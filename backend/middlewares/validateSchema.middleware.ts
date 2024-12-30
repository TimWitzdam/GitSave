import { NextFunction, Request, Response } from "express";
import { Schema } from "zod";

export function validateSchema(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (e) {
      res.status(400).json({ error: "Invalid request body" });
    }
  };
}
