import SwiftUI

@main
struct SolaceApp: App {
  @State private var model = AppModel()

  var body: some Scene {
    WindowGroup {
      Group {
        if model.session == nil {
          JoinView()
        } else {
          MainTabView()
        }
      }
      .environment(model)
    }
  }
}
