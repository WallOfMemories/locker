import { useEffect, useState } from "react";
import { HiLockClosed } from "react-icons/hi";

import {
  formatUnlockDate,
  timeUntil,
  toLocalInputValue,
} from "../../utils/countdown";

import "./LockerPicker.css";

export const MIN_LOCK_MINUTES = 5;

// 9:00 AM local time, N days / months / years from today
function nineAm(offset) {
  const date = new Date();

  date.setHours(9, 0, 0, 0);
  offset(date);

  return toLocalInputValue(date);
}

const PRESETS = [
  { label: "Tomorrow", value: () => nineAm((d) => d.setDate(d.getDate() + 1)) },
  { label: "1 week", value: () => nineAm((d) => d.setDate(d.getDate() + 7)) },
  { label: "1 month", value: () => nineAm((d) => d.setMonth(d.getMonth() + 1)) },
  { label: "1 year", value: () => nineAm((d) => d.setFullYear(d.getFullYear() + 1)) },
];

/**
 * The "locker": pick the future date + time when a Time Capsule opens
 * to everyone. `value` is "YYYY-MM-DDTHH:mm" (local time) or "".
 */
function LockerPicker({ value, onChange }) {
  // `now` re-renders the countdown / validation every 30s.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);

    return () => clearInterval(timer);
  }, []);

  const [datePart = "", timePart = ""] = value ? value.split("T") : [];

  const target = value ? new Date(value) : null;
  const valid = target && !Number.isNaN(target.getTime());
  const tooSoon = valid && target.getTime() < now + MIN_LOCK_MINUTES * 60000;

  function handleDate(event) {
    const nextDate = event.target.value;

    if (!nextDate) {
      onChange("");
      return;
    }

    onChange(`${nextDate}T${timePart || "09:00"}`);
  }

  function handleTime(event) {
    const nextTime = event.target.value;

    if (!nextTime) return;

    const fallbackDate = toLocalInputValue(
      new Date(now + 24 * 3600000)
    ).slice(0, 10);

    onChange(`${datePart || fallbackDate}T${nextTime}`);
  }

  return (
    <section className="locker" aria-label="Time locker">
      <header className="locker__head">
        <span className="locker__icon">
          <HiLockClosed />
        </span>

        <div>
          <h3 className="locker__title">Time Locker</h3>
          <p className="locker__text">
            Your Snap stays sealed. When the time you pick arrives, it opens
            to everyone automatically.
          </p>
        </div>
      </header>

      <div className="locker__presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="locker__chip"
            onClick={() => onChange(preset.value())}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="locker__inputs">
        <label className="locker__field">
          <span>Date</span>
          <input
            type="date"
            value={datePart}
            min={toLocalInputValue(new Date(now)).slice(0, 10)}
            onChange={handleDate}
          />
        </label>

        <label className="locker__field">
          <span>Time</span>
          <input type="time" value={timePart} onChange={handleTime} />
        </label>
      </div>

      {valid && !tooSoon && (
        <p className="locker__summary">
          <strong>Opens {formatUnlockDate(target.toISOString())}</strong>
          <span>{timeUntil(target.toISOString(), now)}</span>
        </p>
      )}

      {tooSoon && (
        <p className="locker__error" role="alert">
          Pick a time at least {MIN_LOCK_MINUTES} minutes from now.
        </p>
      )}
    </section>
  );
}

export default LockerPicker;