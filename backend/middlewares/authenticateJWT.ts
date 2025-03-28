import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { DISABLE_AUTH, JWT_SECRET } from "../configs/app.config";
import { User } from "../types/User";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import prisma from "../../prisma/client";

function getCookie(cookies: string | undefined, name: string) {
  const value = `; ${cookies}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
  redirectOnSuccess: boolean | undefined = undefined,
) => {
  if (DISABLE_AUTH) {
    prisma.user.findFirst().then((user) => {
      if (!user) {
        return res.status(500).json({ message: "No user found" });
      }

      if (redirectOnSuccess === true) {
        return res.redirect("/dashboard");
      }

      (req as AuthenticatedRequest).user = user as User;
      return next();
    });
  } else {
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

        (req as AuthenticatedRequest).user = user as User;
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
  }
};
