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

  /// Attempts that never went out: cancelled or unreachable.
  var unsentEntries: [InviteLogEntry] {
    entries.filter { $0.status == .cancelled || $0.status == .unreachable }
  }

  /// Rebuild contacts for a fresh queue from the unsent entries.
  func resendContacts() -> [InviteContact] {
    unsentEntries.map { entry in
      InviteContact(
        id: entry.id,
        name: entry.contactName,
        phoneNumber: entry.phoneNumber,
        email: entry.email,
        channel: entry.channel)
    }
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
