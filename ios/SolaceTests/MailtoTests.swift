import XCTest
@testable import Solace

final class MailtoTests: XCTestCase {
  func testMailtoJoinsBccAndEncodes() {
    let url = SendQueue.mailtoURL(
      bcc: ["a@example.com", "b@example.com"],
      subject: "In memory of Miriam Delgado",
      body: "You're invited. Details and RSVP: http://127.0.0.1:4863/e/abc")
    let string = url?.absoluteString ?? ""
    XCTAssertTrue(string.hasPrefix("mailto:?bcc="))
    XCTAssertTrue(string.contains("bcc=a%40example.com,b%40example.com"))
    XCTAssertTrue(string.contains("subject=In%20memory%20of%20Miriam%20Delgado"))
    XCTAssertTrue(string.contains("body=You%27re%20invited."))
    XCTAssertTrue(string.contains("http%3A%2F%2F127.0.0.1%3A4863%2Fe%2Fabc"))
  }

  func testMailtoWithNoRecipientsIsNil() {
    XCTAssertNil(SendQueue.mailtoURL(bcc: [], subject: "Subject", body: "Body"))
  }

  func testMailtoEncodesAmpersandsAndNewlines() {
    let url = SendQueue.mailtoURL(
      bcc: ["a@example.com"],
      subject: "Service & reception",
      body: "Line one\nLine two")
    let string = url?.absoluteString ?? ""
    XCTAssertTrue(string.contains("subject=Service%20%26%20reception"))
    XCTAssertTrue(string.contains("body=Line%20one%0ALine%20two"))
  }
}
