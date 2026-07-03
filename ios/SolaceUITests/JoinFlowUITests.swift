import XCTest

// A live-server walkthrough: join with a seeded family code, confirm the
// service loads, and open the RSVPs tab. The runner provides
// SOLACE_TEST_FAMILY_CODE (and usually SOLACE_API_BASE); without it, this
// test skips cleanly.
final class JoinFlowUITests: XCTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testJoinSeededEventAndOpenRsvps() throws {
    let env = ProcessInfo.processInfo.environment
    guard let familyCode = env["SOLACE_TEST_FAMILY_CODE"], !familyCode.isEmpty else {
      throw XCTSkip("needs live server")
    }

    let app = XCUIApplication()
    app.launchEnvironment["SOLACE_RESET"] = "1"
    if let base = env["SOLACE_API_BASE"], !base.isEmpty {
      app.launchEnvironment["SOLACE_API_BASE"] = base
    }
    app.launch()

    let codeField = app.textFields["familyCodeField"]
    XCTAssertTrue(codeField.waitForExistence(timeout: 10), "Join screen should appear")
    codeField.tap()
    codeField.typeText(familyCode)

    let nameField = app.textFields["nameField"]
    nameField.tap()
    nameField.typeText("UI Tester")

    app.buttons["joinButton"].tap()

    let rsvpsTab = app.tabBars.buttons["RSVPs"]
    XCTAssertTrue(rsvpsTab.waitForExistence(timeout: 15), "Joining should land on the main tabs")

    if let deceasedName = env["SOLACE_TEST_DECEASED_NAME"], !deceasedName.isEmpty {
      XCTAssertTrue(
        app.staticTexts[deceasedName].waitForExistence(timeout: 10),
        "Deceased name should be visible on the Service tab")
    }

    rsvpsTab.tap()
    XCTAssertTrue(
      app.navigationBars["RSVPs"].waitForExistence(timeout: 10),
      "RSVPs tab should open")
  }
}
