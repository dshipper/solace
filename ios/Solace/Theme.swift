import SwiftUI

/// Design tokens mirroring the web's memorial-program palette (app/globals.css).
enum Theme {
  static let paper = Color(red: 250 / 255, green: 246 / 255, blue: 239 / 255)
  static let paperRaised = Color(red: 255 / 255, green: 253 / 255, blue: 249 / 255)
  static let ink = Color(red: 34 / 255, green: 31 / 255, blue: 26 / 255)
  static let muted = Color(red: 125 / 255, green: 118 / 255, blue: 106 / 255)
  static let faint = Color(red: 166 / 255, green: 157 / 255, blue: 141 / 255)
  static let accent = Color(red: 90 / 255, green: 107 / 255, blue: 93 / 255)
  static let accentDeep = Color(red: 67 / 255, green: 81 / 255, blue: 70 / 255)
  static let gold = Color(red: 168 / 255, green: 131 / 255, blue: 79 / 255)
  static let goldSoft = Color(red: 244 / 255, green: 236 / 255, blue: 221 / 255)
  static let line = Color(red: 231 / 255, green: 224 / 255, blue: 210 / 255)
}

/// Gold small-caps label, the app-wide section voice.
struct Eyebrow: View {
  let text: String
  var color: Color = Theme.gold

  var body: some View {
    Text(text.uppercased())
      .font(.system(size: 11, weight: .semibold))
      .tracking(2.4)
      .foregroundStyle(color)
  }
}

/// The leaf between hairlines that recurs on every web surface.
struct OrnamentView: View {
  var body: some View {
    HStack(spacing: 10) {
      hairline
      LeafShape()
        .fill(Theme.gold.opacity(0.55))
        .frame(width: 9, height: 12)
      hairline
    }
    .frame(width: 180)
    .accessibilityHidden(true)
  }

  private var hairline: some View {
    Rectangle()
      .fill(Theme.gold.opacity(0.45))
      .frame(height: 1)
  }
}

struct LeafShape: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    path.move(to: CGPoint(x: rect.midX, y: rect.minY))
    path.addQuadCurve(
      to: CGPoint(x: rect.midX, y: rect.maxY),
      control: CGPoint(x: rect.maxX + rect.width * 0.15, y: rect.midY))
    path.addQuadCurve(
      to: CGPoint(x: rect.midX, y: rect.minY),
      control: CGPoint(x: rect.minX - rect.width * 0.15, y: rect.midY))
    path.closeSubpath()
    return path
  }
}

/// Centered gold small-caps title flanked by hairlines (web .sectionTitle).
struct SectionLabel: View {
  let text: String

  var body: some View {
    HStack(spacing: 12) {
      Rectangle().fill(Theme.line).frame(height: 1)
      Eyebrow(text: text)
        .fixedSize()
      Rectangle().fill(Theme.line).frame(height: 1)
    }
  }
}

extension View {
  /// Warm paper behind a List/Form/ScrollView instead of system gray.
  func paperBackground() -> some View {
    self
      .scrollContentBackground(.hidden)
      .background(Theme.paper.ignoresSafeArea())
  }
}
