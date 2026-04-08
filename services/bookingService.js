// services/bookingService.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

export async function bookCourseForUser(userId, courseId) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new Error("Course not found");
  const sessions = await SessionModel.listByCourse(courseId);
  if (sessions.length === 0) throw new Error("Course has no sessions");

  // Compute live counts for each session
  const counts = await Promise.all(
    sessions.map((s) => BookingModel.countConfirmedForSession(s._id))
  );

  const allAvailable = sessions.every((s, i) => counts[i] < (s.capacity ?? 0));
  const status = allAvailable ? "CONFIRMED" : "WAITLISTED";

  return BookingModel.create({
    userId,
    courseId,
    type: "COURSE",
    sessionIds: sessions.map((s) => s._id),
    status,
  });
}

export async function promoteWaitlist(cancelledBooking) {
  const { courseId, type, sessionIds } = cancelledBooking;

  if (type === "COURSE") {
    const waitlisted = await BookingModel.findOldestWaitlisted({ courseId, type: "COURSE" });
    if (!waitlisted) return;

    // Only promote if all sessions in that booking now have capacity
    const sessions = await Promise.all(waitlisted.sessionIds.map((id) => SessionModel.findById(id)));
    const counts = await Promise.all(waitlisted.sessionIds.map((id) => BookingModel.countConfirmedForSession(id)));
    const allAvailable = sessions.every((s, i) => s && counts[i] < (s.capacity ?? 0));

    if (allAvailable) {
      await BookingModel.confirm(waitlisted._id);
    }
  } else if (type === "SESSION") {
    for (const sessionId of sessionIds) {
      const session = await SessionModel.findById(sessionId);
      if (!session) continue;

      const confirmedCount = await BookingModel.countConfirmedForSession(sessionId);
      if (confirmedCount >= (session.capacity ?? 0)) continue;

      const waitlisted = await BookingModel.findOldestWaitlisted({ sessionId, type: "SESSION" });
      if (waitlisted) {
        await BookingModel.confirm(waitlisted._id);
      }
    }
  }
}

export async function bookSessionForUser(userId, sessionId) {
  const session = await SessionModel.findById(sessionId);
  if (!session) throw new Error("Session not found");
  const course = await CourseModel.findById(session.courseId);
  if (!course) throw new Error("Course not found");

  if (!course.allowDropIn && course.type === "WEEKLY_BLOCK") {
    const err = new Error("Drop-in not allowed for this course");
    err.code = "DROPIN_NOT_ALLOWED";
    throw err;
  }

  const confirmedCount = await BookingModel.countConfirmedForSession(sessionId);
  const status = confirmedCount >= (session.capacity ?? 0) ? "WAITLISTED" : "CONFIRMED";

  return BookingModel.create({
    userId,
    courseId: course._id,
    type: "SESSION",
    sessionIds: [session._id],
    status,
  });
}
