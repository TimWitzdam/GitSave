import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function getCookie(cookies, name) {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export const authenticateJWT = (
  req,
  res,
  next,
  redirectOnSuccess = undefined
) => {
  const token = getCookie(req.headers.cookie, "auth_session");

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (redirectOnSuccess === false) {
          return res.redirect("/login");
        } else if (redirectOnSuccess === undefined) {
          return res.status(403).json({ message: "Invalid token" });
        }
      }

      if (redirectOnSuccess === true) {
        return res.redirect("/dashboard");
      }

      req.user = user;
      next();
    });
  } else {
    if (redirectOnSuccess === false) {
      return res.redirect("/login");
    } else if (redirectOnSuccess === true) {
      next();
    } else {
      res.status(401).json({ message: "No token provided" });
    }
  }
};
