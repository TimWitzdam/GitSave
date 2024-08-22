import React from "react";

type Props = {
  name: string;
  link: string;
  lastBackup: string;
  children: React.ReactNode[];
  last?: boolean;
};

export default function Schedule(props: Props) {
  return (
    <div className={`p-4 ${props.last ? "" : "border-b border-border-200"}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="rounded-full bg-green w-4 h-4 shrink-0"></div>
          <div>
            <p className="leading-none mb-1">{props.name}</p>
            <span className="text-secondary text-sm">{props.link}</span>
          </div>
        </div>
        <button className="pl-2">{props.children[0]}</button>
      </div>
      <div className="flex items-center gap-2">
        {props.children[1]}
        <span className="text-secondary text-sm">
          Last backup: {props.lastBackup}
        </span>
      </div>
    </div>
  );
}
