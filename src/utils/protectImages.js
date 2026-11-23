// NEW: stops people dragging a photo out of the page (for example onto a new
// browser tab, which opens the full image and shows its link) and blocks the
// "Open image in new tab" / "Copy image address" right-click menu on photos.
//
// This is a deterrent, not a lock: anyone determined can still find an image
// address with developer tools or take a screenshot. It just removes the
// easy ways.
export function protectImages() {
  document.addEventListener(
    "dragstart",
    (event) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    },
    true
  );

  document.addEventListener(
    "contextmenu",
    (event) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    },
    true
  );
}