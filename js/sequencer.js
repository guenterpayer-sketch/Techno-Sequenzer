// Sequenzer: Lookahead-Scheduling auf der Audio-Uhr, damit das Timing
// unabhängig von UI-Rucklern bleibt.
(function (global) {
  'use strict';

  const STEPS = 16;
  const TRACKS = [
    { id: 'kick', name: 'Kick' },
    { id: 'clap', name: 'Clap' },
    { id: 'chat', name: 'Hat zu' },
    { id: 'ohat', name: 'Hat offen' },
    { id: 'perc', name: 'Perc' },
  ];

  function emptyPattern() {
    const p = {};
    TRACKS.forEach(t => { p[t.id] = new Array(STEPS).fill(0); });
    return p;
  }

  function stepTime(start, step, bpm, swing) {
    const dur = 60 / bpm / 4;
    // Swing verschiebt jeden zweiten 16tel
    return start + step * dur + (step % 2 ? swing * dur : 0);
  }

  // Plant einen Loop-Durchlauf auf einen beliebigen Kontext (auch Offline).
  function scheduleStep(engine, state, step, time) {
    TRACKS.forEach(t => {
      const v = state.pattern[t.id][step];
      if (v && !state.mutes[t.id]) engine.trigger(t.id, time, (v === 2 ? 1 : 0.7) * state.volumes[t.id]);
    });
  }

  class Sequencer {
    constructor(ctx, engine, state, onStep) {
      this.ctx = ctx; this.engine = engine; this.state = state; this.onStep = onStep;
      this.step = 0; this.nextBase = 0; this.timer = null; this.playing = false;
    }

    start() {
      if (this.playing) return;
      this.playing = true;
      this.step = 0;
      this.nextBase = this.ctx.currentTime + 0.06;
      this.nextTime = this.nextBase;
      this.timer = setInterval(() => this._tick(), 25);
      this._tick();
    }

    stop() {
      this.playing = false;
      clearInterval(this.timer);
    }

    _tick() {
      const ahead = this.ctx.currentTime + 0.12;
      while (this.nextTime < ahead) {
        const s = this.state;
        const t = this.nextTime;
        scheduleStep(this.engine, s, this.step, t);
        this.onStep(this.step, t);
        const dur = 60 / s.bpm / 4;
        // Swing relativ zum geraden Raster berechnen, damit sich BPM-Änderungen sauber einfügen
        this.step = (this.step + 1) % STEPS;
        this.nextBase += dur;
        this.nextTime = this.nextBase + (this.step % 2 ? s.swing * dur : 0);
      }
    }
  }

  // Rendert den Loop `loops` mal offline und liefert einen AudioBuffer.
  async function renderOffline(state, loops) {
    const sr = 44100;
    const dur = 60 / state.bpm / 4;
    const total = dur * STEPS * loops + 1.0; // Ausklang für Hat/Kick
    const ctx = new OfflineAudioContext(2, Math.ceil(sr * total), sr);
    const engine = new global.DrumEngine(ctx);
    engine.setMaster(state.master);
    for (let l = 0; l < loops; l++)
      for (let s = 0; s < STEPS; s++)
        scheduleStep(engine, state, s, stepTime(l * STEPS * dur, s, state.bpm, state.swing));
    return ctx.startRendering();
  }

  function encodeWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true);
    out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
    w(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
    }
    return new Blob([out], { type: 'audio/wav' });
  }

  global.Seq = { STEPS, TRACKS, emptyPattern, Sequencer, renderOffline, encodeWav };
})(window);
