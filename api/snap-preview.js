import {
  SITE_URL,
  describe,
  fetchPreview,
  injectMeta,
  isSnapId,
} from "./_snapPreview.js";

// GET /?snap=<id>  (vercel.json rewrites it here)
//
// Returns the normal website page, with the link-preview tags describing this
// Snap. People get the app exactly as before; WhatsApp & co. get the right
// photo and caption.
export default async function handler(req, res) {
  const snapId = String(req.query?.snap || "");

  // Load our own page from the same site the visitor came to.
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const origin = /^(www\.)?thelocker\.in$/.test(host) ? `https://${host}` : SITE_URL;

  let html;

  try {
    const page = await fetch(`${origin}/index.html`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!page.ok) throw new Error(`index.html ${page.status}`);

    html = await page.text();
  } catch (error) {
    console.error("snap-preview: could not load the page:", error);

    res.statusCode = 500;
    res.end("The Locker is temporarily unavailable. Please try again.");
    return;
  }

  // A bad id or any problem just means "show the normal card".
  const card = isSnapId(snapId) ? describe(snapId, await fetchPreview(snapId)) : null;

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Everyone gets the same HTML for a given link, so it is safe to cache.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.end(injectMeta(html, card));
}