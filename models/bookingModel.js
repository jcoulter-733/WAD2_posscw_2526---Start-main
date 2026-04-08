
// models/bookingModel.js
import { bookingsDb } from './_db.js';

export const BookingModel = {
  async create(booking) {
    return bookingsDb.insert({ ...booking, createdAt: new Date().toISOString() });
  },
  async findById(id) {
    return bookingsDb.findOne({ _id: id });
  },
  async listByUser(userId) {
    return bookingsDb.find({ userId }).sort({ createdAt: -1 });
  },
  async cancel(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: 'CANCELLED' } });
    return this.findById(id);
  },
  async listByCourse(courseId) {
    return bookingsDb.find({ courseId }).sort({ createdAt: -1 });
  },
  async listBySession(sessionId) {
    return bookingsDb.find({ sessionIds: { $elemMatch: sessionId }, status: { $ne: "CANCELLED" } }).sort({ createdAt: 1 });
  },
  async deleteByUser(userId) {
    return bookingsDb.remove({ userId }, { multi: true });
  },
  async countConfirmedForSession(sessionId) {
    const bookings = await bookingsDb.find({
      sessionIds: { $elemMatch: sessionId },
      status: "CONFIRMED",
    });
    return bookings.length;
  },
  async findOldestWaitlisted({ courseId, type, sessionId } = {}) {
    const query = { status: "WAITLISTED" };
    if (type) query.type = type;
    if (courseId) query.courseId = courseId;
    if (sessionId) query.sessionIds = { $elemMatch: sessionId };
    const results = await bookingsDb.find(query).sort({ createdAt: 1 });
    return results[0] ?? null;
  },
  async confirm(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: "CONFIRMED" } });
    return this.findById(id);
  },
};
``
