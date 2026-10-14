// Works out how big the wall becomes when `want` more spaces are requested.
// Used for the live preview on the admin Wall Size page.
//
// KEEP IN SYNC with planGrowth() in the backend (services/wallService.js) —
// the server is the one that really decides, this only shows the preview.
//
// New columns go on the right and new rows at the bottom (alternating) so
// the wall stays roughly square. Whole rows/columns are added, so the
// number of new spaces can be a bit more than requested.
export function planGrowth(cols, rows, existing, want) {
  let c = cols;
  let r = rows;

  while (c * r - existing < want) {
    if (c <= r) c += 1;
    else r += 1;
  }

  return { cols: c, rows: r, add: c * r - existing };
}