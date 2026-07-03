import SwiftUI

struct SettingsView: View {
  @Environment(AppModel.self) private var model

  @State private var marketingOn = false
  @State private var email = ""
  @State private var saveNotice: String?
  @State private var errorText: String?
  @State private var isSaving = false
  @State private var showLeaveConfirm = false
  @State private var isLeaving = false
  @State private var synced = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          LabeledContent("Name", value: model.session?.organizerName ?? "")
        } header: {
          Eyebrow(text: "You")
        }
        .listRowBackground(Theme.paperRaised)

        if let bundle = model.bundle {
          Section {
            LabeledContent("Funeral home", value: bundle.event.funeralHomeName)
            LabeledContent("Family code") {
              Text(bundle.event.familyCode)
                .font(.system(size: 15, weight: .medium, design: .serif))
                .tracking(1)
                .foregroundStyle(Theme.accentDeep)
            }
          } header: {
            Eyebrow(text: "Service")
          }
          .listRowBackground(Theme.paperRaised)
        }

        Section {
          Toggle(isOn: marketingBinding) {
            Text(marketingCopy)
          }
          if marketingOn {
            TextField("Your email", text: $email)
              .keyboardType(.emailAddress)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()
          }
          if hasChanges {
            Button(isSaving ? "Saving" : "Save") {
              Task { await save() }
            }
            .disabled(isSaving)
          }
          if let saveNotice {
            Text(saveNotice)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          if let errorText {
            Text(errorText)
              .font(.caption)
              .foregroundStyle(.red)
          }
        } header: {
          Eyebrow(text: "Email updates")
        } footer: {
          Text("Off unless you turn it on. You can change your mind anytime.")
        }
        .listRowBackground(Theme.paperRaised)

        Section {
          Button("Leave event", role: .destructive) {
            showLeaveConfirm = true
          }
          .disabled(isLeaving)
        } footer: {
          Text("This removes your access on this phone and deletes your organizer record. The service page and RSVPs are not affected.")
        }
        .listRowBackground(Theme.paperRaised)
      }
      .paperBackground()
      .navigationTitle("More")
      .confirmationDialog(
        "Leave this event?",
        isPresented: $showLeaveConfirm,
        titleVisibility: .visible
      ) {
        Button("Leave event", role: .destructive) {
          Task {
            isLeaving = true
            await model.leave()
            isLeaving = false
          }
        }
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("You can rejoin later with the family code.")
      }
      .onAppear {
        if !synced {
          marketingOn = model.organizer?.marketingOptIn ?? false
          email = model.organizer?.email ?? ""
          synced = true
        }
      }
    }
  }

  // A9 (binding): this exact wording is what consentVersion attests to.
  private var marketingCopy: String {
    let home = model.bundle?.event.funeralHomeName ?? "the funeral home"
    return "I'm 16 or older and would like occasional emails from \(home) — grief resources and news about future services."
  }

  private var hasChanges: Bool {
    let savedOn = model.organizer?.marketingOptIn ?? false
    let savedEmail = model.organizer?.email ?? ""
    return marketingOn != savedOn || (marketingOn && email != savedEmail)
  }

  private var marketingBinding: Binding<Bool> {
    Binding(
      get: { marketingOn },
      set: { newValue in
        marketingOn = newValue
        saveNotice = nil
        errorText = nil
      })
  }

  private func save() async {
    isSaving = true
    errorText = nil
    saveNotice = nil
    defer { isSaving = false }
    do {
      let trimmed = email.trimmingCharacters(in: .whitespaces)
      try await model.setOptIn(
        marketingOptIn: marketingOn,
        email: marketingOn && !trimmed.isEmpty ? trimmed : nil,
        phone: nil)
      saveNotice = "Saved."
    } catch let error as APIError {
      errorText = error.message
    } catch {
      errorText = "We couldn't save that. Please try again."
    }
  }
}
