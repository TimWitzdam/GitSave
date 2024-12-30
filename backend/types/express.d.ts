import "express";
import { User } from "./User";

declare module "express" {
  export interface Request {
    user?: User;
  }

  export interface RequestWith {
    user: User;
  }
}
