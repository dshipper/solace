import XCTest
@testable import Solace

final class RoutingTests: XCTestCase {
  func testPrefersMobileLabelledPhone() {
    let routed = InviteContact.route(
      phones: [
        (label: "home", value: "+15550000001"),
        (label: "_$!<Mobile>!$_", value: "+15550000002"),
      ],
      emails: [])
    XCTAssertEqual(routed.phoneNumber, "+15550000002")
    XCTAssertEqual(routed.channel, .sms)
  }

  func testFallsBackToFirstPhoneWithoutMobileLabel() {
    let routed = InviteContact.route(
      phones: [
        (label: "home", value: "+15550000001"),
        (label: "work", value: "+15550000002"),
      ],
      emails: [])
    XCTAssertEqual(routed.phoneNumber, "+15550000001")
    XCTAssertEqual(routed.channel, .sms)
  }

  func testPhoneWinsOverEmail() {
    let routed = InviteContact.route(
      phones: [(label: "work", value: "+15550000001")],
      emails: ["friend@example.com"])
    XCTAssertEqual(routed.channel, .sms)
    XCTAssertEqual(routed.phoneNumber, "+15550000001")
    XCTAssertEqual(routed.email, "friend@example.com")
  }

  func testEmailOnlyContactRoutesToEmail() {
    let routed = InviteContact.route(
      phones: [],
      emails: ["first@example.com", "second@example.com"])
    XCTAssertEqual(routed.channel, .email)
    XCTAssertNil(routed.phoneNumber)
    XCTAssertEqual(routed.email, "first@example.com")
  }

  func testNoPhoneOrEmailIsUnreachable() {
    let routed = InviteContact.route(phones: [], emails: [])
    XCTAssertEqual(routed.channel, .unreachable)
    XCTAssertNil(routed.phoneNumber)
    XCTAssertNil(routed.email)
  }

  func testIPhoneLabelCountsAsMobile() {
    let routed = InviteContact.route(
      phones: [
        (label: "home", value: "+15550000001"),
        (label: "_$!<iPhone>!$_", value: "+15550000003"),
      ],
      emails: [])
    XCTAssertEqual(routed.phoneNumber, "+15550000003")
  }
}
