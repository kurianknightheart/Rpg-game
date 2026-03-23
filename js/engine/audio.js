// Audio system stub - Web Audio API based
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicVolume = 0.3;
    this.sfxVolume = 0.7;
    this.currentMusic = null;
    this._sounds = {};
    this._music = {};
    this._initialized = false;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  // Generate simple procedural sound effects using Web Audio
  playTone(freq, duration, type = 'sine', vol = 0.3) {
    if (!this._initialized || !this.enabled) return;
    try {
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(vol * this.sfxVolume, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      oscillator.start(this.ctx.currentTime);
      oscillator.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }

  // Play a sequence of tones
  playSequence(notes) {
    if (!this._initialized || !this.enabled) return;
    let time = this.ctx.currentTime;
    for (const note of notes) {
      this._scheduleTone(note.freq, time, note.dur, note.type || 'sine', note.vol || 0.3);
      time += note.dur;
    }
  }

  _scheduleTone(freq, startTime, duration, type, vol) {
    try {
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(vol * this.sfxVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (e) {}
  }

  // Sound effect presets
  playSFX(name) {
    if (!this._initialized || !this.enabled) return;
    const sfx = {
      attack: () => this.playTone(200, 0.1, 'sawtooth', 0.4),
      hit: () => {
        this.playTone(150, 0.05, 'square', 0.3);
        setTimeout(() => this.playTone(100, 0.1, 'square', 0.2), 50);
      },
      miss: () => this.playTone(300, 0.1, 'sine', 0.2),
      death: () => this.playSequence([
        { freq: 200, dur: 0.1, type: 'sawtooth' },
        { freq: 150, dur: 0.1, type: 'sawtooth' },
        { freq: 100, dur: 0.2, type: 'sawtooth', vol: 0.2 }
      ]),
      levelup: () => this.playSequence([
        { freq: 523, dur: 0.1 }, { freq: 659, dur: 0.1 },
        { freq: 784, dur: 0.1 }, { freq: 1047, dur: 0.2 }
      ]),
      coin: () => this.playSequence([
        { freq: 880, dur: 0.05 }, { freq: 1100, dur: 0.1 }
      ]),
      click: () => this.playTone(600, 0.05, 'square', 0.15),
      move: () => this.playTone(300, 0.05, 'sine', 0.1),
      victory: () => this.playSequence([
        { freq: 523, dur: 0.1 }, { freq: 659, dur: 0.1 },
        { freq: 784, dur: 0.1 }, { freq: 1047, dur: 0.1 },
        { freq: 784, dur: 0.1 }, { freq: 1047, dur: 0.3 }
      ]),
      defeat: () => this.playSequence([
        { freq: 400, dur: 0.2, type: 'sawtooth' },
        { freq: 300, dur: 0.2, type: 'sawtooth' },
        { freq: 200, dur: 0.4, type: 'sawtooth', vol: 0.2 }
      ]),
      select: () => this.playTone(700, 0.05, 'sine', 0.15),
      error: () => this.playTone(200, 0.2, 'square', 0.3),
      door: () => this.playTone(150, 0.15, 'sawtooth', 0.25),
    };

    if (sfx[name]) sfx[name]();
  }

  // Resume audio context on user interaction
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
  }

  setSFXVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }
}

export const audio = new AudioSystem();
export default audio;
