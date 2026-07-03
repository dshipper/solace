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
              .foregroundStyle(.secondary)
          } else {
            ForEach(model.rsvps) { rsvp in
              RsvpRowView(rsvp: rsvp)
            }
          }
        }
      }
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
        .font(.title3)
        .fontWeight(.semibold)
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 10)
    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
  }
}

private struct RsvpRowView: View {
  let rsvp: RsvpRow

  private let sage = Color(red: 90 / 255, green: 107 / 255, blue: 93 / 255)

  var body: some View {
    HStack(alignment: .top) {
      VStack(alignment: .leading, spacing: 3) {
        HStack(spacing: 6) {
          Text(rsvp.name)
            .font(.headline)
          if rsvp.guestCount > 0 {
            Text("+\(rsvp.guestCount)")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }
        if let note = rsvp.note, !note.isEmpty {
          Text(note)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        Text(SolaceDates.formatDate(rsvp.createdAt))
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
      Spacer()
      Text(rsvp.attending == "yes" ? "Attending" : "Declined")
        .font(.subheadline)
        .foregroundStyle(rsvp.attending == "yes" ? sage : .secondary)
    }
    .padding(.vertical, 2)
  }
}
