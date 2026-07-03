import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { libFor, startServer, type TestServer } from "../helpers/server";

/**
 * One server, one suite. Every request sets its own x-forwarded-for so the
 * in-memory rate limiter buckets stay isolated per test; the flood test runs
 * last because it deliberately exhausts one address.
 */

type Lib = Awaited<ReturnType<typeof libFor>>;

let server: TestServer;
let lib: Lib;

function api(path: string, ip: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-forwarded-for", ip);
  return fetch(server.baseUrl + path, { ...init, headers });
}

function postJson(
  path: string,
  ip: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return api(path, ip, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function putJson(path: string, ip: string, body: unknown): Promise<Response> {
  return api(path, ip, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  server = await startServer();
  lib = await libFor(server);
  lib.settings.setSetting("funeral_home_name", "Rivermead Funeral Home");
});

afterAll(async () => {
  if (server) await server.stop();
});

describe("api flows", () => {
  it("reports healthy", async () => {
    const res = await api("/api/health", "10.0.0.1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("carries a family through the full flow: join, share, reply, edit, update", async () => {
    const event = lib.events.createEvent({
      deceasedName: "Eleanor March",
      bornOn: "1938-04-02",
      diedOn: "2026-06-20",
      obituaryText: "Eleanor spent her life teaching music.\n\nShe is remembered with love.",
      publicationAuthorized: true,
    });
    lib.services.setServices(event.id, [
      {
        kind: "funeral",
        startsAt: "2026-07-11T11:00",
        endsAt: "2026-07-11T12:00",
        venueName: "First Methodist Church",
        address: "12 Chapel Lane, Rivermead",
      },
      { kind: "reception", startsAt: "2026-07-11T13:00", venueName: "March Family Home" },
    ]);

    // Join with a lower-case code, then again with spaces instead of dashes.
    const joinRes = await postJson("/api/app/join", "10.1.1.1", {
      familyCode: event.familyCode.toLowerCase(),
      name: "Nora March",
    });
    expect(joinRes.status).toBe(200);
    const joined = await joinRes.json();
    expect(joined.token).toMatch(/^[a-f0-9]{64}$/);
    expect(joined.organizer.name).toBe("Nora March");
    expect(joined.organizer.marketingOptIn).toBe(false);
    expect(joined.bundle.event.familyCode).toBe(event.familyCode);

    const spacedRes = await postJson("/api/app/join", "10.1.1.1", {
      familyCode: event.familyCode.toLowerCase().replace(/-/g, " "),
      name: "Theo March",
    });
    expect(spacedRes.status).toBe(200);

    const auth = bearer(joined.token);

    // Organizer bundle: invite template plus verbatim wall-clock datetimes (A1).
    const bundleRes = await api("/api/app/event", "10.1.1.1", { headers: auth });
    expect(bundleRes.status).toBe(200);
    const bundle = await bundleRes.json();
    expect(bundle.event.deceasedName).toBe("Eleanor March");
    expect(bundle.event.publicUrl).toBe(`${server.baseUrl}/e/${event.slug}`);
    expect(bundle.event.funeralHomeName).toBe("Rivermead Funeral Home");
    expect(bundle.event.status).toBe("published");
    expect(bundle.services[0].startsAt).toBe("2026-07-11T11:00");
    expect(bundle.services[0].endsAt).toBe("2026-07-11T12:00");
    expect(bundle.services[1].startsAt).toBe("2026-07-11T13:00");
    expect(bundle.inviteTemplate.url).toBe(`${server.baseUrl}/e/${event.slug}`);
    expect(bundle.inviteTemplate.message).toContain("Eleanor March");
    expect(bundle.inviteTemplate.message).toContain(`${server.baseUrl}/e/${event.slug}`);
    expect(bundle.rsvpSummary.responseCount).toBe(0);

    // Organizer opt-in is recorded with contact details.
    const optinRes = await postJson(
      "/api/app/me/optin",
      "10.1.1.1",
      { marketingOptIn: true, email: "nora@example.com" },
      auth,
    );
    expect(optinRes.status).toBe(200);
    const optin = await optinRes.json();
    expect(optin.organizer.marketingOptIn).toBe(true);
    expect(optin.organizer.email).toBe("nora@example.com");

    // Public view by slug, datetimes still verbatim.
    const publicRes = await api(`/api/public/events/${event.slug}`, "10.1.1.2");
    expect(publicRes.status).toBe(200);
    const publicBody = await publicRes.json();
    expect(publicBody.event.deceasedName).toBe("Eleanor March");
    expect(publicBody.services[0].startsAt).toBe("2026-07-11T11:00");

    // First reply, with consent recorded.
    const rsvpRes = await postJson(`/api/public/events/${event.slug}/rsvps`, "10.1.1.2", {
      name: "Ruth Ellis",
      email: "ruth@example.com",
      attending: "yes",
      guestCount: 1,
      note: "Eleanor taught our daughter piano.",
      eventUpdatesOptIn: true,
      marketingOptIn: true,
    });
    expect(rsvpRes.status).toBe(200);
    const firstReply = await rsvpRes.json();
    expect(firstReply.updated).toBe(false);
    expect(firstReply.manageToken).toMatch(/^[a-f0-9]{64}$/);
    expect(firstReply.rsvp.eventUpdatesOptIn).toBe(true);
    expect(firstReply.rsvp.marketingOptIn).toBe(true);
    expect(firstReply.rsvp.consentSource).toBe("public-web");
    expect(firstReply.rsvp.consentRecordedAt).toBeTruthy();

    // The same email replying again replaces the earlier reply wholesale (A4).
    const resubmitRes = await postJson(`/api/public/events/${event.slug}/rsvps`, "10.1.1.2", {
      name: "Ruth Ellis",
      email: "RUTH@example.com",
      attending: "yes",
      guestCount: 2,
      marketingOptIn: true,
    });
    expect(resubmitRes.status).toBe(200);
    const resubmit = await resubmitRes.json();
    expect(resubmit.updated).toBe(true);
    expect(resubmit.manageToken).not.toBe(firstReply.manageToken);

    // The old manage link is gone; there is still exactly one reply.
    const oldLink = await api(`/api/public/rsvps/${firstReply.manageToken}`, "10.1.1.2");
    expect(oldLink.status).toBe(404);
    const countBody = await (await api("/api/app/rsvps", "10.1.1.1", { headers: auth })).json();
    expect(countBody.rsvps).toHaveLength(1);

    // Editing only the guest count leaves consent bookkeeping untouched (A5).
    const editRes = await putJson(`/api/public/rsvps/${resubmit.manageToken}`, "10.1.1.2", {
      guestCount: 3,
    });
    expect(editRes.status).toBe(200);
    const edited = await editRes.json();
    expect(edited.rsvp.guestCount).toBe(3);
    const stored = lib.rsvps.getRsvpByManageToken(resubmit.manageToken);
    expect(stored?.rsvp.consentRecordedAt).toBe(resubmit.rsvp.consentRecordedAt);
    expect(stored?.rsvp.consentSource).toBe("public-web");

    // The organizer payload is PII-stripped (A3): no email or phone anywhere.
    const rsvpsBody = await (await api("/api/app/rsvps", "10.1.1.1", { headers: auth })).json();
    expect(Object.keys(rsvpsBody.rsvps[0]).sort()).toEqual([
      "attending",
      "createdAt",
      "guestCount",
      "id",
      "name",
      "note",
    ]);
    const rsvpsText = JSON.stringify(rsvpsBody);
    expect(rsvpsText).not.toContain("email");
    expect(rsvpsText).not.toContain("phone");
    expect(rsvpsText).not.toContain("ruth@example.com");

    // Organizer posts an update; it appears publicly; they can remove their own.
    const updateRes = await postJson(
      "/api/app/updates",
      "10.1.1.1",
      { title: "Reception moved", bodyText: "The reception now follows directly after the service." },
      auth,
    );
    expect(updateRes.status).toBe(200);
    const posted = await updateRes.json();
    expect(posted.update.authorKind).toBe("organizer");
    expect(posted.update.authorName).toBe("Nora March");

    const publicAfter = await (await api(`/api/public/events/${event.slug}`, "10.1.1.2")).json();
    expect(publicAfter.updates[0].title).toBe("Reception moved");

    const deleteRes = await api(`/api/app/updates/${posted.update.id}`, "10.1.1.1", {
      method: "DELETE",
      headers: auth,
    });
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ deleted: true });

    // Staff posts survive organizer delete attempts (A12).
    const staffUpdate = lib.updates.createUpdate(event.id, {
      authorKind: "staff",
      authorName: "Rivermead Funeral Home",
      title: "Parking guidance",
      bodyText: "Please use the lot behind the chapel.",
    });
    const forbidden = await api(`/api/app/updates/${staffUpdate.id}`, "10.1.1.1", {
      method: "DELETE",
      headers: auth,
    });
    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).error.code).toBe("not_own_update");
    expect(lib.updates.getUpdate(staffUpdate.id)).not.toBeNull();
  });

  it("never lets the family code out through the public API (A6)", async () => {
    const event = lib.events.createEvent({ deceasedName: "Harold Finch", publicationAuthorized: true });
    lib.services.setServices(event.id, [{ kind: "memorial", startsAt: "2026-08-01T10:00" }]);
    lib.updates.createUpdate(event.id, {
      authorKind: "staff",
      authorName: "Rivermead Funeral Home",
      title: "Livestream details",
      bodyText: "A link will be posted here.",
    });
    const ip = "10.2.1.1";

    const submitRes = await postJson(`/api/public/events/${event.slug}/rsvps`, ip, {
      name: "Sam Groves",
      email: "sam@example.com",
      attending: "yes",
    });
    const submitText = await submitRes.text();
    const manageToken = JSON.parse(submitText).manageToken as string;

    const eventText = await (await api(`/api/public/events/${event.slug}`, ip)).text();
    const manageText = await (await api(`/api/public/rsvps/${manageToken}`, ip)).text();
    const putText = await (await putJson(`/api/public/rsvps/${manageToken}`, ip, { note: "See you there." })).text();
    const unsubText = await (await postJson("/api/public/unsubscribe", ip, { email: "sam@example.com" })).text();

    for (const text of [eventText, submitText, manageText, putText, unsubText]) {
      expect(text).not.toContain("familyCode");
      expect(text).not.toContain("family_code");
      expect(text).not.toContain(event.familyCode);
    }

    const manageBody = JSON.parse(manageText);
    expect("familyCode" in manageBody.event).toBe(false);
    expect("id" in manageBody.event).toBe(false);
    expect("id" in JSON.parse(eventText).event).toBe(false);
  });

  it("answers strangers uniformly: bad tokens and unknown or archived codes reveal nothing", async () => {
    const noToken = await api("/api/app/event", "10.3.1.1");
    expect(noToken.status).toBe(401);
    const badToken = await api("/api/app/event", "10.3.1.1", { headers: bearer("f".repeat(64)) });
    expect(badToken.status).toBe(401);
    expect((await badToken.json()).error.code).toBe("unauthorized");

    const bogusManage = await api(`/api/public/rsvps/${"e".repeat(64)}`, "10.3.1.1");
    expect(bogusManage.status).toBe(404);

    // 0000 can never be generated (digits run 1000-9999), so this code is safely unknown.
    const unknownJoin = await postJson("/api/app/join", "10.3.1.2", {
      familyCode: "WILLOW-WREN-0000",
      name: "Nobody",
    });
    expect(unknownJoin.status).toBe(404);
    const unknownBody = await unknownJoin.json();
    expect(unknownBody.error.code).toBe("unknown_code");
    expect(unknownBody.error.message).toBe(
      "That code didn't match a service. Please check it with the funeral home.",
    );

    const archived = lib.events.createEvent({ deceasedName: "Vera Stone", publicationAuthorized: true });
    lib.events.updateEvent(archived.id, { deceasedName: undefined, status: "archived" });
    const archivedJoin = await postJson("/api/app/join", "10.3.1.2", {
      familyCode: archived.familyCode,
      name: "Nobody",
    });
    expect(archivedJoin.status).toBe(404);
    expect(await archivedJoin.json()).toEqual(unknownBody);
  });

  it("closes RSVPs for archived services but keeps the memorial readable", async () => {
    const event = lib.events.createEvent({ deceasedName: "Mabel Hart", publicationAuthorized: true });
    lib.events.updateEvent(event.id, { deceasedName: undefined, status: "archived" });

    const view = await api(`/api/public/events/${event.slug}`, "10.4.1.1");
    expect(view.status).toBe(200);
    expect((await view.json()).event.status).toBe("archived");

    const closed = await postJson(`/api/public/events/${event.slug}/rsvps`, "10.4.1.1", {
      name: "Late Guest",
      attending: "yes",
    });
    expect(closed.status).toBe(409);
    expect((await closed.json()).error.code).toBe("rsvps_closed");

    // Drafts are invisible to the public entirely.
    const draft = lib.events.createEvent({
      deceasedName: "Quiet Draft",
      status: "draft",
      publicationAuthorized: true,
    });
    expect((await api(`/api/public/events/${draft.slug}`, "10.4.1.1")).status).toBe(404);
    const draftPost = await postJson(`/api/public/events/${draft.slug}/rsvps`, "10.4.1.1", {
      name: "Early Guest",
      attending: "yes",
    });
    expect(draftPost.status).toBe(404);
  });

  it("lets people remove themselves: reply deletion and organizer self-deletion", async () => {
    const event = lib.events.createEvent({ deceasedName: "Otto Reyes", publicationAuthorized: true });

    const submit = await postJson(`/api/public/events/${event.slug}/rsvps`, "10.5.1.1", {
      name: "Departing Guest",
      attending: "no",
    });
    const { manageToken } = await submit.json();
    const del = await api(`/api/public/rsvps/${manageToken}`, "10.5.1.1", { method: "DELETE" });
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ deleted: true });
    expect((await api(`/api/public/rsvps/${manageToken}`, "10.5.1.1", { method: "DELETE" })).status).toBe(404);
    expect((await api(`/api/public/rsvps/${manageToken}`, "10.5.1.1")).status).toBe(404);

    const join = await postJson("/api/app/join", "10.5.1.2", {
      familyCode: event.familyCode,
      name: "Leaving Organizer",
    });
    const { token } = await join.json();
    expect((await api("/api/app/event", "10.5.1.2", { headers: bearer(token) })).status).toBe(200);
    const leave = await api("/api/app/me", "10.5.1.2", { method: "DELETE", headers: bearer(token) });
    expect(leave.status).toBe(200);
    expect(await leave.json()).toEqual({ deleted: true });
    expect((await api("/api/app/event", "10.5.1.2", { headers: bearer(token) })).status).toBe(401);
    expect((await api("/api/app/me", "10.5.1.2", { method: "DELETE", headers: bearer(token) })).status).toBe(401);
  });

  it("honors unsubscribe without revealing who is on the list (A8)", async () => {
    const event = lib.events.createEvent({ deceasedName: "Iris Bell", publicationAuthorized: true });
    const submit = await postJson(`/api/public/events/${event.slug}/rsvps`, "10.6.1.1", {
      name: "Opted In",
      email: "farewell@example.com",
      attending: "yes",
      marketingOptIn: true,
    });
    expect(submit.status).toBe(200);
    expect(lib.marketing.listConsentedContacts().some((c) => c.email === "farewell@example.com")).toBe(true);

    const unsub = await postJson("/api/public/unsubscribe", "10.6.1.2", { email: "farewell@example.com" });
    expect(unsub.status).toBe(200);
    expect(await unsub.json()).toEqual({ ok: true });
    expect(lib.marketing.listConsentedContacts().some((c) => c.email === "farewell@example.com")).toBe(false);

    // Garbage input gets the same calm answer.
    const garbage = await postJson("/api/public/unsubscribe", "10.6.1.2", { email: "not an email" });
    expect(garbage.status).toBe(200);
    expect(await garbage.json()).toEqual({ ok: true });
    const numeric = await postJson("/api/public/unsubscribe", "10.6.1.2", { email: 42 });
    expect(numeric.status).toBe(200);
    expect(await numeric.json()).toEqual({ ok: true });
  });

  it("refuses path traversal on the uploads route", async () => {
    const encoded = await api("/api/uploads/..%2F..%2Fsolace.db", "10.7.1.1");
    expect(encoded.status).toBe(404);
    const plain = await api("/api/uploads/../solace.db", "10.7.1.1");
    expect(plain.status).toBe(404);
  });

  it("accepts staff photo uploads with a session and serves them back", async () => {
    const anonymous = await api("/api/admin/photo", "10.8.1.1", { method: "POST", body: new FormData() });
    expect(anonymous.status).toBe(401);

    const staff = lib.staff.createStaffUser({
      email: "director@example.com",
      name: "Director",
      password: "quiet-hallway-9",
    });
    const session = lib.staff.createSession(staff.id);

    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]);
    const form = new FormData();
    form.append("photo", new File([png], "portrait.png", { type: "image/png" }));
    const upload = await api("/api/admin/photo", "10.8.1.1", {
      method: "POST",
      headers: { cookie: `solace_staff=${session}` },
      body: form,
    });
    expect(upload.status).toBe(200);
    const { photoPath } = await upload.json();
    expect(photoPath).toMatch(/^[a-f0-9]{24}\.png$/);

    const served = await api(`/api/uploads/${photoPath}`, "10.8.1.1");
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
  });

  // Deliberately last: this floods one address's join bucket.
  it("rate limits repeated join attempts", async () => {
    const ip = "203.0.113.99";
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await postJson("/api/app/join", ip, { familyCode: "WILLOW-ROSE-0001", name: "Prober" });
      statuses.push(res.status);
      if (res.status === 429) {
        expect((await res.json()).error.code).toBe("rate_limited");
        break;
      }
      await res.arrayBuffer();
    }
    expect(statuses).toContain(429);
    expect(statuses.filter((s) => s === 404)).toHaveLength(10);
  });
});
