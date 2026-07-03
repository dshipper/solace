import SwiftUI
import Contacts
import ContactsUI

// The permissionless multi-select contact picker: the system shows the UI and
// the app only receives the contacts the user explicitly picked.
struct ContactsPicker: UIViewControllerRepresentable {
  var onPicked: ([InviteContact]) -> Void

  func makeUIViewController(context: Context) -> CNContactPickerViewController {
    let picker = CNContactPickerViewController()
    picker.delegate = context.coordinator
    return picker
  }

  func updateUIViewController(_ uiViewController: CNContactPickerViewController, context: Context) {}

  func makeCoordinator() -> Coordinator {
    Coordinator(onPicked: onPicked)
  }

  final class Coordinator: NSObject, CNContactPickerDelegate {
    let onPicked: ([InviteContact]) -> Void

    init(onPicked: @escaping ([InviteContact]) -> Void) {
      self.onPicked = onPicked
    }

    func contactPicker(_ picker: CNContactPickerViewController, didSelect contacts: [CNContact]) {
      onPicked(contacts.map { InviteContact.from($0) })
    }
  }
}

extension InviteContact {
  static func from(_ contact: CNContact) -> InviteContact {
    var name = CNContactFormatter.string(from: contact, style: .fullName) ?? ""
    if name.isEmpty {
      name = contact.organizationName
    }
    if name.isEmpty {
      name = "Unnamed contact"
    }
    let phones = contact.phoneNumbers.map { (label: $0.label, value: $0.value.stringValue) }
    let emails = contact.emailAddresses.map { String($0.value) }
    return make(id: contact.identifier, name: name, phones: phones, emails: emails)
  }
}
