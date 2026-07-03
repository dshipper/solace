import SwiftUI

struct JoinView: View {
  @Environment(AppModel.self) private var model

  @State private var familyCode = ""
  @State private var name = ""

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 0) {
          VStack(spacing: 10) {
            Eyebrow(text: "Welcome")
            Text("Solace")
              .font(.system(size: 40, weight: .medium, design: .serif))
              .foregroundStyle(Theme.ink)
            Text("The funeral home gave your family a code. Enter it here to see the service details, invite people, and follow their replies.")
              .font(.system(size: 16, design: .serif))
              .foregroundStyle(Theme.muted)
              .multilineTextAlignment(.center)
              .lineSpacing(3)
              .padding(.horizontal, 8)
          }
          .padding(.top, 56)

          OrnamentView()
            .padding(.vertical, 28)

          VStack(spacing: 12) {
            TextField("Family code", text: $familyCode)
              .textInputAutocapitalization(.characters)
              .autocorrectionDisabled()
              .font(.system(size: 18, weight: .medium, design: .serif))
              .tracking(1.5)
              .multilineTextAlignment(.center)
              .padding(.vertical, 13)
              .background(Theme.paperRaised, in: RoundedRectangle(cornerRadius: 9))
              .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line))
              .accessibilityIdentifier("familyCodeField")
            TextField("Your name", text: $name)
              .multilineTextAlignment(.center)
              .padding(.vertical, 13)
              .background(Theme.paperRaised, in: RoundedRectangle(cornerRadius: 9))
              .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line))
              .accessibilityIdentifier("nameField")
          }

          if let message = model.errorMessage {
            Text(message)
              .font(.subheadline)
              .foregroundStyle(Color(red: 164 / 255, green: 66 / 255, blue: 58 / 255))
              .multilineTextAlignment(.center)
              .padding(.top, 14)
              .accessibilityIdentifier("joinError")
          }

          Button {
            Task { await model.join(familyCode: familyCode, name: name) }
          } label: {
            if model.isJoining {
              ProgressView()
                .frame(maxWidth: .infinity)
            } else {
              Text("Join")
                .frame(maxWidth: .infinity)
                .fontWeight(.semibold)
            }
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)
          .disabled(model.isJoining)
          .padding(.top, 20)
          .accessibilityIdentifier("joinButton")

          Text("Codes look like CEDAR-WREN-4821. Capitalization doesn't matter.")
            .font(.caption)
            .foregroundStyle(Theme.faint)
            .multilineTextAlignment(.center)
            .padding(.top, 14)
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 420)
        .frame(maxWidth: .infinity)
      }
      .paperBackground()
    }
  }
}
