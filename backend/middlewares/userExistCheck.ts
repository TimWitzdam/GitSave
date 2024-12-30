import { NextFunction, Request, Response } from "express";
import prisma from "../../prisma/client";

export const userExistCheck = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  prisma.user.findMany({}).then((users) => {
    if (users.length > 0) {
      return res.redirect("/login");
    } else {
      next();
    }
  });
};
