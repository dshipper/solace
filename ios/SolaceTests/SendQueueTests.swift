import XCTest
@testable import Solace

@MainActor
final class SendQueueTests: XCTestCase {
  private func smsContact(_ id: String) -> InviteContact {
    InviteContact(id: id, name: "Person \(id)", phoneNumber: "+1555000\(id)", email: nil, channel: .sms)
  }

  private func emailContact(_ id: String) -> InviteContact {
    InviteContact(id: id, name: "Person \(id)", phoneNumber: nil, email: "p\(id)@example.com", channel: .email)
  }

  private func unreachableContact(_ id: String) -> InviteContact {
    InviteContact(id: id, name: "Person \(id)", phoneNumber: nil, email: nil, channel: .unreachable)
  }

  func testBuildStepsOneSmsSheetPerRecipient() {
    let contacts = [smsContact("1"), smsContact("2"), smsContact("3")]
    let steps = SendQueue.buildSteps(contacts: contacts, groupSms: false)
    XCTAssertEqual(steps.count, 3)
    for step in steps {
      if case .sms = step { continue }
      XCTFail("Expected individual sms steps")
    }
  }

  func testBuildStepsChunksEmailByTwenty() {
    let contacts = (1...45).map { emailContact("\($0)") }
    let steps = SendQueue.buildSteps(contacts: contacts, groupSms: false)
    XCTAssertEqual(steps.count, 3)
    guard case let .email(first) = steps[0],
          case let .email(second) = steps[1],
          case let .email(third) = steps[2]
    else {
      return XCTFail("Expected email steps")
    }
    XCTAssertEqual(first.count, 20)
    XCTAssertEqual(second.count, 20)
    XCTAssertEqual(third.count, 5)
  }

  func testBuildStepsMixedContacts() {
    let contacts = [smsContact("1"), emailContact("2"), smsContact("3"), unreachableContact("4")]
    let steps = SendQueue.buildSteps(contacts: contacts, groupSms: false)
    XCTAssertEqual(steps.count, 3)
    guard case .sms = steps[0], case .sms = steps[1], case .email = steps[2] else {
      return XCTFail("Expected sms, sms, email")
    }
  }

  func testGroupSmsAllowedUpToEight() {
    let contacts = (1...8).map { smsContact("\($0)") }
    let steps = SendQueue.buildSteps(contacts: contacts, groupSms: true)
    XCTAssertEqual(steps.count, 1)
    guard case let .smsGroup(group) = steps[0] else {
      return XCTFail("Expected one group step")
    }
    XCTAssertEqual(group.count, 8)
  }

  func testGroupSmsFallsBackToIndividualBeyondEight() {
    let contacts = (1...9).map { smsContact("\($0)") }
    let steps = SendQueue.buildSteps(contacts: contacts, groupSms: true)
    XCTAssertEqual(steps.count, 9)
  }

  func testBeginMarksUnreachableImmediately() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), unreachableContact("2")])
    XCTAssertEqual(queue.statuses["2"], .unreachable)
    XCTAssertEqual(queue.statuses["1"], .pending)
    XCTAssertEqual(queue.steps.count, 1)
  }

  func testAdvanceOnlyMovesOneStepAtATime() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), smsContact("2")])
    XCTAssertEqual(queue.phase, .sending)
    XCTAssertEqual(queue.progressText, "Sending 1 of 2")
    guard case let .sms(first) = queue.currentStep else {
      return XCTFail("Expected an sms step")
    }
    XCTAssertEqual(first.id, "1")

    queue.finishCurrentStep(with: .sent)
    XCTAssertEqual(queue.statuses["1"], .sent)
    XCTAssertEqual(queue.progressText, "Sending 2 of 2")
    guard case let .sms(second) = queue.currentStep else {
      return XCTFail("Expected a second sms step")
    }
    XCTAssertEqual(second.id, "2")

    queue.finishCurrentStep(with: .cancelled)
    XCTAssertEqual(queue.statuses["2"], .cancelled)
    XCTAssertEqual(queue.phase, .finished)
    XCTAssertNil(queue.currentStep)
  }

  func testCancellingOneAdvancesToNext() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), smsContact("2")])
    queue.finishCurrentStep(with: .cancelled)
    XCTAssertEqual(queue.statuses["1"], .cancelled)
    XCTAssertNotNil(queue.currentStep)
    XCTAssertEqual(queue.phase, .sending)
  }

  func testStopMarksRemainingCancelled() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), smsContact("2"), smsContact("3")])
    queue.finishCurrentStep(with: .sent)
    queue.stop()
    XCTAssertEqual(queue.statuses["1"], .sent)
    XCTAssertEqual(queue.statuses["2"], .cancelled)
    XCTAssertEqual(queue.statuses["3"], .cancelled)
    XCTAssertEqual(queue.phase, .finished)
    XCTAssertNil(queue.currentStep)
  }

  func testPendingContactsReflectsRemainingQueue() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), smsContact("2")])
    XCTAssertEqual(queue.pendingContacts.map(\.id), ["1", "2"])
    queue.finishCurrentStep(with: .sent)
    XCTAssertEqual(queue.pendingContacts.map(\.id), ["2"])
  }

  func testChunkedHelper() {
    XCTAssertEqual(SendQueue.chunked([1, 2, 3, 4, 5], size: 2), [[1, 2], [3, 4], [5]])
    XCTAssertEqual(SendQueue.chunked([Int](), size: 2), [])
  }

  func testSentAndSkippedCounts() {
    let queue = SendQueue()
    queue.begin(contacts: [smsContact("1"), smsContact("2"), unreachableContact("3")])
    queue.finishCurrentStep(with: .sent)
    queue.stop()
    XCTAssertEqual(queue.sentCount, 1)
    XCTAssertEqual(queue.skippedCount, 2)
  }
}
