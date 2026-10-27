(function (global) {
  'use strict';
  // Kurzschreibweise: x = an, X = Akzent, . = aus
  const P = s => s.replace(/\s/g, '').split('').map(c => c === 'X' ? 2 : c === 'x' ? 1 : 0);

  global.PRESETS = {
    'Techno – Driving 4/4': { bpm: 132, swing: 0.05, pattern: {
      kick: P('x...x...x...x...'), clap: P('....x.......x...'),
      chat: P('x.x.x.x.x.x.x.x.'), ohat: P('..X...X...X...X.'), perc: P('...x..x....x..x.') } },
    'Techno – Peak Time': { bpm: 140, swing: 0, pattern: {
      kick: P('X...x...X...x...'), clap: P('....x.......x..x'),
      chat: P('xxxxxxxxxxxxxxxx'), ohat: P('..x...x...x...x.'), perc: P('.x...x..x..x...x') } },
    'Trance – Classic 138': { bpm: 138, swing: 0, pattern: {
      kick: P('x...x...x...x...'), clap: P('....x.......x...'),
      chat: P('..x...x...x...x.'), ohat: P('..X...X...X...X.'), perc: P('x..x..x..x..x..x') } },
    'Trance – Uplifting 140': { bpm: 140, swing: 0, pattern: {
      kick: P('X...x...x...x...'), clap: P('....X.......X...'),
      chat: P('x.x.x.x.x.x.x.x.'), ohat: P('..x...x...x...x.'), perc: P('......x.......xx') } },
    'Leer': { bpm: 130, swing: 0, pattern: {} },
  };
})(window);
