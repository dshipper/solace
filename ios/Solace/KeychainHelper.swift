import Foundation
import Security

// Tiny string store on the Security framework. On the simulator, if the
// keychain misbehaves (headless test runs), we fall back to UserDefaults —
// the keychain is always tried first.
enum KeychainHelper {
  static let service = "to.every.solace"

  private static func baseQuery(account: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  private static func fallbackKey(_ account: String) -> String {
    "keychain-fallback:\(account)"
  }

  static func read(account: String) -> String? {
    var query = baseQuery(account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data,
       let value = String(data: data, encoding: .utf8) {
      return value
    }
    #if targetEnvironment(simulator)
    return UserDefaults.standard.string(forKey: fallbackKey(account))
    #else
    return nil
    #endif
  }

  @discardableResult
  static func write(_ value: String, account: String) -> Bool {
    SecItemDelete(baseQuery(account: account) as CFDictionary)
    var attributes = baseQuery(account: account)
    attributes[kSecValueData as String] = Data(value.utf8)
    let status = SecItemAdd(attributes as CFDictionary, nil)
    if status == errSecSuccess {
      #if targetEnvironment(simulator)
      UserDefaults.standard.removeObject(forKey: fallbackKey(account))
      #endif
      return true
    }
    #if targetEnvironment(simulator)
    UserDefaults.standard.set(value, forKey: fallbackKey(account))
    return true
    #else
    return false
    #endif
  }

  static func delete(account: String) {
    SecItemDelete(baseQuery(account: account) as CFDictionary)
    #if targetEnvironment(simulator)
    UserDefaults.standard.removeObject(forKey: fallbackKey(account))
    #endif
  }
}
