import sharp from "sharp";

import { SITE_URL, fetchPreview, isSnapId } from "./_snapPreview.js";

// GET /api/snap-image?snap=<id>
//
// The picture shown in the link preview: the Snap's real photo, resized to
// the 1200×630 card shape and compressed to roughly 100–250 KB. WhatsApp
// ignores big images, which is why we don't hand it the original upload.
// A portrait photo is shown whole, on a soft blurred copy of itself, instead
// of being cropped.

const W = 1200;
const H = 630;
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

// The photo address comes from our own backend, but never fetch anything
// that isn't Firebase Storage.
function isStorageUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname === "firebasestorage.googleapis.com" ||
        url.hostname === "storage.googleapis.com")
    );
  } catch {
    return false;
  }
}

function fallback(res) {
  // Nothing to show (locked, hidden, missing): use the normal site card.
  res.statusCode = 302;
  res.setHeader("Location", `${SITE_URL}/og-image.png`);
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  res.end();
}

export default async function handler(req, res) {
  const snapId = String(req.query?.snap || "");

  if (!isSnapId(snapId)) return fallback(res);

  try {
    const preview = await fetchPreview(snapId);

    if (!preview?.available || !isStorageUrl(preview.image)) return fallback(res);

    const original = await fetch(preview.image, { signal: AbortSignal.timeout(8000) });

    if (!original.ok) return fallback(res);

    const declared = Number(original.headers.get("content-length") || 0);

    if (declared > MAX_ORIGINAL_BYTES) return fallback(res);

    const input = Buffer.from(await original.arrayBuffer());

    if (input.length > MAX_ORIGINAL_BYTES) return fallback(res);

    const background = await sharp(input)
      .rotate()
      .resize(W, H, { fit: "cover" })
      .blur(28)
      .modulate({ brightness: 0.85 })
      .toBuffer();

    const foreground = await sharp(input)
      .rotate()
      .resize(W, H, { fit: "inside", withoutEnlargement: false })
      .toBuffer();

    const card = await sharp(background)
      .composite([{ input: foreground, gravity: "centre" }])
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    // A Snap's photo never changes, so cache it hard.
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    );
    res.end(card);
  } catch (error) {
    console.error("snap-image failed:", error);

    fallback(res);
  }
}