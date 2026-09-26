// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitize } from "../../backend/lib/sanatize";

describe("sanitize", () => {
  it("keeps safe characters untouched", () => {
    expect(sanitize("My-Repo_2024.name")).toBe("My-Repo_2024.name");
  });

  it("removes characters that are illegal in file names", () => {
    expect(sanitize('a/b\\c?d<e>f:g*h|i"j')).toBe("abcdefghij");
  });

  it("replaces illegal characters with the given replacement", () => {
    expect(sanitize("a/b:c", "_")).toBe("a_b_c");
  });

  it("removes control characters", () => {
    expect(sanitize("a\u0000b\u001fc\u0080d\u009fe")).toBe("abcde");
  });

  it("removes names consisting only of dots", () => {
    expect(sanitize("...")).toBe("");
    expect(sanitize("..")).toBe("");
    expect(sanitize(".")).toBe("");
  });

  it("keeps dots that are not the whole name", () => {
    expect(sanitize("..hidden")).toBe("..hidden");
    expect(sanitize("file..name")).toBe("file..name");
  });

  it("removes windows reserved device names, case insensitive", () => {
    expect(sanitize("con")).toBe("");
    expect(sanitize("CON")).toBe("");
    expect(sanitize("Prn")).toBe("");
    expect(sanitize("aux")).toBe("");
    expect(sanitize("nul")).toBe("");
    expect(sanitize("com1")).toBe("");
    expect(sanitize("lpt9")).toBe("");
    expect(sanitize("con.txt")).toBe("");
  });

  it("keeps names that merely start with a reserved name", () => {
    expect(sanitize("console")).toBe("console");
    expect(sanitize("com10")).toBe("com10");
  });

  it("removes trailing dots and spaces", () => {
    expect(sanitize("repo.")).toBe("repo");
    expect(sanitize("repo  ")).toBe("repo");
    expect(sanitize("repo. ")).toBe("repo");
  });

  it("replaces the first space with a dash", () => {
    expect(sanitize("my repo")).toBe("my-repo");
    expect(sanitize("my repo name")).toBe("my-repo name");
  });

  it("throws for non string input", () => {
    expect(() => sanitize(123 as unknown as string)).toThrow(
      "Input must be string"
    );
    expect(() => sanitize(null as unknown as string)).toThrow(
      "Input must be string"
    );
    expect(() => sanitize(undefined as unknown as string)).toThrow(
      "Input must be string"
    );
  });

  it("returns an empty string for an empty string", () => {
    expect(sanitize("")).toBe("");
  });
});
