import Foundation
import Observation

enum SendStatus: String, Codable {
  case pending
  case sent
  case cancelled
  case unreachable
}

// One unit of sending: an SMS sheet for one person, a warned group SMS for a
// hand-picked group of at most 8, or an email sheet BCCing at most 20.
enum SendStep: Equatable, Identifiable {
  case sms(InviteContact)
  case smsGroup([InviteContact])
  case email([InviteContact])

  var contacts: [InviteContact] {
    switch self {
    case .sms(let contact): return [contact]
    case .smsGroup(let contacts): return contacts
    case .email(let contacts): return contacts
    }
  }

  var id: String {
    contacts.map(\.id).joined(separator: "+")
  }
}

// State machine for the send queue. It only ever advances when the previous
// compose sheet has fully finished and been dismissed (A13) — the presenter
// calls finishCurrentStep from the dismiss completion.
@MainActor
@Observable
final class SendQueue {
  enum Phase: Equatable {
    case idle
    case sending
    case finished
  }

  static let smsGroupLimit = 8
  static let emailBccLimit = 20

  private(set) var steps: [SendStep] = []
  private(set) var stepIndex = 0
  private(set) var phase: Phase = .idle
  private(set) var statuses: [String: SendStatus] = [:]

  var isSending: Bool { phase == .sending }

  var currentStep: SendStep? {
    guard phase == .sending, stepIndex < steps.count else { return nil }
    return steps[stepIndex]
  }

  var progressText: String {
    guard !steps.isEmpty else { return "" }
    return "Sending \(min(stepIndex + 1, steps.count)) of \(steps.count)"
  }

  var sentCount: Int { statuses.values.filter { $0 == .sent }.count }
  var skippedCount: Int { statuses.values.filter { $0 == .cancelled || $0 == .unreachable }.count }

  /// Contacts still waiting on a compose sheet.
  var pendingContacts: [InviteContact] {
    guard phase == .sending, stepIndex < steps.count else { return [] }
    return steps[stepIndex...].flatMap(\.contacts).filter { statuses[$0.id] == .pending }
  }

  func begin(contacts: [InviteContact], groupSms: Bool = false) {
    steps = Self.buildSteps(contacts: contacts, groupSms: groupSms)
    statuses = [:]
    for contact in contacts {
      statuses[contact.id] = contact.channel == .unreachable ? .unreachable : .pending
    }
    stepIndex = 0
    phase = steps.isEmpty ? .finished : .sending
  }

  /// Called from the previous controller's didFinish -> dismiss completion.
  func finishCurrentStep(with status: SendStatus) {
    guard let step = currentStep else { return }
    for contact in step.contacts {
      statuses[contact.id] = status
    }
    stepIndex += 1
    if stepIndex >= steps.count {
      phase = .finished
    }
  }

  /// "Stop sending": everything not yet handled is marked cancelled.
  func stop() {
    guard phase == .sending else { return }
    for index in stepIndex..<steps.count {
      for contact in steps[index].contacts where statuses[contact.id] == .pending {
        statuses[contact.id] = .cancelled
      }
    }
    stepIndex = steps.count
    phase = .finished
  }

  func resetIfFinished() {
    guard phase == .finished else { return }
    steps = []
    statuses = [:]
    stepIndex = 0
    phase = .idle
  }

  nonisolated static func buildSteps(contacts: [InviteContact], groupSms: Bool) -> [SendStep] {
    let sms = contacts.filter { $0.channel == .sms }
    let email = contacts.filter { $0.channel == .email }
    var steps: [SendStep] = []
    if groupSms, sms.count > 1, sms.count <= smsGroupLimit {
      steps.append(.smsGroup(sms))
    } else {
      steps.append(contentsOf: sms.map { .sms($0) })
    }
    for chunk in chunked(email, size: emailBccLimit) {
      steps.append(.email(chunk))
    }
    return steps
  }

  nonisolated static func chunked<T>(_ items: [T], size: Int) -> [[T]] {
    guard size > 0, !items.isEmpty else { return [] }
    return stride(from: 0, to: items.count, by: size).map {
      Array(items[$0..<min($0 + size, items.count)])
    }
  }

  /// mailto: fallback for phones without a configured Mail account.
  nonisolated static func mailtoURL(bcc: [String], subject: String, body: String) -> URL? {
    guard !bcc.isEmpty else { return nil }
    let unreserved = CharacterSet(
      charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
    func encode(_ value: String) -> String {
      value.addingPercentEncoding(withAllowedCharacters: unreserved) ?? value
    }
    let bccList = bcc.map(encode).joined(separator: ",")
    return URL(string: "mailto:?bcc=\(bccList)&subject=\(encode(subject))&body=\(encode(body))")
  }
}
