import SwiftUI

struct MainTabView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    TabView {
      EventView()
        .tabItem { Label("Service", systemImage: "heart") }
      InviteView()
        .tabItem { Label("Invite", systemImage: "envelope") }
      RSVPsView()
        .tabItem { Label("RSVPs", systemImage: "person.2") }
      UpdatesView()
        .tabItem { Label("Updates", systemImage: "text.bubble") }
      SettingsView()
        .tabItem { Label("More", systemImage: "ellipsis.circle") }
    }
    .task {
      await model.refresh()
      await model.loadRsvps()
    }
  }
}
