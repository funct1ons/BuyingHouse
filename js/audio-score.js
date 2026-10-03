(function (g) {
  'use strict';
  // Original score for HomeYear: six 32-bar cues (A/B/A'/C) sharing the "home" motif 3–5–6–5–1'.
  // Pure data + bar generator; no Web Audio here so it can be checked in Node.
  const H = g.HomeYear = g.HomeYear || {};
  const SCALES = {major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10]};
  const QUAL = {maj:[0,4,7], m:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], m9:[0,3,7,10,14], maj9:[0,4,7,11,14],
    '6':[0,4,7,9], m6:[0,3,7,9], add9:[0,4,7,14], '7sus4':[0,5,7,10], m7b5:[0,3,6,10], dim7:[0,3,6,9], '9':[0,4,7,10,14]};
  const ALL = ['A','B','A2','C','T'];

  function parseChord(sym) {
    const m = /^(\d+):([^/]+)(?:\/(\d+))?$/.exec(sym);
    if (!m || !QUAL[m[2]]) throw Error('bad chord ' + sym);
    const root = +m[1];
    return {sym, root, quality:m[2], intervals:QUAL[m[2]], bass:m[3] === undefined ? root : +m[3]};
  }
  function parseMelody(text) {
    return text.split('|').map(bar => bar.trim().split(/\s+/).filter(Boolean).map(tok => {
      const [d, du] = tok.split(':'), dur = +du;
      if (!(dur > 0)) throw Error('bad duration ' + tok);
      if (d === 'r') return {rest:true, dur};
      const m = /^([b#]?)([1-7])('*|,*)$/.exec(d);
      if (!m) throw Error('bad degree ' + tok);
      return {acc:m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0, deg:+m[2], oct:m[3].startsWith("'") ? m[3].length : -m[3].length, dur};
    }));
  }

  // Chords are "semitones above cue tonic:quality[/bass offset]". Melodies are scale degrees of the
  // section key, ' = octave up, durations in beats; every bar sums to 4 beats.
  const cues = {
    menu: {
      title:'窗台夜灯', key:2, mode:'major', bpm:72, swing:.5, gain:1.05, loop:true, order:['A','B','A2','C'],
      sections:{
        A:{chords:['0:maj7','5:maj7','9:m9','7:7sus4','0:maj7','5:maj7','2:m9','7:7sus4'],
          melody:"3:1 5:1 6:1.5 5:.5 | 1':3 r:1 | 6:1 1':1 7:1 6:1 | 5:3 r:1 | 3:1 5:1 6:1.5 5:.5 | 2':2 1':1 7:1 | 6:1.5 5:.5 4:1 3:1 | 2:3 r:1"},
        B:{chords:['9:m9','4:m7','5:maj7','0:add9/4','2:m9','7:6','5:maj7','7:7sus4'],
          melody:"1':1.5 7:.5 6:2 | 5:1 7:1 5:2 | 6:1 1':1 3':1.5 2':.5 | 2':2 1':2 | 4:1 6:1 1':1 3':1 | 2':3 r:1 | 1':1 7:1 6:1 5:1 | 5:2 4:1 2:1"},
        A2:{chords:['0:maj7','5:maj7','9:m9','7:7sus4','0:maj7','5:maj7','2:m9','7:7'],
          melody:"3:1 5:1 6:1.5 5:.5 | 1':3 r:1 | 6:1 1':1 7:1 6:1 | 5:3 r:1 | 3':1 2':1 1':1.5 6:.5 | 2':2 3':1 2':1 | 1':1.5 7:.5 6:1 5:1 | 5:4"},
        C:{chords:['5:maj7','5:m6','0:maj7/4','9:m7','2:m9','7:7sus4','10:maj7','7:7sus4'],
          melody:"3':2 2':1 1':1 | 2':1 1':1 5:2 | 3:1 5:1 1':2 | 2':1.5 1':.5 6:2 | 4:1 5:1 6:1 1':1 | 5:3 r:1 | b7:1 1':1 2':1 3':1 | 2':2 5:2"}
      },
      tracks:[
        {id:'lead', inst:'piano', role:'lead', oct:4, vel:.62, pan:.08, send:.3},
        {id:'lh', inst:'piano', role:'comp', pattern:'broken', by:{C:'block'}, range:[38,62], vel:.4, pan:-.18, send:.3},
        {id:'pad', inst:'pad', role:'pad', range:[50,70], vel:.34, pan:0, send:.45},
        {id:'sub', inst:'sub', role:'bass', pattern:'long', range:[34,46], vel:.5, pan:0, send:0},
        {id:'strings', inst:'strings', role:'pad', pattern:'swell', range:[55,74], vel:.26, pan:.22, send:.4, sections:['C']},
        {id:'glock', inst:'glock', role:'arp', pattern:'sparkle', range:[74,93], vel:.22, pan:.3, send:.55, sections:['A2','C'], later:['B']},
        {id:'hiss', inst:'hiss', role:'hiss', vel:.5, pan:0, send:0}
      ]
    },
    early: {
      title:'出租屋的早晨', key:5, mode:'major', bpm:92, swing:.58, gain:1, loop:true, order:['A','B','A2','C'],
      sections:{
        A:{chords:['0:maj7','9:m7','2:m7','7:7sus4','0:maj7','9:m7','2:m7','7:7'],
          melody:"3:.5 5:.5 6:1 5:.5 3:.5 r:1 | 1':1 6:1 5:2 | 4:.5 6:.5 1':1 6:.5 4:.5 r:1 | 5:3 r:1 | 3:.5 5:.5 6:1 5:.5 1':.5 r:1 | 3':1 2':.5 1':.5 6:2 | 4:.5 5:.5 6:.5 1':.5 2':1 1':1 | 7:1 2':1 5:2"},
        B:{chords:['5:maj7','7:6','4:m7','9:m7','2:m7','7:7sus4','5:maj7','7:7'],
          melody:"6:1 1':1 3':1.5 2':.5 | 2':1 7:1 5:2 | 5:1 7:.5 5:.5 3:2 | 6:.5 1':.5 3':1 1':1 6:1 | 4:1 6:1 2':1 1':1 | 5:3 r:1 | 3':1 2':1 1':1 6:1 | 7:1 2':1 4':1 3':1"},
        A2:{chords:['0:maj7','9:m7','2:m7','7:7sus4','0:maj7','9:m7','2:m7','7:7'],
          melody:"3:.5 5:.5 6:1 5:.5 3:.5 r:1 | 1':1 6:1 5:2 | 4:.5 6:.5 1':1 6:.5 4:.5 r:1 | 5:3 r:1 | 3':.5 2':.5 1':1 6:.5 5:.5 r:1 | 6:1 1':1 3':2 | 2':.5 1':.5 6:.5 4:.5 5:1 6:1 | 5:4"},
        C:{chords:['10:maj7','5:maj7','8:maj7','7:7sus4','5:m7','0:maj7/4','2:m7','7:7sus4'],
          melody:"b7:1 1':1 2':1 5:1 | 6:2 5:1 3:1 | b6:1 b7:1 1':2 | 5:3 r:1 | 4:1 b6:1 1':1.5 b7:.5 | 6:1 1':1 3':2 | 4:1 6:1 1':1 2':1 | 1':2 5:2"}
      },
      tracks:[
        {id:'lead', inst:'marimba', role:'lead', oct:4, vel:.72, pan:.12, send:.2},
        {id:'ep', inst:'epiano', role:'comp', pattern:'offbeat', alt:'charleston', range:[53,72], vel:.42, pan:-.22, send:.25},
        {id:'bass', inst:'bass', role:'bass', pattern:'root5', range:[36,48], vel:.62, pan:0, send:.05},
        {id:'shaker', inst:'shaker', role:'drum', grid:{x:'x.x.x.x.x.x.x.x.', a:'X.x.X.x.X.x.X.x.'}, vel:.32, pan:.32, send:.1, perc:true},
        {id:'kick', inst:'kick', role:'drum', grid:{x:'x.......x.....x.', a:'x.........x.....'}, vel:.42, pan:0, send:0, layer:1, perc:true},
        {id:'rim', inst:'rim', role:'drum', grid:{x:'....x.......x...', a:'....x.......x..x'}, fill:'....x...x.x.xxxx', vel:.3, pan:-.1, send:.15, layer:2, perc:true, sections:['B','A2','C']},
        {id:'flute', inst:'flute', role:'guide', range:[69,84], vel:.3, pan:-.3, send:.35, layer:1, sections:['A2','C'], later:['B']},
        {id:'pad', inst:'pad', role:'pad', range:[53,72], vel:.18, pan:0, send:.4, layer:1, sections:['B','C']}
      ]
    },
    development: {
      title:'街区在发光', key:8, mode:'major', bpm:100, swing:.5, gain:1, loop:true, order:['A','B','A2','C'],
      sections:{
        A:{chords:['0:maj7','4:m7','5:maj7','4:7','9:m7','5:maj7','2:m7','7:7sus4'],
          melody:"3:1 5:1 6:1 5:1 | 7:2 5:1 3:1 | 6:1 1':1 3':1.5 2':.5 | 3':1.5 2':.5 #5:2 | 6:1.5 1':.5 3':1 1':1 | 4':2 3':1 1':1 | 2':1 1':1 6:1 4:1 | 5:3 r:1"},
        B:{chords:['5:maj7','7:7','4:m7','9:m7','2:m7','7:7','0:maj7','0:7'],
          melody:"1':1 3':1 4':1 3':1 | 2':2 7:1 5:1 | 3':1.5 2':.5 7:2 | 6:1 1':1 3':2 | 4':1 3':1 2':1 6:1 | 5:2 2':2 | 3':1 5':1 3':1 1':1 | b7':2 5':1 3':1"},
        A2:{chords:['0:maj7','4:m7','5:maj7','4:7','9:m7','5:maj7','2:m7','7:7'],
          melody:"3:.5 5:.5 6:1 5:.5 6:.5 1':1 | 7:2 5:1 3:1 | 6:1 1':1 3':1.5 2':.5 | 3':1.5 2':.5 #5:2 | 6:1.5 1':.5 3':1 1':1 | 4':2 3':1 1':1 | 2':1 1':1 6:1 4:1 | 5:2 7:1 2':1"},
        C:{chords:['5:maj7','5:m6','4:m7','9:7','2:m9','7:7sus4','3:maj7','7:7sus4'],
          melody:"3':2 1':1 6:1 | 1':1 b6:1 4:2 | 7:1 2':1 3':2 | 6:1 #1':1 3':1 5':1 | 4':1.5 3':.5 2':1 6:1 | 5:4 | b3':1 2':1 b7:1 5:1 | 5:2 4:1 2:1"}
      },
      tracks:[
        {id:'lead', inst:'flute', role:'lead', oct:3, vel:.6, pan:.1, send:.35},
        {id:'keys', inst:'piano', role:'comp', pattern:'charleston', alt:'halves', range:[55,72], vel:.36, pan:-.2, send:.28, sections:['A','B','A2']},
        {id:'strings', inst:'strings', role:'pad', pattern:'pad', range:[55,76], vel:.3, pan:.18, send:.42, layer:1, sections:['B','A2','C']},
        {id:'bass', inst:'bass', role:'bass', pattern:'walk', range:[36,48], vel:.6, pan:0, send:.05},
        {id:'kick', inst:'kick', role:'drum', grid:{x:'x.....x...x.....', a:'x.....x.x.......'}, vel:.45, pan:0, send:0, layer:1, perc:true},
        {id:'rim', inst:'rim', role:'drum', grid:{x:'....x.......x...', a:'....x.......x.o.'}, fill:'....x...x.x.xxxx', vel:.3, pan:-.08, send:.15, layer:1, perc:true},
        {id:'shaker', inst:'shaker', role:'drum', grid:{x:'xoxoxoxoxoxoxoxo', a:'XoxoXoxoXoxoXoxo'}, vel:.22, pan:.3, send:.1, layer:2, perc:true},
        {id:'glock', inst:'glock', role:'answer', range:[72,91], vel:.24, pan:-.32, send:.5, layer:1, sections:['A2','C'], later:['B']}
      ]
    },
    sprint: {
      title:'最后的几周', key:0, mode:'minor', bpm:116, swing:.5, gain:1.2, loop:true, order:['A','B','A2','C'],
      sections:{
        A:{chords:['0:m','8:maj','3:maj','10:maj','0:m','8:maj','3:maj','7:7'],
          melody:"b3:1 5:1 b6:1.5 5:.5 | 1':2 b7:1 5:1 | 5:.5 b6:.5 5:.5 b3:.5 5:1 b7:1 | 4:2 2:2 | b3:1 5:1 b6:1.5 5:.5 | b3':1 2':1 1':2 | b7:1 5:1 b3:1 5:1 | 7:2 2':2"},
        B:{chords:['5:m7','10:7','3:maj7','8:maj7','2:m7b5','7:7','5:m7','7:7sus4'],
          melody:"1':.5 b3':.5 1':.5 b6:.5 4:2 | 2':1 4':1 2':1 b7:1 | 5:1 b7:1 2':1 b3':1 | 1':2 b3':2 | 4':1 b3':1 2':1 b6:1 | 7:1 2':1 4':1 2':1 | b3':1.5 4':.5 b3':1 1':1 | 2':2 5:2"},
        A2:{chords:['0:m','8:maj','3:maj','10:maj','0:m','8:maj','5:m','7:7'],
          melody:"b3:.5 5:.5 b6:.5 5:.5 b3:.5 5:.5 1':1 | b7:2 b6:1 5:1 | 5:.5 b6:.5 5:.5 b3:.5 5:1 b7:1 | 4:1 5:1 2:2 | b3:1 5:1 b6:1.5 5:.5 | b3':1 2':1 1':2 | b6:1 1':1 4:1 b6:1 | 7:2 2':1 4':1"},
        // Chorus lifts to the relative major (E♭); melody degrees follow the section key.
        C:{key:3, mode:'major', chords:['8:maj7','10:maj','0:m7','3:maj','8:maj7','10:maj','5:m7','7:7'],
          melody:"3:1 5:1 6:1.5 5:.5 | 1':2 7:1 5:1 | 6:1 1':1 3':1.5 2':.5 | 2':2 1':2 | 3':1 2':1 1':1 6:1 | 5:1 6:1 7:1 2':1 | 1':1.5 6:.5 4:1 6:1 | 7:1 #5:1 2':1 7:1"}
      },
      tracks:[
        {id:'lead', inst:'brass', role:'lead', oct:4, vel:.5, pan:.06, send:.3},
        {id:'ost', inst:'pluck', role:'ostinato', range:[48,72], vel:.36, pan:-.26, send:.18},
        {id:'bass', inst:'bass', role:'bass', pattern:'sync', range:[36,48], vel:.62, pan:0, send:.04},
        {id:'wood', inst:'wood', role:'drum', grid:{x:'x...o...x...o...'}, vel:.24, pan:.36, send:.12, perc:true},
        {id:'kick', inst:'kick', role:'drum', grid:{x:'x..x..x...x..x..', a:'x..x..x...x.x...'}, vel:.5, pan:0, send:0, layer:1, perc:true},
        {id:'rim', inst:'rim', role:'drum', grid:{x:'....x.......x...', a:'....x..o....x...'}, fill:'....x.x.x.xxxxxx', vel:.32, pan:-.1, send:.15, layer:1, perc:true},
        {id:'shaker', inst:'shaker', role:'drum', grid:{x:'x.x.x.x.x.x.x.x.', a:'xxx.xxx.xxx.xxx.'}, vel:.24, pan:.28, send:.1, layer:2, perc:true},
        {id:'strings', inst:'strings', role:'pad', pattern:'swell', range:[55,79], vel:.28, pan:.2, send:.4, layer:2, sections:['B','A2','C']},
        {id:'pad', inst:'pad', role:'pad', range:[55,74], vel:.2, pan:0, send:.4, sections:['C']},
        {id:'timp', inst:'timpani', role:'timp', vel:.5, pan:0, send:.25, final:true}
      ]
    },
    'ending-home': {
      title:'钥匙', key:3, mode:'major', bpm:84, swing:.5, gain:1.05, loop:false, order:['A','B','A2','C'], tail:'T',
      sections:{
        A:{chords:['5:maj7','7:6','4:m7','9:m7','2:m9','7:7sus4','0:maj7','0:maj7'],
          melody:"3:1 5:1 6:1.5 5:.5 | 2':2 1':1 5:1 | 5:1 7:1 2':2 | 1':1.5 7:.5 6:2 | 4:1 6:1 1':1 3':1 | 2':3 1':1 | 3':1.5 2':.5 1':2 | r:1 5:1 6:1 7:1"},
        B:{chords:['5:maj7','7:7','4:m7','9:m9','5:maj7','2:m7','7:7sus4','7:7'],
          melody:"1':2 6:1 5:1 | 4:1 5:1 6:1 2':1 | 2':2 5:2 | 3':1.5 2':.5 1':1 6:1 | 6:1 1':1 3':1 5':1 | 4':2 3':1 2':1 | 1':2 2':2 | 2':1 6:1 4:1 2:1"},
        A2:{chords:['5:maj7','7:6','4:m7','9:m7','2:m9','7:7sus4','0:maj7','4:7'],
          melody:"3:1 5:1 6:1.5 5:.5 | 2':2 1':1 5:1 | 5:1 7:1 2':2 | 1':1.5 7:.5 6:2 | 4:1 6:1 1':1 3':1 | 2':3 1':1 | 5':2 3':1 2':1 | 7:2 #5:2"},
        C:{chords:['9:m7','4:m7','5:maj7','0:maj7/4','2:m9','7:7sus4','5:m6','0:add9'],
          melody:"3':2 1':1 6:1 | 2':2 7:1 5:1 | 1':1 3':1 5':1 3':1 | 2':1.5 1':.5 5:2 | 4:1 6:1 1':1 2':1 | 5:4 | 1':1 b6:1 4:2 | 2:1 3:3"},
        T:{chords:['5:maj7','5:m6','0:add9','0:add9','5:maj7','5:m6','0:maj7','0:maj7'],
          melody:"5:2 3':2 | 1':4 | 2':1 3':1 5:2 | 1':4 | 6:2 5:2 | b6:2 4:2 | 3:4 | r:4"}
      },
      tracks:[
        {id:'lead', inst:'piano', role:'lead', oct:4, vel:.64, pan:.06, send:.32},
        {id:'lh', inst:'piano', role:'comp', pattern:'broken', by:{T:'block'}, range:[39,62], vel:.38, pan:-.16, send:.32},
        {id:'strings', inst:'strings', role:'pad', pattern:'pad', by:{C:'swell'}, range:[55,77], vel:.3, pan:.2, send:.45, sections:['B','A2','C','T']},
        {id:'sub', inst:'sub', role:'bass', pattern:'long', range:[34,46], vel:.45, pan:0, send:0},
        {id:'glock', inst:'glock', role:'answer', range:[74,93], vel:.22, pan:-.3, send:.55, sections:['A2','C','T']},
        {id:'flute', inst:'flute', role:'guide', range:[67,82], vel:.22, pan:.32, send:.4, sections:['C']}
      ]
    },
    'ending-rent': {
      title:'还是那间小屋', key:2, mode:'major', bpm:66, swing:.5, gain:1.35, loop:false, order:['A','B','A2','C'], tail:'T',
      sections:{
        A:{chords:['0:add9','8:maj7','5:m6','0:maj7','9:m7','8:maj7','5:m6','7:7sus4'],
          melody:"3:2 5:2 | b6:3 5:1 | 4:2 2:2 | 1:4 | 6:2 1':2 | 2':2 1':1 b6:1 | b6:2 4:1 2:1 | 5:3 r:1"},
        B:{chords:['9:m7','4:m7','5:maj7','0:maj7/4','10:maj7','5:maj7','5:m6','7:7sus4'],
          melody:"1':2 6:2 | 7:2 5:1 3:1 | 6:1 1':1 3':2 | 2':2 1':2 | b7:1 2':1 3':2 | 2':2 7:2 | 1':1 b6:1 4:2 | 5:4"},
        A2:{chords:['0:add9','8:maj7','5:m6','0:maj7','9:m7','8:maj7','5:m6','7:7'],
          melody:"3:2 5:2 | b6:3 5:1 | 4:2 2:2 | 1:4 | 6:2 1':2 | 2':2 1':1 b6:1 | b6:2 4:1 2:1 | 5:2 7:2"},
        C:{chords:['5:maj7','4:m7','9:m7','2:m9','8:maj7','10:maj7','5:maj7','0:add9'],
          melody:"3':2 2':1 1':1 | 7:2 5:2 | 6:1 5:1 3:2 | 4:1 6:1 2':2 | 1':2 b6:2 | b7:2 2':2 | 1':1 7:1 6:1 5:1 | 3:4"},
        T:{chords:['5:maj7','0:add9','5:maj7','0:add9','9:m7','5:maj7','5:m6','0:add9'],
          melody:"r:2 3':2 | 2':2 1':2 | r:2 6:2 | 5:4 | r:2 1':2 | 6:2 5:2 | b6:2 4:2 | 3:4"}
      },
      tracks:[
        {id:'lead', inst:'piano', role:'lead', oct:4, vel:.6, pan:.06, send:.34},
        {id:'lh', inst:'piano', role:'comp', pattern:'broken', by:{A:'block'}, range:[38,60], vel:.36, pan:-.14, send:.34},
        {id:'pad', inst:'pad', role:'pad', range:[50,69], vel:.2, pan:0, send:.5, sections:['B','A2','C','T']},
        {id:'sub', inst:'sub', role:'bass', pattern:'long', range:[34,46], vel:.34, pan:0, send:0, sections:['A2','C','T']},
        {id:'hiss', inst:'hiss', role:'hiss', vel:.45, pan:0, send:0}
      ]
    }
  };

  // Parse once and validate structure eagerly so a broken score fails loudly at load.
  for (const [id, cue] of Object.entries(cues)) {
    cue.id = id;
    for (const [sid, sec] of Object.entries(cue.sections)) {
      sec.parsedChords = sec.chords.map(parseChord);
      sec.bars = parseMelody(sec.melody);
      if (sec.parsedChords.length !== 8 || sec.bars.length !== 8) throw Error(id + '.' + sid + ' must have 8 bars');
      sec.bars.forEach((b, i) => { const sum = b.reduce((a, n) => a + n.dur, 0); if (Math.abs(sum - 4) > 1e-9) throw Error(id + '.' + sid + ' bar ' + (i + 1) + ' sums ' + sum); });
    }
  }

  const pc = n => ((n % 12) + 12) % 12;
  function placeIn(pitchClass, lo, hi) { let m = lo + pc(pitchClass - lo); if (m > hi) m -= 12; return m; }
  function degreeMidi(note, keyPc, mode, base) { return base + keyPc + SCALES[mode][note.deg - 1] + note.acc + 12 * note.oct; }
  function sectionKey(cue, sec) { return {key:sec.key === undefined ? cue.key : sec.key, mode:sec.mode || cue.mode}; }
  function chordPcs(cue, chord) { return chord.intervals.map(i => pc(cue.key + chord.root + i)); }

  // Voice-led voicing: choose the inversion closest to the previous voicing.
  function voice(pcs, lo, hi, prev, open) {
    const tones = pcs.length > 4 ? pcs.filter((_, i) => i !== 0) : pcs;
    let best = null, bestCost = Infinity;
    for (let r = 0; r < tones.length; r++) {
      const order = tones.slice(r).concat(tones.slice(0, r)), v = [];
      let cur = lo - 1;
      for (const t of order) { let m = cur + 1 + pc(t - cur - 1); v.push(m); cur = m; }
      if (open && v.length >= 3) v[1] += 12;
      v.sort((a, b) => a - b);
      while (v[v.length - 1] > hi && v[0] - 12 >= lo - 5) for (let i = 0; i < v.length; i++) v[i] -= 12;
      const cost = prev && prev.length ? v.reduce((a, m, i) => a + Math.abs(m - (prev[Math.min(i, prev.length - 1)])), 0) : Math.abs(v[0] - (lo + hi) / 2);
      if (cost < bestCost) { bestCost = cost; best = v; }
    }
    return best;
  }

  const swing = (cue, at) => { const f = at - Math.floor(at); return Math.abs(f - .5) < 1e-6 ? Math.floor(at) + cue.swing : at; };

  function leadEvents(cue, sec, bi, track, v, rng) {
    const {key, mode} = sectionKey(cue, sec), base = 12 * (track.oct + 1), bar = sec.bars[bi], out = [];
    let at = 0;
    bar.forEach((n, i) => {
      if (!n.rest) {
        const midi = degreeMidi(n, key, mode, base), next = bar[i + 1];
        // Ornament 1: passing tone into a note a third away; ornament 2: upper-neighbour grace.
        if (v.orn === 1 && n.dur >= 1 && next && !next.rest && rng() < .55) {
          const target = degreeMidi(next, key, mode, base), gap = target - midi;
          if (Math.abs(gap) >= 3 && Math.abs(gap) <= 4) {
            out.push({at, dur:n.dur - .5, notes:[midi], vel:track.vel});
            const scale = SCALES[mode].map(s => pc(key + s)), mid = midi + Math.sign(gap) * (scale.includes(pc(midi + Math.sign(gap) * 2)) ? 2 : 1);
            out.push({at:at + n.dur - .5, dur:.5, notes:[mid], vel:track.vel * .82});
            at += n.dur; return;
          }
        }
        if (v.orn === 2 && n.dur >= 1.5 && at > 0 && rng() < .5) out.push({at:at - .12, dur:.12, notes:[midi + 2], vel:track.vel * .6});
        out.push({at, dur:n.dur, notes:[midi], vel:track.vel * (at === 0 ? 1 : at % 1 === 0 ? .92 : .84)});
      }
      at += n.dur;
    });
    return out.map(e => ({...e, at:e.at < 0 ? 0 : swing(cue, e.at)}));
  }

  function bassEvents(cue, chord, nextChord, track, pattern) {
    const [lo, hi] = track.range, root = placeIn(cue.key + chord.bass, lo, hi), fifth = placeIn(cue.key + chord.root + chord.intervals[2], lo, hi + 5);
    const third = placeIn(cue.key + chord.root + chord.intervals[1], lo, hi + 5), nextRoot = placeIn(cue.key + nextChord.bass, lo, hi);
    const approach = nextRoot + (nextRoot > root ? -1 : 1), vel = track.vel;
    if (pattern === 'long') return [{at:0, dur:4, notes:[root], vel}];
    if (pattern === 'root5') return [{at:0, dur:1.4, notes:[root], vel}, {at:swing(cue, 1.5), dur:.4, notes:[root], vel:vel * .6}, {at:2, dur:1.4, notes:[fifth], vel:vel * .85}, {at:swing(cue, 3.5), dur:.45, notes:[approach], vel:vel * .7}];
    if (pattern === 'walk') return [{at:0, dur:.9, notes:[root], vel}, {at:1, dur:.9, notes:[third], vel:vel * .8}, {at:2, dur:.9, notes:[fifth], vel:vel * .85}, {at:3, dur:.9, notes:[approach], vel:vel * .75}];
    // sync: driving syncopation for the sprint
    return [{at:0, dur:.45, notes:[root], vel}, {at:.75, dur:.22, notes:[root], vel:vel * .6}, {at:1.5, dur:.45, notes:[root + 12], vel:vel * .7}, {at:2.5, dur:.45, notes:[fifth], vel:vel * .8}, {at:3, dur:.45, notes:[root], vel:vel * .85}, {at:3.5, dur:.45, notes:[approach], vel:vel * .7}];
  }

  function compEvents(cue, chord, track, pattern, st, v) {
    const [lo, hi] = track.range, pcs = chordPcs(cue, chord), vel = track.vel;
    if (pattern === 'broken') {
      const r = placeIn(cue.key + chord.bass, lo, lo + 11), f = r + pc(cue.key + chord.root + chord.intervals[2] - r), t = r + 12 + pc(cue.key + chord.root + chord.intervals[1] - r);
      const seq = [{at:0, n:r, w:1}, {at:1, n:f, w:.62}, {at:2, n:t, w:.72}, {at:3, n:f, w:.58}];
      if (v.comp) seq.splice(2, 0, {at:swing(cue, 1.5), n:t, w:.5});
      return seq.map(s => ({at:s.at, dur:1.9, notes:[s.n], vel:vel * s.w}));
    }
    const notes = st.voicing = voice(pcs, lo, hi, st.voicing, v.voicing === 'open');
    if (pattern === 'block') return [{at:0, dur:3.9, notes, vel}];
    if (pattern === 'halves') return [{at:0, dur:1.9, notes, vel}, {at:2, dur:1.9, notes, vel:vel * .82}];
    if (pattern === 'charleston') return [{at:0, dur:1.3, notes, vel}, {at:swing(cue, 1.5), dur:2.3, notes, vel:vel * .78}];
    // offbeat: held downbeat plus swung stabs
    return [{at:0, dur:1.2, notes, vel}, {at:swing(cue, 1.5), dur:.35, notes, vel:vel * .7}, {at:swing(cue, 3.5), dur:.35, notes, vel:vel * .75}].concat(v.comp ? [{at:swing(cue, 2.5), dur:.3, notes, vel:vel * .55}] : []);
  }

  function guideEvents(cue, chord, track, st) {
    const [lo, hi] = track.range, ivs = chord.intervals, a = ivs[1], b = ivs.length > 3 ? ivs[3] : ivs[2];
    const pick = p => { const opts = [placeIn(p, lo, hi), placeIn(p, lo, hi) - 12, placeIn(p, lo, hi) + 12].filter(m => m >= lo - 2 && m <= hi + 2); return st.last ? opts.sort((x, y) => Math.abs(x - st.last) - Math.abs(y - st.last))[0] : opts[0]; };
    const n1 = pick(cue.key + chord.root + a); st.last = n1;
    const n2 = pick(cue.key + chord.root + b); st.last = n2;
    return [{at:0, dur:2, notes:[n1], vel:track.vel}, {at:2, dur:2, notes:[n2], vel:track.vel * .9}];
  }

  function chordTonesIn(cue, chord, lo, hi) { const pcs = chordPcs(cue, chord), out = []; for (let m = lo; m <= hi; m++) if (pcs.includes(pc(m))) out.push(m); return out; }

  function answerEvents(cue, chord, track, lead) {
    // Glockenspiel answers only where the melody breathes: rests or notes held two beats or more.
    const tones = chordTonesIn(cue, chord, track.range[0], track.range[1]).reverse(), out = [];
    let cursor = 0;
    const spots = [];
    lead.forEach(e => { if (e.at - cursor >= 1) spots.push(cursor); if (e.dur >= 2) spots.push(e.at + 1); cursor = Math.max(cursor, e.at + e.dur); });
    if (4 - cursor >= 1) spots.push(cursor);
    const s = spots.find(x => x <= 2.5);
    if (s === undefined || tones.length < 3) return out;
    for (let i = 0; i < 3; i++) out.push({at:s + i * .5, dur:.6, notes:[tones[i]], vel:track.vel * (1 - i * .15)});
    return out;
  }

  function sparkleEvents(cue, chord, track, rng) {
    const tones = chordTonesIn(cue, chord, track.range[0], track.range[1]), out = [];
    for (let b = 0; b < 4; b++) { if (rng() < .38) continue; out.push({at:b, dur:.9, notes:[tones[Math.floor(rng() * tones.length)]], vel:track.vel * (b ? .8 : 1)}); }
    if (rng() < .3) out.push({at:3.5, dur:.4, notes:[tones[tones.length - 1]], vel:track.vel * .6});
    return out;
  }

  function ostinatoEvents(cue, chord, track, v) {
    const [lo] = track.range, r = placeIn(cue.key + chord.root, lo, lo + 11), f = r + chord.intervals[2], t = r + 12 + chord.intervals[1];
    const seq = v.comp ? [r, r + 12, f, r + 12, t, r + 12, f, r + 12] : [r, f, r + 12, f, t, f, r + 12, f];
    return seq.map((n, i) => ({at:i * .5, dur:.3, notes:[n], vel:track.vel * (i % 2 ? .7 : 1)}));
  }

  function drumEvents(track, bi, v) {
    const grid = (track.fill && bi === 7 && v.fill) ? track.fill : (v.comp && track.grid.a ? track.grid.a : track.grid.x), out = [];
    for (let i = 0; i < 16; i++) { const c = grid[i]; if (c === '.') continue; out.push({at:i / 4, dur:.25, notes:[], vel:track.vel * (c === 'X' ? 1.25 : c === 'o' ? .55 : 1), opts:{alt:c === 'o'}}); }
    return out;
  }

  // One bar of events for a cue. state carries voicings between bars; rng is the presentation PRNG.
  function bar(cue, plan, state, rng) {
    const sec = cue.sections[plan.section], bi = plan.bar, chord = sec.parsedChords[bi];
    const nextChord = bi < 7 ? sec.parsedChords[bi + 1] : sec.parsedChords[0];
    const v = plan.variant, events = [];
    let lead = [];
    for (const track of cue.tracks) {
      // plan.only (intro / crossfade bars) bypasses section and layer gating so a cue can always
      // be entered or left on its sustained layers alone.
      if (plan.only) { if (!plan.only.includes(track.role)) continue; }
      else {
        const inSection = track.sections ? (track.sections.includes(plan.section) || (plan.loop > 0 && (track.later || []).includes(plan.section))) : ALL.includes(plan.section);
        const level = track.perc && plan.cold ? plan.level - 1 : plan.level;
        if (!inSection || (track.layer || 0) > level || (track.final && !plan.final)) continue;
      }
      const st = state[track.id] = state[track.id] || {}, pattern = (track.by && track.by[plan.section]) || (v.comp && track.alt) || track.pattern;
      let evs = [];
      switch (track.role) {
        case 'lead': evs = lead = leadEvents(cue, sec, bi, track, v, rng); break;
        case 'bass': evs = bassEvents(cue, chord, nextChord, track, pattern); break;
        case 'comp': evs = compEvents(cue, chord, track, pattern, st, v); break;
        case 'pad': st.voicing = voice(chordPcs(cue, chord), track.range[0], track.range[1], st.voicing, false); evs = [{at:0, dur:4.15, notes:st.voicing, vel:track.vel, opts:{swell:pattern === 'swell' && (bi % 4 >= 2 || plan.section === 'C')}}]; break;
        case 'guide': evs = guideEvents(cue, chord, track, st); break;
        case 'answer': evs = answerEvents(cue, chord, track, lead); break;
        case 'arp': evs = sparkleEvents(cue, chord, track, rng); break;
        case 'ostinato': evs = ostinatoEvents(cue, chord, track, v); break;
        case 'drum': evs = drumEvents(track, bi, v); break;
        case 'hiss': evs = [{at:0, dur:4, notes:[], vel:track.vel}]; break;
        case 'timp': if (bi === 7) { const r = placeIn(cue.key + chord.root, 36, 47); evs = Array.from({length:16}, (_, i) => ({at:i / 4, dur:.3, notes:[r], vel:track.vel * (.35 + .65 * i / 15)})); } break;
      }
      for (const e of evs) events.push({track:track.id, inst:track.inst, pan:track.pan, send:track.send, role:track.role, opts:{}, ...e});
    }
    // Light humanisation for pitched parts only, so the grid never sounds machine-stamped.
    for (const e of events) if (e.role !== 'drum' && e.role !== 'hiss' && e.at > 0) { e.at += (rng() - .5) * .02; e.vel *= .94 + rng() * .12; }
    return {chord:chord.sym, events};
  }

  // Seeded presentation PRNG (mulberry32); never touches the game RNG.
  function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function variant(cue, section, loop, rng) {
    // The very first statement of A is plain so the theme is heard clearly.
    if (loop === 0 && section === 'A') return {comp:0, orn:0, fill:false, voicing:'close'};
    return {comp:rng() < .5 ? 1 : 0, orn:rng() < .34 ? 0 : rng() < .5 ? 1 : 2, fill:rng() < .6, voicing:rng() < .4 ? 'open' : 'close'};
  }

  H.AudioScore = Object.freeze({cues, cueIds:Object.freeze(Object.keys(cues)), parseChord, parseMelody, bar, prng, variant, voice, SCALES});
})(typeof window !== 'undefined' ? window : globalThis);
