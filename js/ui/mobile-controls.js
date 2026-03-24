/**
 * mobile-controls.js
 * Circular analog joystick for Iron Banner.
 *
 * The joystick maps drag angle + distance to 8 isometric directions:
 *   nw: dCol=-1, dRow=-1   n: dCol=0, dRow=-1   ne: dCol=1, dRow=-1
 *    w: dCol=-1, dRow=0                            e: dCol=1, dRow=0
 *   sw: dCol=-1, dRow=1    s: dCol=0, dRow=1    se: dCol=1, dRow=1
 *
 * The active direction is exposed via getActiveDir() so the game loop
 * can queue movement at exactly the right tick rate (no drift).
 *
 * Usage:
 *   import { MobileControls } from './ui/mobile-controls.js';
 *   const joy = new MobileControls(container, state, moveParty);
 *   joy.show(); // show on overworld
 *   joy.hide(); // hide in menus/combat
 *   const dir = joy.getActiveDir(); // { dCol, dRow } or null
 */

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const OUTER_R    = 60;   // outer circle radius (px)
const KNOB_R     = 22;   // knob radius (px)
const DEAD_ZONE  = 0.22; // fraction of OUTER_R before direction activates

// 8 cardinal + diagonal directions, indexed by (Math.round(deg/45) % 8)
// 0° = right (east), going clockwise
const DIR_TABLE = [
  { dCol:  1, dRow:  0 }, // 0  – E
  { dCol:  1, dRow:  1 }, // 1  – SE
  { dCol:  0, dRow:  1 }, // 2  – S
  { dCol: -1, dRow:  1 }, // 3  – SW
  { dCol: -1, dRow:  0 }, // 4  – W
  { dCol: -1, dRow: -1 }, // 5  – NW
  { dCol:  0, dRow: -1 }, // 6  – N
  { dCol:  1, dRow: -1 }, // 7  – NE
];

// ──────────────────────────────────────────────────────────────────────────────
// Injected styles (once per page)
// ──────────────────────────────────────────────────────────────────────────────

const JOYSTICK_CSS = `
/* ── Joystick wrapper ── */
.joystick-wrap {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.joystick-wrap.joy-hidden {
  display: none;
}

/* ── Outer shell ── */
.joystick-outer {
  position: relative;
  width: ${OUTER_R * 2}px;
  height: ${OUTER_R * 2}px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%,
    rgba(40,30,10,0.90) 0%,
    rgba(15,10,2,0.88) 100%);
  border: 2px solid rgba(212,168,67,0.55);
  box-shadow:
    0 0 18px rgba(0,0,0,0.7),
    inset 0 0 12px rgba(0,0,0,0.5),
    0 0 6px rgba(212,168,67,0.2);
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Directional tick marks ── */
.joystick-outer::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 1px dashed rgba(212,168,67,0.18);
}

/* ── Compass labels ── */
.joy-compass {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.joy-compass span {
  position: absolute;
  font-size: 9px;
  color: rgba(212,168,67,0.30);
  font-family: 'Cinzel', serif;
  font-weight: 600;
  letter-spacing: 0.05em;
  transform: translate(-50%, -50%);
  line-height: 1;
}

.joy-n  { top: 8px;   left: 50%; }
.joy-s  { top: calc(100% - 8px); left: 50%; }
.joy-w  { top: 50%;   left: 8px; }
.joy-e  { top: 50%;   left: calc(100% - 8px); }

/* ── Draggable knob ── */
.joystick-knob {
  position: absolute;
  width: ${KNOB_R * 2}px;
  height: ${KNOB_R * 2}px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%,
    #d4a843 0%,
    #8b6914 55%,
    #5a3e08 100%);
  border: 1.5px solid rgba(255,230,130,0.7);
  box-shadow:
    0 2px 8px rgba(0,0,0,0.8),
    0 0 6px rgba(212,168,67,0.4),
    inset 0 1px 2px rgba(255,255,200,0.3);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: none;
  pointer-events: none;
  will-change: transform;
}

.joystick-knob.joy-returning {
  transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Active glow when direction is engaged */
.joystick-outer.joy-active .joystick-knob {
  box-shadow:
    0 2px 8px rgba(0,0,0,0.8),
    0 0 14px rgba(212,168,67,0.7),
    inset 0 1px 2px rgba(255,255,200,0.3);
}

/* ── Direction indicator ring segments ── */
.joy-dir-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

/* ── Zoom buttons ── */
.joy-zoom-row {
  display: flex;
  gap: 8px;
}

.joy-zoom-btn {
  width: 44px;
  height: 30px;
  border: 1.5px solid rgba(212,168,67,0.5);
  border-radius: 6px;
  background: rgba(15,10,2,0.82);
  color: rgba(212,168,67,0.88);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.08s, box-shadow 0.08s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  font-family: 'Cinzel', serif;
}

.joy-zoom-btn:active,
.joy-zoom-btn.btn-pressed {
  background: rgba(80,50,5,0.9);
  box-shadow: 0 0 8px rgba(212,168,67,0.4);
}
`;

let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.id = 'joystick-styles';
  s.textContent = JOYSTICK_CSS;
  document.head.appendChild(s);
}

// ──────────────────────────────────────────────────────────────────────────────
// MobileControls  (joystick + zoom buttons)
// ──────────────────────────────────────────────────────────────────────────────

export class MobileControls {
  /**
   * @param {HTMLElement} container
   * @param {object}      state        – game state singleton
   * @param {function}    movePartyFn  – moveParty(state, col, row)
   */
  constructor(container, state, movePartyFn) {
    this.container  = container;
    this.state      = state;
    this.moveParty  = movePartyFn;

    this._visible    = false;
    this._touching   = false;
    this._activeDir  = null;   // { dCol, dRow } or null
    this._wrap       = null;
    this._outer      = null;
    this._knob       = null;

    // Pointer tracking
    this._ptId       = null;   // active pointerId

    _injectCSS();
    this._build();
    this._bindEvents();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Returns current direction if joystick past dead-zone, else null. */
  getActiveDir() { return this._activeDir; }

  /** Show joystick (on touch/narrow screens, or forced). */
  show(force = false) {
    const auto = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    if (force || auto) {
      this._visible = true;
      this._wrap && this._wrap.classList.remove('joy-hidden');
    }
  }

  /** Hide joystick unconditionally. */
  hide() {
    this._visible = false;
    this._wrap && this._wrap.classList.add('joy-hidden');
    this._reset();
  }

  /** Toggle visibility. */
  toggle() {
    this._visible ? this.hide() : this.show(true);
  }

  // Legacy compatibility – called by keyboard handler in main.js
  _onDir(dCol, dRow) {
    const pos = this.state?.world?.partyPos;
    if (!pos) return;
    const nc = pos.col + dCol;
    const nr = pos.row + dRow;
    const w  = this.state.world.width;
    const h  = this.state.world.height;
    if (nc < 0 || nr < 0 || nc >= w || nr >= h) return;
    this.moveParty(this.state, nc, nr);
  }

  // ── Build DOM ───────────────────────────────────────────────────────────────

  _build() {
    const wrap = document.createElement('div');
    wrap.className = 'joystick-wrap joy-hidden';

    // Outer shell
    const outer = document.createElement('div');
    outer.className = 'joystick-outer';

    // Compass labels
    const compass = document.createElement('div');
    compass.className = 'joy-compass';
    compass.innerHTML = `
      <span class="joy-n">N</span>
      <span class="joy-s">S</span>
      <span class="joy-w">W</span>
      <span class="joy-e">E</span>
    `;

    // Knob
    const knob = document.createElement('div');
    knob.className = 'joystick-knob';

    outer.appendChild(compass);
    outer.appendChild(knob);
    wrap.appendChild(outer);

    // Zoom buttons
    const zoomRow = document.createElement('div');
    zoomRow.className = 'joy-zoom-row';

    const zIn  = this._makeZoomBtn('+', 1);
    const zOut = this._makeZoomBtn('−', -1);
    zoomRow.appendChild(zIn);
    zoomRow.appendChild(zOut);
    wrap.appendChild(zoomRow);

    this._wrap  = wrap;
    this._outer = outer;
    this._knob  = knob;
    this.container.appendChild(wrap);
  }

  _makeZoomBtn(label, dir) {
    const btn = document.createElement('button');
    btn.className = 'joy-zoom-btn';
    btn.textContent = label;
    btn.type = 'button';
    btn.setAttribute('aria-label', dir > 0 ? 'Zoom in' : 'Zoom out');

    const fire = (e) => {
      e.preventDefault();
      btn.classList.add('btn-pressed');
      setTimeout(() => btn.classList.remove('btn-pressed'), 120);
      this.container.dispatchEvent(
        new CustomEvent('dpad:zoom', { detail: { dir }, bubbles: true })
      );
    };
    btn.addEventListener('pointerdown', fire, { passive: false });
    return btn;
  }

  // ── Pointer events (unified mouse + touch) ──────────────────────────────────

  _bindEvents() {
    const outer = this._outer;

    outer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this._ptId !== null) return; // already tracking
      this._ptId = e.pointerId;
      outer.setPointerCapture(e.pointerId);
      this._knob.classList.remove('joy-returning');
      this._handlePointer(e);
    }, { passive: false });

    outer.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._ptId) return;
      e.preventDefault();
      this._handlePointer(e);
    }, { passive: false });

    const release = (e) => {
      if (e.pointerId !== this._ptId) return;
      this._ptId = null;
      this._reset();
    };
    outer.addEventListener('pointerup',     release, { passive: true });
    outer.addEventListener('pointercancel', release, { passive: true });
  }

  _handlePointer(e) {
    const rect = this._outer.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    const dx   = e.clientX - cx;
    const dy   = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp knob within outer circle
    const clamp = Math.min(dist, OUTER_R - KNOB_R);
    const angle = Math.atan2(dy, dx);
    const kx    = Math.cos(angle) * clamp;
    const ky    = Math.sin(angle) * clamp;

    // Move knob visually (offset from its CSS center position)
    this._knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    const ratio = dist / OUTER_R;

    if (ratio > DEAD_ZONE) {
      const dir = this._angleToDir(angle);
      this._activeDir = dir;
      this._outer.classList.add('joy-active');
    } else {
      this._activeDir = null;
      this._outer.classList.remove('joy-active');
    }
  }

  _angleToDir(angle) {
    // angle is -π..π; convert to 0..360 clockwise from east
    const deg   = ((angle * 180 / Math.PI) + 360) % 360;
    const idx   = Math.round(deg / 45) % 8;
    return DIR_TABLE[idx];
  }

  _reset() {
    this._activeDir = null;
    this._outer.classList.remove('joy-active');
    this._knob.classList.add('joy-returning');
    this._knob.style.transform = 'translate(-50%, -50%)';
    // Remove transition class after animation
    setTimeout(() => {
      if (this._knob) this._knob.classList.remove('joy-returning');
    }, 150);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function initMobileControls(container, state, movePartyFn) {
  return new MobileControls(container, state, movePartyFn);
}
