import { Request } from "express";
import { User } from "./User";

export interface AuthenticatedRequest extends Request {
  user: User;
}
