# Solace — Funeral Event Invitations & RSVPs

A funeral home gives grieving families a dignified way to invite people to a service and manage RSVPs. Three roles:

1. **Staff** (funeral home employees) — use a password-protected **web admin** to create events (obituary, photo, services schedule), hand the family a **family code**, watch RSVPs, and export the consented communication list.
2. **Family organizers** — use the **iOS app** (staff tell them to download it). They join with the family code, invite people from their contacts (on-device sending only), watch RSVPs live, and post updates.
3. **Invitees** — receive a text/email with a link. **No app, no account.** They see the obituary page on the web and RSVP there.

Single funeral home in v1 (name stored in settings).

## Non-negotiables (privacy & compliance — do not violate)

1. **No contact upload.** The backend has NO endpoint that accepts address-book data, and none may be added. Contacts are used on the sender's phone only, to address messages the sender personally sends.
2. **Consent is per-person, affirmative, and recorded.** RSVP form has two checkboxes:
   - `eventUpdatesOptIn` — "Keep me posted about this service (schedule changes, livestream link)." **Default checked** (event-scoped, transactional).
   - `marketingOptIn` — "I'd like to hear from {funeralHomeName} about future services and grief resources." **Default UNCHECKED.**
   Store `consentRecordedAt` (ISO timestamp) and `consentSource` on every RSVP.
3. **Marketing export contains only records with `marketingOptIn = 1`.**
4. iOS Contacts copy must say contacts stay on the phone. `NSContactsUsageDescription`: "Solace uses your contacts only on this phone, to help you address invitations you send yourself. Contacts are never uploaded."
5. No analytics, no trackers, no third-party scripts.

## Repo layout & slice ownership

```
solace/
  SPEC.md                    ← this file
  package.json, tsconfig.json, next.config.ts, vitest.config.ts, vitest.integration.config.ts
  .claude/launch.json        ← dev server config (port 4863)
  app/
    layout.tsx, globals.css, page.tsx      [FOUNDATION; B may polish page.tsx]
    api/health/route.ts                    [FOUNDATION]
    api/uploads/[name]/route.ts            [FOUNDATION] serves DATA_DIR/uploads
    api/admin/photo/route.ts               [FOUNDATION] multipart photo upload (staff session required)
    api/app/**                             [SLICE A] organizer API (iOS)
    api/public/**                          [SLICE A] public RSVP API
    (public)/e/[slug]/page.tsx             [SLICE B] obituary + RSVP page
    (public)/rsvp/[token]/page.tsx         [SLICE B] manage-RSVP page
    admin/**                               [SLICE C] staff dashboard (pages + server actions + any route.ts, e.g. CSV export)
  components/public/**                     [SLICE B]
  components/admin/**                      [SLICE C]
  lib/**                                   [FOUNDATION — do not modify; report gaps instead]
  middleware.ts                            [FOUNDATION] cookie-presence redirect for /admin
  scripts/seed.ts                          [FOUNDATION]
  tests/unit/**                            [FOUNDATION + slices add]
  tests/integration/**                     [SLICE A owns API flow tests]
  tests/helpers/**                         [FOUNDATION] server boot helper
  ios/**                                   [SLICE D] XcodeGen project + SwiftUI app + tests
  data/                                    (gitignored) SQLite db + uploads
```

Slices must not edit files outside their ownership. Everything shared lives in `lib/` (foundation). If `lib/` is missing something you need, work around it locally in your slice and flag it in your final report.

## Runtime

- Next.js 15 (App Router, TS, React 19), port **4863**, plain CSS (no Tailwind).
- SQLite via `better-sqlite3` (WAL). `serverExternalPackages: ['better-sqlite3']`.
- `SOLACE_DATA_DIR` env → data dir (default `./data`). DB at `<dir>/solace.db`, uploads at `<dir>/uploads/`.
- `SOLACE_BASE_URL` → absolute-link base (default `http://127.0.0.1:4863`).
- Middleware CANNOT touch the DB (edge runtime). It only redirects `/admin/*` → `/admin/login` when the session cookie is absent. Real auth = `requireStaff()` from `lib/auth-server.ts` in every admin page/action/route.

## Data model (exact)

```sql
settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
staff_users(id, email UNIQUE NOT NULL, name, password_hash, created_at);
sessions(token_hash PRIMARY KEY, staff_user_id, created_at, expires_at);
events(id, slug UNIQUE, family_code UNIQUE, deceased_name, born_on, died_on,
       photo_path, obituary_text, status TEXT CHECK(status IN ('draft','published','archived')) DEFAULT 'published',
       created_by, created_at, updated_at);
services(id, event_id, kind TEXT CHECK(kind IN ('visitation','funeral','graveside','memorial','reception','livestream')),
         title, starts_at, ends_at, venue_name, address, notes, livestream_url, sort_order);
organizers(id, event_id, name, token_hash UNIQUE, email, phone,
           marketing_opt_in INTEGER DEFAULT 0, consent_recorded_at, created_at, last_seen_at);
rsvps(id, event_id, manage_token UNIQUE, name NOT NULL, email, phone,
      attending TEXT CHECK(attending IN ('yes','no')), guest_count INTEGER DEFAULT 0,
      note, event_updates_opt_in INTEGER DEFAULT 1, marketing_opt_in INTEGER DEFAULT 0,
      consent_recorded_at, consent_source TEXT, created_at, updated_at);
updates(id, event_id, author_kind TEXT CHECK(author_kind IN ('organizer','staff')),
        author_name, title, body_text, created_at);
```

IDs: random hex. `slug`: 10-char lowercase url-safe. `family_code`: `WORD-DDDD` from a gentle wordlist (e.g. `CEDAR-4821`), case-insensitive lookup. Tokens (organizer bearer, RSVP manage, staff session): 32-byte hex, stored **hashed** (sha256). Passwords: scrypt.

RSVP dedupe: same event + same email (case-insensitive, when email present) ⇒ update the existing row, keep its manage_token.

Obituary/updates are **plain text**: render escaped, split on blank lines into `<p>`. No HTML/markdown (XSS-safe by construction).

## Domain lib (foundation — already written; use these, signatures are final)

- `lib/db.ts` — `getDb()`, schema bootstrap.
- `lib/ids.ts` — `newId()`, `newSlug()`, `newFamilyCode()`, `newToken()` → `{token, tokenHash}`, `hashToken(t)`.
- `lib/settings.ts` — `getSetting(key)`, `setSetting(key, value)`, `getFuneralHomeName()`.
- `lib/staff.ts` — `createStaffUser({email,name,password})`, `verifyStaffLogin(email,password)`, `createSession(staffUserId)` → token, `getSessionUser(token)`, `destroySession(token)`.
- `lib/auth-server.ts` — `requireStaff()` (server-only; reads cookie, validates, redirects to /admin/login), `getStaffOrNull()`, cookie name `solace_staff`.
- `lib/events.ts` — `createEvent(...)`, `updateEvent(id, patch)`, `listEvents()`, `getEvent(id)`, `getEventBySlug(slug)`, `getEventByFamilyCode(code)`, `publicUrl(event)`.
- `lib/services.ts` — `setServices(eventId, services[])` (replace-all), `listServices(eventId)`.
- `lib/organizers.ts` — `joinEvent(familyCode, name)` → `{token, organizer, event} | null`, `getOrganizerByToken(token)`, `setOrganizerOptIn(id, {marketingOptIn, email?, phone?})`.
- `lib/rsvps.ts` — `submitRsvp(eventId, input, source)` → `{rsvp, manageToken}` (upsert by email), `getRsvpByManageToken(token)`, `updateRsvpByManageToken(token, patch)`, `listRsvps(eventId)`, `rsvpSummary(eventId)` → `{responseCount, attendingCount, totalGuests, declinedCount}` (totalGuests = attendees + their guests).
- `lib/updates.ts` — `createUpdate(eventId, {authorKind, authorName, title, bodyText})`, `listUpdates(eventId)`.
- `lib/marketing.ts` — `listConsentedContacts()` → rows from rsvps ∪ organizers where marketing_opt_in=1, `consentedCsv()`.
- `lib/format.ts` — `formatDateRange`, `formatServiceLine(service)`, `inviteMessage(event, firstService, url)` (single source of the invite text; API exposes it to iOS).
- `lib/validate.ts` — `vStr`, `vEmail`, `vPhone`, `vEnum`, `vInt`, `vBool` helpers that throw `ValidationError(message)`.
- `lib/http.ts` — `jsonError(status, code, message)`, `readJson(req)`, `requireOrganizer(req)` (Bearer → organizer or throws), `checkOrigin(req)` (admin/public POST CSRF guard: Origin, if present, must match host), `rateLimit(key, max, windowMs)` in-memory.
- `lib/photos.ts` — `savePhoto(file: File)` → `photo_path`, `photoUrl(photo_path)` → `/api/uploads/<name>`; jpg/png/webp only, 8 MB cap.

## HTTP API contract (Slice A implements; shapes are FINAL — camelCase JSON)

Errors: `{"error": {"code": string, "message": string}}` with 400/401/404/429.

### Organizer API (Bearer token from join; 401 on bad/missing token)
- `POST /api/app/join` `{familyCode, name}` → `{token, organizer: {id, name, marketingOptIn, email, phone}, bundle: EventBundle}`. 404 `code:"unknown_code"` if no event. Rate-limit 10/min/IP.
- `GET /api/app/event` → `EventBundle`
- `GET /api/app/rsvps` → `{rsvps: [{id, name, email, phone, attending, guestCount, note, createdAt}]}`
- `POST /api/app/updates` `{title, bodyText}` → `{update}`
- `POST /api/app/me/optin` `{marketingOptIn: bool, email?, phone?}` → `{organizer}`

`EventBundle`:
```json
{
  "event": {"id","slug","publicUrl","familyCode","deceasedName","bornOn","diedOn",
             "photoUrl","obituaryText","funeralHomeName","status"},
  "services": [{"id","kind","title","startsAt","endsAt","venueName","address","notes","livestreamUrl"}],
  "updates":  [{"id","authorKind","authorName","title","bodyText","createdAt"}],
  "rsvpSummary": {"responseCount","attendingCount","totalGuests","declinedCount"},
  "inviteTemplate": {"message","url"}
}
```

### Public API (no auth; rate-limit RSVP writes 20/min/IP)
- `GET /api/public/events/[slug]` → `{event: {slug, deceasedName, bornOn, diedOn, photoUrl, obituaryText, funeralHomeName}, services: [...], updates: [...]}` (404 unknown slug; NO familyCode, NO rsvp list)
- `POST /api/public/events/[slug]/rsvps` `{name, email?, phone?, attending, guestCount, note?, eventUpdatesOptIn, marketingOptIn}` → `{manageToken, rsvp}`; requires name; attending ∈ yes|no; guestCount 0–10; email-or-phone encouraged but only name required.
- `GET /api/public/rsvps/[token]` → `{rsvp, event, services, updates}` (own RSVP via manage token)
- `PUT /api/public/rsvps/[token]` (same fields as POST, all optional) → `{rsvp}`

## Public web (Slice B)

`/e/[slug]` — the page an invitee lands on. Server component fetches via lib. Sections:
1. Header: photo (if any), deceased name, born–died dates, funeral home name (small).
2. Obituary (escaped paragraphs).
3. Services schedule (cards: kind label, date/time, venue, address → `https://maps.apple.com/?q=` link, livestream link if set).
4. Updates feed (newest first, author + date).
5. **RSVP form** (client component → `POST /api/public/events/[slug]/rsvps`): name, email, phone, attending (yes/no radio, required), guest count stepper (0–10), note textarea, the two consent checkboxes per Non-negotiables, submit. On success: warm confirmation + link to `/rsvp/{manageToken}` ("Save this link to change your reply") and store token in localStorage to re-show it.
6. 404 slug → gentle "This page isn't available."

`/rsvp/[token]` — shows current RSVP + event summary + updates; edit form (PUT). Invalid token → gentle error.

Design: dignified and warm. Serif (`"Iowan Old Style", Palatino, Georgia, serif`), cream paper `#faf7f2`, ink `#1f1d1a`, sage accent `#5a6b5d`, muted gold `#b08d4f`, hairlines `#e5dfd4`. 18px base, max-width 42rem, generous spacing, 44px touch targets, mobile-first. No emoji, no exclamation marks, no gradients. Copy is plain and kind.

## Admin web (Slice C) — all pages call `requireStaff()`

- `/admin/login` — email + password → session cookie (server action using lib/staff).
- `/admin` — events table (name, dates, status, RSVP counts) + "New event".
- `/admin/events/new` — deceased name, born/died dates, photo upload (client posts to `/api/admin/photo`, stores returned path in hidden field), obituary textarea, services editor (add/remove rows: kind, title, starts/ends, venue, address, notes, livestream URL), create → detail page.
- `/admin/events/[id]` — tabs/sections:
  - **Share**: family code (large, copyable), public link, QR code (`qrcode` npm → data URL server-side), and the printed instruction card text staff can read to families.
  - **RSVPs**: summary numbers + table (name, contact, attending, guests, note, opted-in badges, date). "Email attendees" mailto: link with BCC of event-updates opt-ins who left email.
  - **Updates**: composer (posts as staff) + list.
  - **Edit**: same form as new, pre-filled; archive button (status → archived; public page then shows only obituary + "contact funeral home", no RSVP form; API blocks new RSVPs — lib enforces).
- `/admin/marketing` — consented list (name, email, phone, source event, consent date) + `export.csv` route + mailto BCC compose link. Copy at top states these people opted in.
- `/admin/settings` — funeral home name, add staff user.
- Logout button. Admin uses UI sans stack, same palette, denser layout. Mutations via server actions (call `checkOrigin` equivalent is built into actions — Next validates Origin for server actions natively).

## iOS app (Slice D) — SwiftUI, iOS 17+, XcodeGen

`ios/project.yml` → app `Solace` (bundle `to.every.solace`), targets: `Solace`, `SolaceTests` (unit), `SolaceUITests` (UI). Build/test on simulator `iPhone 15 Pro` id `843FA19C-C232-43B0-8E45-7AB39F722CFB`. Info.plist: `NSContactsUsageDescription` (copy above), ATS `NSAllowsLocalNetworking` true. API base: `SOLACE_API_BASE` launch env, else Info.plist `SolaceAPIBase`, default `http://127.0.0.1:4863`.

Architecture: `@Observable` `AppModel` (session token in Keychain via small helper, event bundle, rsvps, invite log), `APIClient` (URLSession async/await, decodes the contract above), Views:

- **JoinView**: funeral-home-toned welcome, family code field (auto-uppercase, accepts `cedar-4821`), your name → join → main tabs. Friendly error on unknown code.
- **EventView** (tab "Service"): photo, name, dates, services schedule, obituary, ShareLink for the public URL, updates list.
- **InviteView** (tab "Invite"):
  - Primary: "Choose from Contacts" → `CNContactPickerViewController` (multi-select; no permission prompt).
  - Secondary: "Add everyone in my contacts" → confirmation sheet explaining batching + on-device promise → `CNContactStore` full access request → all contacts with phone/email selected, prunable list.
  - Selected list shows badges (text/email). "Send invitations" → batches: SMS via `MFMessageComposeViewController` (recipients ≤ 8/batch, body = server `inviteTemplate.message`), email-only via `MFMailComposeViewController` (BCC ≤ 20/batch). After each sheet, record locally sent/cancelled and advance. If `!canSendText` (simulator): fall back to `UIActivityViewController` share sheet, still record.
  - Invite log (JSON in Application Support): name, channel, status, date. Header: "Invited · N". Footer note: "Contacts never leave your phone."
- **RSVPsView** (tab "RSVPs"): summary chips (attending incl. guests, declined, responses), rows (name, guests, note), pull-to-refresh, auto-refresh on foreground.
- **UpdatesView** (tab "Updates"): list + compose sheet (title, body) → POST; after post, offer share sheet to spread it by text.
- **SettingsView** (tab "More"): my name, marketing opt-in toggle (default OFF, posts `/api/app/me/optin` with email/phone fields shown when enabling), family code display, funeral home name, "Leave event" (clears token).

Unit tests: invite batching (8/20 chunking, mixed contacts), invite message fallback, API decoding from fixture JSON matching the contract, Keychain helper roundtrip. UI test: launch with `SOLACE_API_BASE` + `SOLACE_TEST_FAMILY_CODE` env (set by the test runner) → join seeded event → assert deceased name visible → open RSVPs tab.

## Amendments after design review (BINDING — these override anything above)

A 4-lens adversarial design review confirmed 20 findings. These decisions are final; the foundation lib already implements the data-layer parts.

**A1. Datetime contract (critical).** All service datetimes (`startsAt`, `endsAt`) are naive local wall-clock strings, format `YYYY-MM-DDTHH:mm` (or bare `YYYY-MM-DD`), in the funeral home's local timezone. They are NEVER converted between timezones by any layer. Admin uses `<input type="datetime-local">` and stores the raw string. Web renders via `lib/format.ts` (`formatDateTime` parses the parts manually — no TZ math). **iOS models `startsAt`/`endsAt` as `String?`** and formats with its own manual parser (mirror lib/format.ts semantics: "Saturday, July 11, 2026 at 11:00 AM"); never run these through `JSONDecoder.dateDecodingStrategy` or TimeZone-aware conversion. `bornOn`/`diedOn`/`createdAt`/`consentRecordedAt`: `createdAt`-style audit fields are UTC ISO-8601 with Z; iOS also treats them as strings (display only via relative/short formatting of the date part).

**A2. Family code + join hardening.** Code format is now `WORD-WORD-DDDD` (e.g. `CEDAR-WREN-4821`), two distinct words. Join responses are uniform: unknown code and archived event both return the same 404 `{"error":{"code":"unknown_code","message":"That code didn't match a service. Please check it with the funeral home."}}`. Slice A must rate-limit join per-IP (10/min) AND globally (`rateLimit("join:global", 100, 3600_000)`).

**A3. Organizer RSVP payload is PII-stripped.** `GET /api/app/rsvps` returns `{rsvps: [{id, name, attending, guestCount, note, createdAt}]}` — NO email, NO phone. Only the staff dashboard shows invitee contact info. The public RSVP form (Slice B) includes the disclosure line: "Your reply is shared with the family and {funeralHomeName}." iOS RSVP rows show name/guests/note only.

**A4. RSVP upsert semantics.** `POST .../rsvps` response is `{manageToken, rsvp, updated}`. `updated: true` means an existing reply with that email was replaced (wholesale — no prior field survives, manage token rotates). Slice B confirmation for `updated: true` must say "We've updated your earlier reply." The old manage link 404s with the gentle message "This link is no longer valid. You can reply again from the service page."

**A5. Manage page + consent semantics.** `/rsvp/[token]` pre-fills BOTH consent checkboxes from the stored row (not the POST defaults). PUT treats omitted fields as unchanged. Consent bookkeeping (`consentRecordedAt/Source/Version`) updates ONLY when a consent value actually changes (lib enforces this). The manage page also gets a "Remove my reply" button → `DELETE /api/public/rsvps/[token]` → 200 `{deleted: true}`; confirm before calling.

**A6. Manage GET redaction.** `GET /api/public/rsvps/[token]` returns `{rsvp, event, services, updates}` where `event` is EXACTLY the public projection from `publicEventBundle` (no familyCode, no id). Regression test required: `familyCode` (and `family_code`) must not appear anywhere in any `/api/public/*` response body.

**A7. Returning invitee.** After a successful RSVP, Slice B stores the manage token in `localStorage` under `solace_rsvp:{slug}`. On `/e/[slug]`, if present, show a "You've replied — change or remove your reply" card linking to `/rsvp/{token}` with a secondary "Respond as someone else" that reveals the blank form. If the token 404s (rotated/deleted), clear the key and show the form.

**A8. Unsubscribe + suppression.** New public page `/unsubscribe`: email field → `POST /api/public/unsubscribe {email}` → always 200 `{ok: true}` (no account enumeration), calls `lib/marketing.unsubscribeEmail(email, "public-unsubscribe")`. Rate-limit 10/min/IP. Slice C `/admin/marketing` gains a per-row "Suppress" action (same lib call, source "staff") and shows the suppression list. Marketing export is EMAIL-ONLY (no phone column — texting requires TCPA consent this product does not collect). Footer of public pages links to /unsubscribe ("Email preferences").

**A9. Marketing checkbox copy (final):** "I'm 16 or older and would like occasional emails from {funeralHomeName} — grief resources and news about future services." Default unchecked everywhere. Event-updates checkbox copy: "Keep me posted about this service (schedule changes, livestream link)." Default checked on the initial form only.

**A10. Staff login hardening.** The login action rate-limits per-IP (`login:ip:{ip}`, 10/15min) and per-email (`login:email:{email}`, 10/15min) and returns one generic failure message ("That email and password didn't match."). 2FA is explicitly out of scope for v1.

**A11. Staff management surface (Slice C additions).** Event detail gains: **Organizers** section (name, joined, last seen, marketing opt-in badge, Remove button → `removeOrganizer`), **Regenerate family code** button (→ `regenerateFamilyCode`, with confirm dialog noting the old code stops working), per-update **Delete** button (staff may delete any update), per-RSVP **Delete** button, and a **Danger zone**: "Delete this event and all its data" (typed-confirmation, → `deleteEvent`). Event create/edit form gains a required checkbox: "The family has authorized publishing this obituary and photo" (`publicationAuthorized`, must be checked to save).

**A12. Organizer self-serve deletion (Slice A + D).** `DELETE /api/app/me` (Bearer) removes the organizer row (lib `deleteOrganizerByToken`) → `{deleted: true}`. iOS "Leave event" calls it, then clears the Keychain token and the local invite log. `DELETE /api/app/updates/[id]` (Bearer) deletes an update IF `authorKind == "organizer"` and it belongs to this event — organizers delete only from their own event; author matching by event + organizer kind is sufficient for v1 (403 `not_own_update` when authorKind is "staff"). iOS Updates list supports swipe-to-delete on organizer posts.

**A13. iOS sending rules (final).**
- Routing: a contact with any phone number is an SMS invite (prefer the first mobile-labelled number, else first number); email-only contacts are email invites; contacts with neither are marked "no way to reach" in the review list.
- SMS: **one recipient per compose sheet** (group threads would expose strangers' numbers to each other and pool their replies). Progress header "Sending 3 of 24". An optional "Send as one group message" toggle exists ONLY behind an explicit warning sheet ("Everyone in the group will see each other's numbers and replies") for hand-picked groups ≤ 8.
- Presentation state machine: a send queue; the next composer is presented only from the previous controller's `didFinish` → `dismiss(animated:completion:)` completion block. Cancel-one advances; "Stop sending" empties the queue.
- Email: gate on `MFMailComposeViewController.canSendMail()`. If false, build a `mailto:` URL (BCC ≤ 20, percent-encoded subject/body) and `UIApplication.shared.open`; if that fails, share sheet. Record every attempt in the invite log with status sent/cancelled/unreachable.
- Invite log gains "Resend to anyone not yet sent" which re-queues cancelled/unreachable entries.
- Contacts access: the multi-select `CNContactPickerViewController` (permissionless) is the primary path. "Add many at once" (full-list) flow: request access; handle iOS 18+ `.limited` explicitly (treat as usable; title the result "Added the N contacts you've shared with Solace"; offer the limited-access management path); `.denied` → guide to the picker instead. After bulk add, the user MUST land in the reviewable list (prunable) before any send is possible — there is no one-tap blast. App Review notes will document that all sending is user-initiated per message.

**A14. Data lifecycle.** Retention automation is out of scope for v1, but: invitees can delete their reply (A5), organizers can delete themselves (A12), staff can delete RSVPs, organizers, updates, and whole events (A11). README documents that staff handle verbal deletion requests via these controls.

## Testing bar (definition of done)

1. `npm run build` — zero TS errors.
2. `npm test` — unit suite green.
3. `npm run test:integration` — boots built app on ephemeral port + temp DATA_DIR; full HTTP flows: seed staff → login cookie → create event w/ services → join by family code → public bundle → RSVP submit (consent recorded) → dedupe on re-submit (`updated: true`, old link 404s) → manage-token edit preserves consent bookkeeping when only guests change → organizer sees RSVPs (payload has NO email/phone) + summary → update posted & visible publicly → organizer deletes own update; 403 on staff update → marketing export email-only, only consented → unsubscribe removes from export → auth failures (bad token/cookie/code, uniform join 404) → `familyCode` never appears in any /api/public/* body → /api/uploads traversal names 404 → archived event rejects RSVPs → DELETE rsvp + DELETE /api/app/me work → rate limit fires (429). 
4. `ios: xcodegen && xcodebuild test` — unit + UI tests green on the simulator.
5. Manual browser + simulator walkthrough with screenshots (done by the orchestrator at the end).
