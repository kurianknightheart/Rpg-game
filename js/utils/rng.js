// RNG utilities with seedable random

// Simple mulberry32 PRNG - fast, good quality
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let _rng = Math.random;
let _seed = Date.now();

export function seed(s) {
  _seed = s;
  _rng = mulberry32(s);
}

export function random() {
  return _rng();
}

export function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
  return random() * (max - min) + min;
}

export function randRange(range) {
  // range is [min, max]
  if (Array.isArray(range)) return randInt(range[0], range[1]);
  return range;
}

export function chance(pct) {
  // pct: 0-100
  return random() * 100 < pct;
}

export function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(random() * arr.length)];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWeighted(items, weightFn) {
  // items: array, weightFn: (item) => number
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Noise functions for terrain generation
export class PerlinNoise {
  constructor(s) {
    this.seed = s || Date.now();
    this.perm = new Uint8Array(512);
    this._init();
  }

  _init() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Shuffle with our seed
    let rng = mulberry32(this.seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return a + t * (b - a); }

  grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  noise2d(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const a = this.perm[X] + Y;
    const aa = this.perm[a];
    const ab = this.perm[a + 1];
    const b = this.perm[X + 1] + Y;
    const ba = this.perm[b];
    const bb = this.perm[b + 1];
    return this.lerp(
      this.lerp(this.grad(this.perm[aa], x, y), this.grad(this.perm[ba], x - 1, y), u),
      this.lerp(this.grad(this.perm[ab], x, y - 1), this.grad(this.perm[bb], x - 1, y - 1), u),
      v
    );
  }

  octave(x, y, octaves, persistence, scale) {
    let val = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.noise2d(x * frequency, y * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return val / maxVal;
  }
}

export default {
  seed, random, randInt, randFloat, randRange, chance, pick, shuffle, pickWeighted
};
