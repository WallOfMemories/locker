import { useEffect, useMemo, useRef, useState } from "react";
import { HiLocationMarker, HiSearch, HiX } from "react-icons/hi";

import { searchCountries } from "../../utils/countries";

import "./LocationPicker.css";

/**
 * "Add location" field.
 * CHANGED: a Snap can now only be tagged with a COUNTRY. The list is built
 * in (no map search, no typed text, no GPS), so it is instant and works
 * offline. The server enforces the same rule.
 * `value` is { id (country code), name, address, lat, lng } | null
 */
function LocationPicker({ value, onChange }) {
  const wrapRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(() => searchCountries(query), [query]);

  // Close the list when clicking elsewhere.
  useEffect(() => {
    function handleOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);

    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function choose(place) {
    onChange(place);

    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      // Enter must never submit the whole Create Snap form from here.
      event.preventDefault();

      if (open && results[active]) choose(results[active]);
      else if (open && results.length === 1) choose(results[0]);
    }
  }

  // ---------- A location is already chosen ----------
  if (value) {
    return (
      <div className="locpicker">
        <div className="locpicker__chip">
          <span className="locpicker__pin locpicker__pin--on">
            <HiLocationMarker />
          </span>

          <span className="locpicker__text">
            <span className="locpicker__name">{value.name}</span>
            {value.address && (
              <span className="locpicker__addr">{value.address}</span>
            )}
          </span>

          <button
            type="button"
            className="locpicker__remove"
            onClick={() => onChange(null)}
            aria-label="Remove location"
          >
            <HiX />
          </button>
        </div>
      </div>
    );
  }

  // ---------- Pick a country ----------
  return (
    <div className="locpicker" ref={wrapRef}>
      <div className="locpicker__field">
        <HiSearch />

        <input
          type="text"
          className="locpicker__input"
          value={query}
          placeholder="Search for a country…"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {open && (
        <ul className="locpicker__list" role="listbox">
          {results.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`locpicker__item ${
                  index === active ? "is-active" : ""
                }`}
                onClick={() => choose(place)}
                onMouseEnter={() => setActive(index)}
              >
                <span className="locpicker__pin">
                  <HiLocationMarker />
                </span>

                <span className="locpicker__text">
                  <span className="locpicker__name">{place.name}</span>
                </span>
              </button>
            </li>
          ))}

          {results.length === 0 && (
            <li className="locpicker__empty">
              No country found. Check the spelling and try again.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default LocationPicker;