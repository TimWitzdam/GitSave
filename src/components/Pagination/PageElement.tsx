import React from "react";

type Props = {
  current: boolean;
  children: React.ReactNode;
};

export default function PageElement(props: Props) {
  return (
    <a
      href={`?page=${props.children}`}
      className={`${props.current && "bg-white text-black"} ${props.children === "..." && "cursor-default"} border-2 border-r-0 border-white w-12 h-12 grid place-content-center text-center `}
    >
      {props.children}
    </a>
  );
}
