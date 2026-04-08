import { randomBytes } from "crypto";

const COOKIE = "x-csrf-token";

// Attach a CSRF token to every request and expose it to views.
// On mutating requests (POST etc.), validate the submitted token matches the cookie.
export const csrfMiddleware = (req, res, next) => {
  // Generate or reuse the token from the cookie
  let token = req.cookies[COOKIE];
  if (!token) {
    token = randomBytes(32).toString("hex");
    res.cookie(COOKIE, token, {
      httpOnly: false, // must be readable by the form (double-submit pattern)
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Expose to Mustache templates
  res.locals.csrfToken = token;

  // Validate on mutating methods
  const safe = ["GET", "HEAD", "OPTIONS"];
  if (!safe.includes(req.method)) {
    const submitted = req.body?._csrf;
    if (!submitted || submitted !== token) {
      return res.status(403).send("Invalid CSRF token");
    }
  }

  next();
};
