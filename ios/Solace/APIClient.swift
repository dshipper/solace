import Foundation

struct APIError: Error, Codable, Equatable, LocalizedError {
  let code: String
  let message: String

  var errorDescription: String? { message }
}

struct APIClient: Sendable {
  let baseURL: URL
  let token: String?

  init(baseURL: URL, token: String?) {
    self.baseURL = baseURL
    self.token = token
  }

  private struct ErrorEnvelope: Codable { let error: APIError }
  private struct RsvpsEnvelope: Codable { let rsvps: [RsvpRow] }
  private struct UpdateEnvelope: Codable { let update: EventUpdate }
  private struct OrganizerEnvelope: Codable { let organizer: Organizer }

  private struct JoinBody: Encodable {
    let familyCode: String
    let name: String
  }

  private struct UpdateBody: Encodable {
    let title: String
    let bodyText: String
  }

  private struct OptInBody: Encodable {
    let marketingOptIn: Bool
    let email: String?
    let phone: String?
  }

  func join(familyCode: String, name: String) async throws -> JoinResponse {
    try await send("POST", "/api/app/join", body: JoinBody(familyCode: familyCode, name: name))
  }

  func getEvent() async throws -> EventBundle {
    try await send("GET", "/api/app/event")
  }

  func getRsvps() async throws -> [RsvpRow] {
    let envelope: RsvpsEnvelope = try await send("GET", "/api/app/rsvps")
    return envelope.rsvps
  }

  func postUpdate(title: String, bodyText: String) async throws -> EventUpdate {
    let envelope: UpdateEnvelope = try await send(
      "POST", "/api/app/updates", body: UpdateBody(title: title, bodyText: bodyText))
    return envelope.update
  }

  func deleteUpdate(id: String) async throws {
    _ = try await perform(makeRequest("DELETE", "/api/app/updates/\(id)", bodyData: nil))
  }

  func setOptIn(marketingOptIn: Bool, email: String?, phone: String?) async throws -> Organizer {
    let envelope: OrganizerEnvelope = try await send(
      "POST", "/api/app/me/optin",
      body: OptInBody(marketingOptIn: marketingOptIn, email: email, phone: phone))
    return envelope.organizer
  }

  func deleteMe() async throws {
    _ = try await perform(makeRequest("DELETE", "/api/app/me", bodyData: nil))
  }

  private func send<T: Decodable>(_ method: String, _ path: String) async throws -> T {
    try await decode(perform(makeRequest(method, path, bodyData: nil)))
  }

  private func send<T: Decodable, B: Encodable>(_ method: String, _ path: String, body: B) async throws -> T {
    let bodyData: Data
    do {
      bodyData = try JSONEncoder().encode(body)
    } catch {
      throw APIError(code: "bad_request", message: "We couldn't prepare that request.")
    }
    return try await decode(perform(makeRequest(method, path, bodyData: bodyData)))
  }

  private func decode<T: Decodable>(_ data: Data) throws -> T {
    do {
      return try JSONDecoder().decode(T.self, from: data)
    } catch {
      throw APIError(code: "bad_response", message: "The server sent something unexpected.")
    }
  }

  private func makeRequest(_ method: String, _ path: String, bodyData: Data?) throws -> URLRequest {
    guard let url = URL(string: path, relativeTo: baseURL) else {
      throw APIError(code: "bad_url", message: "Invalid server address.")
    }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let token {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
    if let bodyData {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = bodyData
    }
    return request
  }

  private func perform(_ request: @autoclosure () throws -> URLRequest) async throws -> Data {
    let prepared = try request()
    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await URLSession.shared.data(for: prepared)
    } catch {
      throw APIError(code: "network", message: "We couldn't reach the server.")
    }
    guard let http = response as? HTTPURLResponse else {
      throw APIError(code: "network", message: "We couldn't reach the server.")
    }
    guard (200..<300).contains(http.statusCode) else {
      if let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data) {
        throw envelope.error
      }
      throw APIError(code: "http_\(http.statusCode)", message: "The server couldn't handle that request.")
    }
    return data
  }
}
