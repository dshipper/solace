import XCTest
@testable import Solace

final class SolaceDatesTests: XCTestCase {
  func testFormatDateTimeWithTime() {
    XCTAssertEqual(
      SolaceDates.formatDateTime("2026-07-11T11:00"),
      "Saturday, July 11, 2026 at 11:00 AM")
  }

  func testFormatDateTimeDateOnly() {
    XCTAssertEqual(SolaceDates.formatDateTime("2026-07-11"), "Saturday, July 11, 2026")
  }

  func testFormatDateTimeAfternoonAndMidnight() {
    XCTAssertEqual(
      SolaceDates.formatDateTime("2026-07-11T13:05"),
      "Saturday, July 11, 2026 at 1:05 PM")
    XCTAssertEqual(
      SolaceDates.formatDateTime("2026-07-11T00:30"),
      "Saturday, July 11, 2026 at 12:30 AM")
    XCTAssertEqual(
      SolaceDates.formatDateTime("2026-07-11T12:00"),
      "Saturday, July 11, 2026 at 12:00 PM")
  }

  func testFormatDate() {
    XCTAssertEqual(SolaceDates.formatDate("1941-03-08"), "March 8, 1941")
  }

  func testFormatDateFallsBackToRawValueWhenUnparseable() {
    XCTAssertEqual(SolaceDates.formatDate("sometime soon"), "sometime soon")
    XCTAssertEqual(SolaceDates.formatDate(nil), "")
    XCTAssertEqual(SolaceDates.formatDate(""), "")
  }

  func testFormatDateHandlesUtcAuditTimestamps() {
    // createdAt-style fields are UTC ISO strings; we display the date part only.
    XCTAssertEqual(SolaceDates.formatDate("2026-07-02T14:03:00.000Z"), "July 2, 2026")
  }

  func testFormatTime() {
    XCTAssertEqual(SolaceDates.formatTime("2026-07-11T11:00"), "11:00 AM")
    XCTAssertEqual(SolaceDates.formatTime("2026-07-11"), "")
    XCTAssertEqual(SolaceDates.formatTime(nil), "")
  }

  func testFormatYears() {
    XCTAssertEqual(SolaceDates.formatYears(bornOn: "1941-03-08", diedOn: "2026-06-25"), "1941\u{2013}2026")
    XCTAssertEqual(SolaceDates.formatYears(bornOn: nil, diedOn: "2026-06-25"), "2026")
    XCTAssertEqual(SolaceDates.formatYears(bornOn: "1941-03-08", diedOn: nil), "1941")
    XCTAssertEqual(SolaceDates.formatYears(bornOn: nil, diedOn: nil), "")
  }

  func testKindLabelsMatchWebFormatting() {
    XCTAssertEqual(SolaceDates.kindLabel("visitation"), "Visitation")
    XCTAssertEqual(SolaceDates.kindLabel("funeral"), "Funeral Service")
    XCTAssertEqual(SolaceDates.kindLabel("graveside"), "Graveside Service")
    XCTAssertEqual(SolaceDates.kindLabel("memorial"), "Memorial Service")
    XCTAssertEqual(SolaceDates.kindLabel("reception"), "Reception")
    XCTAssertEqual(SolaceDates.kindLabel("livestream"), "Livestream")
  }

  func testSpaceSeparatorAlsoParses() {
    XCTAssertEqual(
      SolaceDates.formatDateTime("2026-07-11 11:00"),
      "Saturday, July 11, 2026 at 11:00 AM")
  }
}
