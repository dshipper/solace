import Foundation

enum InviteChannel: String, Codable {
  case sms
  case email
  case unreachable
}

struct InviteContact: Identifiable, Hashable, Codable {
  let id: String
  let name: String
  let phoneNumber: String?
  let email: String?
  let channel: InviteChannel

  /// A13 routing: a contact with any phone number is an SMS invite (prefer the
  /// first mobile-labelled number, else the first number); email-only contacts
  /// are email invites; contacts with neither are unreachable.
  static func route(
    phones: [(label: String?, value: String)],
    emails: [String]
  ) -> (phoneNumber: String?, email: String?, channel: InviteChannel) {
    let mobile = phones.first { isMobileLabel($0.label) }
    if let phone = mobile ?? phones.first {
      return (phone.value, emails.first, .sms)
    }
    if let email = emails.first {
      return (nil, email, .email)
    }
    return (nil, nil, .unreachable)
  }

  static func make(
    id: String = UUID().uuidString,
    name: String,
    phones: [(label: String?, value: String)],
    emails: [String]
  ) -> InviteContact {
    let routed = route(phones: phones, emails: emails)
    return InviteContact(
      id: id,
      name: name,
      phoneNumber: routed.phoneNumber,
      email: routed.email,
      channel: routed.channel)
  }

  private static func isMobileLabel(_ label: String?) -> Bool {
    guard let label else { return false }
    let lowered = label.lowercased()
    return lowered.contains("mobile") || lowered.contains("iphone") || lowered.contains("cell")
  }
}
