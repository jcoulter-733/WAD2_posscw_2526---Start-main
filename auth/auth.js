import bcrypt from "bcrypt";
import { usersDb } from "../models/_db.js";
import jwt from "jsonwebtoken";

export const login = async (req, res, next) => {
  try {
    const username = req.body?.username;
    const password = req.body?.password;

    if (!username || !password) {
      return res.status(400).render("login");
    }

    const entries = await usersDb.find({ username });

    if (!entries || entries.length === 0) {
      console.log("User", username, "not found");
      return res.render("register");
    }

    const userRecord = entries[0];

    if (!userRecord || typeof userRecord.password !== "string") {
      console.warn(`Malformed user record for ${username}:`, userRecord);
      return res.status(500).send("Internal Server Error");
    }

    const hashedPassword = userRecord.password;
    if (!hashedPassword) {
      console.warn(`No password hash stored for user ${username}`);
      return res.status(403).render("login");
    }

    const isValid = await bcrypt.compare(password, hashedPassword);
    if (!isValid) {
      return res.status(403).render("login");
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      console.error("ACCESS_TOKEN_SECRET is not set");
      return res.status(500).send("Server misconfiguration");
    }

    const payload = { _id: userRecord._id, username, role: userRecord.role ?? "student" };
    const accessToken = jwt.sign(payload, secret, { expiresIn: 300 });

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 300 * 1000,
    });

    return next();
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

export const verify = (req, res, next) => {
  const accessToken = req.cookies?.jwt;

  if (!accessToken) {
    return res.status(403).send();
  }

  try {
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).send();
  }
};



