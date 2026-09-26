// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validateSchema } from "../../backend/middlewares/validateSchema.middleware";

const schema = z.object({
  name: z.string(),
  count: z.number(),
  mode: z.enum(["a", "b"]),
});

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("validateSchema", () => {
  it("calls next for a valid body", () => {
    const next = vi.fn();
    const res = createResponse();
    validateSchema(schema)(
      { body: { name: "x", count: 1, mode: "a" } } as never,
      res as never,
      next
    );
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("answers 400 for a body missing fields", () => {
    const next = vi.fn();
    const res = createResponse();
    validateSchema(schema)(
      { body: { name: "x" } } as never,
      res as never,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request body" });
  });

  it("answers 400 for wrong types", () => {
    const next = vi.fn();
    const res = createResponse();
    validateSchema(schema)(
      { body: { name: 1, count: "1", mode: "a" } } as never,
      res as never,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("answers 400 for invalid enum values", () => {
    const next = vi.fn();
    const res = createResponse();
    validateSchema(schema)(
      { body: { name: "x", count: 1, mode: "c" } } as never,
      res as never,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("answers 400 when body is undefined", () => {
    const next = vi.fn();
    const res = createResponse();
    validateSchema(schema)({} as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
