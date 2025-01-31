import type { Request, Response } from "express";
import { AccessTokenService } from "../services/accessToken.service";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

export async function getAccessTokens(req: Request, res: Response) {
  const username = (req as AuthenticatedRequest).user.username;
  const accessTokens = await AccessTokenService.getAccessToken(username);

  return res.json(accessTokens);
}

export async function createAccessToken(req: Request, res: Response) {
  const { name, token, tokenUsername } = req.body;
  const username = (req as AuthenticatedRequest).user.username;

  const accessToken = await AccessTokenService.createAccessToken(
    name,
    tokenUsername,
    token,
    username
  );

  return res.json(accessToken);
}
