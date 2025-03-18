import React, { useEffect, useRef } from "react";
import MenuIcon from "../../icons/MenuIcon";

type Props = {
  id: number;
  name: string;
  editClick: () => void;
  deleteClick: () => void;
};

export default function AccessToken(props: Props) {
  const [showMenu, setShowMenu] = React.useState<boolean>(false);
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
    <div className="border border-border-200 py-2 px-2 flex items-center justify-between gap-3 rounded-lg">
      <span>{props.name}</span>
      <div className="relative" ref={menuRef}>
        <button
          className="bg-bg-100 rounded-lg p-3 flex items-center justify-center transition-colors border border-transparent hover:border-border-200"
          onClick={() => setShowMenu(!showMenu)}
        >
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
            onClick={props.deleteClick}
            className="text-left rounded-lg text-red hover:bg-bg-100 transition-colors p-2 px-4 w-full whitespace-nowrap"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
