// controllers/courseController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { fmtDate, fmtDateOnly } from "../utils/formatters.js";

export const homePage = async (_req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: fmtDateOnly(c.startDate),
          endDate: fmtDateOnly(c.endDate),
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
        };
      })
    );
    res.render("home", { title: "Yoga Courses", courses: cards });
  } catch (err) {
    next(err);
  }
};

export const coursesListPage = async (req, res, next) => {
  try {
    const {
      level,
      type,
      dropin,
      q,
      page = "1",
      pageSize = "10",
    } = req.query;

    const filter = {};
    if (level) filter.level = level;
    if (type) filter.type = type;
    if (dropin === "yes") filter.allowDropIn = true;
    if (dropin === "no") filter.allowDropIn = false;

    let courses = await CourseModel.list(filter);

    const needle = (q || "").trim().toLowerCase();
    if (needle) {
      courses = courses.filter(
        (c) =>
          c.title?.toLowerCase().includes(needle) ||
          c.description?.toLowerCase().includes(needle)
      );
    }

    courses.sort((a, b) => {
      const ad = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (a.title || "").localeCompare(b.title || "");
    });

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.max(1, parseInt(pageSize, 10) || 10);
    const total = courses.length;
    const totalPages = Math.max(1, Math.ceil(total / ps));
    const start = (p - 1) * ps;
    const pageItems = courses.slice(start, start + ps);

    const cards = await Promise.all(
      pageItems.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const first = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: fmtDateOnly(c.startDate),
          endDate: fmtDateOnly(c.endDate),
          nextSession: first ? fmtDate(first.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
        };
      })
    );

    const pagination = {
      page: p,
      pageSize: ps,
      total,
      totalPages,
      hasMultiplePages: totalPages > 1,
      hasPrev: p > 1,
      hasNext: p < totalPages,
      prevLink: p > 1 ? buildLink(req, p - 1, ps) : null,
      nextLink: p < totalPages ? buildLink(req, p + 1, ps) : null,
    };

    res.render("courses", { title: "Courses", filters: { level, type, dropin, q }, courses: cards, pagination });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);

    const userId = res.locals.user?._id;
    const userBookings = userId
      ? (await BookingModel.listByCourse(courseId)).filter(
          (b) => b.userId === userId && b.status !== "CANCELLED"
        )
      : [];

    const courseBooking = userBookings.find((b) => b.type === "COURSE");
    const hasAnyBooking = userBookings.length > 0;
    const sessionPrice = course.price ?? 0;
    const totalPrice = (sessionPrice * sessions.length).toFixed(2);

    const rows = await Promise.all(sessions.map(async (s) => {
      const booked = await BookingModel.countConfirmedForSession(s._id);
      const remaining = Math.max(0, (s.capacity ?? 0) - booked);
      const sessionBooking = userBookings.find(
        (b) => b.type === "SESSION" && b.sessionIds?.includes(s._id)
      );
      return {
        id: s._id,
        start: fmtDate(s.startDateTime),
        end: fmtDate(s.endDateTime),
        capacity: s.capacity,
        booked,
        remaining,
        allowDropIn: course.allowDropIn,
        isFull: remaining === 0,
        userBooked: !!sessionBooking,
        userBookingId: sessionBooking?._id ?? null,
        price: sessionPrice.toFixed(2),
        
      };
    }));

    const courseFull = rows.length > 0 && rows.every((r) => r.isFull);

    res.render("course", {
      title: course.title,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: fmtDateOnly(course.startDate),
        endDate: fmtDateOnly(course.endDate),
        description: course.description,
        price: sessionPrice.toFixed(2),
        totalPrice,
        sessionsCount: sessions.length,
        courseFull,
        canBookCourse: !hasAnyBooking,
        courseBooked: !!courseBooking,
        courseBookingId: courseBooking?._id ?? null,
        room: course.room,
        instructor: course.instructor,
      },
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const courseBookPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = await Promise.all(sessions.map(async (s) => {
      const booked = await BookingModel.countConfirmedForSession(s._id);
      return {
        start: fmtDate(s.startDateTime),
        remaining: Math.max(0, (s.capacity ?? 0) - booked),
      };
    }));

    res.render("course_book", {
      title: `Book: ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: fmtDateOnly(course.startDate),
        endDate: fmtDateOnly(course.endDate),
        description: course.description,
      },
      sessions: rows,
      sessionsCount: rows.length,
    });
  } catch (err) {
    next(err);
  }
};

function buildLink(req, page, pageSize) {
  const url = new URL(
    `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`
  );
  const params = new URLSearchParams(req.query);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${url.pathname}?${params.toString()}`;
}
