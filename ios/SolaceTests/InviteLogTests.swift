import XCTest
@testable import Solace

@MainActor
final class InviteLogTests: XCTestCase {
  private var tempDir: URL!

  override func setUp() {
    super.setUp()
    tempDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("invite-log-tests-\(UUID().uuidString)", isDirectory: true)
  }

  override func tearDown() {
    if let tempDir {
      try? FileManager.default.removeItem(at: tempDir)
    }
    super.tearDown()
  }

  private func contact(_ id: String, channel: InviteChannel = .sms) -> InviteContact {
    InviteContact(
      id: id,
      name: "Person \(id)",
      phoneNumber: channel == .sms ? "+1555000\(id)" : nil,
      email: channel == .email ? "p\(id)@example.com" : nil,
      channel: channel)
  }

  func testRoundtripThroughDisk() {
    let log = InviteLog(directory: tempDir)
    log.record(contact: contact("1"), status: .sent)
    log.record(contact: contact("2", channel: .email), status: .cancelled)

    let reloaded = InviteLog(directory: tempDir)
    XCTAssertEqual(reloaded.entries.count, 2)
    XCTAssertEqual(reloaded.entries[0].contactName, "Person 1")
    XCTAssertEqual(reloaded.entries[0].status, .sent)
    XCTAssertEqual(reloaded.entries[1].channel, .email)
    XCTAssertEqual(reloaded.entries[1].status, .cancelled)
    XCTAssertEqual(reloaded.sentCount, 1)
  }

  func testResendReturnsCancelledAndUnreachableOnly() {
    let log = InviteLog(directory: tempDir)
    log.record(contact: contact("1"), status: .sent)
    log.record(contact: contact("2"), status: .cancelled)
    log.record(contact: contact("3", channel: .unreachable), status: .unreachable)

    let resend = log.resendContacts()
    XCTAssertEqual(resend.count, 2)
    XCTAssertEqual(resend[0].name, "Person 2")
    XCTAssertEqual(resend[0].channel, .sms)
    XCTAssertEqual(resend[0].phoneNumber, "+15550002")
    XCTAssertEqual(resend[1].channel, .unreachable)
  }

  func testResendExcludesContactsLaterSent() {
    let log = InviteLog(directory: tempDir)
    log.record(contact: contact("1"), status: .cancelled)
    log.record(contact: contact("2"), status: .cancelled)
    log.record(contact: contact("1"), status: .sent)

    XCTAssertEqual(log.unsentEntries.count, 1)
    let resend = log.resendContacts()
    XCTAssertEqual(resend.count, 1)
    XCTAssertEqual(resend[0].phoneNumber, "+15550002")
  }

  func testResendDedupesRepeatedAttemptsForOnePerson() {
    let log = InviteLog(directory: tempDir)
    log.record(contact: contact("1"), status: .cancelled)
    log.record(contact: contact("1"), status: .cancelled)

    let resend = log.resendContacts()
    XCTAssertEqual(resend.count, 1)
    // The same person resent again must merge to the same queue entry.
    XCTAssertEqual(log.resendContacts()[0].id, resend[0].id)
  }

  func testUnreachableIsRecordedOnlyOnce() {
    let log = InviteLog(directory: tempDir)
    let person = contact("3", channel: .unreachable)
    log.record(contact: person, status: .unreachable)
    log.record(contact: person, status: .unreachable)

    XCTAssertEqual(log.entries.count, 1)
    XCTAssertEqual(log.unsentEntries.count, 1)
  }

  func testClearRemovesEntriesAndFile() {
    let log = InviteLog(directory: tempDir)
    log.record(contact: contact("1"), status: .sent)
    log.clear()
    XCTAssertTrue(log.entries.isEmpty)

    let reloaded = InviteLog(directory: tempDir)
    XCTAssertTrue(reloaded.entries.isEmpty)
  }
}
