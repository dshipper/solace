import SwiftUI

struct RSVPsView: View {
  @Environment(AppModel.self) private var model
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    NavigationStack {
      List {
        if let summary = model.bundle?.rsvpSummary {
          Section {
            summaryChips(summary)
              .listRowBackground(Color.clear)
              .listRowInsets(EdgeInsets())
          }
        }
        Section {
          if model.rsvps.isEmpty {
            Text("No replies yet. When people respond, you'll see them here.")
              .font(.subheadline)
              .foregroundStyle(Theme.muted)
          } else {
            ForEach(model.rsvps) { rsvp in
              RsvpRowView(rsvp: rsvp)
            }
          }
        }
        .listRowBackground(Theme.paperRaised)
      }
      .paperBackground()
      .navigationTitle("RSVPs")
      .refreshable {
        await model.refresh()
        await model.loadRsvps()
      }
      .task {
        await model.loadRsvps()
      }
      .onChange(of: scenePhase) { _, phase in
        if phase == .active {
          Task {
            await model.refresh()
            await model.loadRsvps()
          }
        }
      }
    }
  }

  private func summaryChips(_ summary: RsvpSummary) -> some View {
    HStack(spacing: 10) {
      chip(value: summary.totalGuests, label: "attending")
      chip(value: summary.declinedCount, label: "declined")
      chip(value: summary.responseCount, label: "responses")
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 4)
  }

  private func chip(value: Int, label: String) -> some View {
    VStack(spacing: 2) {
      Text("\(value)")
        .font(.system(size: 22, weight: .medium, design: .serif))
        .foregroundStyle(Theme.accentDeep)
      Eyebrow(text: label, color: Theme.faint)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 12)
    .background(Theme.paperRaised, in: RoundedRectangle(cornerRadius: 10))
    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line))
  }
}

private struct RsvpRowView: View {
  let rsvp: RsvpRow

  var body: some View {
    HStack(alignment: .top) {
      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 6) {
          Text(rsvp.name)
            .font(.system(size: 17, weight: .semibold, design: .serif))
          if rsvp.guestCount > 0 {
            Text("+\(rsvp.guestCount)")
              .font(.subheadline)
              .foregroundStyle(Theme.muted)
          }
        }
        if let note = rsvp.note, !note.isEmpty {
          Text(note)
            .font(.system(size: 15, design: .serif))
            .italic()
            .foregroundStyle(Theme.muted)
        }
        Text(SolaceDates.formatDate(rsvp.createdAt))
          .font(.caption)
          .foregroundStyle(Theme.faint)
      }
      Spacer()
      Text(rsvp.attending == "yes" ? "Attending" : "Declined")
        .font(.subheadline)
        .foregroundStyle(rsvp.attending == "yes" ? Theme.accentDeep : Theme.muted)
    }
    .padding(.vertical, 2)
  }
}
