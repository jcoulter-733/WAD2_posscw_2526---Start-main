// controllers/bookingViewController.js
import { BookingModel } from "../models/bookingModel.js";
import { CourseModel } from "../models/courseModel.js";
import { bookCourseForUser, bookSessionForUser, promoteWaitlist } from "../services/bookingService.js";
import { fmtDate } from "../utils/formatters.js";

export const postBookCourse = async (req, res, _next) => {
  try {
    const courseId = req.params.id;
    const booking = await bookCourseForUser(res.locals.user._id, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res.status(400).render("error", { title: "Booking failed", message: err.message });
  }
};

export const postBookSession = async (req, res, _next) => {
  try {
    const sessionId = req.params.id;
    const booking = await bookSessionForUser(res.locals.user._id, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.bookingId);
    if (!booking)
      return res.status(404).render("error", { title: "Not found", message: "Booking not found" });

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const userBookingsPage = async (_req, res, next) => {
  try {
    const userId = res.locals.user._id;
    const rawBookings = await BookingModel.listByUser(userId);

    const list = await Promise.all(rawBookings.map(async (b) => {
      const course = b.courseId ? await CourseModel.findById(b.courseId) : null;
      return {
        id: b._id,
        courseTitle: course ? course.title : "Unknown course",
        type: b.type === "COURSE" ? "Full course" : "Single session",
        createdAt: b.createdAt ? fmtDate(b.createdAt) : "",
        status: b.status,
        cancellable: b.status !== "CANCELLED",
      };
    }));

    res.render("usersBookings", {
      title: "My Bookings",
      bookings: list.length ? { list } : null,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.id);
    if (!booking)
      return res.status(404).render("error", { title: "Not found", message: "Booking not found" });
    if (booking.status === "CANCELLED") return res.redirect("/bookings");

    const cancelled = await BookingModel.cancel(req.params.id);
    await promoteWaitlist(cancelled);
    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
};
