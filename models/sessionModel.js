
// models/sessionModel.js
import { sessionsDb } from './_db.js';

export const SessionModel = {
  async create(session) {
    return sessionsDb.insert(session);
  },
  async listByCourse(courseId) {
    return sessionsDb.find({ courseId }).sort({ startDateTime: 1 });
  },
  async findById(id) {
    return sessionsDb.findOne({ _id: id });
  },
  async delete(id) {
    return sessionsDb.remove({ _id: id });
  },
};
