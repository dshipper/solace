import SwiftUI

struct JoinView: View {
  @Environment(AppModel.self) private var model

  @State private var familyCode = ""
  @State private var name = ""

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          VStack(alignment: .leading, spacing: 8) {
            Text("Solace")
              .font(.largeTitle)
              .fontWeight(.semibold)
              .fontDesign(.serif)
            Text("The funeral home gave your family a code. Enter it here to see the service details, invite people, and follow their replies.")
              .foregroundStyle(.secondary)
          }
          .padding(.top, 32)

          VStack(spacing: 12) {
            TextField("Family code", text: $familyCode)
              .textInputAutocapitalization(.characters)
              .autocorrectionDisabled()
              .textFieldStyle(.roundedBorder)
              .accessibilityIdentifier("familyCodeField")
            TextField("Your name", text: $name)
              .textFieldStyle(.roundedBorder)
              .accessibilityIdentifier("nameField")
          }

          if let message = model.errorMessage {
            Text(message)
              .font(.subheadline)
              .foregroundStyle(.red)
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
          .accessibilityIdentifier("joinButton")

          Text("Codes look like CEDAR-WREN-4821. Capitalization doesn't matter.")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(24)
      }
    }
  }
}
