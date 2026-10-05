import { useEffect, useRef, useState } from "react";
import { HiLocationMarker, HiPlus, HiSearch, HiX } from "react-icons/hi";

import {
  reverseLocation,
  searchLocations,
} from "../../services/locationService";

import "./LocationPicker.css";

/**
 * Instagram-style "Add location" field.
 *  - type to search places, pick one from the list
 *  - or tap "Use my current location"
 * `value` is { id, name, address, lat, lng } | null
 */
function LocationPicker({ value, onChange }) {
  const wrapRef = useRef(null);

  // NEW: the user's position (when known) so nearby places rank first.
  const biasRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;

  // NEW: if the browser already has location permission, quietly read the
  // position once so searches favour places near the user. This never
  // shows a permission prompt — "Use my current location" does that.
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions?.query) {
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return;

        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            biasRef.current = { lat: coords.latitude, lng: coords.longitude };
          },
          () => {},
          { maximumAge: 600000, timeout: 5000 }
        );
      })
      .catch(() => {});
  }, []);

  // Debounced search; stale requests are aborted.
  useEffect(() => {
    if (!canSearch) return undefined;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const places = await searchLocations(
          trimmed,
          controller.signal,
          biasRef.current
        );

        setResults(places);
        setActive(-1);
      } catch (err) {
        if (err.name === "AbortError") return;

        setResults([]);
        setError(err.message || "Could not search places.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, canSearch]);

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
    setResults([]);
    setOpen(false);
    setError("");
  }

  // NEW: the place isn't in the map data — let the person use their own
  // text (saved without map coordinates).
  function chooseTyped() {
    choose({
      id: `custom-${Date.now()}`,
      name: trimmed.slice(0, 120),
      address: "",
      lat: null,
      lng: null,
    });
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
    }
  }

  function handleUseCurrent() {
    if (!navigator.geolocation) {
      setError("Your browser can't share your location. Search for a place instead.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        biasRef.current = { lat, lng };

        try {
          const place = await reverseLocation(lat, lng);

          choose(
            place || {
              id: `geo-${lat.toFixed(4)},${lng.toFixed(4)}`,
              name: "Current location",
              address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              lat,
              lng,
            }
          );
        } catch {
          // Name lookup failed — the coordinates are still a valid location.
          choose({
            id: `geo-${lat.toFixed(4)},${lng.toFixed(4)}`,
            name: "Current location",
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
          });
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        setLocating(false);

        setError(
          geoError.code === 1
            ? "Location permission was blocked. Search for a place instead."
            : "Couldn't get your location. Search for a place instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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

  // ---------- Pick a location ----------
  const showList = open && canSearch;

  return (
    <div className="locpicker" ref={wrapRef}>
      <div className="locpicker__field">
        <HiSearch />

        <input
          type="text"
          className="locpicker__input"
          value={query}
          placeholder="Search for a place…"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          autoComplete="off"
        />

        {loading && <span className="locpicker__spinner" />}
      </div>

      <button
        type="button"
        className="locpicker__current"
        onClick={handleUseCurrent}
        disabled={locating}
      >
        {locating ? (
          <span className="locpicker__spinner" />
        ) : (
          <HiLocationMarker />
        )}
        {locating ? "Finding you…" : "Use my current location"}
      </button>

      {error && (
        <p className="locpicker__error" role="alert">
          {error}
        </p>
      )}

      {showList && (
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
                  {place.address && (
                    <span className="locpicker__addr">{place.address}</span>
                  )}
                </span>
              </button>
            </li>
          ))}

          {!loading && !error && results.length === 0 && (
            <li className="locpicker__empty">
              No places found. Try adding the city or area to your search.
            </li>
          )}

          {/* NEW: always offer the typed text as a fallback */}
          {!loading && (
            <li>
              <button
                type="button"
                className="locpicker__item locpicker__item--typed"
                onClick={chooseTyped}
              >
                <span className="locpicker__pin">
                  <HiPlus />
                </span>

                <span className="locpicker__text">
                  <span className="locpicker__name">
                    Use “{trimmed}”
                  </span>
                  <span className="locpicker__addr">
                    Can't find it? Add it as typed
                  </span>
                </span>
              </button>
            </li>
          )}

          <li className="locpicker__attr">
            Places from OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
}

export default LocationPicker;