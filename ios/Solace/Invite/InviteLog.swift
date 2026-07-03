import Foundation
import Observation

struct InviteLogEntry: Codable, Identifiable, Equatable {
  let id: String
  let contactName: String
  let channel: InviteChannel
  var status: SendStatus
  let date: String
  // Kept locally (never uploaded) so "Resend to anyone not yet sent" can
  // rebuild a queue without touching the address book again.
  var phoneNumber: String?
  var email: String?
}

// Local-only record of invitation attempts, persisted as JSON in Application
// Support. Cleared when the organizer leaves the event.
@MainActor
@Observable
final class InviteLog {
  private(set) var entries: [InviteLogEntry] = []
  private let fileURL: URL

  init(directory: URL? = nil) {
    let base = directory
      ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        .appendingPathComponent("Solace", isDirectory: true)
    fileURL = base.appendingPathComponent("invite-log.json")
    load()
  }

  func record(contact: InviteContact, status: SendStatus) {
    // Unreachable is a standing fact about the contact, not a fresh attempt:
    // don't append a duplicate row every time a resend re-queues them.
    if status == .unreachable {
      let key = Self.identityKey(name: contact.name, phoneNumber: contact.phoneNumber, email: contact.email)
      if entries.contains(where: { $0.status == .unreachable && Self.identityKey(for: $0) == key }) {
        return
      }
    }
    entries.append(
      InviteLogEntry(
        id: UUID().uuidString,
        contactName: contact.name,
        channel: contact.channel,
        status: status,
        date: ISO8601DateFormatter().string(from: Date()),
        phoneNumber: contact.phoneNumber,
        email: contact.email))
    save()
  }

  var sentCount: Int {
    entries.filter { $0.status == .sent }.count
  }

  /// Attempts that never went out (cancelled or unreachable), one per person,
  /// excluding anyone a later attempt actually reached.
  var unsentEntries: [InviteLogEntry] {
    let sentKeys = Set(entries.filter { $0.status == .sent }.map(Self.identityKey(for:)))
    var seen = Set<String>()
    var unsent: [InviteLogEntry] = []
    for entry in entries where entry.status == .cancelled || entry.status == .unreachable {
      let key = Self.identityKey(for: entry)
      guard !sentKeys.contains(key), !seen.contains(key) else { continue }
      seen.insert(key)
      unsent.append(entry)
    }
    return unsent
  }

  /// Rebuild contacts for a fresh queue from the unsent entries. The identity
  /// key doubles as the contact id so re-adding the same person (e.g. tapping
  /// Resend twice) merges instead of queueing duplicate compose sheets.
  func resendContacts() -> [InviteContact] {
    unsentEntries.map { entry in
      InviteContact(
        id: Self.identityKey(for: entry),
        name: entry.contactName,
        phoneNumber: entry.phoneNumber,
        email: entry.email,
        channel: entry.channel)
    }
  }

  /// People are identified by how we'd reach them (phone, then email),
  /// falling back to name for unreachable contacts.
  private static func identityKey(name: String, phoneNumber: String?, email: String?) -> String {
    phoneNumber ?? email ?? "name:\(name)"
  }

  private static func identityKey(for entry: InviteLogEntry) -> String {
    identityKey(name: entry.contactName, phoneNumber: entry.phoneNumber, email: entry.email)
  }

  func clear() {
    entries = []
    try? FileManager.default.removeItem(at: fileURL)
  }

  private func load() {
    guard let data = try? Data(contentsOf: fileURL),
          let stored = try? JSONDecoder().decode([InviteLogEntry].self, from: data)
    else { return }
    entries = stored
  }

  private func save() {
    let directory = fileURL.deletingLastPathComponent()
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    guard let data = try? JSONEncoder().encode(entries) else { return }
    try? data.write(to: fileURL, options: .atomic)
  }
}
