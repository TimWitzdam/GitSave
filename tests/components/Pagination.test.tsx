// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Pagination from "../../src/components/Pagination/Pagination";

function readLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((link) => ({
    text: link.textContent,
    href: link.getAttribute("href"),
    current: link.className.includes("bg-white"),
  }));
}

function readPageLinks(container: HTMLElement) {
  return readLinks(container).filter((link) => link.text !== "");
}

describe("Pagination", () => {
  it("renders all pages when they fit on one view", () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={20} perPage={10} />
    );
    expect(readPageLinks(container).map((link) => link.text)).toEqual([
      "1",
      "2",
    ]);
  });

  it("renders the first pages and an ellipsis for many pages", () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={50} perPage={10} />
    );
    expect(readPageLinks(container)).toEqual([
      { text: "1", href: "?page=1", current: true },
      { text: "2", href: "?page=2", current: false },
      { text: "3", href: "?page=3", current: false },
      { text: "...", href: "?page=...", current: false },
      { text: "5", href: "?page=5", current: false },
    ]);
  });

  it("centers the window around the current page", () => {
    const { container } = render(
      <Pagination currentPage={3} totalItems={50} perPage={10} />
    );
    expect(readPageLinks(container)).toEqual([
      { text: "1", href: "?page=1", current: false },
      { text: "...", href: "?page=...", current: false },
      { text: "3", href: "?page=3", current: true },
      { text: "4", href: "?page=4", current: false },
      { text: "5", href: "?page=5", current: false },
    ]);
  });

  it("shows the last pages when the current page is near the end", () => {
    const { container } = render(
      <Pagination currentPage={5} totalItems={50} perPage={10} />
    );
    expect(readPageLinks(container).map((link) => link.text)).toEqual([
      "1",
      "...",
      "3",
      "4",
      "5",
    ]);
    expect(readPageLinks(container)[4].current).toBe(true);
  });

  it("renders the previous link correctly", () => {
    const { container } = render(
      <Pagination currentPage={4} totalItems={50} perPage={10} />
    );
    const links = readLinks(container);
    expect(links[0].href).toBe("?page=3");
  });

  it("clamps the previous link to page 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={50} perPage={10} />
    );
    expect(readLinks(container)[0].href).toBe("?page=1");
  });

  it("advances the next link", () => {
    const { container } = render(
      <Pagination currentPage={2} totalItems={50} perPage={10} />
    );
    const links = readLinks(container);
    expect(links[links.length - 1].href).toBe("?page=3");
  });

  it("clamps the next link to the last page", () => {
    const { container } = render(
      <Pagination currentPage={5} totalItems={50} perPage={10} />
    );
    const links = readLinks(container);
    expect(links[links.length - 1].href).toBe("?page=5");
  });

  it("renders no page links when there are no items", () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={0} perPage={10} />
    );
    expect(readPageLinks(container)).toEqual([]);
    expect(readLinks(container)[0].href).toBe("?page=1");
    expect(readLinks(container)[1].href).toBe("?page=1");
  });

  it("rounds total pages up", () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={21} perPage={10} />
    );
    expect(readPageLinks(container).map((link) => link.text)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("renders all pages when on the second page of a small result set", () => {
    const { container } = render(
      <Pagination currentPage={2} totalItems={30} perPage={10} />
    );
    expect(readPageLinks(container)).toEqual([
      { text: "1", href: "?page=1", current: false },
      { text: "2", href: "?page=2", current: true },
      { text: "3", href: "?page=3", current: false },
    ]);
  });

  it("renders all pages when on the last page of a four page result set", () => {
    const { container } = render(
      <Pagination currentPage={4} totalItems={40} perPage={10} />
    );
    expect(readPageLinks(container).map((link) => link.text)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(readPageLinks(container)[3].current).toBe(true);
  });
});
