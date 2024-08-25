import React from "react";

type Props = {
  timestamp: string;
  name: string;
  success: boolean;
  message: string | null;
  last?: boolean;
};

export default function History(props: Props) {
  return (
    <div className={`p-4 ${props.last ? "" : "border-b border-border-200"}`}>
      <p className="text-secondary text-sm">{props.timestamp}</p>
      <p className="mb-2 mt-1">{props.name}</p>
      <div className="flex items-center gap-2">
        <div
          className={`rounded-full w-3 h-3 ${props.success ? "bg-green" : "bg-red"}`}
        ></div>
        <span className="text-secondary text-sm">
          {props.success
            ? "Backup successful"
            : `Backup failed (${props.message})`}
        </span>
      </div>
    </div>
  );
}
