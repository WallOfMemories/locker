import { useEffect, useRef, useState } from "react";
import { FaRegFlag } from "react-icons/fa";
import { HiDotsHorizontal } from "react-icons/hi";

import "./ReportMenu.css";

// Round "three dots" button. Tapping it opens a small menu with "Report";
// choosing that calls onReport (which opens the report dialog).
//   floating = true  -> sits in the top-left corner of the pop-up
//   floating = false -> sits inline (beside the location pill)
function ReportMenu({ onReport, floating = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handlePointer(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        // Close only the menu, not the whole Snap pop-up.
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey, true);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open]);

  function handleReport() {
    setOpen(false);
    onReport();
  }

  return (
    <div
      ref={rootRef}
      className={`reportmenu ${floating ? "reportmenu--floating" : ""}`}
    >
      <button
        type="button"
        className={`reportmenu__dots ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More options"
      >
        <HiDotsHorizontal />
      </button>

      {open && (
        <div className="reportmenu__list" role="menu">
          <button
            type="button"
            role="menuitem"
            className="reportmenu__item"
            onClick={handleReport}
          >
            <FaRegFlag />
            Report this Snap
          </button>
        </div>
      )}
    </div>
  );
}

export default ReportMenu;