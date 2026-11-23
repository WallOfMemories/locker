// NEW: which boxes of the wall are BID boxes (the first 20).
// Keep this in step with BID_BOX_COUNT on the backend (default 20).
// The wall uses it to paint these boxes gold; the server is what really
// decides whether a bid or a purchase is allowed.
export const BID_BOX_COUNT = 20;

export function boxNumber(spaceId) {
  const match = /^space_(\d{1,6})$/.exec(String(spaceId));

  return match ? Number(match[1]) : 0;
}

export function isBidBox(spaceId) {
  const number = boxNumber(spaceId);

  return number >= 1 && number <= BID_BOX_COUNT;
}