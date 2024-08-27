import React, { useEffect, useRef } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import MenuIcon from "../icons/MenuIcon";
import TimeIcon from "../icons/TimeIcon";

type Props = {
  name: string;
  link: string;
  paused: boolean;
  lastBackup: string;
  last?: boolean;
  editClick: () => void;
  backupNowClick: () => void;
  pauseClick: () => void;
  deleteClick: () => void;
};

export default function Schedule(props: Props) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`${props.last ? "" : "border-b border-border-200"}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3 px-4 pt-4">
          <div
            className={`${props.paused ? "bg-orange" : "bg-green"} rounded-full w-4 h-4 shrink-0`}
          ></div>
          <div>
            <p className="leading-none mb-1">{props.name}</p>
            <span className="text-secondary text-sm">{props.link}</span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button className="p-4 pb-0" onClick={() => setShowMenu(!showMenu)}>
            <MenuIcon />
          </button>
          <div
            className={`${!showMenu && "hidden"} absolute right-0 z-10 border border-border-200 p-2 rounded-lg bg-bg-300 text-secondary`}
          >
            <button
              onClick={props.editClick}
              className="text-left rounded-lg hover:bg-bg-100 transition-colors p-2 px-4 w-full"
            >
              Edit
            </button>
            <button
              onClick={props.backupNowClick}
              className="text-left rounded-lg hover:bg-bg-100 transition-colors p-2 px-4 w-full whitespace-nowrap"
            >
              Backup now
            </button>
            <button
              onClick={props.pauseClick}
              className={`${props.paused ? "text-green" : "text-orange"} text-left rounded-lg hover:bg-bg-100 transition-colors p-2 px-4 w-full whitespace-nowrap`}
            >
              {props.paused ? "Resume" : "Pause"}
            </button>
            <button className="text-left rounded-lg text-red hover:bg-bg-100 transition-colors p-2 px-4 w-full whitespace-nowrap">
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 pb-4">
        <TimeIcon />
        <span className="text-secondary text-sm">
          Last backup: {formatTimestamp(props.lastBackup)}
        </span>
      </div>
    </div>
  );
}
