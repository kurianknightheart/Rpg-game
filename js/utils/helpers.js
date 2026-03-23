// General helper utilities

// Deep clone an object
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}

// Format gold amount
export function formatGold(amount) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k g`;
  return `${amount} g`;
}

// Format a stat value with +/- prefix
export function formatStat(val) {
  return val >= 0 ? `+${val}` : `${val}`;
}

// Get ordinal suffix (1st, 2nd, 3rd, 4th)
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Capitalize first letter
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format time as HH:MM
export function formatTime(hours, minutes = 0) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor(minutes) % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Format day number
export function formatDay(day) {
  return `Day ${day}`;
}

// Get a color hex from HSL
export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Interpolate between two hex colors
export function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Create a unique ID
let _idCounter = 0;
export function uid(prefix = '') {
  _idCounter++;
  return `${prefix}${Date.now()}_${_idCounter}`;
}

// Throttle a function
export function throttle(fn, delay) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

// Debounce a function
export function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Check if touch device
export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// Get element position relative to canvas
export function getElementPos(element, event) {
  const rect = element.getBoundingClientRect();
  const touch = event.touches ? event.touches[0] : event;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

// Parse a range [min, max] or single value
export function parseRange(val) {
  if (Array.isArray(val)) {
    return Math.floor(Math.random() * (val[1] - val[0] + 1)) + val[0];
  }
  return val;
}

// Clamp a number
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Generate a list of numbers
export function range(start, end, step = 1) {
  const arr = [];
  for (let i = start; i <= end; i += step) arr.push(i);
  return arr;
}

// String pad
export function padLeft(str, len, char = ' ') {
  str = String(str);
  while (str.length < len) str = char + str;
  return str;
}

// Check rect intersection
export function rectsOverlap(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
}

// Point in rect check
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export default {
  deepClone, formatGold, formatStat, ordinal, capitalize,
  formatTime, formatDay, hslToHex, lerpColor, uid,
  throttle, debounce, isTouchDevice, getElementPos,
  parseRange, clamp, range, padLeft, rectsOverlap, pointInRect
};
