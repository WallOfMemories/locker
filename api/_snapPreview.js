// ------------------------------------------------------------
// Shared helpers for the two "link preview" functions (they live in /api, but
// a file starting with an underscore is never turned into a URL by Vercel).
//
// WHY THIS EXISTS: WhatsApp, Instagram, X, Telegram... build a link preview by
// reading the page's <meta property="og:..."> tags WITHOUT running any
// JavaScript. This site is a single-page app, so every link used to show the
// same generic card. For /?snap=<id> we now answer with the same page plus tags
// that describe THAT Snap (its real photo, caption and public name).
// ------------------------------------------------------------

export const SITE_URL = process.env.SITE_URL || "https://www.thelocker.in";

export const API_URL =
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "https://locker-backend-dusky.vercel.app";

// Same shape as the backend's check: only plain ids ever reach the backend.
export function isSnapId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(value);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function shorten(text, max) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();

  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// Asks the backend what this Snap may show publicly.
// -> the preview object, or null (not found / backend unreachable)
export async function fetchPreview(snapId) {
  try {
    const response = await fetch(
      `${API_URL}/api/snaps/${encodeURIComponent(snapId)}/preview`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!response.ok) return null;

    const data = await response.json();

    return data?.preview || null;
  } catch {
    return null;
  }
}

// The wording of the card. null = "leave the normal site card as it is".
export function describe(snapId, preview) {
  if (!preview) return null;

  const url = `${SITE_URL}/?snap=${encodeURIComponent(snapId)}`;

  if (preview.available) {
    const who = preview.displayName || (preview.username ? `@${preview.username}` : "someone");
    const handle = preview.displayName && preview.username ? ` (@${preview.username})` : "";
    const place = preview.country ? ` · ${preview.country}` : "";

    return {
      url,
      title: shorten(preview.caption, 70) || "A memory on The Locker",
      description: `Shared by ${who}${handle}${place}. Pin your memory on the wall at The Locker.`,
      // a resized copy of the real photo (see snap-image.js)
      image: preview.image
        ? `${SITE_URL}/api/snap-image?snap=${encodeURIComponent(snapId)}`
        : null,
    };
  }

  if (preview.reason === "locked") {
    const opens = preview.unlockAt
      ? new Date(preview.unlockAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "";

    return {
      url,
      title: "A Time Capsule on The Locker",
      description: opens
        ? `Sealed until ${opens}. Come back when it opens.`
        : "Sealed until a date the owner chose. Come back when it opens.",
      image: null, // the photo stays secret until it opens
    };
  }

  return null; // hidden: nothing special to show
}

// Swaps the normal card tags in index.html for this Snap's tags.
export function injectMeta(html, card) {
  if (!card) return html;

  // remove every existing og:* / twitter:* tag (they can span several lines)
  let out = html.replace(
    /<meta\s[^>]*?(?:property|name)="(?:og|twitter):[^"]*"[^>]*>\s*/g,
    ""
  );

  const title = escapeHtml(card.title);
  const description = escapeHtml(card.description);
  const url = escapeHtml(card.url);

  // keep the site's normal image when this card has none of its own
  const image = card.image || `${SITE_URL}/og-image.png`;
  const imageType = card.image ? "image/jpeg" : "image/png";

  const tags = `
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="The Locker" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  `;

  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title} | The Locker</title>`);

  return out.replace("</head>", `${tags}</head>`);
}