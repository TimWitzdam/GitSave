import { HistoryService } from "../services/history.service";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

interface PaginationQuery {
  limit?: string;
  offset?: string;
}

export async function getHistory(
  req: Request<{}, {}, {}, PaginationQuery>,
  res: Response
) {
  const { limit, offset } = req.query;
  const username = (req as AuthenticatedRequest).user.username;

  // Convert string values to numbers
  const numLimit = limit ? parseInt(limit, 10) : undefined;
  const numOffset = offset ? parseInt(offset, 10) : undefined;

  // Check if values are missing or invalid
  if (
    numLimit === undefined ||
    numOffset === undefined ||
    isNaN(numLimit) ||
    isNaN(numOffset) ||
    numLimit <= 0 ||
    numOffset < 0
  ) {
    return res.status(400).send("Invalid limit or offset");
  }

  const { backupHistory, totalCount } = await HistoryService.getHistory(
    username,
    numOffset,
    numLimit
  );
  return res.json({ backupHistory, totalCount });
}
