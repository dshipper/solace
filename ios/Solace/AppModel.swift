import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
  struct Session: Equatable {
    var token: String
    var organizerName: String
  }

  private(set) var session: Session?
  private(set) var bundle: EventBundle?
  private(set) var rsvps: [RsvpRow] = []
  private(set) var organizer: Organizer?
  private(set) var isJoining = false
  private(set) var isLoading = false
  var errorMessage: String?

  let inviteLog: InviteLog

  private static let tokenAccount = "organizer-token"
  private static let nameAccount = "organizer-name"
  private static let profileKey = "solace-organizer-profile"

  nonisolated static func apiBase() -> URL {
    if let env = ProcessInfo.processInfo.environment["SOLACE_API_BASE"],
       let url = URL(string: env) {
      return url
    }
    if let configured = Bundle.main.object(forInfoDictionaryKey: "SolaceAPIBase") as? String,
       let url = URL(string: configured) {
      return url
    }
    return URL(string: "http://127.0.0.1:4863")!
  }

  var api: APIClient {
    APIClient(baseURL: Self.apiBase(), token: session?.token)
  }

  init() {
    inviteLog = InviteLog()
    if ProcessInfo.processInfo.environment["SOLACE_RESET"] == "1" {
      KeychainHelper.delete(account: Self.tokenAccount)
      KeychainHelper.delete(account: Self.nameAccount)
      UserDefaults.standard.removeObject(forKey: Self.profileKey)
      inviteLog.clear()
    }
    if let token = KeychainHelper.read(account: Self.tokenAccount) {
      let name = KeychainHelper.read(account: Self.nameAccount) ?? ""
      session = Session(token: token, organizerName: name)
    }
    if let data = UserDefaults.standard.data(forKey: Self.profileKey),
       let stored = try? JSONDecoder().decode(Organizer.self, from: data) {
      organizer = stored
    }
  }

  func join(familyCode: String, name: String) async {
    let code = familyCode.trimmingCharacters(in: .whitespacesAndNewlines)
    let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !code.isEmpty, !cleanName.isEmpty else {
      errorMessage = "Please enter the family code and your name."
      return
    }
    isJoining = true
    errorMessage = nil
    defer { isJoining = false }
    do {
      let client = APIClient(baseURL: Self.apiBase(), token: nil)
      let response = try await client.join(familyCode: code, name: cleanName)
      KeychainHelper.write(response.token, account: Self.tokenAccount)
      KeychainHelper.write(response.organizer.name, account: Self.nameAccount)
      saveProfile(response.organizer)
      organizer = response.organizer
      bundle = response.bundle
      session = Session(token: response.token, organizerName: response.organizer.name)
    } catch let error as APIError {
      errorMessage = error.code == "unknown_code"
        ? "That code didn't match a service. Please check it with the funeral home."
        : error.message
    } catch {
      errorMessage = "We couldn't reach the server. Please check your connection and try again."
    }
  }

  func refresh() async {
    guard session != nil else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      bundle = try await api.getEvent()
    } catch let error as APIError where error.code == "unauthorized" {
      clearLocalState(message: "Your access to this event has ended. You can rejoin with the family code.")
    } catch {
      if bundle == nil {
        errorMessage = "We couldn't load the service details. Pull down to try again."
      }
    }
  }

  func loadRsvps() async {
    guard session != nil else { return }
    do {
      rsvps = try await api.getRsvps()
    } catch let error as APIError where error.code == "unauthorized" {
      clearLocalState(message: "Your access to this event has ended. You can rejoin with the family code.")
    } catch {
      // Keep whatever we had; the next refresh will try again.
    }
  }

  func postUpdate(title: String, bodyText: String) async throws -> EventUpdate {
    let update = try await api.postUpdate(title: title, bodyText: bodyText)
    await refresh()
    return update
  }

  func deleteUpdate(id: String) async {
    do {
      try await api.deleteUpdate(id: id)
      await refresh()
    } catch let error as APIError {
      errorMessage = error.message
    } catch {
      errorMessage = "We couldn't delete that update. Please try again."
    }
  }

  func setOptIn(marketingOptIn: Bool, email: String?, phone: String?) async throws {
    let updated = try await api.setOptIn(marketingOptIn: marketingOptIn, email: email, phone: phone)
    organizer = updated
    saveProfile(updated)
  }

  /// Leave event: best-effort server-side removal, then clear everything local
  /// (Keychain token, cached profile, and the invite log).
  func leave() async {
    if session != nil {
      try? await api.deleteMe()
    }
    clearLocalState()
  }

  private func saveProfile(_ organizer: Organizer) {
    if let data = try? JSONEncoder().encode(organizer) {
      UserDefaults.standard.set(data, forKey: Self.profileKey)
    }
  }

  private func clearLocalState(message: String? = nil) {
    KeychainHelper.delete(account: Self.tokenAccount)
    KeychainHelper.delete(account: Self.nameAccount)
    UserDefaults.standard.removeObject(forKey: Self.profileKey)
    inviteLog.clear()
    session = nil
    bundle = nil
    rsvps = []
    organizer = nil
    errorMessage = message
  }
}
