// controllers/authController.js
import bcrypt from "bcrypt";
import { usersDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";

export const getLoginPage = (req, res) => {
  res.render("login", { title: "Log In", message: req.query.message });
};

export const getRegisterPage = (req, res) => {
  res.render("register", { title: "Register" });
};

export const postRegister = async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.pass;

  if (!username || !email || !password) {
    res.status(400).render("register", { title: "Register", error: "All fields are required." });
    return;
  }

  try {
    const existingUsername = await usersDb.findOne({ username });
    if (existingUsername) {
      res.status(400).render("register", { title: "Register", error: `Username '${username}' is already taken.` });
      return;
    }
    const existingEmail = await usersDb.findOne({ email });
    if (existingEmail) {
      res.status(400).render("register", { title: "Register", error: `Email '${email}' is already registered.` });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.create({ username, email, password: hashedPassword, role: "student" });
    res.redirect("/login");
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send("Internal Server Error");
  }
};

export const logout = (req, res) => {
  res.clearCookie("jwt").redirect("/");
};
