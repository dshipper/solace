import XCTest
@testable import Solace

// Fixture JSON copied from the SPEC HTTP contract. Decoding uses a plain
// JSONDecoder with no date strategy — all date-ish fields stay strings.
final class APIDecodingTests: XCTestCase {
  private let joinFixture = """
  {
    "token": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "organizer": {
      "id": "org1",
      "name": "Ruth Delgado",
      "marketingOptIn": false,
      "email": null,
      "phone": null
    },
    "bundle": {
      "event": {
        "id": "evt1",
        "slug": "abcdefghij",
        "publicUrl": "http://127.0.0.1:4863/e/abcdefghij",
        "familyCode": "CEDAR-WREN-4821",
        "deceasedName": "Miriam Delgado",
        "bornOn": "1941-03-08",
        "diedOn": "2026-06-25",
        "photoUrl": null,
        "obituaryText": "Miriam loved her garden.\\n\\nShe is survived by her daughter.",
        "funeralHomeName": "Hollis & Sons Funeral Home",
        "status": "published"
      },
      "services": [
        {
          "id": "svc1",
          "eventId": "evt1",
          "kind": "funeral",
          "title": null,
          "startsAt": "2026-07-11T11:00",
          "endsAt": "2026-07-11T12:00",
          "venueName": "St. Anne's Chapel",
          "address": "12 Chapel Rd, Portland, ME",
          "notes": null,
          "livestreamUrl": null,
          "sortOrder": 0
        }
      ],
      "updates": [
        {
          "id": "upd1",
          "authorKind": "organizer",
          "authorName": "Ruth Delgado",
          "title": "Reception moved",
          "bodyText": "The reception now starts at one.",
          "createdAt": "2026-07-02T14:03:00.000Z"
        }
      ],
      "rsvpSummary": {
        "responseCount": 3,
        "attendingCount": 2,
        "totalGuests": 5,
        "declinedCount": 1
      },
      "inviteTemplate": {
        "message": "You're invited to a service in memory of Miriam Delgado. Funeral Service on Saturday, July 11, 2026 at 11:00 AM at St. Anne's Chapel. Details and RSVP: http://127.0.0.1:4863/e/abcdefghij",
        "url": "http://127.0.0.1:4863/e/abcdefghij"
      }
    }
  }
  """

  // Per amendment A3 the organizer RSVP payload is PII-stripped: no email, no phone.
  private let rsvpsFixture = """
  {
    "rsvps": [
      {
        "id": "r1",
        "name": "June Park",
        "attending": "yes",
        "guestCount": 2,
        "note": "We will bring flowers.",
        "createdAt": "2026-07-02T14:03:00.000Z"
      },
      {
        "id": "r2",
        "name": "Sam Ortiz",
        "attending": "no",
        "guestCount": 0,
        "note": null,
        "createdAt": "2026-07-02T15:00:00.000Z"
      }
    ]
  }
  """

  private let errorFixture = """
  {
    "error": {
      "code": "unknown_code",
      "message": "That code didn't match a service. Please check it with the funeral home."
    }
  }
  """

  func testDecodesJoinResponse() throws {
    let response = try JSONDecoder().decode(JoinResponse.self, from: Data(joinFixture.utf8))
    XCTAssertEqual(response.organizer.name, "Ruth Delgado")
    XCTAssertFalse(response.organizer.marketingOptIn)
    XCTAssertEqual(response.bundle.event.deceasedName, "Miriam Delgado")
    XCTAssertEqual(response.bundle.event.familyCode, "CEDAR-WREN-4821")
    XCTAssertEqual(response.bundle.event.bornOn, "1941-03-08")
    XCTAssertEqual(response.bundle.services.count, 1)
    XCTAssertEqual(response.bundle.services[0].startsAt, "2026-07-11T11:00")
    XCTAssertEqual(response.bundle.services[0].kind, "funeral")
    XCTAssertEqual(response.bundle.updates[0].authorKind, "organizer")
    XCTAssertEqual(response.bundle.rsvpSummary.totalGuests, 5)
    XCTAssertTrue(response.bundle.inviteTemplate.message.contains("Saturday, July 11, 2026 at 11:00 AM"))
  }

  func testDecodedServiceDatesStayVerbatimStrings() throws {
    let response = try JSONDecoder().decode(JoinResponse.self, from: Data(joinFixture.utf8))
    // The wall-clock string must survive untouched; formatting happens at render time.
    let startsAt = response.bundle.services[0].startsAt
    XCTAssertEqual(startsAt, "2026-07-11T11:00")
    XCTAssertEqual(SolaceDates.formatDateTime(startsAt), "Saturday, July 11, 2026 at 11:00 AM")
  }

  func testDecodesEventBundleAlone() throws {
    let join = try JSONDecoder().decode(JoinResponse.self, from: Data(joinFixture.utf8))
    let encoded = try JSONEncoder().encode(join.bundle)
    let decoded = try JSONDecoder().decode(EventBundle.self, from: encoded)
    XCTAssertEqual(decoded, join.bundle)
  }

  func testDecodesRsvpsWithoutContactInfo() throws {
    struct Envelope: Codable { let rsvps: [RsvpRow] }
    let envelope = try JSONDecoder().decode(Envelope.self, from: Data(rsvpsFixture.utf8))
    XCTAssertEqual(envelope.rsvps.count, 2)
    XCTAssertEqual(envelope.rsvps[0].name, "June Park")
    XCTAssertEqual(envelope.rsvps[0].attending, "yes")
    XCTAssertEqual(envelope.rsvps[0].guestCount, 2)
    XCTAssertEqual(envelope.rsvps[1].note, nil)
    XCTAssertEqual(envelope.rsvps[1].attending, "no")

    // The model has no email or phone fields at all; re-encoding must not
    // invent contact info.
    let reencoded = String(data: try JSONEncoder().encode(envelope.rsvps[0]), encoding: .utf8) ?? ""
    XCTAssertFalse(reencoded.contains("email"))
    XCTAssertFalse(reencoded.contains("phone"))
  }

  func testDecodesErrorEnvelope() throws {
    struct Envelope: Codable { let error: APIError }
    let envelope = try JSONDecoder().decode(Envelope.self, from: Data(errorFixture.utf8))
    XCTAssertEqual(envelope.error.code, "unknown_code")
    XCTAssertTrue(envelope.error.message.contains("didn't match a service"))
  }
}
