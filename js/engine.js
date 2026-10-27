// Audio-Engine: erzeugt alle Sounds per Synthese. Kennt weder UI noch Sequenzer,
// damit sie später austauschbar bleibt (z. B. gegen eine Rust/WASM-Version).
(function (global) {
  'use strict';

  function makeNoise(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  class DrumEngine {
    // ctx: AudioContext oder OfflineAudioContext
    constructor(ctx) {
      this.ctx = ctx;
      this.noise = makeNoise(ctx);
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -12;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.15;
      this.master = ctx.createGain();
      this.master.gain.value = 0.8;
      this.comp.connect(this.master).connect(ctx.destination);
      this.out = this.comp;
    }

    setMaster(v) { this.master.gain.value = v; }

    trigger(voice, time, vel) {
      const fn = this['_' + voice];
      if (fn) fn.call(this, time, vel);
    }

    _env(g, time, peak, decay) {
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    }

    _noiseSrc(time, dur) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.start(time, Math.random(), dur);
      return s;
    }

    _kick(t, vel) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      this._env(g, t, 1.0 * vel, 0.45);
      o.connect(g).connect(this.out);
      o.start(t); o.stop(t + 0.5);
      // kurzer Klick für Attack
      const n = this._noiseSrc(t, 0.01);
      const ng = c.createGain();
      this._env(ng, t, 0.25 * vel, 0.01);
      n.connect(ng).connect(this.out);
    }

    _clap(t, vel) {
      const c = this.ctx;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach(off => {
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.9 * vel, t + off + 0.001);
        g.gain.exponentialRampToValueAtTime(0.1 * vel, t + off + 0.01);
      });
      g.gain.setValueAtTime(0.7 * vel, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      const n = this._noiseSrc(t, 0.25);
      n.connect(bp).connect(g).connect(this.out);
    }

    _hat(t, vel, decay) {
      const c = this.ctx;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 7500;
      const g = c.createGain();
      this._env(g, t, 0.5 * vel, decay);
      const n = this._noiseSrc(t, decay + 0.05);
      n.connect(hp).connect(g).connect(this.out);
    }
    _chat(t, vel) { this._hat(t, vel, 0.05); }
    _ohat(t, vel) { this._hat(t, vel, 0.28); }

    _perc(t, vel) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(210, t + 0.08);
      const g = c.createGain();
      this._env(g, t, 0.5 * vel, 0.12);
      o.connect(g).connect(this.out);
      o.start(t); o.stop(t + 0.15);
    }
  }

  global.DrumEngine = DrumEngine;
})(window);
