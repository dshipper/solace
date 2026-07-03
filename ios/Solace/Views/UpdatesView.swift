import SwiftUI

struct UpdatesView: View {
  @Environment(AppModel.self) private var model
  @State private var showCompose = false

  var body: some View {
    NavigationStack {
      List {
        if let updates = model.bundle?.updates, !updates.isEmpty {
          ForEach(updates) { update in
            VStack(alignment: .leading, spacing: 5) {
              Text(update.title)
                .font(.system(size: 17, weight: .semibold, design: .serif))
              Eyebrow(
                text: "\(update.authorName) · \(SolaceDates.formatDate(update.createdAt))",
                color: Theme.faint)
              Text(update.bodyText)
                .font(.system(size: 15, design: .serif))
                .lineSpacing(3)
            }
            .padding(.vertical, 4)
            .listRowBackground(Theme.paperRaised)
            .swipeActions {
              // Organizers may delete organizer-authored updates only (A12).
              if update.authorKind == "organizer" {
                Button(role: .destructive) {
                  Task { await model.deleteUpdate(id: update.id) }
                } label: {
                  Text("Delete")
                }
              }
            }
          }
        } else {
          Text("No updates yet. Post one to let people know about schedule changes or the livestream.")
            .font(.subheadline)
            .foregroundStyle(Theme.muted)
            .listRowBackground(Theme.paperRaised)
        }
      }
      .paperBackground()
      .navigationTitle("Updates")
      .toolbar {
        Button {
          showCompose = true
        } label: {
          Label("New update", systemImage: "square.and.pencil")
        }
      }
      .refreshable {
        await model.refresh()
      }
      .sheet(isPresented: $showCompose) {
        ComposeUpdateSheet()
      }
    }
  }
}

private struct ComposeUpdateSheet: View {
  @Environment(AppModel.self) private var model
  @Environment(\.dismiss) private var dismiss

  @State private var title = ""
  @State private var bodyText = ""
  @State private var isPosting = false
  @State private var errorText: String?
  @State private var posted: EventUpdate?

  var body: some View {
    NavigationStack {
      Form {
        if let posted {
          Section {
            Text("Posted. Everyone with the link can see it now.")
            if let shareText = shareText(for: posted) {
              ShareLink(item: shareText) {
                Text("Spread the word by text")
              }
            }
          }
        } else {
          Section {
            TextField("Title", text: $title)
            TextEditor(text: $bodyText)
              .frame(minHeight: 140)
          } footer: {
            Text("Plain words are enough. People will see this on the service page.")
          }
          if let errorText {
            Section {
              Text(errorText)
                .foregroundStyle(.red)
            }
          }
        }
      }
      .navigationTitle("New update")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(posted == nil ? "Cancel" : "Done") {
            dismiss()
          }
        }
        if posted == nil {
          ToolbarItem(placement: .confirmationAction) {
            Button("Post") {
              Task { await post() }
            }
            .disabled(isPosting || title.trimmingCharacters(in: .whitespaces).isEmpty
              || bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
          }
        }
      }
    }
  }

  private func post() async {
    isPosting = true
    errorText = nil
    defer { isPosting = false }
    do {
      posted = try await model.postUpdate(
        title: title.trimmingCharacters(in: .whitespaces),
        bodyText: bodyText.trimmingCharacters(in: .whitespacesAndNewlines))
    } catch let error as APIError {
      errorText = error.message
    } catch {
      errorText = "We couldn't post that update. Please try again."
    }
  }

  private func shareText(for update: EventUpdate) -> String? {
    guard let bundle = model.bundle else { return nil }
    return "An update about \(bundle.event.deceasedName)'s service — \(update.title): \(update.bodyText) Details: \(bundle.event.publicUrl)"
  }
}
