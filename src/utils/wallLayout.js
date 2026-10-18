// ------------------------------------------------------------
// Works out how to lay the whole wall out on the screen.
//
// Goals:
//   1. EVERY space is visible when the page opens (no zooming / dragging to
//      find them) — including spaces an admin adds later.
//   2. NO empty margins: the boxes fill the whole width and height.
//   3. ALIGNED: one real grid — every row has the same columns and every box
//      is the same size, so the boxes line up in straight columns.
//      (CHANGED: it used to give some rows one box more than others to avoid
//      a short last row, which made the columns zig-zag.)
//   4. If so many spaces would make the boxes unreadably small (phones), the
//      boxes stay a comfortable size and the wall is taller than the screen
//      (you drag / scroll down it).
//
// Pure function (no React) so it is easy to test.
// ------------------------------------------------------------

export const WALL_GAP = 5; // space between tiles (px)
export const WALL_PAD = 6; // space between the wall and the screen edge (px)

// Smallest a tile may get before the wall scrolls instead. Wider screens can
// go smaller; phones keep bigger, finger-friendly tiles.
const MIN_TILE_DESKTOP = 52;
const MIN_TILE_PHONE = 64;
const PHONE_WIDTH = 640;

const MAX_TILE = 240; // a wall with only a few spaces shouldn't get giant tiles

// How far from square a box may be stretched so the grid can fill the screen
// with a (nearly) full last row. Tried from strict to loose.
const SHAPE_LIMITS = [
  [0.7, 1.43],
  [0.5, 2],
];

// pickFit() scores every possible grid: how far its boxes are from square,
// plus how much of the last row is left empty. Lower is better. A weight
// above 1 on the empty cells means "a slightly tall / wide box is better than
// a visibly short last row".
const SHAPE_WEIGHT = 1;
const BLANK_WEIGHT = 1.2;

// -> null | {
//      mode:     "fit"    every box on screen, rows share the height
//                "scroll" boxes keep a fixed size, the wall is taller
//      cols, rows
//      tileHeight   px, only used in "scroll" mode
//      blanks       empty cells at the end of the last row (0 = full grid)
//    }
export function computeWallLayout(count, width, height) {
  if (!count || width <= 0 || height <= 0) return null;

  const minTile = width < PHONE_WIDTH ? MIN_TILE_PHONE : MIN_TILE_DESKTOP;

  const availW = width - WALL_PAD * 2;
  const availH = height - WALL_PAD * 2;

  const fit = pickFit(count, availW, availH, minTile);

  if (fit && fit.size <= MAX_TILE) {
    return {
      mode: "fit",
      cols: fit.cols,
      rows: fit.rows,
      tileHeight: 0,
      blanks: fit.blanks,
    };
  }

  // Too many for one screen (or too few — keep the boxes a sensible size):
  // fixed-size boxes in a wall that is taller than the screen.
  const target = fit && fit.size > MAX_TILE ? MAX_TILE : minTile;

  return pickScroll(count, availW, target);
}

// Every column count from 1..count is a candidate. Keep the ones whose boxes
// are reasonably square and about as big as the best option, then take the one
// with the best score (see SHAPE_WEIGHT / BLANK_WEIGHT above).
function pickFit(count, availW, availH, minTile) {
  const candidates = [];

  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols);

    const w = (availW - WALL_GAP * (cols - 1)) / cols;
    const h = (availH - WALL_GAP * (rows - 1)) / rows;

    if (w < minTile || h < minTile) continue;

    const blanks = cols * rows - count;
    const shape = w / h;

    candidates.push({
      cols,
      rows,
      blanks,
      size: Math.min(w, h),
      shape,
      score:
        Math.abs(Math.log(shape)) * SHAPE_WEIGHT +
        (blanks / cols) * BLANK_WEIGHT,
    });
  }

  for (const [low, high] of SHAPE_LIMITS) {
    const usable = candidates.filter((c) => c.shape >= low && c.shape <= high);

    if (usable.length === 0) continue;

    const biggest = Math.max(...usable.map((c) => c.size));

    // not much smaller than the best boxes available…
    const roomy = usable.filter((c) => c.size >= biggest * 0.85);

    // …and the best score; if tied, the bigger boxes
    return roomy.reduce((best, c) =>
      c.score < best.score || (c.score === best.score && c.size > best.size)
        ? c
        : best
    );
  }

  return null;
}

// Scroll mode: about `target` px boxes. Look a little below the natural number
// of columns (slightly bigger boxes) for one that leaves the last row fullest.
function pickScroll(count, availW, target) {
  const natural = Math.max(1, Math.floor((availW + WALL_GAP) / (target + WALL_GAP)));
  const lowest = Math.max(1, Math.ceil(natural * 0.85));

  let best = null;

  for (let cols = natural; cols >= lowest; cols -= 1) {
    const rows = Math.ceil(count / cols);
    const blanks = cols * rows - count;

    if (!best || blanks < best.blanks) best = { cols, rows, blanks };
  }

  const tileWidth = (availW - WALL_GAP * (best.cols - 1)) / best.cols;

  return {
    mode: "scroll",
    cols: best.cols,
    rows: best.rows,
    tileHeight: Math.round(tileWidth),
    blanks: best.blanks,
  };
}

// ------------------------------------------------------------
// Used by the zoomable wall (SnapWallGrid)
// ------------------------------------------------------------

// Height of the whole wall in px: exactly the screen in "fit" mode, taller
// than the screen in "scroll" mode.
export function getWorldHeight(layout, viewportHeight) {
  if (layout.mode === "fit") return viewportHeight;

  return (
    layout.rows * layout.tileHeight +
    (layout.rows - 1) * WALL_GAP +
    WALL_PAD * 2
  );
}

// Where box number `index` sits inside the wall (px, at zoom 1). Lets the
// "Find my Snaps" button zoom straight to a box.
export function getTileRect(layout, index, worldWidth, worldHeight) {
  const row = Math.floor(index / layout.cols);
  const column = index % layout.cols;

  const width =
    (worldWidth - WALL_PAD * 2 - WALL_GAP * (layout.cols - 1)) / layout.cols;

  const height =
    layout.mode === "fit"
      ? (worldHeight - WALL_PAD * 2 - WALL_GAP * (layout.rows - 1)) /
        layout.rows
      : layout.tileHeight;

  return {
    x: WALL_PAD + column * (width + WALL_GAP),
    y: WALL_PAD + row * (height + WALL_GAP),
    w: width,
    h: height,
  };
}