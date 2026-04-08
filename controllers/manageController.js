// controllers/manageController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { usersDb } from "../models/_db.js";
import { fmtDate, fmtDateOnly } from "../utils/formatters.js";

// GET /manage/courses
export const manageCoursesPage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const rows = courses.map((c) => ({
      id: c._id,
      title: c.title,
      level: c.level,
      type: c.type,
      startDate: fmtDateOnly(c.startDate),
      endDate: fmtDateOnly(c.endDate),
      allowDropIn: c.allowDropIn,
    }));
    res.render("manage/courses", { title: "Manage Classes", courses: rows });
  } catch (err) {
    next(err);
  }
};

// GET /manage/courses/new
export const newCoursePage = async (req, res, next) => {
  try {
    const organisers = await usersDb.find({ role: "organiser" });
    const organiserList = organisers.map((u) => ({ id: u._id, username: u.username ?? u.name }));
    res.render("manage/courseForm", { title: "Add New Class", course: null, organisers: organiserList });
  } catch (err) {
    next(err);
  }
};

// POST /manage/courses/new
export const createCourse = async (req, res, next) => {
  try {
    const { title, description, level, type, startDate, endDate, allowDropIn, location, price, instructorId } = req.body;
    await CourseModel.create({
      title,
      description,
      level,
      type,
      startDate: startDate || null,
      endDate: endDate || null,
      allowDropIn: allowDropIn === "on",
      location: location || null,
      price: price ? parseFloat(price) : null,
      instructorId: instructorId || null,
    });
    res.redirect("/manage/courses");
  } catch (err) {
    next(err);
  }
};

// GET /manage/courses/:id/edit
export const editCoursePage = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(course._id);
    const sessionRows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
    }));

    const organisers = await usersDb.find({ role: "organiser" });
    const organiserList = organisers.map((u) => ({
      id: u._id,
      username: u.username ?? u.name,
      selected: u._id === course.instructorId,
    }));

    res.render("manage/courseForm", {
      title: "Edit Class",
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        level: course.level,
        type: course.type,
        startDate: course.startDate ? course.startDate.slice(0, 10) : "",
        endDate: course.endDate ? course.endDate.slice(0, 10) : "",
        allowDropIn: course.allowDropIn,
        location: course.location ?? "",
        price: course.price ?? "",
        isLevelBeginner: course.level === "beginner",
        isLevelIntermediate: course.level === "intermediate",
        isLevelAdvanced: course.level === "advanced",
        isTypeWeekly: course.type === "WEEKLY_BLOCK",
        isTypeWeekend: course.type === "WEEKEND_WORKSHOP",
      },
      organisers: organiserList,
      sessions: sessionRows,
    });
  } catch (err) {
    next(err);
  }
};

// POST /manage/courses/:id/edit
export const updateCourse = async (req, res, next) => {
  try {
    const { title, description, level, type, startDate, endDate, allowDropIn, location, price, instructorId } = req.body;
    await CourseModel.update(req.params.id, {
      title,
      description,
      level,
      type,
      startDate: startDate || null,
      endDate: endDate || null,
      allowDropIn: allowDropIn === "on",
      location: location || null,
      price: price ? parseFloat(price) : null,
      instructorId: instructorId || null,
    });
    res.redirect("/manage/courses");
  } catch (err) {
    next(err);
  }
};

// POST /manage/courses/:id/delete
export const deleteCourse = async (req, res, next) => {
  try {
    await CourseModel.delete(req.params.id);
    res.redirect("/manage/courses");
  } catch (err) {
    next(err);
  }
};

// POST /manage/courses/:id/sessions
export const addSession = async (req, res, next) => {
  try {
    const { startDateTime, endDateTime, capacity } = req.body;
    await SessionModel.create({
      courseId: req.params.id,
      startDateTime,
      endDateTime,
      capacity: parseInt(capacity, 10),
      bookedCount: 0,
    });
    res.redirect(`/manage/courses/${req.params.id}/edit`);
  } catch (err) {
    next(err);
  }
};

// POST /manage/sessions/:id/delete
export const deleteSession = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session) return res.status(404).render("error", { title: "Not found", message: "Session not found" });
    await SessionModel.delete(req.params.id);
    res.redirect(`/manage/courses/${session.courseId}/edit`);
  } catch (err) {
    next(err);
  }
};

// GET /manage/users
export const manageUsersPage = async (req, res, next) => {
  try {
    const users = await usersDb.find({});
    const rows = users.map((u) => ({
      id: u._id,
      username: u.username ?? u.name ?? "—",
      role: u.role ?? "student",
      isInstructor: (u.role ?? "student") === "organiser",
    }));
    res.render("manage/users", { title: "Manage Users", users: rows });
  } catch (err) {
    next(err);
  }
};

// POST /manage/users/:id/role
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["student", "organiser"].includes(role)) {
      return res.status(400).render("error", { title: "Bad request", message: "Invalid role." });
    }
    await usersDb.update({ _id: req.params.id }, { $set: { role } });
    res.redirect("/manage/users");
  } catch (err) {
    next(err);
  }
};

// POST /manage/users/:id/delete
export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    await BookingModel.deleteByUser(userId);
    await usersDb.remove({ _id: userId });
    res.redirect("/manage/users");
  } catch (err) {
    next(err);
  }
};

// GET /manage/courses/:id/bookings
export const courseBookingsPage = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const bookings = await BookingModel.listByCourse(req.params.id);
    const rows = await Promise.all(bookings.map(async (b) => {
      const user = b.userId ? await usersDb.findOne({ _id: b.userId }) : null;
      return {
        username: user?.username ?? user?.name ?? "Unknown",
        type: b.type === "COURSE" ? "Full course" : "Single session",
        status: b.status,
        createdAt: b.createdAt ? fmtDateOnly(b.createdAt) : "",
      };
    }));

    res.render("manage/courseBookings", {
      title: `Bookings: ${course.title}`,
      course: { id: course._id, title: course.title },
      backHref: "/manage/courses",
      backLabel: "Back to Classes",
      bookings: rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /manage/courses/:id/sessions
export const courseSessionsPage = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const now = new Date().toISOString();
    const allSessions = await SessionModel.listByCourse(course._id);
    const upcoming = allSessions.filter((s) => s.startDateTime >= now);

    const sessionRows = upcoming.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      bookedCount: s.bookedCount ?? 0,
    }));

    res.render("manage/sessions", {
      title: `Sessions: ${course.title}`,
      hasSessions: sessionRows.length > 0,
      sessions: sessionRows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /manage/sessions/:id/bookings
export const sessionBookingsPage = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session) return res.status(404).render("error", { title: "Not found", message: "Session not found" });

    const course = await CourseModel.findById(session.courseId);

    const bookings = await BookingModel.listBySession(req.params.id);
    const rows = await Promise.all(bookings.map(async (b) => {
      const user = b.userId ? await usersDb.findOne({ _id: b.userId }) : null;
      return {
        username: user?.username ?? user?.name ?? "Unknown",
        type: b.type === "COURSE" ? "Full course" : "Single session",
        status: b.status,
        createdAt: b.createdAt ? fmtDateOnly(b.createdAt) : "",
      };
    }));

    res.render("manage/courseBookings", {
      title: `Bookings: ${fmtDate(session.startDateTime)}`,
      backHref: `/manage/courses/${session.courseId}/sessions`,
      backLabel: `Back to Sessions${course ? ` — ${course.title}` : ""}`,
      bookings: rows,
    });
  } catch (err) {
    next(err);
  }
};
