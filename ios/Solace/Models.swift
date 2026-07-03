import Foundation

// Codable mirrors of the HTTP API contract. All date-ish fields are plain
// strings (naive wall-clock or UTC ISO); they are never decoded as Date.

struct EventInfo: Codable, Equatable {
  let id: String
  let slug: String
  let publicUrl: String
  let familyCode: String
  let deceasedName: String
  let bornOn: String?
  let diedOn: String?
  let photoUrl: String?
  let obituaryText: String
  let funeralHomeName: String
  let status: String
}

struct Service: Codable, Equatable, Identifiable {
  let id: String
  let kind: String
  let title: String?
  let startsAt: String?
  let endsAt: String?
  let venueName: String?
  let address: String?
  let notes: String?
  let livestreamUrl: String?
}

struct EventUpdate: Codable, Equatable, Identifiable {
  let id: String
  let authorKind: String
  let authorName: String
  let title: String
  let bodyText: String
  let createdAt: String
}

struct RsvpSummary: Codable, Equatable {
  let responseCount: Int
  let attendingCount: Int
  let totalGuests: Int
  let declinedCount: Int
}

struct InviteTemplate: Codable, Equatable {
  let message: String
  let url: String
}

struct EventBundle: Codable, Equatable {
  let event: EventInfo
  let services: [Service]
  let updates: [EventUpdate]
  let rsvpSummary: RsvpSummary
  let inviteTemplate: InviteTemplate
}

// Organizer-visible RSVP rows are PII-stripped by the server: no email, no phone.
struct RsvpRow: Codable, Equatable, Identifiable {
  let id: String
  let name: String
  let attending: String
  let guestCount: Int
  let note: String?
  let createdAt: String
}

struct Organizer: Codable, Equatable {
  let id: String
  let name: String
  let marketingOptIn: Bool
  let email: String?
  let phone: String?
}

struct JoinResponse: Codable, Equatable {
  let token: String
  let organizer: Organizer
  let bundle: EventBundle
}
