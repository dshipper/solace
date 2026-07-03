# Solace

A funeral home gives grieving families a dignified way to invite people to a service and manage RSVPs.

- **Staff** use a password-protected web dashboard to create the event (obituary, photo, service schedule), hand the family a two-word **family code**, watch RSVPs come in, and export the opted-in communication list.
- **Family organizers** use the **iOS app**: join with the family code, invite people straight from their contacts (messages are sent from *their* phone, by *them*), see who's coming, and post updates.
- **Invitees** need nothing but the link they were texted: an obituary page on the web with the schedule and an RSVP form.

## The privacy stance (load-bearing, not decorative)

- **Contacts never leave the phone.** The backend has no endpoint that accepts address-book data. Contacts are used on-device only to address messages the sender personally sends (one compose sheet per recipient, so invitees never see each other's numbers).
- **Consent is per-person and affirmative.** The RSVP form's funeral-home communications box is unchecked by default, versioned, and recorded with timestamp + source. The event-updates box is event-scoped.
- **The marketing export is email-only** (texting would require TCPA-grade consent this product doesn't collect) and contains only people who personally opted in. Suppressions (from `/unsubscribe` or a staff action) always win over stale flags.
- **Deletion controls everywhere** (v1 is manual, not scheduled): invitees can remove their reply from their manage link; organizers can leave (and be removed by staff, who can also rotate a leaked family code); staff can delete RSVPs, updates, organizers, or an entire event with all its data. Staff handle verbal deletion requests with these controls.

## Running it

```bash
npm install
npm run seed     # staff login + demo event; prints the family code
npm run dev      # http://127.0.0.1:4863
```

Seed credentials: `dan@every.to` / `solace-demo-1` → [/admin](http://127.0.0.1:4863/admin).

### iOS app

```bash
npm run ios:generate   # xcodegen → ios/Solace.xcodeproj
npm run ios:build      # builds for the iPhone 15 Pro simulator
```

The app points at `http://127.0.0.1:4863` by default (works from the simulator). Enter the family code from the seed output. In the simulator, SMS/Mail composers aren't available, so sending falls back to the share sheet — on a device it uses Messages/Mail directly.

## Tests

```bash
npm test                  # unit suite (domain lib)
npm run test:integration  # builds, boots the real server, runs full HTTP flows
npm run ios:test          # iOS unit tests (+ UI test, which skips without a live server)
```

To run the iOS UI test against a live server: start `npm run dev`, seed, then pass `SOLACE_TEST_FAMILY_CODE=<code>` into the test environment.

## Architecture

Next.js 15 (App Router) + SQLite (`better-sqlite3`), plain CSS, no analytics, no third-party scripts. All domain logic lives in `lib/`; API routes, pages, and the SwiftUI app are thin adapters over it. `SPEC.md` is the full contract, including the binding post-review amendments (A1–A14) that pin datetime handling, consent semantics, PII boundaries between the three roles, and the iOS sending rules.

| Piece | Where |
|---|---|
| Domain lib + schema | `lib/` |
| Organizer + public API | `app/api/` |
| Public obituary/RSVP pages | `app/(public)/` |
| Staff dashboard | `app/admin/` |
| iOS app (XcodeGen + SwiftUI) | `ios/` |

Data lives in `./data/` (gitignored): `solace.db` plus uploaded photos. Set `SOLACE_DATA_DIR` / `SOLACE_BASE_URL` to relocate (tests do).
