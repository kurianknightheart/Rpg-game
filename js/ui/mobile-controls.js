/**
 * mobile-controls.js – Circular analog joystick inside a dedicated control panel.
 *
 * The panel is a separate DOM layer (z-index 9500) that sits above the canvas.
 * ALL touch and pointer events on the panel are explicitly consumed so the canvas
 * never sees them, solving the "joystick moves the map" problem.
 *
 * Direction mapping (8-way isometric):
 *   NW: dCol=-1,dRow=-1   N: dCol=0,dRow=-1   NE: dCol=1,dRow=-1
 *    W: dCol=-1,dRow=0                           E: dCol=1,dRow=0
 *   SW: dCol=-1,dRow=1    S: dCol=0,dRow=1    SE: dCol=1,dRow=1
 *
 * API:
 *   joy.show([force])    – reveal panel
 *   joy.hide()           – hide panel
 *   joy.toggle()         – toggle visibility
 *   joy.getActiveDir()   – { dCol, dRow } or null (polled each game tick)
 *   joy._onDir(dc,dr)    – legacy single-step for keyboard compat
 */

const OUTER_R   = 58;    // outer circle radius (px)
const KNOB_R    = 21;    // knob radius (px)
const DEAD_ZONE = 0.20;  // fraction of OUTER_R before direction activates

// 8-way direction table (clockwise from East)
const DIR8 = [
  { dCol:  1, dRow:  0 }, // 0  E
  { dCol:  1, dRow:  1 }, // 1  SE
  { dCol:  0, dRow:  1 }, // 2  S
  { dCol: -1, dRow:  1 }, // 3  SW
  { dCol: -1, dRow:  0 }, // 4  W
  { dCol: -1, dRow: -1 }, // 5  NW
  { dCol:  0, dRow: -1 }, // 6  N
  { dCol:  1, dRow: -1 }, // 7  NE
];

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
/* ── Control panel shell ── */
.joy-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 9500;
  width: 176px;
  padding: 10px 10px 8px;
  background:
    linear-gradient(160deg, rgba(22,16,4,0.94) 0%, rgba(10,8,2,0.96) 100%);
  border: 1px solid rgba(212,168,67,0.45);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(212,168,67,0.10),
    0 6px 32px rgba(0,0,0,0.85),
    inset 0 1px 0 rgba(212,168,67,0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.joy-panel.joy-hidden { display: none !important; }

/* Panel label */
.joy-panel-label {
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 9px;
  letter-spacing: 0.18em;
  color: rgba(212,168,67,0.50);
  text-transform: uppercase;
  margin-bottom: -2px;
  pointer-events: none;
}

/* ── Outer joystick ring ── */
.joy-outer {
  position: relative;
  width: ${OUTER_R * 2}px;
  height: ${OUTER_R * 2}px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%,
      rgba(50,38,10,0.95) 0%,
      rgba(18,13,3,0.95) 100%);
  border: 2px solid rgba(212,168,67,0.40);
  box-shadow:
    0 0 0 3px rgba(212,168,67,0.08),
    0 3px 14px rgba(0,0,0,0.80),
    inset 0 0 16px rgba(0,0,0,0.50);
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

/* Dashed guide ring */
.joy-outer::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 1px dashed rgba(212,168,67,0.14);
  pointer-events: none;
}

/* Outer ring glow when active */
.joy-outer.joy-active {
  border-color: rgba(212,168,67,0.75);
  box-shadow:
    0 0 0 3px rgba(212,168,67,0.15),
    0 3px 18px rgba(0,0,0,0.85),
    0 0 16px rgba(212,168,67,0.20),
    inset 0 0 16px rgba(0,0,0,0.50);
  cursor: grabbing;
}

/* Compass labels */
.joy-compass {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}
.joy-compass span {
  position: absolute;
  font-size: 8px;
  color: rgba(212,168,67,0.28);
  font-family: 'Cinzel', serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  transform: translate(-50%, -50%);
  line-height: 1;
}
.joy-cn { top: 7px;             left: 50%; }
.joy-cs { top: calc(100%-7px);  left: 50%; }
.joy-cw { top: 50%;             left: 7px; }
.joy-ce { top: 50%;             left: calc(100%-7px); }

/* ── Knob ── */
.joy-knob {
  position: absolute;
  width: ${KNOB_R * 2}px;
  height: ${KNOB_R * 2}px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 36% 30%,
      #f0c84a 0%,
      #c49020 40%,
      #7a5008 80%,
      #4a3004 100%);
  border: 1.5px solid rgba(255,235,150,0.65);
  box-shadow:
    0 2px 10px rgba(0,0,0,0.85),
    0 0 8px rgba(212,168,67,0.30),
    inset 0 1px 3px rgba(255,250,200,0.25);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  will-change: transform;
}
.joy-knob.returning {
  transition: transform 0.14s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.joy-outer.joy-active .joy-knob {
  box-shadow:
    0 2px 10px rgba(0,0,0,0.85),
    0 0 18px rgba(212,168,67,0.65),
    inset 0 1px 3px rgba(255,250,200,0.25);
}

/* ── Direction indicator dots (8 small dots around ring) ── */
.joy-dir-dot {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(212,168,67,0.25);
  transform-origin: center;
  pointer-events: none;
}

/* ── Zoom buttons ── */
.joy-zoom-row {
  display: flex;
  gap: 6px;
}
.joy-zoom-btn {
  flex: 1;
  height: 28px;
  min-width: 44px;
  border: 1px solid rgba(212,168,67,0.40);
  border-radius: 6px;
  background: rgba(20,14,3,0.85);
  color: rgba(212,168,67,0.85);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: 'Cinzel', serif;
  transition: background 0.08s, box-shadow 0.08s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  touch-action: none;
}
.joy-zoom-btn:active,
.joy-zoom-btn.pressing {
  background: rgba(80,55,5,0.92);
  box-shadow: 0 0 10px rgba(212,168,67,0.35);
  border-color: rgba(212,168,67,0.70);
}
`;

let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.id    = 'joystick-panel-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Block ALL touch & pointer & mouse events from reaching the canvas. */
function _blockAll(el) {
  const absorb = (e) => { e.stopPropagation(); e.preventDefault(); };
  ['touchstart','touchmove','touchend','touchcancel',
   'pointerdown','pointermove','pointerup','pointercancel',
   'mousedown','mousemove','mouseup','click','contextmenu'
  ].forEach(type =>
    el.addEventListener(type, absorb, { passive: false, capture: false })
  );
}

// ── MobileControls ───────────────────────────────────────────────────────────

export class MobileControls {
  /**
   * @param {HTMLElement} container   – parent element to mount the panel into
   * @param {object}      state       – game state (used by legacy _onDir)
   * @param {function}    movePartyFn – moveParty(state, col, row)
   */
  constructor(container, state, movePartyFn) {
    this.container  = container;
    this.state      = state;
    this.moveParty  = movePartyFn;

    this._visible   = false;
    this._panel     = null;
    this._outer     = null;
    this._knob      = null;
    this._activeDir = null;
    this._ptId      = null;

    _injectCSS();
    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Returns { dCol, dRow } when joystick is pushed past dead-zone, else null. */
  getActiveDir() { return this._activeDir; }

  show(force = false) {
    const auto = window.matchMedia('(pointer: coarse)').matches ||
                 window.innerWidth < 900;
    if (force || auto) {
      this._visible = true;
      this._panel && this._panel.classList.remove('joy-hidden');
    }
  }

  hide() {
    this._visible = false;
    this._panel && this._panel.classList.add('joy-hidden');
    this._reset();
  }

  toggle() { this._visible ? this.hide() : this.show(true); }

  /** Legacy single-step used by keyboard handler. */
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

  // ── DOM construction ────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div');
    panel.className = 'joy-panel joy-hidden';

    // Label
    const label = document.createElement('div');
    label.className = 'joy-panel-label';
    label.textContent = 'Movement';

    // Outer ring
    const outer = document.createElement('div');
    outer.className = 'joy-outer';

    // Compass marks
    const compass = document.createElement('div');
    compass.className = 'joy-compass';
    compass.innerHTML = `
      <span class="joy-cn">N</span>
      <span class="joy-cs">S</span>
      <span class="joy-cw">W</span>
      <span class="joy-ce">E</span>
    `;

    // 8 direction dots
    for (let i = 0; i < 8; i++) {
      const deg  = i * 45;
      const rad  = (deg - 90) * Math.PI / 180;
      const dotR = OUTER_R - 6;
      const dx   = Math.cos(rad) * dotR;
      const dy   = Math.sin(rad) * dotR;
      const dot  = document.createElement('div');
      dot.className = 'joy-dir-dot';
      dot.style.left = `calc(50% + ${dx}px - 1.5px)`;
      dot.style.top  = `calc(50% + ${dy}px - 1.5px)`;
      outer.appendChild(dot);
    }

    // Knob
    const knob = document.createElement('div');
    knob.className = 'joy-knob';

    outer.appendChild(compass);
    outer.appendChild(knob);

    // Zoom row
    const zoomRow = document.createElement('div');
    zoomRow.className = 'joy-zoom-row';
    zoomRow.appendChild(this._makeZoomBtn('+', 1));
    zoomRow.appendChild(this._makeZoomBtn('−', -1));

    panel.appendChild(label);
    panel.appendChild(outer);
    panel.appendChild(zoomRow);

    // Block ALL events on the entire panel from reaching canvas below
    _blockAll(panel);

    this._panel = panel;
    this._outer = outer;
    this._knob  = knob;
    this.container.appendChild(panel);

    this._bindJoystick();
  }

  _makeZoomBtn(text, dir) {
    const btn = document.createElement('button');
    btn.className   = 'joy-zoom-btn';
    btn.textContent = text;
    btn.type        = 'button';

    const fire = (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.classList.add('pressing');
      setTimeout(() => btn.classList.remove('pressing'), 120);
      this.container.dispatchEvent(
        new CustomEvent('dpad:zoom', { detail: { dir }, bubbles: true })
      );
    };
    btn.addEventListener('pointerdown', fire, { passive: false });
    return btn;
  }

  // ── Joystick pointer handling ────────────────────────────────────────────────

  _bindJoystick() {
    const outer = this._outer;

    outer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this._ptId !== null) return;
      this._ptId = e.pointerId;
      outer.setPointerCapture(e.pointerId);
      this._knob.classList.remove('returning');
      this._move(e.clientX, e.clientY);
    }, { passive: false });

    outer.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._ptId) return;
      e.preventDefault();
      e.stopPropagation();
      this._move(e.clientX, e.clientY);
    }, { passive: false });

    const release = (e) => {
      if (e.pointerId !== this._ptId) return;
      e.stopPropagation();
      this._ptId = null;
      this._reset();
    };
    outer.addEventListener('pointerup',     release, { passive: true });
    outer.addEventListener('pointercancel', release, { passive: true });
  }

  _move(clientX, clientY) {
    const rect  = this._outer.getBoundingClientRect();
    const cx    = rect.left + rect.width  / 2;
    const cy    = rect.top  + rect.height / 2;
    const dx    = clientX - cx;
    const dy    = clientY - cy;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Clamp knob inside ring
    const clamp = Math.min(dist, OUTER_R - KNOB_R);
    const kx    = Math.cos(angle) * clamp;
    const ky    = Math.sin(angle) * clamp;
    this._knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    if (dist / OUTER_R > DEAD_ZONE) {
      this._activeDir = DIR8[Math.round(((angle * 180 / Math.PI) + 360) % 360 / 45) % 8];
      this._outer.classList.add('joy-active');
    } else {
      this._activeDir = null;
      this._outer.classList.remove('joy-active');
    }
  }

  _reset() {
    this._activeDir = null;
    this._outer.classList.remove('joy-active');
    this._knob.classList.add('returning');
    this._knob.style.transform = 'translate(-50%, -50%)';
    setTimeout(() => this._knob && this._knob.classList.remove('returning'), 160);
  }
}

export function initMobileControls(container, state, movePartyFn) {
  return new MobileControls(container, state, movePartyFn);
}
