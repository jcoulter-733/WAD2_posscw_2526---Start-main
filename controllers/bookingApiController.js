// controllers/bookingApiController.js
import { bookCourseForUser, bookSessionForUser, promoteWaitlist } from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

export const bookCourse = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { courseId } = req.body;
    const booking = await bookCourseForUser(userId, courseId);
    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const bookSession = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { sessionId } = req.body;
    const booking = await bookSessionForUser(userId, sessionId);
    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res
      .status(err.code === "DROPIN_NOT_ALLOWED" ? 400 : 500)
      .json({ error: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status === "CANCELLED") return res.json({ booking });

    const cancelled = await BookingModel.cancel(bookingId);
    await promoteWaitlist(cancelled);
    res.json({ booking: cancelled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
};
