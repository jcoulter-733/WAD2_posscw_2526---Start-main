// routes/views.js
import { Router } from "express";
import { requireLogin, requireInstructor } from "../middlewares/currentUser.js";
import { login } from "../auth/auth.js";

import {
  homePage,
  coursesListPage,
  courseDetailPage,
  courseBookPage,
} from "../controllers/courseController.js";

import {
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
  userBookingsPage,
  cancelBooking,
} from "../controllers/bookingViewController.js";

import {
  getLoginPage,
  getRegisterPage,
  postRegister,
  logout,
} from "../controllers/authController.js";

import {
  manageCoursesPage,
  newCoursePage,
  createCourse,
  editCoursePage,
  updateCourse,
  deleteCourse,
  courseBookingsPage,
  courseSessionsPage,
  sessionBookingsPage,
  manageUsersPage,
  updateUserRole,
  deleteUser,
  addSession,
  deleteSession,
} from "../controllers/manageController.js";

const router = Router();

// Public course browsing
router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);

// Booking (requires login)
router.get("/courses/:id/book", requireLogin, courseBookPage);
router.post("/courses/:id/book", requireLogin, postBookCourse);
router.post("/sessions/:id/book", requireLogin, postBookSession);
router.get("/bookings", requireLogin, userBookingsPage);
router.get("/bookings/:bookingId", requireLogin, bookingConfirmationPage);
router.post("/bookings/:id/cancel", requireLogin, cancelBooking);

// Auth
router.get("/login", getLoginPage);
router.post("/login", login, (_req, res) => res.redirect("/"));
router.get("/register", getRegisterPage);
router.post("/register", postRegister);
router.post("/logout", logout);

// Manage (requires login + instructor role)
router.get("/manage/courses", requireLogin, requireInstructor, manageCoursesPage);
router.get("/manage/courses/new", requireLogin, requireInstructor, newCoursePage);
router.post("/manage/courses/new", requireLogin, requireInstructor, createCourse);
router.get("/manage/courses/:id/edit", requireLogin, requireInstructor, editCoursePage);
router.post("/manage/courses/:id/edit", requireLogin, requireInstructor, updateCourse);
router.post("/manage/courses/:id/delete", requireLogin, requireInstructor, deleteCourse);
router.get("/manage/courses/:id/bookings", requireLogin, requireInstructor, courseBookingsPage);
router.get("/manage/courses/:id/sessions", requireLogin, requireInstructor, courseSessionsPage);
router.get("/manage/sessions/:id/bookings", requireLogin, requireInstructor, sessionBookingsPage);
router.post("/manage/courses/:id/sessions", requireLogin, requireInstructor, addSession);
router.post("/manage/sessions/:id/delete", requireLogin, requireInstructor, deleteSession);
router.get("/manage/users", requireLogin, requireInstructor, manageUsersPage);
router.post("/manage/users/:id/role", requireLogin, requireInstructor, updateUserRole);
router.post("/manage/users/:id/delete", requireLogin, requireInstructor, deleteUser);

export default router;
