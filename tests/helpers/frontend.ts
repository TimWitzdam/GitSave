import { vi } from "vitest";

interface ResponseOptions {
  ok?: boolean;
  status?: number;
}

/** Creates a minimal Response-like object usable by `fetch` mocks. */
export function jsonResponse(data: unknown, options: ResponseOptions = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () =>
      Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
  } as unknown as Response;
}

export function textResponse(data: string, options: ResponseOptions = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(data),
  } as unknown as Response;
}

/** Installs a fresh fetch mock on the jsdom window (and globalThis). */
export function stubFetch() {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/**
 * jsdom logs a "Not implemented: navigation" error through console.error when
 * components assign to location.href / call location.reload inside tests.
 * Call this to keep the output clean.
 */
export function silenceJsdomErrors() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

/** Sets ?page=... on the jsdom URL for components that read location.search. */
export function setLocationSearch(search: string) {
  window.history.pushState({}, "", `/${search}`);
}

export function resetLocationSearch() {
  window.history.pushState({}, "", "/");
}
