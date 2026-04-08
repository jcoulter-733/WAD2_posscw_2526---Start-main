import jwt from "jsonwebtoken";

export const attachCurrentUser = (req, res, next) => {
  const token = req.cookies?.jwt;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    res.locals.user = payload; // exposed to Mustache as {{user}}
    res.locals.isInstructor = payload.role === "organiser";
  } catch {
    // invalid/expired token — treat as logged out
  }
  next();
};

export const requireLogin = (req, res, next) => {
  if (res.locals.user) return next();
  res.redirect("/login?message=Please+log+in+to+view+this+page");
};

export const requireInstructor = (req, res, next) => {
  if (res.locals.user?.role === "organiser") return next();
  res.status(403).render("error", { title: "Forbidden", message: "Instructor access required." });
};
