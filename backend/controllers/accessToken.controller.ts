import type { Request, Response } from "express";
import { AccessTokenService } from "../services/accessToken.service";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { scheduleCronJobs } from "../server";

export async function getAccessTokens(req: Request, res: Response) {
  const username = (req as AuthenticatedRequest).user.username;
  const accessTokens = await AccessTokenService.getAccessToken(username);

  return res.json(accessTokens);
}

export async function createAccessToken(req: Request, res: Response) {
  const { name, token } = req.body;
  const username = (req as AuthenticatedRequest).user.username;

  const accessToken = await AccessTokenService.createAccessToken(
    name,
    token,
    username,
  );

  return res.json(accessToken);
}

export async function updateAccessToken(req: Request, res: Response) {
  const { name, token } = req.body;
  const { id } = req.params;

  const accessToken = await AccessTokenService.updateAccessToken(
    Number(id),
    name,
    token,
  );
  scheduleCronJobs();

  return res.json(accessToken);
}

export async function deleteAccessToken(req: Request, res: Response) {
  const { id } = req.params;

  await AccessTokenService.deleteAccessToken(Number(id));

  scheduleCronJobs();

  return res.status(204).send();
}
