/* 手绘像素图数据：'.' 为透明，其他字符查 palette */

const SPRITE_DATA = {
  player_idle: {
    palette: {
      o: '#2a1a12', H: '#a86a33', h: '#7a4a21',
      s: '#f4c99b', S: '#d79d6d', w: '#ffffff', e: '#2b1a12',
      r: '#e0563f', R: '#b23a2c',
      j: '#2f7f78', J: '#46a099', k: '#1f5a54',
      p: '#3c4a6a', P: '#55678f', t: '#5a3a22', T: '#7b5232',
    },
    rows: [
      '......oooooo......',
      '....ooHHHHHHoo....',
      '...oHHHHHHHHHHo...',
      '...oHHHHHHHHHHo...',
      '..oHHHHHHHHHHHHo..',
      '.oHHHHHHHHHHHHHHo.',
      '.oooooooooooooooo.',
      '...osssssssssso...',
      '...oswessssweso...',
      '...osssssssssso...',
      '...orrrrrrrrrro...',
      '..oRrrrrrrrrrrRo..',
      '..ojjjjjjjjjjjjo..',
      '.ojjJJJJJJJJJJjjo.',
      '.osjJJJJJJJJJJjso.',
      '..ojjjjjjjjjjjjo..',
      '..okkkkkkkkkkkko..',
      '...oppppppppppo...',
      '..otttto..otttto..',
      '..oTTTTo..oTTTTo..',
    ],
  },

  player_walk: {
    palette: {
      o: '#2a1a12', H: '#a86a33', h: '#7a4a21',
      s: '#f4c99b', S: '#d79d6d', w: '#ffffff', e: '#2b1a12',
      r: '#e0563f', R: '#b23a2c',
      j: '#2f7f78', J: '#46a099', k: '#1f5a54',
      p: '#3c4a6a', P: '#55678f', t: '#5a3a22', T: '#7b5232',
    },
    rows: [
      '......oooooo......',
      '....ooHHHHHHoo....',
      '...oHHHHHHHHHHo...',
      '...oHHHHHHHHHHo...',
      '..oHHHHHHHHHHHHo..',
      '.oHHHHHHHHHHHHHHo.',
      '.oooooooooooooooo.',
      '...osssssssssso...',
      '...oswessssweso...',
      '...osssssssssso...',
      '...orrrrrrrrrro...',
      '..oRrrrrrrrrrrRo..',
      '..ojjjjjjjjjjjjo..',
      '.ojjJJJJJJJJJJjjo.',
      '.osjJJJJJJJJJJjso.',
      '..ojjjjjjjjjjjjo..',
      '..okkkkkkkkkkkko..',
      '...oppppppppppo...',
      '.otttto....otttto.',
      '.oTTTTo....oTTTTo.',
    ],
  },

  goblin_idle: {
    palette: {
      o: '#22170f', H: '#9a6638', h: '#71472a',
      g: '#6aa84f', G: '#8cc46a', d: '#4a7a33', e: '#ffdf6b',
      c: '#6b4a2f', C: '#8a6440', p: '#3f3a5a', t: '#4a3020',
    },
    rows: [
      '.....oooooo.....',
      '...ooHHHHHHoo...',
      '..oHHHHHHHHHHo..',
      '..oHhhhhhhhhHo..',
      '..oHhhhhhhhhHo..',
      '...oggggggggo...',
      '...ogeggggego...',
      '...oggggggggo...',
      '...oddddddddo...',
      '..occcccccccco..',
      '.oCCccccccccCCo.',
      '.ogccccccccccgo.',
      '..occcccccccco..',
      '...oppppppppo...',
      '..opppo..opppo..',
      '..otttto..otttto',
    ],
  },

  goblin_walk: {
    palette: {
      o: '#22170f', H: '#9a6638', h: '#71472a',
      g: '#6aa84f', G: '#8cc46a', d: '#4a7a33', e: '#ffdf6b',
      c: '#6b4a2f', C: '#8a6440', p: '#3f3a5a', t: '#4a3020',
    },
    rows: [
      '.....oooooo.....',
      '...ooHHHHHHoo...',
      '..oHHHHHHHHHHo..',
      '..oHhhhhhhhhHo..',
      '..oHhhhhhhhhHo..',
      '...oggggggggo...',
      '...ogeggggego...',
      '...oggggggggo...',
      '...oddddddddo...',
      '..occcccccccco..',
      '.oCCccccccccCCo.',
      '.ogccccccccccgo.',
      '..occcccccccco..',
      '...oppppppppo...',
      '..opppo..opppo..',
      '.otttto..otttto.',
    ],
  },

  bat_0: {
    palette: { o: '#1c1424', p: '#6b4a8a', P: '#8c66b0', d: '#4a3266', e: '#ffd24a' },
    rows: [
      '..oo........oo..',
      '.oppo......oppo.',
      'oppppo.oo.oppppo',
      'opPPppooooppPPpo',
      '.oppppppppppppo.',
      '..opppepppeppo..',
      '...oppppppppo...',
      '....oooooooo....',
    ],
  },

  bat_1: {
    palette: { o: '#1c1424', p: '#6b4a8a', P: '#8c66b0', d: '#4a3266', e: '#ffd24a' },
    rows: [
      '...oo......oo...',
      '..oppo....oppo..',
      '.oppppo..oppppo.',
      'oppPPppooppPPppo',
      'oppppppppppppppo',
      '..opppepppeppo..',
      '...oppppppppo...',
      '....oooooooo....',
    ],
  },
};

// 剑客：斗笠 + 蓝色道服 + 红围巾，复用枪手的身体轮廓换配色
const SWORDSMAN_PALETTE = {
  o: '#24180f',
  H: '#d9b45a', h: '#b8933f',
  s: '#f4c99b', S: '#d79d6d', w: '#ffffff', e: '#2b1a12',
  r: '#e0563f', R: '#b23a2c',
  j: '#3a5f8a', J: '#557fb0', k: '#23405e',
  p: '#3b3a4a', P: '#55536a', t: '#4a3020', T: '#6b4a30',
};

SPRITE_DATA.swordsman_idle = { palette: SWORDSMAN_PALETTE, rows: SPRITE_DATA.player_idle.rows };
SPRITE_DATA.swordsman_walk = { palette: SWORDSMAN_PALETTE, rows: SPRITE_DATA.player_walk.rows };

// 科学怪人：绿色皮肤、黑色头发、护目镜、白色实验服、脖子两侧金属螺栓
const FRANKENSTEIN_PALETTE = {
  o: '#1c1a16', H: '#2a2830', h: '#403d4a',
  s: '#8fcf6a', S: '#6fae4d', w: '#f4f0d8', e: '#ffdf6b',
  C: '#d8d8c8', c: '#a8b0a0', b: '#9aa0a8',
  p: '#3c3a4a', P: '#55536a', t: '#4a3020', T: '#6b4a30',
};

SPRITE_DATA.frankenstein_idle = {
  palette: FRANKENSTEIN_PALETTE,
  rows: [
    '......oooooo......',
    '....ooHHHHHHoo....',
    '...oHHHHHHHHHHo...',
    '...oHhhhhhhhhHo...',
    '..oHHHHHHHHHHHHo..',
    '.oHHHHHHHHHHHHHHo.',
    '.oooooooooooooooo.',
    '...osssssssssso...',
    '..obssssssssssbo..',
    '...oswessssweso...',
    '...osssssssssso...',
    '...osSssssssSso...',
    '..oCCccccccccCCo..',
    '..occcccccccccco..',
    '.occcCccccccCccco.',
    '.osccccccccccccso.',
    '..oCCCCCCCCCCCCo..',
    '...oppppppppppo...',
    '..otttto..otttto..',
    '..oTTTTo..oTTTTo..',
  ],
};

SPRITE_DATA.frankenstein_walk = {
  palette: FRANKENSTEIN_PALETTE,
  rows: [
    '......oooooo......',
    '....ooHHHHHHoo....',
    '...oHHHHHHHHHHo...',
    '...oHhhhhhhhhHo...',
    '..oHHHHHHHHHHHHo..',
    '.oHHHHHHHHHHHHHHo.',
    '.oooooooooooooooo.',
    '...osssssssssso...',
    '..obssssssssssbo..',
    '...oswessssweso...',
    '...osssssssssso...',
    '...osSssssssSso...',
    '..oCCccccccccCCo..',
    '..occcccccccccco..',
    '.occcCccccccCccco.',
    '.osccccccccccccso.',
    '..oCCCCCCCCCCCCo..',
    '...oppppppppppo...',
    '.otttto....otttto.',
    '.oTTTTo....oTTTTo.',
  ],
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPRITE_DATA;
}
