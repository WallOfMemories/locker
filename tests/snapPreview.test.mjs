import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";

import previewHandler from "../api/snap-preview.js";
import imageHandler from "../api/snap-image.js";
import { describe, injectMeta, isSnapId } from "../api/_snapPreview.js";

// The real built page, so we know the tag swap works on the real thing.
const PAGE = fs.readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const PHOTO = "https://firebasestorage.googleapis.com/v0/b/x/o/snaps%2Fu1%2Fa.jpg?alt=media&token=t";

function fakeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(body) { this.body = body; },
  };
}

// Pretends to be the website + the backend.
function mockFetch({ preview, photo }) {
  globalThis.fetch = async (url) => {
    const u = String(url);

    if (u.endsWith("/index.html")) return new Response(PAGE, { status: 200 });
    if (u.includes("/preview")) {
      return preview
        ? new Response(JSON.stringify({ success: true, preview }), { status: 200 })
        : new Response("{}", { status: 404 });
    }
    if (u === PHOTO || u.startsWith("https://evil.example")) {
      return new Response(photo || Buffer.alloc(0), { status: 200 });
    }

    return new Response("?", { status: 404 });
  };
}

const metaCount = (html, key) => (html.match(new RegExp(`property="${key}"`, "g")) || []).length;

test("snap ids are checked", () => {
  assert.equal(isSnapId("3CuMZXyc3WBFtYWwYKLV"), true);
  assert.equal(isSnapId("../etc"), false);
  assert.equal(isSnapId("a"), false);
  assert.equal(isSnapId(undefined), false);
});

test("a normal Snap gets its own card: caption, name, country and photo address", async () => {
  mockFetch({ preview: { available: true, image: PHOTO, caption: "Sweet Memory", username: "santhosh1703", displayName: "Santhosh", country: "India" } });

  const res = fakeRes();

  await previewHandler({ query: { snap: "3CuMZXyc3WBFtYWwYKLV" }, headers: { host: "www.thelocker.in" } }, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/html/);
  assert.match(res.body, /og:title" content="Sweet Memory"/);
  assert.match(res.body, /Shared by Santhosh \(@santhosh1703\) · India/);
  assert.match(res.body, /og:image" content="https:\/\/www\.thelocker\.in\/api\/snap-image\?snap=3CuMZXyc3WBFtYWwYKLV"/);
  assert.match(res.body, /og:url" content="https:\/\/www\.thelocker\.in\/\?snap=3CuMZXyc3WBFtYWwYKLV"/);

  // exactly ONE of each tag (the old generic ones are gone) ...
  for (const key of ["og:title", "og:description", "og:image", "og:url"]) {
    assert.equal(metaCount(res.body, key), 1, key);
  }
  assert.equal((res.body.match(/name="twitter:image"/g) || []).length, 1);
  // ... and the app itself is still there
  assert.match(res.body, /<div id="root">/);
  assert.match(res.body, /<script type="module"[^>]*src="\/assets\//);
});

test("a caption cannot break out of the page", () => {
  const card = describe("abcdef12", { available: true, image: PHOTO, caption: '"><script>alert(1)</script>', username: "u", displayName: "", country: "" });
  const html = injectMeta("<html><head><title>x</title></head><body></body></html>", card);

  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;/);
});

test("a locked Time Capsule shows no photo and no caption, only the open date", async () => {
  mockFetch({ preview: { available: false, reason: "locked", unlockAt: "2030-01-15T00:00:00.000Z" } });

  const res = fakeRes();

  await previewHandler({ query: { snap: "3CuMZXyc3WBFtYWwYKLV" }, headers: { host: "www.thelocker.in" } }, res);

  assert.match(res.body, /og:title" content="A Time Capsule on The Locker"/);
  assert.match(res.body, /Sealed until 15 January 2030/);
  assert.match(res.body, /og:image" content="https:\/\/www\.thelocker\.in\/og-image\.png"/);
  assert.equal(res.body.includes("snap-image"), false);
});

test("hidden, unknown or bad ids just show the normal site card", async () => {
  for (const [snap, preview] of [
    ["3CuMZXyc3WBFtYWwYKLV", { available: false, reason: "hidden" }],
    ["3CuMZXyc3WBFtYWwYKLV", null],
    ["../../x", { available: true, image: PHOTO, caption: "hi" }],
  ]) {
    mockFetch({ preview });

    const res = fakeRes();

    await previewHandler({ query: { snap }, headers: { host: "www.thelocker.in" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, PAGE); // untouched
  }
});

test("only our own domain is used to load the page", async () => {
  const seen = [];
  const original = globalThis.fetch;

  mockFetch({ preview: null });
  const wrapped = globalThis.fetch;

  globalThis.fetch = async (url) => { seen.push(String(url)); return wrapped(url); };

  await previewHandler({ query: { snap: "3CuMZXyc3WBFtYWwYKLV" }, headers: { host: "evil.example.com" } }, fakeRes());

  assert.equal(seen.some((u) => u.includes("evil.example.com")), false);
  globalThis.fetch = original;
});

test("the photo is resized into a small 1200x630 card, even a tall phone photo", async () => {
  // a big noisy portrait photo, like a phone upload
  const raw = Buffer.alloc(3000 * 4000 * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = (i * 7 + (i >> 9)) % 256;
  const big = await sharp(raw, { raw: { width: 3000, height: 4000, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();

  mockFetch({ preview: { available: true, image: PHOTO, caption: "x" }, photo: big });

  const res = fakeRes();

  await imageHandler({ query: { snap: "3CuMZXyc3WBFtYWwYKLV" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "image/jpeg");

  const info = await sharp(res.body).metadata();

  assert.equal(info.width, 1200);
  assert.equal(info.height, 630);
  assert.ok(res.body.length < big.length / 5, `card ${res.body.length} vs original ${big.length}`);
  assert.match(res.headers["cache-control"], /s-maxage=86400/);
});

test("the photo function refuses anything that is not Firebase Storage, and hidden Snaps", async () => {
  for (const preview of [
    { available: true, image: "https://evil.example.com/a.jpg" },
    { available: true, image: "http://firebasestorage.googleapis.com/a.jpg" },
    { available: false, reason: "locked" },
    null,
  ]) {
    mockFetch({ preview });

    const res = fakeRes();

    await imageHandler({ query: { snap: "3CuMZXyc3WBFtYWwYKLV" } }, res);

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, "https://www.thelocker.in/og-image.png");
  }
});