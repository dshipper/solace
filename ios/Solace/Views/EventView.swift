import SwiftUI

struct EventView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    NavigationStack {
      ScrollView {
        if let bundle = model.bundle {
          content(bundle)
        } else if model.isLoading {
          ProgressView()
            .padding(.top, 80)
        } else if let message = model.errorMessage {
          Text(message)
            .foregroundStyle(.secondary)
            .padding(24)
        }
      }
      .navigationTitle("Service")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        if let bundle = model.bundle, let url = URL(string: bundle.event.publicUrl) {
          ShareLink(item: url)
        }
      }
      .refreshable {
        await model.refresh()
      }
    }
  }

  private func content(_ bundle: EventBundle) -> some View {
    VStack(alignment: .leading, spacing: 28) {
      header(bundle.event)
      if !bundle.services.isEmpty {
        servicesSection(bundle.services)
      }
      if !bundle.event.obituaryText.isEmpty {
        obituarySection(bundle.event.obituaryText)
      }
      if !bundle.updates.isEmpty {
        updatesSection(bundle.updates)
      }
    }
    .padding(20)
  }

  private func header(_ event: EventInfo) -> some View {
    VStack(spacing: 12) {
      if let photoUrl = event.photoUrl, let url = URL(string: photoUrl) {
        AsyncImage(url: url) { image in
          image
            .resizable()
            .scaledToFill()
        } placeholder: {
          Rectangle()
            .fill(Color(.secondarySystemBackground))
        }
        .frame(height: 240)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 14))
      }
      Text(event.deceasedName)
        .font(.title)
        .fontWeight(.semibold)
        .fontDesign(.serif)
        .multilineTextAlignment(.center)
      let years = SolaceDates.formatYears(bornOn: event.bornOn, diedOn: event.diedOn)
      if !years.isEmpty {
        Text(years)
          .font(.title3)
          .foregroundStyle(.secondary)
      }
      Text(event.funeralHomeName)
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
  }

  private func servicesSection(_ services: [Service]) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Services")
        .font(.headline)
      ForEach(services) { service in
        ServiceCard(service: service)
      }
    }
  }

  private func obituarySection(_ text: String) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Obituary")
        .font(.headline)
      ForEach(Array(paragraphs(of: text).enumerated()), id: \.offset) { _, paragraph in
        Text(paragraph)
          .fontDesign(.serif)
      }
    }
  }

  private func updatesSection(_ updates: [EventUpdate]) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Updates")
        .font(.headline)
      ForEach(updates) { update in
        VStack(alignment: .leading, spacing: 4) {
          Text(update.title)
            .font(.subheadline)
            .fontWeight(.semibold)
          Text(update.bodyText)
            .font(.subheadline)
          Text("\(update.authorName) · \(SolaceDates.formatDate(update.createdAt))")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
      }
    }
  }

  private func paragraphs(of text: String) -> [String] {
    text
      .replacingOccurrences(of: "\r\n", with: "\n")
      .components(separatedBy: "\n\n")
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
  }
}

private struct ServiceCard: View {
  let service: Service

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(displayTitle)
        .font(.subheadline)
        .fontWeight(.semibold)
      let when = SolaceDates.formatDateTime(service.startsAt)
      if !when.isEmpty {
        Text(when)
          .font(.subheadline)
      }
      let until = SolaceDates.formatTime(service.endsAt)
      if !until.isEmpty {
        Text("Until \(until)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      if let venue = service.venueName, !venue.isEmpty {
        Text(venue)
          .font(.subheadline)
      }
      if let address = service.address, !address.isEmpty {
        if let url = mapsURL(for: address) {
          Link(address, destination: url)
            .font(.caption)
        } else {
          Text(address)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      if let notes = service.notes, !notes.isEmpty {
        Text(notes)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      if let livestream = service.livestreamUrl, let url = URL(string: livestream) {
        Link("Watch the livestream", destination: url)
          .font(.caption)
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
  }

  private var displayTitle: String {
    if let title = service.title, !title.isEmpty {
      return title
    }
    return SolaceDates.kindLabel(service.kind)
  }

  private func mapsURL(for address: String) -> URL? {
    let unreserved = CharacterSet(
      charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
    guard let encoded = address.addingPercentEncoding(withAllowedCharacters: unreserved) else {
      return nil
    }
    return URL(string: "https://maps.apple.com/?q=\(encoded)")
  }
}
