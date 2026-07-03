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
            .foregroundStyle(Theme.muted)
            .padding(24)
        }
      }
      .paperBackground()
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
    VStack(spacing: 34) {
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
    .padding(.horizontal, 24)
    .padding(.top, 18)
    .padding(.bottom, 40)
  }

  private func header(_ event: EventInfo) -> some View {
    VStack(spacing: 0) {
      Eyebrow(text: "In loving memory")
        .padding(.bottom, 16)
      if let photoUrl = event.photoUrl, let url = URL(string: photoUrl) {
        AsyncImage(url: url) { image in
          image
            .resizable()
            .scaledToFill()
        } placeholder: {
          Rectangle()
            .fill(Theme.goldSoft)
        }
        .frame(maxWidth: 260, maxHeight: 300)
        .clipShape(RoundedRectangle(cornerRadius: 3))
        .padding(6)
        .background(Theme.paperRaised, in: RoundedRectangle(cornerRadius: 5))
        .overlay(RoundedRectangle(cornerRadius: 5).stroke(Theme.line))
        .shadow(color: Theme.ink.opacity(0.08), radius: 14, y: 6)
        .padding(.bottom, 22)
      }
      Text(event.deceasedName)
        .font(.system(size: 33, weight: .medium, design: .serif))
        .foregroundStyle(Theme.ink)
        .multilineTextAlignment(.center)
        .padding(.bottom, 7)
      let years = SolaceDates.formatYears(bornOn: event.bornOn, diedOn: event.diedOn)
      if !years.isEmpty {
        Text(years)
          .font(.system(size: 17, design: .serif))
          .italic()
          .tracking(2)
          .foregroundStyle(Theme.muted)
          .padding(.bottom, 14)
      }
      Eyebrow(text: event.funeralHomeName, color: Theme.faint)
      OrnamentView()
        .padding(.top, 26)
    }
    .frame(maxWidth: .infinity)
  }

  private func servicesSection(_ services: [Service]) -> some View {
    VStack(spacing: 22) {
      SectionLabel(text: "Services")
      ForEach(Array(services.enumerated()), id: \.element.id) { index, service in
        if index > 0 {
          Rectangle()
            .fill(Theme.line.opacity(0.7))
            .frame(height: 1)
            .padding(.horizontal, 30)
        }
        ServiceEntry(service: service)
      }
    }
  }

  private func obituarySection(_ text: String) -> some View {
    VStack(spacing: 20) {
      SectionLabel(text: "Obituary")
      VStack(alignment: .leading, spacing: 14) {
        ForEach(Array(paragraphs(of: text).enumerated()), id: \.offset) { _, paragraph in
          Text(paragraph)
            .font(.system(size: 16.5, design: .serif))
            .foregroundStyle(Theme.ink)
            .lineSpacing(5)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private func updatesSection(_ updates: [EventUpdate]) -> some View {
    VStack(spacing: 18) {
      SectionLabel(text: "Updates")
      VStack(alignment: .leading, spacing: 0) {
        ForEach(Array(updates.enumerated()), id: \.element.id) { index, update in
          if index > 0 {
            Rectangle()
              .fill(Theme.line.opacity(0.7))
              .frame(height: 1)
              .padding(.vertical, 14)
          }
          VStack(alignment: .leading, spacing: 5) {
            Text(update.title)
              .font(.system(size: 18, weight: .semibold, design: .serif))
              .foregroundStyle(Theme.ink)
            Eyebrow(text: "\(update.authorName) · \(SolaceDates.formatDate(update.createdAt))", color: Theme.faint)
            Text(update.bodyText)
              .font(.system(size: 15.5, design: .serif))
              .foregroundStyle(Theme.ink)
              .lineSpacing(4)
              .padding(.top, 3)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
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

private struct ServiceEntry: View {
  let service: Service

  var body: some View {
    VStack(spacing: 0) {
      if let title = service.title, !title.isEmpty {
        Eyebrow(text: SolaceDates.kindLabel(service.kind))
          .padding(.bottom, 6)
      }
      Text(displayTitle)
        .font(.system(size: 23, weight: .medium, design: .serif))
        .foregroundStyle(Theme.ink)
        .multilineTextAlignment(.center)
        .padding(.bottom, 6)
      let when = SolaceDates.formatDateTime(service.startsAt)
      if !when.isEmpty {
        let until = SolaceDates.formatTime(service.endsAt)
        Text(until.isEmpty ? when : "\(when) – \(until)")
          .font(.system(size: 14.5, weight: .semibold))
          .foregroundStyle(Theme.ink)
          .multilineTextAlignment(.center)
          .padding(.bottom, 10)
      }
      if let venue = service.venueName, !venue.isEmpty {
        Text(venue)
          .font(.system(size: 17, design: .serif))
          .foregroundStyle(Theme.ink)
          .padding(.bottom, 3)
      }
      if let address = service.address, !address.isEmpty {
        if let url = mapsURL(for: address) {
          Link(address, destination: url)
            .font(.footnote)
            .foregroundStyle(Theme.muted)
            .underline(true, color: Theme.line)
            .padding(.bottom, 8)
        } else {
          Text(address)
            .font(.footnote)
            .foregroundStyle(Theme.muted)
            .padding(.bottom, 8)
        }
      }
      if let notes = service.notes, !notes.isEmpty {
        Text(notes)
          .font(.system(size: 15, design: .serif))
          .italic()
          .foregroundStyle(Theme.muted)
          .multilineTextAlignment(.center)
          .padding(.bottom, 8)
      }
      if let livestream = service.livestreamUrl, let url = URL(string: livestream) {
        Link("Watch the livestream", destination: url)
          .font(.footnote)
          .foregroundStyle(Theme.accentDeep)
      }
    }
    .frame(maxWidth: .infinity)
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
