import prisma from "../../prisma/client.js";

export const userExistCheck = (req, res, next) => {
  prisma.user.findMany({}).then((users) => {
    if (users.length > 0) {
      return res.redirect("/login");
    } else {
      next();
    }
  });
};
