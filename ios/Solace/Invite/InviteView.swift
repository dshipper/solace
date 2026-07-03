import SwiftUI

struct InviteView: View {
  @Environment(AppModel.self) private var model

  @State private var selected: [InviteContact] = []
  @State private var showPicker = false
  @State private var showBulkConfirm = false
  @State private var bulk = BulkAddModel()
  @State private var bulkNotice: String?
  @State private var queue = SendQueue()
  @State private var presenter: SendPresenter?
  @State private var groupMode = false
  @State private var showGroupWarning = false
  @State private var lastRunSummary: String?

  private var smsCount: Int {
    selected.filter { $0.channel == .sms }.count
  }

  private var reachableCount: Int {
    selected.filter { $0.channel != .unreachable }.count
  }

  var body: some View {
    NavigationStack {
      List {
        if queue.isSending {
          sendingSection
        } else {
          addSection
          if !selected.isEmpty {
            selectedSection
            sendSection
          }
          if let lastRunSummary {
            Section {
              Text(lastRunSummary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
          }
          shareSection
          logSection
        }
      }
      .navigationTitle("Invite")
      .sheet(isPresented: $showPicker) {
        ContactsPicker { picked in
          merge(picked)
          lastRunSummary = nil
        }
        .ignoresSafeArea()
      }
      .sheet(isPresented: $showBulkConfirm) {
        BulkConfirmSheet {
          showBulkConfirm = false
          Task { await runBulkAdd() }
        }
        .presentationDetents([.medium])
      }
      .alert("Send as a group?", isPresented: $showGroupWarning) {
        Button("Send as a group") { groupMode = true }
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("Everyone in the group will see each other's numbers and replies.")
      }
      .onChange(of: queue.phase) { _, phase in
        if phase == .finished {
          finishRun()
        }
      }
    }
  }

  private var addSection: some View {
    Section {
      Button {
        showPicker = true
      } label: {
        Label("Choose from contacts", systemImage: "person.crop.circle.badge.plus")
      }
      Button {
        showBulkConfirm = true
      } label: {
        Label("Add many at once", systemImage: "person.3")
      }
      if let bulkNotice {
        Text(bulkNotice)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    } header: {
      Text("Invite people")
    } footer: {
      Text("You choose who to invite and send each message yourself. Contacts never leave your phone.")
    }
  }

  private var selectedSection: some View {
    Section {
      ForEach(selected) { contact in
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            Text(contact.name)
            if contact.channel == .unreachable {
              Text("No phone or email — we can't reach them from here")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
          Spacer()
          ChannelBadge(channel: contact.channel)
        }
      }
      .onDelete { offsets in
        selected.remove(atOffsets: offsets)
      }
      if smsCount > 1 && smsCount <= SendQueue.smsGroupLimit {
        Toggle("Send as one group message", isOn: groupModeBinding)
      }
    } header: {
      Text("Ready to invite · \(selected.count)")
    } footer: {
      Text("Swipe to remove anyone before sending. Messages go out one at a time, from you.")
    }
  }

  private var sendSection: some View {
    Section {
      Button {
        startSending()
      } label: {
        Text("Send invitations (\(reachableCount))")
          .frame(maxWidth: .infinity)
          .fontWeight(.semibold)
      }
      .disabled(reachableCount == 0)
    }
  }

  private var sendingSection: some View {
    Section {
      HStack(spacing: 12) {
        ProgressView()
        Text(queue.progressText)
      }
      Button("Stop sending", role: .destructive) {
        presenter?.stop()
      }
    } footer: {
      Text("Each message opens for you to review and send.")
    }
  }

  private var shareSection: some View {
    Section {
      if let bundle = model.bundle, let url = URL(string: bundle.inviteTemplate.url) {
        ShareLink(item: url) {
          Text("Share the link another way")
        }
      }
    }
  }

  private var logSection: some View {
    Section {
      if model.inviteLog.entries.isEmpty {
        Text("No invitations yet. When you send some, they'll be listed here.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      } else {
        ForEach(Array(model.inviteLog.entries.suffix(30).reversed())) { entry in
          HStack {
            VStack(alignment: .leading, spacing: 2) {
              Text(entry.contactName)
              Text(SolaceDates.formatDate(entry.date))
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Text(statusLabel(entry.status))
              .font(.caption)
              .foregroundStyle(entry.status == .sent ? .secondary : Color.orange)
          }
        }
        if !model.inviteLog.unsentEntries.isEmpty {
          Button("Resend to anyone not yet sent") {
            merge(model.inviteLog.resendContacts())
            lastRunSummary = nil
          }
        }
      }
    } header: {
      Text("Invited · \(model.inviteLog.sentCount)")
    } footer: {
      Text("Contacts never leave your phone.")
    }
  }

  private var groupModeBinding: Binding<Bool> {
    Binding(
      get: { groupMode },
      set: { newValue in
        if newValue {
          showGroupWarning = true
        } else {
          groupMode = false
        }
      })
  }

  private func merge(_ newContacts: [InviteContact]) {
    var seen = Set(selected.map(\.id))
    for contact in newContacts where !seen.contains(contact.id) {
      selected.append(contact)
      seen.insert(contact.id)
    }
  }

  private func runBulkAdd() async {
    let added = await bulk.loadAll()
    merge(added)
    switch bulk.state {
    case .denied:
      bulkNotice = "Contacts access is turned off for Solace. You can still choose people with the contact picker."
    case .failed(let message):
      bulkNotice = message
    case .loaded:
      bulkNotice = bulk.resultTitle
    default:
      bulkNotice = nil
    }
  }

  private func startSending() {
    guard let bundle = model.bundle else { return }
    queue.resetIfFinished()
    let sendPresenter = SendPresenter(
      queue: queue,
      log: model.inviteLog,
      message: bundle.inviteTemplate.message,
      subject: "In memory of \(bundle.event.deceasedName)")
    presenter = sendPresenter
    sendPresenter.start(contacts: selected, groupSms: groupMode)
  }

  private func finishRun() {
    let sent = queue.sentCount
    let skipped = queue.skippedCount
    if sent == 0 && skipped == 0 {
      lastRunSummary = nil
    } else if sent == 0 {
      lastRunSummary = "No invitations were sent."
    } else {
      var summary = sent == 1 ? "Sent 1 invitation." : "Sent \(sent) invitations."
      if skipped > 0 {
        summary += " \(skipped) not sent — you can resend below."
      }
      lastRunSummary = summary
    }
    selected = []
    groupMode = false
    presenter = nil
    queue.resetIfFinished()
  }

  private func statusLabel(_ status: SendStatus) -> String {
    switch status {
    case .sent: return "Sent"
    case .cancelled: return "Not sent"
    case .unreachable: return "No way to reach"
    case .pending: return "Waiting"
    }
  }
}

private struct ChannelBadge: View {
  let channel: InviteChannel

  var body: some View {
    switch channel {
    case .sms:
      badge("Text")
    case .email:
      badge("Email")
    case .unreachable:
      badge("No way to reach", tint: .orange)
    }
  }

  private func badge(_ label: String, tint: Color = .secondary) -> some View {
    Text(label)
      .font(.caption)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(tint.opacity(0.15), in: Capsule())
      .foregroundStyle(tint)
  }
}

private struct BulkConfirmSheet: View {
  @Environment(\.dismiss) private var dismiss
  let onConfirm: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("Add many at once")
        .font(.title3)
        .fontWeight(.semibold)
      Text("Solace will read your contacts on this phone to build a list you can review. Nothing is sent until you send it yourself, one message at a time.")
      Text("Contacts are never uploaded. They stay on your phone.")
        .foregroundStyle(.secondary)
      Spacer()
      Button {
        onConfirm()
      } label: {
        Text("Add my contacts")
          .frame(maxWidth: .infinity)
          .fontWeight(.semibold)
      }
      .buttonStyle(.borderedProminent)
      Button("Not now") {
        dismiss()
      }
      .frame(maxWidth: .infinity)
    }
    .padding(24)
  }
}
