// Small date helpers shared by Create Snap, the wall and Time Capsules.

const FULL = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const SHORT = { day: "numeric", month: "short", year: "numeric" };

// "Sat, 10 Oct 2026, 9:00 AM" (in the viewer's own time zone)
export function formatUnlockDate(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, FULL).format(date);
}

// "10 Oct 2026"
export function formatShortDate(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, SHORT).format(date);
}

// "in 8 days" · "in 3 hours" · "in 12 minutes" · "any moment now"
// `now` is passed in (ms) so components can re-render on a timer.
export function timeUntil(iso, now) {
  const target = new Date(iso).getTime();

  if (Number.isNaN(target)) return "";

  const diff = target - now;

  if (diff <= 0) return "any moment now";

  const minutes = Math.ceil(diff / 60000);

  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.round(diff / 3600000);

  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;

  const days = Math.round(diff / 86400000);

  if (days < 60) return `in ${days} days`;

  const months = Math.round(days / 30.44);

  if (months < 24) return `in ${months} months`;

  return `in ${Math.round(days / 365.25)} years`;
}

// Date -> "YYYY-MM-DDTHH:mm" in LOCAL time (what date/time inputs use)
export function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}