/**
 * mobile-controls.js
 * Virtual D-pad and floating joystick for Iron Banner (browser-based isometric RPG).
 *
 * Isometric movement deltas:
 *   nw: dCol=-1, dRow=-1   n: dCol=0, dRow=-1   ne: dCol=1, dRow=-1
 *    w: dCol=-1, dRow=0                            e: dCol=1, dRow=0
 *   sw: dCol=-1, dRow=1    s: dCol=0, dRow=1    se: dCol=1, dRow=1
 *
 * Usage:
 *   import { initMobileControls } from './ui/mobile-controls.js';
 *   const controls = initMobileControls(document.getElementById('gameContainer'), state, moveParty);
 *   controls.show(); // call when entering overworld
 *   controls.hide(); // call when in menus/combat/settlement
 */

// Direction definitions: [dirClass, label, dCol, dRow]
const DIRECTIONS = [
  ['dpad-nw', '↖', -1, -1],
  ['dpad-n',  '↑',  0, -1],
  ['dpad-ne', '↗',  1, -1],
  ['dpad-w',  '←', -1,  0],
  null, // center cell placeholder
  ['dpad-e',  '→',  1,  0],
  ['dpad-sw', '↙', -1,  1],
  ['dpad-s',  '↓',  0,  1],
  ['dpad-se', '↘',  1,  1],
];

// Inline styles injected once per page load
const DPAD_STYLES = `
.mobile-dpad {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.mobile-dpad.dpad-hidden {
  display: none;
}

.dpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 48px);
  grid-template-rows: repeat(3, 48px);
  gap: 4px;
}

.dpad-btn {
  width: 48px;
  height: 48px;
  border: 2px solid rgba(255, 220, 100, 0.6);
  border-radius: 8px;
  background: rgba(20, 12, 4, 0.75);
  color: rgba(255, 220, 100, 0.9);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.08s, transform 0.08s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.dpad-btn:active,
.dpad-btn.dpad-active {
  background: rgba(180, 120, 20, 0.85);
  transform: scale(0.93);
}

.dpad-center-cell {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dpad-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 220, 100, 0.3);
  border: 1px solid rgba(255, 220, 100, 0.5);
}

.dpad-zoom {
  display: flex;
  gap: 8px;
}

.dpad-zoom-btn {
  width: 44px;
  height: 32px;
  border: 2px solid rgba(255, 220, 100, 0.5);
  border-radius: 6px;
  background: rgba(20, 12, 4, 0.75);
  color: rgba(255, 220, 100, 0.85);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.08s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.dpad-zoom-btn:active {
  background: rgba(180, 120, 20, 0.85);
}
`;

let _stylesInjected = false;

function injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'mobile-dpad-styles';
  style.textContent = DPAD_STYLES;
  document.head.appendChild(style);
}

export class MobileControls {
  /**
   * @param {HTMLElement} container - DOM element to append the D-pad to
   * @param {object} state - Game state singleton (state.world.partyPos, state.world.width/height)
   * @param {function} movePartyFn - function(state, col, row) to move the party
   */
  constructor(container, state, movePartyFn) {
    this.container = container;
    this.state = state;
    this.moveParty = movePartyFn;

    this._visible = false;
    this._repeatTimer = null;
    this._repeatInitTimer = null;
    this._repeatInterval = 400;   // ms between repeat steps when held
    this._repeatDelay = 200;      // ms before first repeat fires
    this._el = null;

    injectStyles();
    this._build();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Show the D-pad. Only shows if touch device or narrow screen (or forced).
   * Pass `force = true` to show regardless of device type.
   */
  show(force = false) {
    const isTouchOrNarrow =
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth < 900;

    if (force || isTouchOrNarrow) {
      this._visible = true;
      if (this._el) {
        this._el.classList.remove('dpad-hidden');
      }
    }
  }

  /**
   * Hide the D-pad unconditionally.
   */
  hide() {
    this._visible = false;
    if (this._el) {
      this._el.classList.add('dpad-hidden');
    }
    this._stopRepeat();
  }

  /**
   * Toggle the D-pad visibility (useful for a UI toggle button).
   */
  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show(true); // force-show on toggle
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Build and insert the D-pad DOM into this.container.
   */
  _build() {
    // Wrapper
    const dpad = document.createElement('div');
    dpad.className = 'mobile-dpad dpad-hidden';
    dpad.id = 'mobileDpad';

    // Grid
    const grid = document.createElement('div');
    grid.className = 'dpad-grid';

    DIRECTIONS.forEach((def, i) => {
      if (def === null) {
        // Center decorative cell
        const center = document.createElement('div');
        center.className = 'dpad-center-cell';
        const dot = document.createElement('div');
        dot.className = 'dpad-dot';
        center.appendChild(dot);
        grid.appendChild(center);
        return;
      }

      const [dirClass, label, dCol, dRow] = def;
      const btn = document.createElement('button');
      btn.className = `dpad-btn ${dirClass}`;
      btn.textContent = label;
      btn.setAttribute('data-col', dCol);
      btn.setAttribute('data-row', dRow);
      btn.setAttribute('aria-label', `Move ${dirClass.replace('dpad-', '')}`);
      btn.setAttribute('type', 'button');

      // Touch events (primary for mobile)
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('dpad-active');
        this._onDir(dCol, dRow);
        this._startRepeat(dCol, dRow);
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('dpad-active');
        this._stopRepeat();
      }, { passive: false });

      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        btn.classList.remove('dpad-active');
        this._stopRepeat();
      }, { passive: false });

      // Mouse events for desktop testing
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        btn.classList.add('dpad-active');
        this._onDir(dCol, dRow);
        this._startRepeat(dCol, dRow);
      });

      btn.addEventListener('mouseup', () => {
        btn.classList.remove('dpad-active');
        this._stopRepeat();
      });

      btn.addEventListener('mouseleave', () => {
        btn.classList.remove('dpad-active');
        this._stopRepeat();
      });

      grid.appendChild(btn);
    });

    dpad.appendChild(grid);

    // Zoom row
    const zoomRow = document.createElement('div');
    zoomRow.className = 'dpad-zoom';

    const zoomIn = document.createElement('button');
    zoomIn.className = 'dpad-zoom-btn';
    zoomIn.id = 'dpadZoomIn';
    zoomIn.textContent = '+';
    zoomIn.setAttribute('type', 'button');
    zoomIn.setAttribute('aria-label', 'Zoom in');
    zoomIn.addEventListener('touchstart', (e) => { e.preventDefault(); this._onZoom(1); }, { passive: false });
    zoomIn.addEventListener('mousedown', (e) => { e.preventDefault(); this._onZoom(1); });

    const zoomOut = document.createElement('button');
    zoomOut.className = 'dpad-zoom-btn';
    zoomOut.id = 'dpadZoomOut';
    zoomOut.textContent = '−';
    zoomOut.setAttribute('type', 'button');
    zoomOut.setAttribute('aria-label', 'Zoom out');
    zoomOut.addEventListener('touchstart', (e) => { e.preventDefault(); this._onZoom(-1); }, { passive: false });
    zoomOut.addEventListener('mousedown', (e) => { e.preventDefault(); this._onZoom(-1); });

    zoomRow.appendChild(zoomIn);
    zoomRow.appendChild(zoomOut);
    dpad.appendChild(zoomRow);

    this._el = dpad;
    this.container.appendChild(dpad);
  }

  /**
   * Handle a single directional step.
   * Validates bounds before calling moveParty.
   * @param {number} dCol
   * @param {number} dRow
   */
  _onDir(dCol, dRow) {
    const pos = this.state && this.state.world && this.state.world.partyPos;
    if (!pos) return;

    const newCol = pos.col + dCol;
    const newRow = pos.row + dRow;
    const w = this.state.world.width;
    const h = this.state.world.height;

    if (newCol < 0 || newRow < 0 || newCol >= w || newRow >= h) return;

    this.moveParty(this.state, newCol, newRow);
  }

  /**
   * Handle zoom button press.
   * Dispatches a custom event; callers can listen for 'dpad:zoom' on the container.
   * @param {number} dir - +1 for zoom in, -1 for zoom out
   */
  _onZoom(dir) {
    if (this.container) {
      this.container.dispatchEvent(
        new CustomEvent('dpad:zoom', { detail: { dir }, bubbles: true })
      );
    }
  }

  /**
   * Start a repeating move after an initial delay.
   * Cancels any existing repeat first.
   * @param {number} dCol
   * @param {number} dRow
   */
  _startRepeat(dCol, dRow) {
    this._stopRepeat();

    this._repeatInitTimer = setTimeout(() => {
      this._repeatTimer = setInterval(() => {
        this._onDir(dCol, dRow);
      }, this._repeatInterval);
    }, this._repeatDelay);
  }

  /**
   * Stop any active repeat timer.
   */
  _stopRepeat() {
    if (this._repeatInitTimer !== null) {
      clearTimeout(this._repeatInitTimer);
      this._repeatInitTimer = null;
    }
    if (this._repeatTimer !== null) {
      clearInterval(this._repeatTimer);
      this._repeatTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Create and return a MobileControls instance.
 *
 * @param {HTMLElement} container
 * @param {object} state
 * @param {function} movePartyFn
 * @returns {MobileControls}
 */
export function initMobileControls(container, state, movePartyFn) {
  return new MobileControls(container, state, movePartyFn);
}

// ---------------------------------------------------------------------------
// Standalone toggle helper
// ---------------------------------------------------------------------------

// Module-level reference so toggleDpad() can operate without a direct handle.
let _instance = null;

/**
 * Store an instance reference for the module-level toggle.
 * Called automatically by initMobileControls if you want toggleDpad() support.
 *
 * @param {MobileControls} instance
 */
export function registerDpadInstance(instance) {
  _instance = instance;
}

/**
 * Toggle the D-pad visibility. Useful for wiring up a UI button without
 * needing to pass the MobileControls instance around.
 *
 * Example:
 *   <button onclick="toggleDpad()">Toggle D-pad</button>
 *   // after: import { toggleDpad } from './ui/mobile-controls.js';
 *   // window.toggleDpad = toggleDpad;
 */
export function toggleDpad() {
  if (_instance) {
    _instance.toggle();
  }
}
