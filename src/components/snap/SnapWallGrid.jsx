import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiMaximize, FiMinus, FiPlus, FiTarget } from "react-icons/fi";

import SnapSpace from "./SnapSpace";

import {
  computeWallLayout,
  getTileRect,
  getWorldHeight,
} from "../../utils/wallLayout";

// The wall.
//
// Opens fitted to the screen: every box visible, no empty margins (the maths
// is in utils/wallLayout.js). From there you can zoom in and drag around like
// a map — mouse wheel / trackpad pinch / pinch on a phone / the + and −
// buttons — and the ⤢ button returns to the full view. You can never zoom
// out past the full view, so the wall never shrinks and leaves empty space.
//
// When an admin adds spaces the view resets to the full view, so the new
// boxes are on screen straight away.
const MAX_ZOOM = 4;
const FIND_ZOOM = 2.8; // how far "Find my Snaps" zooms in
const DRAG_THRESHOLD = 6; // px before a press counts as a drag, not a click

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function SnapWallGrid({ spaces, onSelect, myId }) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);

  const [size, setSize] = useState({ width: 0, height: 0 });

  // the current pan / zoom (kept out of React state: it changes every frame)
  const view = useRef({ x: 0, y: 0, k: 1 });
  const dims = useRef({ vw: 0, vh: 0, ww: 0, wh: 0 });
  const animation = useRef(null);
  const dragged = useRef(false);
  const findCount = useRef(0);
  const previousCount = useRef(null);

  // ---------- layout ----------

  useLayoutEffect(() => {
    const element = viewportRef.current;

    if (!element) return undefined;

    function measure() {
      const width = element.clientWidth;
      const height = element.clientHeight;

      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      );
    }

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => computeWallLayout(spaces.length, size.width, size.height),
    [spaces.length, size.width, size.height]
  );

  const worldWidth = size.width;
  const worldHeight = layout
    ? getWorldHeight(layout, size.height)
    : size.height;

  const fit = layout?.mode === "fit";

  // CHANGED: one real CSS grid. Every row has the same columns and every box
  // the same size, so the boxes line up in straight columns.
  //   fit:    rows share the screen height equally
  //   scroll: every row is one fixed height and the wall is taller
  const gridStyle = layout
    ? {
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        ...(fit
          ? { gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))` }
          : { gridAutoRows: `${layout.tileHeight}px` }),
      }
    : undefined;

  // The boxes that belong to the person using the site.
  const mineIndexes = useMemo(() => {
    if (!myId) return [];

    const result = [];

    spaces.forEach((space, index) => {
      if (space.ownerId === myId) result.push(index);
    });

    return result;
  }, [spaces, myId]);

  // ---------- pan / zoom ----------

  const apply = useCallback(() => {
    const world = worldRef.current;

    if (!world) return;

    const { x, y, k } = view.current;

    world.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }, []);

  // Never lets the wall leave the screen: you can't zoom out past the full
  // view, and the edges of the wall can't be dragged away from the edges of
  // the screen.
  const constrain = useCallback((next) => {
    const { vw, vh, ww, wh } = dims.current;
    const k = clamp(next.k, 1, MAX_ZOOM);

    return {
      k,
      x: clamp(next.x, Math.min(0, vw - ww * k), 0),
      y: clamp(next.y, Math.min(0, vh - wh * k), 0),
    };
  }, []);

  const setView = useCallback(
    (next) => {
      view.current = constrain(next);
      apply();
    },
    [constrain, apply]
  );

  const cancelAnimation = useCallback(() => {
    if (animation.current) {
      cancelAnimationFrame(animation.current);
      animation.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target, duration = 260) => {
      cancelAnimation();

      const from = { ...view.current };
      const to = constrain(target);
      const start = performance.now();

      function step(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        view.current = {
          x: from.x + (to.x - from.x) * ease,
          y: from.y + (to.y - from.y) * ease,
          k: from.k + (to.k - from.k) * ease,
        };

        apply();

        animation.current = t < 1 ? requestAnimationFrame(step) : null;
      }

      animation.current = requestAnimationFrame(step);
    },
    [apply, constrain, cancelAnimation]
  );

  const zoomAt = useCallback(
    (px, py, factor, animate = false) => {
      const v = view.current;
      const k = clamp(v.k * factor, 1, MAX_ZOOM);
      const ratio = k / v.k;

      const next = {
        k,
        x: px - (px - v.x) * ratio,
        y: py - (py - v.y) * ratio,
      };

      if (animate) {
        animateTo(next);
      } else {
        setView(next);
      }
    },
    [animateTo, setView]
  );

  // Size changed (window resized, phone rotated): keep the same view but
  // make sure it still fits the new size.
  useLayoutEffect(() => {
    dims.current = {
      vw: size.width,
      vh: size.height,
      ww: worldWidth,
      wh: worldHeight,
    };

    setView(view.current);
  }, [size.width, size.height, worldWidth, worldHeight, setView]);

  // Spaces were added: go back to the full view so the new boxes are visible.
  useEffect(() => {
    if (
      previousCount.current !== null &&
      previousCount.current !== spaces.length
    ) {
      animateTo({ x: 0, y: 0, k: 1 }, 400);
    }

    previousCount.current = spaces.length;
  }, [spaces.length, animateTo]);

  // Wheel, mouse drag, touch drag and pinch.
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    const pointers = new Map();

    let panStart = null;
    let pinchStart = null;

    function localPoint(clientX, clientY) {
      const rect = viewport.getBoundingClientRect();

      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function pinchMetrics() {
      const [a, b] = [...pointers.values()];

      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        center: localPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
    }

    function onWheel(event) {
      event.preventDefault();

      cancelAnimation();

      let delta = event.deltaY;

      if (event.deltaMode === 1) delta *= 33;
      if (event.deltaMode === 2) delta *= 400;

      const { vh, wh } = dims.current;
      const v = view.current;

      // A wall taller than the screen (lots of spaces on a small screen) and
      // not zoomed in: the wheel simply scrolls down it. Ctrl + wheel (or a
      // trackpad pinch) still zooms.
      if (!event.ctrlKey && wh > vh + 1 && v.k <= 1.001) {
        setView({ k: v.k, x: v.x, y: v.y - delta });
        return;
      }

      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const speed = event.ctrlKey ? 0.012 : 0.0016;
      const point = localPoint(event.clientX, event.clientY);

      zoomAt(point.x, point.y, Math.exp(-delta * speed));
    }

    function onPointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      cancelAnimation();

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 1) {
        dragged.current = false;

        panStart = {
          x: event.clientX,
          y: event.clientY,
          viewX: view.current.x,
          viewY: view.current.y,
        };
      } else if (pointers.size === 2) {
        dragged.current = true;
        panStart = null;

        const { dist, center } = pinchMetrics();
        const v = view.current;

        pinchStart = {
          dist,
          k: v.k,
          worldX: (center.x - v.x) / v.k,
          worldY: (center.y - v.y) / v.k,
        };
      }
    }

    function onPointerMove(event) {
      if (!pointers.has(event.pointerId)) return;

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size >= 2 && pinchStart) {
        const { dist, center } = pinchMetrics();

        const k = clamp(pinchStart.k * (dist / pinchStart.dist), 1, MAX_ZOOM);

        setView({
          k,
          x: center.x - pinchStart.worldX * k,
          y: center.y - pinchStart.worldY * k,
        });

        return;
      }

      if (pointers.size === 1 && panStart) {
        const dx = event.clientX - panStart.x;
        const dy = event.clientY - panStart.y;

        if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

        dragged.current = true;

        viewport.classList.add("is-dragging");

        setView({
          k: view.current.k,
          x: panStart.viewX + dx,
          y: panStart.viewY + dy,
        });
      }
    }

    function onPointerEnd(event) {
      if (!pointers.has(event.pointerId)) return;

      pointers.delete(event.pointerId);

      pinchStart = null;

      if (pointers.size === 1) {
        // pinch -> one finger: carry on dragging smoothly
        const [remaining] = [...pointers.values()];

        panStart = {
          x: remaining.x,
          y: remaining.y,
          viewX: view.current.x,
          viewY: view.current.y,
        };
      } else {
        panStart = null;
      }

      if (pointers.size === 0) viewport.classList.remove("is-dragging");
    }

    // A drag must not count as a click on the box under the finger.
    function onClickCapture(event) {
      if (dragged.current) {
        event.stopPropagation();
        event.preventDefault();
        dragged.current = false;
      }
    }

    // Tabbing to a box that is off-screen would make the browser scroll this
    // overflow-hidden area and tear the layout; undo that.
    function onScroll() {
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("click", onClickCapture, true);
    viewport.addEventListener("scroll", onScroll);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("click", onClickCapture, true);
      viewport.removeEventListener("scroll", onScroll);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);

      cancelAnimation();
    };
  }, [cancelAnimation, setView, zoomAt]);

  // ---------- buttons ----------

  function zoomFromCenter(factor) {
    zoomAt(size.width / 2, size.height / 2, factor, true);
  }

  function resetView() {
    animateTo({ x: 0, y: 0, k: 1 });
  }

  // Zooms to one of the person's own Snaps; press again for the next one.
  function findMine() {
    if (!layout || mineIndexes.length === 0) return;

    const index = mineIndexes[findCount.current % mineIndexes.length];

    findCount.current += 1;

    const rect = getTileRect(layout, index, worldWidth, worldHeight);

    animateTo(
      {
        k: FIND_ZOOM,
        x: size.width / 2 - (rect.x + rect.w / 2) * FIND_ZOOM,
        y: size.height / 2 - (rect.y + rect.h / 2) * FIND_ZOOM,
      },
      450
    );
  }

  return (
    <>
      <div className="wall-viewport" ref={viewportRef}>
        {spaces.length === 0 && (
          <div className="snapwall-status">
            <p>There are no spaces on the wall yet.</p>
          </div>
        )}

        {layout && (
          <div
            className="wall-world"
            ref={worldRef}
            style={{ width: worldWidth, height: worldHeight }}
          >
            <div
              className={`wall-grid${fit ? " wall-grid--fit" : ""}`}
              style={gridStyle}
            >
              {spaces.map((space) => (
                <SnapSpace
                  key={space.id}
                  space={space}
                  onSelect={onSelect}
                  mine={Boolean(myId) && space.ownerId === myId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wall-controls">
        {mineIndexes.length > 0 && (
          <button
            type="button"
            className="wall-controls__mine"
            onClick={findMine}
            aria-label="Find my Snaps"
            title={`Find my Snaps (${mineIndexes.length})`}
          >
            <FiTarget />
          </button>
        )}

        <button
          type="button"
          onClick={() => zoomFromCenter(1.6)}
          aria-label="Zoom in"
        >
          <FiPlus />
        </button>

        <button
          type="button"
          onClick={() => zoomFromCenter(1 / 1.6)}
          aria-label="Zoom out"
        >
          <FiMinus />
        </button>

        <button type="button" onClick={resetView} aria-label="Show the whole wall">
          <FiMaximize />
        </button>
      </div>
    </>
  );
}

export default SnapWallGrid;