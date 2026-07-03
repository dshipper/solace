import Foundation

// Mirrors lib/format.ts: service datetimes are naive local wall-clock strings
// ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"). We split components by hand and never
// convert between timezones.
enum SolaceDates {
  static let kindLabels: [String: String] = [
    "visitation": "Visitation",
    "funeral": "Funeral Service",
    "graveside": "Graveside Service",
    "memorial": "Memorial Service",
    "reception": "Reception",
    "livestream": "Livestream",
  ]

  static let monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  static let weekdayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ]

  struct Parts: Equatable {
    let year: Int
    let month: Int
    let day: Int
    let hour: Int?
    let minute: Int?
  }

  static func parseParts(_ value: String?) -> Parts? {
    guard let value else { return nil }
    let chars = Array(value.trimmingCharacters(in: .whitespacesAndNewlines))
    guard chars.count >= 10 else { return nil }

    func number(_ range: Range<Int>) -> Int? {
      var result = 0
      for index in range {
        guard let digit = chars[index].wholeNumberValue, (0...9).contains(digit) else { return nil }
        result = result * 10 + digit
      }
      return result
    }

    guard chars[4] == "-", chars[7] == "-",
          let year = number(0..<4), let month = number(5..<7), let day = number(8..<10),
          (1...12).contains(month), (1...31).contains(day)
    else { return nil }

    var hour: Int?
    var minute: Int?
    if chars.count >= 16, chars[10] == "T" || chars[10] == " ", chars[13] == ":",
       let h = number(11..<13), let m = number(14..<16),
       (0...23).contains(h), (0...59).contains(m) {
      hour = h
      minute = m
    }
    return Parts(year: year, month: month, day: day, hour: hour, minute: minute)
  }

  /// "March 8, 1941". Falls back to the raw value when it cannot be parsed.
  static func formatDate(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "" }
    guard let p = parseParts(value) else { return value }
    return "\(monthNames[p.month - 1]) \(p.day), \(p.year)"
  }

  /// "Saturday, July 11, 2026 at 11:00 AM" (date-only input omits the time).
  static func formatDateTime(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "" }
    guard let p = parseParts(value) else { return value }
    let datePart = "\(weekdayName(p)), \(monthNames[p.month - 1]) \(p.day), \(p.year)"
    guard let hour = p.hour, let minute = p.minute else { return datePart }
    return "\(datePart) at \(clock(hour: hour, minute: minute))"
  }

  /// "11:00 AM", or empty when the value has no time component.
  static func formatTime(_ value: String?) -> String {
    guard let p = parseParts(value), let hour = p.hour, let minute = p.minute else { return "" }
    return clock(hour: hour, minute: minute)
  }

  /// "1941–2026", or a single year when only one date is known.
  static func formatYears(bornOn: String?, diedOn: String?) -> String {
    let born = bornOn.flatMap(parseParts)?.year
    let died = diedOn.flatMap(parseParts)?.year
    if let born, let died { return "\(born)\u{2013}\(died)" }
    if let died { return String(died) }
    if let born { return String(born) }
    return ""
  }

  static func kindLabel(_ kind: String) -> String {
    kindLabels[kind] ?? kind.capitalized
  }

  // The weekday comes from Calendar, but only as a lookup over the fixed date
  // parts we already parsed — no timezone conversion happens here.
  private static func weekdayName(_ p: Parts) -> String {
    var components = DateComponents()
    components.year = p.year
    components.month = p.month
    components.day = p.day
    components.hour = 12
    let calendar = Calendar(identifier: .gregorian)
    guard let date = calendar.date(from: components) else { return "" }
    return weekdayNames[calendar.component(.weekday, from: date) - 1]
  }

  private static func clock(hour: Int, minute: Int) -> String {
    let suffix = hour >= 12 ? "PM" : "AM"
    let display = hour % 12 == 0 ? 12 : hour % 12
    return String(format: "%d:%02d %@", display, minute, suffix)
  }
}
