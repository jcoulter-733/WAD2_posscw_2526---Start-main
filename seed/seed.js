// seed/seed.js
import bcrypt from "bcrypt";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

const iso = (d) => new Date(d).toISOString();
const hash = (pw) => bcrypt.hash(pw, 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function wipeAll() {
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

/** Insert a course + its sessions in one call.
 *  sessions: array of { startDateTime, endDateTime, capacity }
 */
async function createCourse(courseData, sessionDefs) {
  const course = await CourseModel.create({ ...courseData, sessionIds: [] });
  const sessions = await Promise.all(
    sessionDefs.map((s) =>
      SessionModel.create({ courseId: course._id, bookedCount: 0, ...s })
    )
  );
  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions };
}

/** Build weekly session slots starting from `firstStart` ISO string. */
function weeklySlots(firstStart, count, durationMins, capacity) {
  const slots = [];
  const base = new Date(firstStart);
  for (let i = 0; i < count; i++) {
    const start = new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end   = new Date(start.getTime() + durationMins * 60 * 1000);
    slots.push({ startDateTime: iso(start), endDateTime: iso(end), capacity });
  }
  return slots;
}

/** Build consecutive-day session slots (e.g. for a weekend workshop). */
function dailySlots(dates, startHour, durationMins, capacity) {
  return dates.map((d) => {
    const start = new Date(`${d}T${String(startHour).padStart(2, "0")}:00:00`);
    const end   = new Date(start.getTime() + durationMins * 60 * 1000);
    return { startDateTime: iso(start), endDateTime: iso(end), capacity };
  });
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("Initialising DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log("Creating users…");

  const [adminPw, student1Pw, student2Pw] = await Promise.all([
    hash("admin123"),
    hash("password1"),
    hash("password1"),
  ]);

  const [admin, student1, student2] = await Promise.all([
    usersDb.insert({
      username: "admin",
      name: "Admin User",
      email: "admin@yogastudio.local",
      password: adminPw,
      role: "organiser",
    }),
    usersDb.insert({
      username: "sarah",
      name: "Sarah Johnson",
      email: "sarah@student.local",
      password: student1Pw,
      role: "student",
    }),
    usersDb.insert({
      username: "james",
      name: "James Patel",
      email: "james@student.local",
      password: student2Pw,
      role: "student",
    }),
  ]);

  // ── Courses ───────────────────────────────────────────────────────────────
  console.log("Creating courses & sessions…");

  // 1. Beginner weekly block — 8 weeks, Monday evenings
  await createCourse(
    {
      title: "Beginner Yoga Foundation",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-13",
      endDate: "2026-06-01",
      price: 12,
      room: "TBA",
      instructor: "TBA",
      description:
        "A gentle 8-week introduction to yoga covering basic postures, breathing, and relaxation. Perfect for those who have never tried yoga before.",
    },
    weeklySlots("2026-04-13T18:00:00", 8, 60, 15)
  );

  // 2. Intermediate weekly block — 10 weeks, Wednesday evenings
  await createCourse(
    {
      title: "Vinyasa Flow — Build Your Practice",
      level: "intermediate",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-15",
      endDate: "2026-06-17",
      price: 15,
      room: "TBA",
      instructor: "TBA",
      description:
        "A dynamic 10-week flowing class linking breath to movement. Expect to build strength, flexibility, and a consistent home practice.",
    },
    weeklySlots("2026-04-15T19:00:00", 10, 75, 14)
  );

  // 3. Advanced weekly block — 6 weeks, Thursday mornings
  await createCourse(
    {
      title: "Advanced Ashtanga Intensive",
      level: "advanced",
      type: "WEEKLY_BLOCK",
      allowDropIn: false,
      startDate: "2026-04-16",
      endDate: "2026-05-21",
      price: 20,
      room: "TBA",
      instructor: "TBA",
      description:
        "A rigorous 6-week Ashtanga series for experienced practitioners. Full primary series with assists and detailed alignment coaching.",
    },
    weeklySlots("2026-04-16T07:00:00", 6, 90, 10)
  );

  // 4. Weekend workshop — Yin & Restorative, two Saturday sessions
  await createCourse(
    {
      title: "Yin & Restorative Weekend",
      level: "beginner",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-02",
      endDate: "2026-05-03",
      price: 35,
      room: "TBA",
      instructor: "TBA",
      description:
        "Two full days of slow, floor-based poses held for 3-5 minutes each. Ideal for stress relief, deep stretching, and nervous system reset.",
    },
    [
      ...dailySlots(["2026-05-02"], 10, 180, 12),
      ...dailySlots(["2026-05-03"], 10, 180, 12),
    ]
  );

  // 5. Weekend workshop — Pranayama & Meditation
  await createCourse(
    {
      title: "Breathwork & Meditation Retreat",
      level: "intermediate",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-16",
      endDate: "2026-05-17",
      price: 45,
      room: "TBA",
      instructor: "TBA",
      description:
        "An immersive weekend exploring pranayama (breath control) and guided meditation techniques. Suitable for those with some yoga experience.",
    },
    [
      ...dailySlots(["2026-05-16"], 9, 120, 16),
      ...dailySlots(["2026-05-16"], 14, 120, 16),
      ...dailySlots(["2026-05-17"], 9, 120, 16),
      ...dailySlots(["2026-05-17"], 14, 120, 16),
    ]
  );

  // 6. Weekly block — Pregnancy Yoga, Tuesday mornings
  await createCourse(
    {
      title: "Pregnancy Yoga",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-04-14",
      endDate: "2026-05-19",
      price: 14,
      room: "TBA",
      instructor: "TBA",
      description:
        "A safe and nurturing 6-week class designed for all stages of pregnancy. Focus on pelvic floor, back relief, and breathing for labour.",
    },
    weeklySlots("2026-04-14T10:00:00", 6, 60, 12)
  );

  // ── Verification ─────────────────────────────────────────────────────────
  const [userCount, courseCount, sessionCount] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
  ]);

  console.log("\n— Verification —");
  console.log("Users   :", userCount);
  console.log("Courses :", courseCount);
  console.log("Sessions:", sessionCount);

  console.log("\n✅ Seed complete. Login credentials:");
  console.log("  Organiser  — username: admin    password: admin123");
  console.log("  Student    — username: sarah    password: password1");
  console.log("  Student    — username: james    password: password1");
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});
