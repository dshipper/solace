import UIKit
import MessageUI

// Presents one compose sheet at a time, driven by SendQueue. The next sheet is
// only presented from the previous controller's didFinish -> dismiss
// completion (A13). Every attempt is recorded in the invite log.
@MainActor
final class SendPresenter: NSObject {
  let queue: SendQueue
  let log: InviteLog
  let message: String
  let subject: String

  init(queue: SendQueue, log: InviteLog, message: String, subject: String) {
    self.queue = queue
    self.log = log
    self.message = message
    self.subject = subject
  }

  func start(contacts: [InviteContact], groupSms: Bool) {
    queue.begin(contacts: contacts, groupSms: groupSms)
    for contact in contacts where contact.channel == .unreachable {
      log.record(contact: contact, status: .unreachable)
    }
    presentNext()
  }

  func stop() {
    let remaining = queue.pendingContacts
    queue.stop()
    for contact in remaining {
      log.record(contact: contact, status: .cancelled)
    }
  }

  private func presentNext() {
    guard let step = queue.currentStep else { return }
    switch step {
    case .sms(let contact):
      presentSms(recipients: [contact])
    case .smsGroup(let contacts):
      presentSms(recipients: contacts)
    case .email(let contacts):
      presentEmail(contacts: contacts)
    }
  }

  private func presentSms(recipients: [InviteContact]) {
    guard MFMessageComposeViewController.canSendText() else {
      // Simulator, or a device without Messages: hand the text to the share
      // sheet so the user can still get it out.
      presentShareSheet()
      return
    }
    let composer = MFMessageComposeViewController()
    composer.messageComposeDelegate = self
    composer.recipients = recipients.compactMap(\.phoneNumber)
    composer.body = message
    present(composer)
  }

  private func presentEmail(contacts: [InviteContact]) {
    let emails = contacts.compactMap(\.email)
    if MFMailComposeViewController.canSendMail() {
      let composer = MFMailComposeViewController()
      composer.mailComposeDelegate = self
      composer.setBccRecipients(emails)
      composer.setSubject(subject)
      composer.setMessageBody(message, isHTML: false)
      present(composer)
      return
    }
    if let url = SendQueue.mailtoURL(bcc: emails, subject: subject, body: message) {
      UIApplication.shared.open(url) { [weak self] success in
        Task { @MainActor in
          guard let self else { return }
          if success {
            self.completeCurrentStep(.sent)
          } else {
            self.presentShareSheet()
          }
        }
      }
      return
    }
    presentShareSheet()
  }

  private func presentShareSheet() {
    let sheet = UIActivityViewController(activityItems: [message], applicationActivities: nil)
    sheet.completionWithItemsHandler = { [weak self] _, completed, _, _ in
      Task { @MainActor in
        self?.completeCurrentStep(completed ? .sent : .cancelled)
      }
    }
    present(sheet)
  }

  private func completeCurrentStep(_ status: SendStatus) {
    guard let step = queue.currentStep else { return }
    for contact in step.contacts {
      log.record(contact: contact, status: status)
    }
    queue.finishCurrentStep(with: status)
    presentNext()
  }

  private func present(_ controller: UIViewController) {
    guard let top = Self.topViewController() else {
      completeCurrentStep(.cancelled)
      return
    }
    if let popover = controller.popoverPresentationController {
      popover.sourceView = top.view
      popover.sourceRect = CGRect(
        x: top.view.bounds.midX, y: top.view.bounds.midY, width: 1, height: 1)
    }
    top.present(controller, animated: true)
  }

  static func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first { $0.isKeyWindow }
      ?? scenes.first?.windows.first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

extension SendPresenter: MFMessageComposeViewControllerDelegate {
  func messageComposeViewController(
    _ controller: MFMessageComposeViewController,
    didFinishWith result: MessageComposeResult
  ) {
    let status: SendStatus = result == .sent ? .sent : .cancelled
    controller.dismiss(animated: true) { [weak self] in
      Task { @MainActor in
        self?.completeCurrentStep(status)
      }
    }
  }
}

extension SendPresenter: MFMailComposeViewControllerDelegate {
  func mailComposeController(
    _ controller: MFMailComposeViewController,
    didFinishWith result: MFMailComposeResult,
    error: Error?
  ) {
    let status: SendStatus = (result == .sent || result == .saved) ? .sent : .cancelled
    controller.dismiss(animated: true) { [weak self] in
      Task { @MainActor in
        self?.completeCurrentStep(status)
      }
    }
  }
}
