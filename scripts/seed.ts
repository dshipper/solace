import { getDb } from "../lib/db";
import { createStaffUser, getStaffByEmail } from "../lib/staff";
import { getSetting, setSetting } from "../lib/settings";
import { createEvent, listEvents, publicUrl } from "../lib/events";
import { setServices } from "../lib/services";

const OBITUARY = `Margaret Ellen Hayes, 85, of Cedar Falls, passed away peacefully at home on June 20, 2026, surrounded by her family.

Margaret was born March 8, 1941, to Harold and Ruth Whitman. She taught fourth grade at Lincoln Elementary for thirty-one years, where generations of students remember her reading aloud every afternoon, doing all the voices. She married James Hayes in 1963; they shared sixty-two years, two daughters, five grandchildren, and a garden that never quite obeyed either of them.

She is survived by her husband James; her daughters Carol (Mark) Jensen and Patricia (David) Lowe; her grandchildren Emily, Sarah, Michael, Anna, and Thomas; and her sister Dorothy. The family suggests memorial contributions to the Cedar Falls Public Library.`;

function main() {
  getDb();

  if (!getSetting("funeral_home_name")) {
    setSetting("funeral_home_name", "Evergreen Memorial Home");
    console.log("Set funeral_home_name = Evergreen Memorial Home");
  }

  const email = process.env.SOLACE_SEED_EMAIL ?? "dan@every.to";
  if (!getStaffByEmail(email)) {
    createStaffUser({ email, name: "Dan Shipper", password: "solace-demo-1" });
    console.log(`Created staff user ${email} (password: solace-demo-1)`);
  } else {
    console.log(`Staff user ${email} already exists`);
  }

  if (listEvents().length === 0) {
    const event = createEvent({
      deceasedName: "Margaret Ellen Hayes",
      bornOn: "1941-03-08",
      diedOn: "2026-06-20",
      obituaryText: OBITUARY,
    });
    setServices(event.id, [
      {
        kind: "visitation",
        startsAt: "2026-07-10T17:00",
        endsAt: "2026-07-10T19:00",
        venueName: "Evergreen Memorial Home",
        address: "214 Willow Lane, Cedar Falls, IA 50613",
      },
      {
        kind: "funeral",
        startsAt: "2026-07-11T11:00",
        venueName: "First Presbyterian Church",
        address: "902 Main Street, Cedar Falls, IA 50613",
        livestreamUrl: "https://example.com/live/hayes",
      },
      {
        kind: "reception",
        startsAt: "2026-07-11T12:30",
        venueName: "Church Fellowship Hall",
        address: "902 Main Street, Cedar Falls, IA 50613",
        notes: "Lunch will be served. All are welcome.",
      },
    ]);
    console.log(`Created demo event: ${event.deceasedName}`);
    console.log(`  Family code: ${event.familyCode}`);
    console.log(`  Public page: ${publicUrl(event)}`);
  } else {
    const existing = listEvents()[0];
    console.log(`Events already exist; skipping demo event`);
    console.log(`  Existing event: ${existing.deceasedName}`);
    console.log(`  Family code: ${existing.familyCode}`);
    console.log(`  Public page: ${publicUrl(existing)}`);
  }
}

main();
