import React from "react";
import ShortArrow from "../icons/ShortArrow";
import PageElement from "./PageElement";

type Props = {
  currentPage: number;
  totalItems: number;
  perPage: number;
};

type PageElement = number | "...";

export default function Pagination(props: Props) {
  let pageElements: PageElement[] = [];
  let totalPages = Math.ceil(props.totalItems / props.perPage);

  if (props.currentPage >= 2) {
    if (props.currentPage + 1 > totalPages) {
      if (totalPages <= 4) {
        for (let i = 0; totalPages > i; i++) {
          pageElements[i] = i + 1;
        }
      } else {
        pageElements[4] = totalPages;
        pageElements[3] = totalPages - 1;
        pageElements[2] = totalPages - 2;
        pageElements[1] = "...";
        pageElements[0] = 1;
      }
    } else {
      if (totalPages <= 4) {
        for (let i = 0; totalPages > i; i++) {
          pageElements[i] = i + 1;
        }
      } else {
        if (
          props.currentPage + 1 === totalPages ||
          props.currentPage + 2 === totalPages
        ) {
          pageElements[4] = totalPages;
          pageElements[3] = totalPages - 1;
          pageElements[2] = totalPages - 2;
          pageElements[1] = "...";
          pageElements[0] = 1;
        } else {
          pageElements[0] = props.currentPage - 1;
          pageElements[1] = props.currentPage;
          pageElements[2] = props.currentPage + 1;
          pageElements[3] = "...";
          pageElements[4] = totalPages;
        }
      }
    }
  } else {
    if (totalPages > 4) {
      pageElements[0] = 1;
      pageElements[1] = 2;
      pageElements[2] = 3;
      pageElements[3] = "...";
      pageElements[4] = totalPages;
    } else {
      for (let i = 0; totalPages > i; i++) {
        pageElements[i] = i + 1;
      }
    }
  }

  return (
    <div className="flex items-center">
      <a
        href={`?page=${props.currentPage - 1 <= 1 ? props.currentPage : props.currentPage - 1}`}
        className="border-2 border-r-0 border-white w-12 h-12 grid place-content-center text-center rounded-l-lg"
      >
        <div className="rotate-180">
          <ShortArrow />
        </div>
      </a>
      {pageElements.map(
        (pageElement: PageElement, index: number) =>
          pageElement && (
            <PageElement
              key={index}
              current={props.currentPage === pageElement}
            >
              {pageElement}
            </PageElement>
          )
      )}
      <a
        href={`?page=${props.currentPage + 1 <= totalPages ? props.currentPage + 1 : props.currentPage}`}
        className="border-2 border-white w-12 h-12 grid place-content-center text-center rounded-r-lg"
      >
        <ShortArrow />
      </a>
    </div>
  );
}
