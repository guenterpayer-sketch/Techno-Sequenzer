(function () {
  'use strict';
  const { STEPS, TRACKS, emptyPattern, Sequencer, renderOffline, encodeWav } = window.Seq;
  const $ = id => document.getElementById(id);

  const state = {
    bpm: 138, swing: 0, master: 0.8,
    pattern: emptyPattern(),
    mutes: {}, volumes: {},
  };
  TRACKS.forEach(t => { state.mutes[t.id] = false; state.volumes[t.id] = 0.9; });

  let ctx = null, engine = null, seq = null;
  const cells = {}; // trackId -> [button]
  const rows = {};
  let playhead = [];

  function ensureAudio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      engine = new window.DrumEngine(ctx);
      engine.setMaster(state.master);
      seq = new Sequencer(ctx, engine, state, (step, time) => playhead.push({ step, time }));
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function paintCell(id, i) {
    const v = state.pattern[id][i];
    const b = cells[id][i];
    b.classList.toggle('on', v === 1);
    b.classList.toggle('accent', v === 2);
  }

  function buildGrid() {
    const grid = $('grid');
    TRACKS.forEach(t => {
      const row = document.createElement('div');
      row.className = 'row';
      rows[t.id] = row;
      const name = document.createElement('span');
      name.className = 'name'; name.textContent = t.name;
      const mute = document.createElement('button');
      mute.className = 'mute'; mute.textContent = 'M';
      mute.setAttribute('aria-label', t.name + ' stumm');
      mute.onclick = () => {
        state.mutes[t.id] = !state.mutes[t.id];
        mute.classList.toggle('active', state.mutes[t.id]);
        row.classList.toggle('muted', state.mutes[t.id]);
      };
      row.append(name, mute);
      cells[t.id] = [];
      for (let i = 0; i < STEPS; i++) {
        const b = document.createElement('button');
        b.className = 'step' + (i % 4 === 0 ? ' beat' : '');
        b.setAttribute('aria-label', `${t.name} Step ${i + 1}`);
        b.onclick = () => {
          state.pattern[t.id][i] = (state.pattern[t.id][i] + 1) % 3;
          paintCell(t.id, i);
          ensureAudio();
          if (!seq.playing && state.pattern[t.id][i])
            engine.trigger(t.id, ctx.currentTime + 0.01, 0.8);
        };
        cells[t.id].push(b);
        row.append(b);
      }
      grid.append(row);
    });
  }

  function loadPreset(name) {
    const p = window.PRESETS[name];
    state.bpm = p.bpm; state.swing = p.swing;
    TRACKS.forEach(t => { state.pattern[t.id] = (p.pattern[t.id] || new Array(STEPS).fill(0)).slice(); });
    $('bpm').value = state.bpm; $('swing').value = Math.round(state.swing * 100);
    TRACKS.forEach(t => { for (let i = 0; i < STEPS; i++) paintCell(t.id, i); });
  }

  function animate() {
    if (ctx) {
      const now = ctx.currentTime;
      while (playhead.length && playhead[0].time <= now) {
        const { step } = playhead.shift();
        TRACKS.forEach(t => {
          cells[t.id].forEach((b, i) => b.classList.toggle('now', i === step));
        });
      }
    }
    requestAnimationFrame(animate);
  }

  function togglePlay() {
    ensureAudio();
    const btn = $('play');
    if (seq.playing) {
      seq.stop(); playhead = [];
      TRACKS.forEach(t => cells[t.id].forEach(b => b.classList.remove('now')));
      btn.textContent = '▶ Start'; btn.classList.remove('playing');
    } else {
      seq.start();
      btn.textContent = '■ Stop'; btn.classList.add('playing');
    }
  }

  async function exportWav() {
    const btn = $('export');
    btn.disabled = true; btn.textContent = 'Rendere …';
    try {
      const buf = await renderOffline(state, 4);
      const url = URL.createObjectURL(encodeWav(buf));
      const a = document.createElement('a');
      a.href = url; a.download = `loop-${state.bpm}bpm.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      btn.disabled = false; btn.textContent = 'WAV exportieren';
    }
  }

  function init() {
    buildGrid();
    const sel = $('preset');
    Object.keys(window.PRESETS).forEach(n => sel.add(new Option(n, n)));
    sel.onchange = () => loadPreset(sel.value);
    sel.value = 'Trance – Classic 138';
    loadPreset(sel.value);

    $('play').onclick = togglePlay;
    $('bpm').oninput = e => { const v = +e.target.value; if (v >= 60 && v <= 200) state.bpm = v; };
    $('swing').oninput = e => { state.swing = e.target.value / 100; };
    $('master').oninput = e => { state.master = e.target.value / 100; if (engine) engine.setMaster(state.master); };
    $('clear').onclick = () => {
      TRACKS.forEach(t => { state.pattern[t.id].fill(0); for (let i = 0; i < STEPS; i++) paintCell(t.id, i); });
    };
    $('export').onclick = exportWav;
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); togglePlay(); }
    });
    animate();
    if ('serviceWorker' in navigator && location.protocol !== 'file:')
      navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  init();
})();
