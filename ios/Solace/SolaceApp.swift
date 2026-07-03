import SwiftUI

@main
struct SolaceApp: App {
  @State private var model = AppModel()

  init() {
    let nav = UINavigationBarAppearance()
    nav.configureWithOpaqueBackground()
    nav.backgroundColor = UIColor(Theme.paper)
    nav.shadowColor = UIColor(Theme.line)
    if let serifLarge = UIFontDescriptor.preferredFontDescriptor(withTextStyle: .largeTitle)
      .withDesign(.serif)
    {
      nav.largeTitleTextAttributes = [
        .font: UIFont(descriptor: serifLarge, size: 30),
        .foregroundColor: UIColor(Theme.ink),
      ]
    }
    if let serifTitle = UIFontDescriptor.preferredFontDescriptor(withTextStyle: .headline)
      .withDesign(.serif)
    {
      nav.titleTextAttributes = [
        .font: UIFont(descriptor: serifTitle, size: 17),
        .foregroundColor: UIColor(Theme.ink),
      ]
    }
    UINavigationBar.appearance().standardAppearance = nav
    UINavigationBar.appearance().scrollEdgeAppearance = nav

    let tab = UITabBarAppearance()
    tab.configureWithOpaqueBackground()
    tab.backgroundColor = UIColor(Theme.paperRaised)
    tab.shadowColor = UIColor(Theme.line)
    UITabBar.appearance().standardAppearance = tab
    UITabBar.appearance().scrollEdgeAppearance = tab
  }

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
      .tint(Theme.accentDeep)
    }
  }
}
