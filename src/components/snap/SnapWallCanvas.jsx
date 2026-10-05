import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import SnapSpace from "./SnapSpace";

// World units (px at zoom 1)
const TILE = 240;
const GAP = 14;
const FIT_PADDING = 0;

const MAX_ZOOM = 3;
const MIN_ZOOM_FACTOR = 0.5; // relative to "fit whole wall"
const EDGE = 120; // px of wall that must stay on screen

const DRAG_THRESHOLD = 6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function SnapWallCanvas({ spaces, onSelect }) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);

  const view = useRef({ x: 0, y: 0, k: 1 });
  const fitZoom = useRef(1);
  const userMoved = useRef(false);
  const animation = useRef(null);
  const dragged = useRef(false);

  const { cols, rows } = useMemo(() => {
    if (spaces.length === 0) return { cols: 10, rows: 10 };

    return {
      cols: Math.max(...spaces.map((s) => s.column ?? 0)) + 1,
      rows: Math.max(...spaces.map((s) => s.row ?? 0)) + 1,
    };
  }, [spaces]);

  const worldWidth = cols * TILE + (cols - 1) * GAP;
  const worldHeight = rows * TILE + (rows - 1) * GAP;

  // Tracks the wall's total capacity so it can auto-refit when an
  // admin adds spaces and the grid grows, even if the person had
  // already panned or zoomed.
  const gridCapacity = cols * rows;
  const prevCapacity = useRef(null);

  // Writes the current view to the DOM (no React re-render).
  const apply = useCallback(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;

    if (!viewport || !world) return;

    const { x, y, k } = view.current;

    world.style.transform = `translate(${x}px, ${y}px) scale(${k})`;

    // Background dots move and scale with the map.
    let dot = 60 * k;
    while (dot < 24) dot *= 2;

    viewport.style.backgroundSize = `${dot}px ${dot}px`;
    viewport.style.backgroundPosition = `${x}px ${y}px`;
  }, []);

  const constrain = useCallback(
    (next) => {
      const viewport = viewportRef.current;

      const vw = viewport?.clientWidth || 0;
      const vh = viewport?.clientHeight || 0;

      const minZoom = Math.min(
        fitZoom.current * MIN_ZOOM_FACTOR,
        MAX_ZOOM
      );

      const k = clamp(next.k, minZoom, MAX_ZOOM);

      return {
        k,
        x: clamp(next.x, EDGE - worldWidth * k, vw - EDGE),
        y: clamp(next.y, EDGE - worldHeight * k, vh - EDGE),
      };
    },
    [worldWidth, worldHeight]
  );

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
    (target, duration = 240) => {
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

        animation.current =
          t < 1 ? requestAnimationFrame(step) : null;
      }

      animation.current = requestAnimationFrame(step);
    },
    [apply, constrain, cancelAnimation]
  );

  // "Cover" fit: fills the whole viewport with tiles edge to edge,
  // like a Google Maps default view, cropping overflow rather than
  // letterboxing it. Centered on the grid.
  const getFitView = useCallback(() => {
    const viewport = viewportRef.current;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const fit = clamp(
      Math.max(
        (vw - FIT_PADDING * 2) / worldWidth,
        (vh - FIT_PADDING * 2) / worldHeight
      ),
      0.05,
      MAX_ZOOM
    );

    fitZoom.current = fit;

    return {
      k: fit,
      x: (vw - worldWidth * fit) / 2,
      y: (vh - worldHeight * fit) / 2,
    };
  }, [worldWidth, worldHeight]);

  const zoomAt = useCallback(
    (px, py, factor, animate = false) => {
      const v = view.current;

      const minZoom = Math.min(
        fitZoom.current * MIN_ZOOM_FACTOR,
        MAX_ZOOM
      );

      const k = clamp(v.k * factor, minZoom, MAX_ZOOM);
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

  // Initial fit + keep the wall fitted on resize until the user moves.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    function refit() {
      const fitView = getFitView();

      if (userMoved.current) {
        setView(view.current);
      } else {
        view.current = fitView;
        apply();
      }
    }

    refit();

    const observer = new ResizeObserver(refit);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [getFitView, setView, apply]);

  // When the grid's capacity changes (an admin added spaces), smoothly
  // shrink the existing boxes and refit the whole wall on screen,
  // overriding any manual pan/zoom, since the layout itself changed.
  useEffect(() => {
    if (
      prevCapacity.current !== null &&
      prevCapacity.current !== gridCapacity
    ) {
      userMoved.current = false;
      animateTo(getFitView(), 500);
    }

    prevCapacity.current = gridCapacity;
  }, [gridCapacity, getFitView, animateTo]);

  // Wheel, mouse drag, touch drag and pinch.
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    const pointers = new Map();

    let panStart = null;
    let pinchStart = null;

    function localPoint(clientX, clientY) {
      const rect = viewport.getBoundingClientRect();

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
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
      userMoved.current = true;

      let delta = event.deltaY;

      if (event.deltaMode === 1) delta *= 33;
      if (event.deltaMode === 2) delta *= 400;

      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const speed = event.ctrlKey ? 0.012 : 0.0016;

      const point = localPoint(event.clientX, event.clientY);

      zoomAt(point.x, point.y, Math.exp(-delta * speed));
    }

    function onPointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      cancelAnimation();

      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

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

      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointers.size >= 2 && pinchStart) {
        userMoved.current = true;

        const { dist, center } = pinchMetrics();

        const k = pinchStart.k * (dist / pinchStart.dist);

        // constrain() clamps k; recompute x/y from the clamped value.
        const clampedK = constrain({ k, x: 0, y: 0 }).k;

        setView({
          k: clampedK,
          x: center.x - pinchStart.worldX * clampedK,
          y: center.y - pinchStart.worldY * clampedK,
        });

        return;
      }

      if (pointers.size === 1 && panStart) {
        const dx = event.clientX - panStart.x;
        const dy = event.clientY - panStart.y;

        if (
          !dragged.current &&
          Math.hypot(dx, dy) < DRAG_THRESHOLD
        ) {
          return;
        }

        dragged.current = true;
        userMoved.current = true;

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
        // Went from pinch to one finger: continue panning smoothly.
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

      if (pointers.size === 0) {
        viewport.classList.remove("is-dragging");
      }
    }

    // A drag must not count as a click on the tile under the cursor.
    function onClickCapture(event) {
      if (dragged.current) {
        event.stopPropagation();
        event.preventDefault();
        dragged.current = false;
      }
    }

    viewport.addEventListener("wheel", onWheel, {
      passive: false,
    });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("click", onClickCapture, true);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("click", onClickCapture, true);

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);

      cancelAnimation();
    };
  }, [cancelAnimation, constrain, setView, zoomAt]);

  function zoomFromCenter(factor) {
    const viewport = viewportRef.current;

    userMoved.current = true;

    zoomAt(
      viewport.clientWidth / 2,
      viewport.clientHeight / 2,
      factor,
      true
    );
  }

  // Resets to the default full-bleed view.
  function fitToScreen() {
    userMoved.current = false;

    animateTo(getFitView());
  }

  return (
    <>
      <div className="wall-viewport" ref={viewportRef}>
        <div
          className="wall-world"
          ref={worldRef}
          style={{ width: worldWidth, height: worldHeight }}
        >
          {spaces.map((space) => (
            <SnapSpace
              key={space.id}
              space={space}
              onSelect={onSelect}
              style={{
                left: (space.column ?? 0) * (TILE + GAP),
                top: (space.row ?? 0) * (TILE + GAP),
                width: TILE,
                height: TILE,
              }}
            />
          ))}
        </div>
      </div>

      <div className="wall-controls">
        <button
          type="button"
          onClick={() => zoomFromCenter(1.6)}
          aria-label="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          onClick={() => zoomFromCenter(1 / 1.6)}
          aria-label="Zoom out"
        >
          −
        </button>

        <button
          type="button"
          onClick={fitToScreen}
          aria-label="Reset view"
        >
          ⤢
        </button>
      </div>
    </>
  );
}

export default SnapWallCanvas;