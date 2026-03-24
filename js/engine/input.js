// InputManager - handles mouse, keyboard, and touch input for the world canvas.
// Translates raw events into game actions: tile clicks, camera pan, pinch-zoom.

const TILE_W = 64;
const TILE_H = 32;

// Convert isometric screen position to grid col/row
function screenToGrid(wx, wy) {
  const col = Math.round(wx / (TILE_W / 2) / 2 + wy / (TILE_H / 2) / 2);
  const row = Math.round(wy / (TILE_H / 2) / 2 - wx / (TILE_W / 2) / 2);
  return { col, row };
}

/**
 * Returns true if the client-space point is inside any fixed UI overlay
 * that should block canvas input (joystick panel, HUD buttons, etc.).
 * This is a coordinate-based guard that works regardless of z-index or
 * touch-action propagation quirks across browsers.
 */
function _isInsideUIZone(clientX, clientY) {
  const ids = ['mobileDpadContainer', 'overworldHUD'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right &&
        clientY >= r.top  && clientY <= r.bottom) {
      // For HUD: only block if hitting an element with pointer-events (buttons)
      if (id === 'overworldHUD') {
        const hit = document.elementFromPoint(clientX, clientY);
        if (hit && hit.tagName !== 'CANVAS') return true;
      } else {
        return true;
      }
    }
  }
  return false;
}

export class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Camera} camera
   * @param {function} onTileClick   - (col, row) => void
   * @param {function} onTileDblClick - (col, row) => void
   */
  constructor(canvas, camera, onTileClick, onTileDblClick) {
    this.canvas = canvas;
    this.camera = camera;
    this.onTileClick = onTileClick || (() => {});
    this.onTileDblClick = onTileDblClick || (() => {});

    // Mouse state
    this.mouseDown = false;
    this.mouseButton = -1;
    this.mouseDownPos = { x: 0, y: 0 };
    this.mousePos = { x: 0, y: 0 };
    this.mouseDragged = false;
    this._dragThreshold = 6;

    // Touch state
    this.lastTouch = null;
    this.touchStartDist = 0;
    this.touchStartZoom = 1.0;
    this._touchMoved = false;
    this._touchBlockedByUI = false;
    this._lastTapTime = 0;
    this._lastTapPos = { x: 0, y: 0 };

    this._keys = {};
    this._boundHandlers = {};
    this._init();
  }

  _canvasPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }

  _init() {
    // ── Mouse ────────────────────────────────────────────────────────────────
    const onMouseDown = (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      // Block if click originated inside a UI control zone
      if (_isInsideUIZone(e.clientX, e.clientY)) return;
      const pos = this._canvasPos(e.clientX, e.clientY);
      this.mouseDown = true;
      this.mouseButton = e.button;
      this.mouseDownPos = { ...pos };
      this.mousePos = { ...pos };
      this.mouseDragged = false;
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      const pos = this._canvasPos(e.clientX, e.clientY);
      if (this.mouseDown && e.buttons > 0) {
        const dx = pos.x - this.mousePos.x;
        const dy = pos.y - this.mousePos.y;
        const totalDx = pos.x - this.mouseDownPos.x;
        const totalDy = pos.y - this.mouseDownPos.y;
        if (Math.abs(totalDx) > this._dragThreshold ||
            Math.abs(totalDy) > this._dragThreshold) {
          this.mouseDragged = true;
        }
        if (this.mouseDragged) {
          this.camera.offsetX -= dx / this.camera.zoomLevel;
          this.camera.offsetY -= dy / this.camera.zoomLevel;
        }
      }
      this.mousePos = pos;
    };

    const onMouseUp = (e) => {
      if (!this.mouseDown) return;
      if (!this.mouseDragged) {
        const pos = this._canvasPos(e.clientX, e.clientY);
        const world = this.camera.screenToWorld(pos.x, pos.y);
        const { col, row } = screenToGrid(world.x, world.y);
        if (e.button === 0) this.onTileClick(col, row);
      }
      this.mouseDown   = false;
      this.mouseDragged = false;
      this.mouseButton = -1;
      e.preventDefault();
    };

    const onDblClick = (e) => {
      if (_isInsideUIZone(e.clientX, e.clientY)) return;
      const pos = this._canvasPos(e.clientX, e.clientY);
      const world = this.camera.screenToWorld(pos.x, pos.y);
      const { col, row } = screenToGrid(world.x, world.y);
      this.onTileDblClick(col, row);
      e.preventDefault();
    };

    const onWheel = (e) => {
      e.preventDefault();
      const pos = this._canvasPos(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoom(factor, pos.x, pos.y);
    };

    const onContextMenu = (e) => e.preventDefault();

    // ── Touch ────────────────────────────────────────────────────────────────
    const onTouchStart = (e) => {
      // Block any touch that starts inside a UI control zone (joystick panel, etc.)
      if (e.touches.length > 0) {
        const t = e.touches[0];
        if (_isInsideUIZone(t.clientX, t.clientY)) {
          this._touchBlockedByUI = true;
          return;
        }
      }
      this._touchBlockedByUI = false;
      e.preventDefault();
      this._touchMoved = false;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const pos = this._canvasPos(t.clientX, t.clientY);
        this.lastTouch     = pos;
        this.mouseDownPos  = { ...pos };
      } else if (e.touches.length === 2) {
        const t0 = this._canvasPos(e.touches[0].clientX, e.touches[0].clientY);
        const t1 = this._canvasPos(e.touches[1].clientX, e.touches[1].clientY);
        this.touchStartDist = Math.hypot(t1.x - t0.x, t1.y - t0.y);
        this.touchStartZoom = this.camera.zoomLevel;
      }
    };

    const onTouchMove = (e) => {
      if (this._touchBlockedByUI) return;
      e.preventDefault();
      this._touchMoved = true;

      if (e.touches.length === 1 && this.lastTouch) {
        const t   = e.touches[0];
        const pos = this._canvasPos(t.clientX, t.clientY);
        const dx  = pos.x - this.lastTouch.x;
        const dy  = pos.y - this.lastTouch.y;
        this.camera.offsetX -= dx / this.camera.zoomLevel;
        this.camera.offsetY -= dy / this.camera.zoomLevel;
        this.lastTouch = pos;
      } else if (e.touches.length === 2) {
        const t0   = this._canvasPos(e.touches[0].clientX, e.touches[0].clientY);
        const t1   = this._canvasPos(e.touches[1].clientX, e.touches[1].clientY);
        const dist = Math.hypot(t1.x - t0.x, t1.y - t0.y);
        if (this.touchStartDist > 0) {
          const newZoom     = this.touchStartZoom * (dist / this.touchStartDist);
          const clampedZoom = Math.min(this.camera.maxZoom,
                                Math.max(this.camera.minZoom, newZoom));
          const midX = (t0.x + t1.x) / 2;
          const midY = (t0.y + t1.y) / 2;
          this.camera.zoom(clampedZoom / this.camera.zoomLevel, midX, midY);
          this.touchStartZoom = clampedZoom;
          this.touchStartDist = dist;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (this._touchBlockedByUI) {
        if (e.touches.length === 0) {
          this._touchBlockedByUI = false;
          this.lastTouch = null;
        }
        return;
      }
      e.preventDefault();
      if (!this._touchMoved && e.changedTouches.length === 1) {
        const t    = e.changedTouches[0];
        const pos  = this._canvasPos(t.clientX, t.clientY);
        const world = this.camera.screenToWorld(pos.x, pos.y);
        const { col, row } = screenToGrid(world.x, world.y);

        const now  = Date.now();
        const dx   = pos.x - this._lastTapPos.x;
        const dy   = pos.y - this._lastTapPos.y;
        const dist = Math.hypot(dx, dy);

        if (now - this._lastTapTime < 300 && dist < 30) {
          this.onTileDblClick(col, row);
          this._lastTapTime = 0;
        } else {
          this.onTileClick(col, row);
          this._lastTapTime = now;
          this._lastTapPos  = { ...pos };
        }
      }
      if (e.touches.length === 0) {
        this.lastTouch      = null;
        this.touchStartDist = 0;
      }
    };

    // ── Keyboard  (no camera pan – WASD/arrows drive party movement in main.js) ──
    const onKeyDown = (e) => { this._keys[e.code] = true; };
    const onKeyUp   = (e) => { this._keys[e.code] = false; };

    // Attach
    this.canvas.addEventListener('mousedown',    onMouseDown);
    this.canvas.addEventListener('mousemove',    onMouseMove);
    this.canvas.addEventListener('mouseup',      onMouseUp);
    this.canvas.addEventListener('dblclick',     onDblClick);
    this.canvas.addEventListener('wheel',        onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu',  onContextMenu);
    this.canvas.addEventListener('touchstart',   onTouchStart,  { passive: false });
    this.canvas.addEventListener('touchmove',    onTouchMove,   { passive: false });
    this.canvas.addEventListener('touchend',     onTouchEnd,    { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    this._boundHandlers = {
      mousedown: onMouseDown, mousemove: onMouseMove, mouseup: onMouseUp,
      dblclick: onDblClick, wheel: onWheel, contextmenu: onContextMenu,
      touchstart: onTouchStart, touchmove: onTouchMove, touchend: onTouchEnd,
      keydown: onKeyDown, keyup: onKeyUp,
    };
  }

  isKeyDown(code) { return !!this._keys[code]; }

  destroy() {
    const h = this._boundHandlers;
    this.canvas.removeEventListener('mousedown',   h.mousedown);
    this.canvas.removeEventListener('mousemove',   h.mousemove);
    this.canvas.removeEventListener('mouseup',     h.mouseup);
    this.canvas.removeEventListener('dblclick',    h.dblclick);
    this.canvas.removeEventListener('wheel',       h.wheel);
    this.canvas.removeEventListener('contextmenu', h.contextmenu);
    this.canvas.removeEventListener('touchstart',  h.touchstart);
    this.canvas.removeEventListener('touchmove',   h.touchmove);
    this.canvas.removeEventListener('touchend',    h.touchend);
    window.removeEventListener('keydown', h.keydown);
    window.removeEventListener('keyup',   h.keyup);
    this._boundHandlers = {};
  }
}

export function initInput(canvas, camera, onTileClick, onTileDblClick) {
  return new InputManager(canvas, camera, onTileClick, onTileDblClick);
}

export default InputManager;
