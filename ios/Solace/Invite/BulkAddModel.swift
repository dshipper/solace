import Foundation
import Contacts
import Observation

// The "Add many at once" flow: request full contacts access, enumerate on a
// background task, and hand back reachable contacts for the reviewable list.
// Everything stays on this phone.
@MainActor
@Observable
final class BulkAddModel {
  enum State: Equatable {
    case idle
    case requesting
    case loading
    case denied
    case failed(String)
    case loaded(count: Int, limited: Bool)
  }

  private(set) var state: State = .idle

  var resultTitle: String? {
    guard case let .loaded(count, limited) = state else { return nil }
    if limited {
      return "Added the \(count) contacts you've shared with Solace"
    }
    return count == 1 ? "Added 1 contact" : "Added \(count) contacts"
  }

  /// True when the last bulk add ran under iOS 18+ limited contacts access,
  /// so the UI can offer the limited-access management path (A13).
  var isLimitedResult: Bool {
    if case .loaded(_, limited: true) = state { return true }
    return false
  }

  func loadAll() async -> [InviteContact] {
    state = .requesting
    let store = CNContactStore()
    let granted = (try? await store.requestAccess(for: .contacts)) ?? false
    let status = CNContactStore.authorizationStatus(for: .contacts)
    let limited = Self.isLimited(status)
    guard granted || limited || status == .authorized else {
      state = .denied
      return []
    }
    state = .loading
    do {
      let contacts = try await Self.fetchAll(store: store)
      state = .loaded(count: contacts.count, limited: limited)
      return contacts
    } catch {
      state = .failed("We couldn't read your contacts. You can still choose people with the contact picker.")
      return []
    }
  }

  func reset() {
    state = .idle
  }

  /// iOS 18 introduced limited contacts access; treat it as usable.
  nonisolated static func isLimited(_ status: CNAuthorizationStatus) -> Bool {
    if #available(iOS 18.0, *) {
      return status == .limited
    }
    return false
  }

  private nonisolated static func fetchAll(store: CNContactStore) async throws -> [InviteContact] {
    try await Task.detached(priority: .userInitiated) {
      let keys: [CNKeyDescriptor] = [
        CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
        CNContactPhoneNumbersKey as CNKeyDescriptor,
        CNContactEmailAddressesKey as CNKeyDescriptor,
      ]
      let request = CNContactFetchRequest(keysToFetch: keys)
      request.sortOrder = .userDefault
      var results: [InviteContact] = []
      try store.enumerateContacts(with: request) { contact, _ in
        let mapped = InviteContact.from(contact)
        if mapped.channel != .unreachable {
          results.append(mapped)
        }
      }
      return results
    }.value
  }
}
