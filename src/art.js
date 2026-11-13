/* 程序化像素美术：所有贴图在启动时用 Canvas 生成 */

const Art = {
  build(scene) {
    this.makeUnitSprites(scene);
    this.makeGround(scene);
    this.makeDecor(scene);
    this.makeCreatures(scene);
    this.makeFX(scene);
    this.makeUI(scene);
    this.makeVignettes(scene);
    this.makeAnims(scene);
  },

  _canvas(scene, key, w, h, draw, scale) {
    const s = scale || 1;
    const tex = scene.textures.createCanvas(key, Math.round(w * s), Math.round(h * s));
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(s, s);
    draw(ctx, w, h);
    ctx.restore();
    tex.refresh();
    return tex;
  },

  _pix(scene, key, rows, palette, scale) {
    const w = rows[0].length;
    const h = rows.length;
    return this._canvas(scene, key, w, h, (ctx) => {
      for (let y = 0; y < h; y++) {
        const row = rows[y];
        for (let x = 0; x < w; x++) {
          const ch = row[x];
          if (ch === '.' || !palette[ch]) continue;
          ctx.fillStyle = palette[ch];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }, scale || 1);
  },

  makeUnitSprites(scene) {
    for (const key of Object.keys(SPRITE_DATA)) {
      const def = SPRITE_DATA[key];
      this._pix(scene, key, def.rows, def.palette, 2);
    }
  },

  // ---------------------------------------------------------------- 地面
  makeGround(scene) {
    const rnd = mulberry32(20261113);

    this._canvas(scene, 'ground', GAME_W, GAME_H, (ctx) => {
      // 基础草色 + 大块色斑
      ctx.fillStyle = '#59a63f';
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      for (let i = 0; i < 90; i++) {
        const x = rnd() * GAME_W;
        const y = rnd() * GAME_H;
        const rx = 26 + rnd() * 90;
        const ry = rx * (0.4 + rnd() * 0.5);
        ctx.globalAlpha = 0.08 + rnd() * 0.10;
        this._ellipse(ctx, x, y, rx, ry, rnd() < 0.5 ? '#74c154' : '#478c30', 3, rnd, 8);
      }
      ctx.globalAlpha = 1;

      // 细碎草色噪点
      const noise = ['#4f9a37', '#63b148', '#5aa63f', '#67b54b', '#549f3c', '#6fbd52'];
      for (let i = 0; i < 16000; i++) {
        const x = Math.floor(rnd() * GAME_W);
        const y = Math.floor(rnd() * GAME_H);
        ctx.fillStyle = noise[(rnd() * noise.length) | 0];
        ctx.fillRect(x, y, 2, 2);
      }

      // 草叶纹理
      for (let i = 0; i < 900; i++) {
        const x = Math.floor(rnd() * GAME_W);
        const y = Math.floor(rnd() * GAME_H);
        ctx.fillStyle = rnd() < 0.5 ? '#4b9235' : '#70bd53';
        ctx.fillRect(x, y, 1, 2 + Math.floor(rnd() * 3));
      }

      // 中央被踩秃的泥土空地
      const cx = 480, cy = 318;
      this._ellipse(ctx, cx, cy, 196, 88, '#b18a5a', 2, rnd, 5);
      this._ellipse(ctx, 380, 322, 94, 64, '#b18a5a', 2, rnd, 4);
      this._ellipse(ctx, 586, 320, 98, 66, '#b18a5a', 2, rnd, 4);
      this._ellipse(ctx, 480, 448, 54, 28, '#b18a5a', 2, rnd, 4);

      // 泥土深浅斑点
      for (let i = 0; i < 320; i++) {
        const x = cx + (rnd() * 2 - 1) * 198;
        const y = cy + (rnd() * 2 - 1) * 88;
        if (((x - cx) / 196) ** 2 + ((y - cy) / 88) ** 2 > 1) continue;
        const c = rnd() < 0.5 ? '#9e7749' : (rnd() < 0.5 ? '#c09a68' : '#8f6a40');
        ctx.fillStyle = c;
        ctx.fillRect(Math.floor(x), Math.floor(y), 2 + Math.floor(rnd() * 3), 2);
      }

      // 泥地边缘的草簇
      for (let i = 0; i < 60; i++) {
        const a = rnd() * Math.PI * 2;
        const x = cx + Math.cos(a) * 194;
        const y = cy + Math.sin(a) * 86;
        ctx.fillStyle = rnd() < 0.5 ? '#4a9134' : '#65b24a';
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 3);
      }

      // 散落的石头、小花、蘑菇
      for (let i = 0; i < 42; i++) {
        const x = ARENA.left + 18 + rnd() * (ARENA.right - ARENA.left - 36);
        const y = ARENA.top + 18 + rnd() * (ARENA.bottom - ARENA.top - 36);
        if (((x - cx) / 185) ** 2 + ((y - cy) / 82) ** 2 < 0.9) continue;
        this._decoration(ctx, x, y, rnd);
      }
      for (let i = 0; i < 18; i++) {
        const x = ARENA.left + 24 + rnd() * (ARENA.right - ARENA.left - 48);
        const y = ARENA.top + 24 + rnd() * (ARENA.bottom - ARENA.top - 48);
        this._flowerCluster(ctx, x, y, rnd);
      }
      for (let i = 0; i < 10; i++) {
        const x = cx + (rnd() * 2 - 1) * 186;
        const y = cy + (rnd() * 2 - 1) * 82;
        if (((x - cx) / 196) ** 2 + ((y - cy) / 88) ** 2 > 0.92) continue;
        ctx.fillStyle = '#7c5c3a';
        ctx.fillRect(Math.floor(x), Math.floor(y), 3, 2);
        ctx.fillStyle = '#a3805a';
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 1);
      }

      // 四周围栏 / 树篱
      ctx.fillStyle = '#1d421d';
      ctx.fillRect(0, 0, GAME_W, ARENA.top);
      ctx.fillRect(0, ARENA.bottom, GAME_W, GAME_H - ARENA.bottom);
      ctx.fillRect(0, 0, ARENA.left, GAME_H);
      ctx.fillRect(ARENA.right, 0, GAME_W - ARENA.right, GAME_H);

      for (let i = 0; i < 2; i++) {
        const off = i * 12;
        for (let x = -16; x < GAME_W + 16; x += 21) {
          this._bush(ctx, x + rnd() * 10, ARENA.top - 8 - off + rnd() * 6, 13 + rnd() * 10, rnd);
          this._bush(ctx, x + rnd() * 10, ARENA.bottom + 8 + off + rnd() * 6, 13 + rnd() * 10, rnd);
        }
        for (let y = -16; y < GAME_H + 16; y += 22) {
          this._bush(ctx, ARENA.left - 8 - off + rnd() * 6, y + rnd() * 10, 13 + rnd() * 10, rnd);
          this._bush(ctx, ARENA.right + 8 + off + rnd() * 6, y + rnd() * 10, 13 + rnd() * 10, rnd);
        }
      }

      // 四角的大树冠
      this._canopy(ctx, 10, 8, 46, rnd);
      this._canopy(ctx, GAME_W - 10, 8, 46, rnd);
      this._canopy(ctx, 10, GAME_H - 6, 50, rnd);
      this._canopy(ctx, GAME_W - 10, GAME_H - 6, 50, rnd);

      // 树篱内侧的阴影，让房间有“墙”的厚度
      const innerW = ARENA.right - ARENA.left;
      const innerH = ARENA.bottom - ARENA.top;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(7,20,7,${0.20 - i * 0.032})`;
        ctx.fillRect(ARENA.left + i * 3, ARENA.top + i * 3, innerW - i * 6, 2);
        ctx.fillRect(ARENA.left + i * 3, ARENA.top + i * 3, 2, innerH - i * 6);
        ctx.fillRect(ARENA.right - i * 3 - 2, ARENA.top + i * 3, 2, innerH - i * 6);
        ctx.fillRect(ARENA.left + i * 3, ARENA.bottom - i * 3 - 2, innerW - i * 6, 2);
      }

      // 屋内高光边
      ctx.strokeStyle = 'rgba(150,212,106,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ARENA.left + 1, ARENA.top + 1, innerW - 2, innerH - 2);
    });
  },

  _ellipse(ctx, cx, cy, rx, ry, color, step, rnd, jitter) {
    const s = step || 1;
    ctx.fillStyle = color;
    for (let y = -ry; y < ry; y += s) {
      const t = y / ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
      if (half <= 0.5) continue;
      const j = jitter && rnd ? (rnd() * jitter - jitter / 2) : 0;
      ctx.fillRect(Math.round(cx - half + j), Math.round(cy + y), Math.max(1, Math.round(half * 2)), s);
    }
  },

  _bush(ctx, x, y, r, rnd) {
    const colors = ['#245224', '#2d5f29', '#356e2c', '#3f7d31', '#4a8a37'];
    this._ellipse(ctx, x, y, r, r * 0.72, colors[(rnd() * colors.length) | 0], 2, rnd, 4);
    this._ellipse(ctx, x - r * 0.22, y - r * 0.25, r * 0.62, r * 0.38, colors[(rnd() * colors.length) | 0], 1, rnd, 2);
    if (rnd() < 0.45) {
      this._ellipse(ctx, x - r * 0.28, y - r * 0.3, r * 0.22, r * 0.14, '#5b9c3f', 1, rnd, 1);
    }
    if (rnd() < 0.15) {
      ctx.fillStyle = rnd() < 0.5 ? '#f0d75e' : '#f0e6cf';
      ctx.fillRect(Math.floor(x + rnd() * r - r / 2), Math.floor(y - rnd() * r * 0.5), 2, 2);
    }
  },

  _canopy(ctx, x, y, r, rnd) {
    this._ellipse(ctx, x, y, r, r * 0.8, '#1a3d1a', 3, rnd, 8);
    this._ellipse(ctx, x - r * 0.12, y - r * 0.15, r * 0.8, r * 0.6, '#2a5a26', 2, rnd, 5);
    this._ellipse(ctx, x - r * 0.25, y - r * 0.28, r * 0.45, r * 0.3, '#3f7d31', 2, rnd, 2);
    this._ellipse(ctx, x - r * 0.35, y - r * 0.35, r * 0.18, r * 0.12, '#5b9c3f', 1, rnd, 1);
  },

  _decoration(ctx, x, y, rnd) {
    const t = rnd();
    if (t < 0.36) {
      // 小石头
      ctx.fillStyle = '#7f8c6a';
      ctx.fillRect(x, y, 5, 3);
      ctx.fillStyle = '#a6b28d';
      ctx.fillRect(x + 1, y, 3, 1);
      ctx.fillStyle = '#5e6b4c';
      ctx.fillRect(x, y + 2, 5, 1);
    } else if (t < 0.62) {
      // 蘑菇
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(x + 2, y + 2, 2, 3);
      ctx.fillStyle = '#cf4b42';
      ctx.fillRect(x, y, 6, 3);
      ctx.fillStyle = '#f3f0df';
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x + 4, y + 1, 1, 1);
    } else {
      // 草簇
      ctx.fillStyle = '#3f7f2d';
      ctx.fillRect(x, y + 2, 1, 3);
      ctx.fillRect(x + 2, y, 1, 5);
      ctx.fillRect(x + 4, y + 2, 1, 3);
      ctx.fillStyle = '#69b84d';
      ctx.fillRect(x + 2, y, 1, 2);
    }
  },

  _flowerCluster(ctx, x, y, rnd) {
    const colors = ['#f3efd8', '#ffd85a', '#f191b0', '#b487d6'];
    const c = colors[(rnd() * colors.length) | 0];
    for (let i = 0; i < 3; i++) {
      const fx = Math.round(x + (rnd() * 2 - 1) * 9);
      const fy = Math.round(y + (rnd() * 2 - 1) * 7);
      ctx.fillStyle = '#3f7f2d';
      ctx.fillRect(fx, fy + 2, 1, 3);
      ctx.fillStyle = c;
      ctx.fillRect(fx, fy, 1, 1);
      ctx.fillRect(fx - 1, fy + 1, 1, 1);
      ctx.fillRect(fx + 1, fy + 1, 1, 1);
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(fx, fy + 1, 1, 1);
    }
  },

  // ---------------------------------------------------------------- 装饰物（可摆动）
  makeDecor(scene) {
    const flower = (key, petal, center) => {
      this._canvas(scene, key, 8, 11, (ctx) => {
        ctx.fillStyle = '#3f7f2d';
        ctx.fillRect(3, 5, 1, 5);
        ctx.fillRect(2, 8, 1, 2);
        ctx.fillStyle = '#5fa63f';
        ctx.fillRect(5, 7, 1, 2);
        ctx.fillStyle = petal;
        ctx.fillRect(3, 1, 1, 1);
        ctx.fillRect(2, 2, 1, 1);
        ctx.fillRect(4, 2, 1, 1);
        ctx.fillRect(2, 3, 1, 1);
        ctx.fillRect(4, 3, 1, 1);
        ctx.fillStyle = center;
        ctx.fillRect(3, 2, 1, 2);
      }, 2);
    };
    flower('flower_white', '#f4f1dd', '#f4c542');
    flower('flower_yellow', '#ffd85a', '#f08f38');
    flower('flower_pink', '#f08fae', '#ffe08a');

    this._canvas(scene, 'tuft', 10, 8, (ctx) => {
      const cols = ['#3f7f2d', '#57a13a', '#6cbb4c'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cols[i % cols.length];
        const x = 1 + i * 2;
        const h = 3 + (i % 3) * 2;
        ctx.fillRect(x, 7 - h, 1, h);
      }
      ctx.fillStyle = '#8ed46a';
      ctx.fillRect(3, 1, 1, 2);
      ctx.fillRect(7, 2, 1, 2);
    }, 2);

    this._canvas(scene, 'pebble_deco', 8, 6, (ctx) => {
      ctx.fillStyle = '#6f7c5d';
      ctx.fillRect(1, 2, 6, 3);
      ctx.fillStyle = '#9daa82';
      ctx.fillRect(2, 1, 4, 1);
      ctx.fillStyle = '#4e5a40';
      ctx.fillRect(2, 4, 4, 1);
    }, 2);

    this._canvas(scene, 'bush_deco', 18, 12, (ctx) => {
      this._ellipse(ctx, 9, 8, 8, 4.5, '#2d5f29', 1);
      this._ellipse(ctx, 6, 6, 5, 3.5, '#3f7d31', 1);
      this._ellipse(ctx, 12, 6, 5, 3.2, '#356e2c', 1);
      this._ellipse(ctx, 5, 5, 2.5, 1.5, '#5b9c3f', 1);
    }, 2);
  },

  // ---------------------------------------------------------------- 生物
  makeCreatures(scene) {
    this._gun(scene);
    this._weapons(scene);
    this._slime(scene, 'slime_0', 22, 18, {
      body: '#67b84a', dark: '#4a9134', light: '#8fd463',
      shine: '#d4f5b0', outline: '#1f3d18', eye: '#f4f0d8', pupil: '#1e2a16',
    }, false);
    this._slime(scene, 'slime_1', 22, 18, {
      body: '#67b84a', dark: '#4a9134', light: '#8fd463',
      shine: '#d4f5b0', outline: '#1f3d18', eye: '#f4f0d8', pupil: '#1e2a16',
    }, true);
    this._slime(scene, 'slime_mini_0', 16, 13, {
      body: '#7cc95a', dark: '#59a63f', light: '#a4e47a',
      shine: '#e0ffc4', outline: '#22451b', eye: '#f4f0d8', pupil: '#1e2a16',
    }, false);
    this._slime(scene, 'slime_mini_1', 16, 13, {
      body: '#7cc95a', dark: '#59a63f', light: '#a4e47a',
      shine: '#e0ffc4', outline: '#22451b', eye: '#f4f0d8', pupil: '#1e2a16',
    }, true);
    this._boss(scene, 'boss_0', false);
    this._boss(scene, 'boss_1', true);
    this._bow(scene);
    this._coins(scene);
  },

  _gun(scene) {
    this._canvas(scene, 'gun', 12, 7, (ctx) => {
      ctx.fillStyle = '#26282e';
      ctx.fillRect(2, 1, 9, 4);
      ctx.fillRect(2, 4, 4, 3);
      ctx.fillStyle = '#8d94a6';
      ctx.fillRect(3, 2, 7, 2);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(3, 2, 6, 1);
      ctx.fillStyle = '#4c5262';
      ctx.fillRect(4, 3, 5, 1);
      ctx.fillStyle = '#26282e';
      ctx.fillRect(10, 2, 2, 2);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(6, 4, 1, 1);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(3, 4, 2, 2);
      ctx.fillStyle = '#a87345';
      ctx.fillRect(3, 4, 1, 2);
    }, 2);
  },

  _weapons(scene) {
    this._canvas(scene, 'gun_shotgun', 15, 8, (ctx) => {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(1, 4, 6, 4);
      ctx.fillRect(5, 2, 10, 4);
      ctx.fillRect(8, 1, 7, 2);
      ctx.fillStyle = '#8a5a2a';
      ctx.fillRect(1, 4, 5, 2);
      ctx.fillStyle = '#7d8496';
      ctx.fillRect(6, 3, 8, 2);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(7, 3, 7, 1);
      ctx.fillRect(9, 1, 5, 1);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(7, 5, 1, 2);
    }, 2);

    this._canvas(scene, 'gun_smg', 15, 8, (ctx) => {
      ctx.fillStyle = '#26282e';
      ctx.fillRect(1, 3, 4, 3);
      ctx.fillRect(4, 2, 9, 4);
      ctx.fillRect(6, 5, 3, 3);
      ctx.fillStyle = '#4c5262';
      ctx.fillRect(5, 3, 7, 2);
      ctx.fillStyle = '#9fe8ff';
      ctx.fillRect(10, 3, 2, 1);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(5, 3, 5, 1);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(12, 4, 2, 1);
    }, 2);

    this._canvas(scene, 'gun_rifle', 18, 8, (ctx) => {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(0, 4, 5, 3);
      ctx.fillRect(4, 3, 13, 2);
      ctx.fillRect(7, 1, 4, 2);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(1, 4, 4, 2);
      ctx.fillStyle = '#7d8496';
      ctx.fillRect(5, 3, 11, 1);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(6, 3, 10, 1);
      ctx.fillStyle = '#a8c8ff';
      ctx.fillRect(8, 1, 2, 1);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(12, 4, 1, 1);
    }, 2);

    this._canvas(scene, 'gun_flamer', 16, 9, (ctx) => {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(0, 2, 4, 6);
      ctx.fillRect(4, 3, 9, 3);
      ctx.fillRect(12, 2, 3, 4);
      ctx.fillStyle = '#b84a2a';
      ctx.fillRect(1, 3, 2, 4);
      ctx.fillStyle = '#ff8a3a';
      ctx.fillRect(1, 3, 1, 2);
      ctx.fillStyle = '#7d8496';
      ctx.fillRect(5, 4, 7, 1);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(11, 2, 2, 1);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(14, 3, 1, 2);
    }, 2);

    this._canvas(scene, 'gun_railgun', 19, 8, (ctx) => {
      ctx.fillStyle = '#222a36';
      ctx.fillRect(0, 4, 5, 3);
      ctx.fillRect(4, 3, 14, 2);
      ctx.fillRect(7, 1, 5, 2);
      ctx.fillStyle = '#3a5f8a';
      ctx.fillRect(1, 4, 4, 2);
      ctx.fillStyle = '#c9a94f';
      ctx.fillRect(5, 3, 12, 1);
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(7, 2, 2, 1);
      ctx.fillRect(11, 2, 2, 1);
      ctx.fillRect(15, 2, 2, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 3, 1, 1);
      ctx.fillRect(17, 3, 1, 1);
    }, 2);

    this._canvas(scene, 'gun_staff', 17, 9, (ctx) => {
      ctx.fillStyle = '#3a2313';
      ctx.fillRect(0, 4, 11, 2);
      ctx.fillStyle = '#7a4a21';
      ctx.fillRect(1, 4, 10, 1);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(2, 6, 3, 2);
      ctx.fillStyle = '#1f3d18';
      this._ellipse(ctx, 13, 4.5, 4.2, 4.2, '#1f3d18', 1);
      ctx.fillStyle = '#67b84a';
      this._ellipse(ctx, 13, 4.5, 3.2, 3.2, '#67b84a', 1);
      ctx.fillStyle = '#8fd463';
      this._ellipse(ctx, 12, 3.5, 1.6, 1.4, '#8fd463', 1);
      ctx.fillStyle = '#1e2a16';
      ctx.fillRect(12, 4, 1, 1);
      ctx.fillRect(15, 4, 1, 1);
      ctx.fillStyle = '#d4f5b0';
      ctx.fillRect(11, 2, 1, 1);
    }, 2);
  },

  _slime(scene, key, w, h, pal, squash) {
    this._canvas(scene, key, w, h, (ctx) => {
      const cx = w / 2;
      const cy = h * 0.60 + (squash ? 0.9 : 0);
      const rx = w * 0.38 + (squash ? 0.8 : -0.2);
      const ry = h * 0.29 - (squash ? 0.7 : 0);
      this._ellipse(ctx, cx, cy, rx + 1.4, ry + 1.4, pal.outline, 1);
      this._ellipse(ctx, cx, cy, rx, ry, pal.body, 1);
      this._ellipse(ctx, cx, cy + ry * 0.50, rx * 0.84, ry * 0.45, pal.dark, 1);
      this._ellipse(ctx, cx - rx * 0.28, cy - ry * 0.38, rx * 0.42, ry * 0.34, pal.light, 1);
      ctx.fillStyle = pal.shine;
      ctx.fillRect(Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.62), 2, 2);
      // 眼睛
      const eyeY = cy - ry * 0.12;
      const eyeDX = rx * 0.34;
      this._ellipse(ctx, cx - eyeDX, eyeY, 2.1, 2.8, pal.eye, 1);
      this._ellipse(ctx, cx + eyeDX, eyeY, 2.1, 2.8, pal.eye, 1);
      ctx.fillStyle = pal.pupil;
      ctx.fillRect(Math.round(cx - eyeDX), Math.round(eyeY), 2, 2);
      ctx.fillRect(Math.round(cx + eyeDX - 1), Math.round(eyeY), 2, 2);
      // 嘴
      ctx.fillStyle = pal.pupil;
      ctx.fillRect(Math.round(cx - 1.5), Math.round(cy + ry * 0.38), 3, 1);
    }, 2);
  },

  _boss(scene, key, squash) {
    this._canvas(scene, key, 56, 46, (ctx) => {
      const cx = 28;
      const cy = 31 + (squash ? 0.8 : 0);
      const rx = 21 + (squash ? 0.7 : -0.2);
      const ry = 13.5 - (squash ? 0.6 : 0);
      // 身体
      this._ellipse(ctx, cx, cy, rx + 1.6, ry + 1.6, '#1d3c16', 1);
      this._ellipse(ctx, cx, cy, rx, ry, '#5aa63f', 1);
      this._ellipse(ctx, cx, cy + ry * 0.48, rx * 0.85, ry * 0.48, '#3f7f2d', 1);
      this._ellipse(ctx, cx - rx * 0.3, cy - ry * 0.4, rx * 0.43, ry * 0.32, '#86ce5b', 1);
      // 身上的斑点
      ctx.fillStyle = '#4a9134';
      ctx.fillRect(cx - 15, cy + 3, 3, 2);
      ctx.fillRect(cx + 12, cy + 1, 2, 2);
      ctx.fillRect(cx + 4, cy + 8, 3, 2);
      ctx.fillStyle = '#d4f5b0';
      ctx.fillRect(cx - 17, cy - 7, 3, 2);
      // 王冠
      const crownX = cx - 13, crownY = 11;
      ctx.fillStyle = '#5a3a12';
      ctx.fillRect(crownX - 1, crownY - 1, 28, 9);
      ctx.fillRect(crownX + 2, crownY - 6, 4, 6);
      ctx.fillRect(crownX + 10, crownY - 9, 4, 9);
      ctx.fillRect(crownX + 18, crownY - 6, 4, 6);
      ctx.fillRect(crownX + 24, crownY - 2, 3, 3);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(crownX, crownY, 26, 7);
      ctx.fillRect(crownX + 3, crownY - 4, 2, 4);
      ctx.fillRect(crownX + 11, crownY - 7, 2, 7);
      ctx.fillRect(crownX + 19, crownY - 4, 2, 4);
      ctx.fillRect(crownX + 25, crownY - 1, 2, 2);
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(crownX + 1, crownY + 1, 24, 1);
      ctx.fillStyle = '#c94a4a';
      ctx.fillRect(cx - 2, crownY + 3, 4, 3);
      // 愤怒的眼睛
      const eyeY = cy - 3;
      this._ellipse(ctx, cx - 8, eyeY, 3.6, 3.0, '#f4f0d8', 1);
      this._ellipse(ctx, cx + 8, eyeY, 3.6, 3.0, '#f4f0d8', 1);
      ctx.fillStyle = '#1e2a16';
      ctx.fillRect(cx - 9, eyeY - 1, 3, 3);
      ctx.fillRect(cx + 7, eyeY - 1, 3, 3);
      // 怒眉
      ctx.fillStyle = '#2b4a1e';
      ctx.fillRect(cx - 13, eyeY - 5, 8, 2);
      ctx.fillRect(cx + 5, eyeY - 5, 8, 2);
      ctx.fillRect(cx - 13, eyeY - 4, 2, 2);
      ctx.fillRect(cx + 11, eyeY - 4, 2, 2);
      // 嘴和牙
      ctx.fillStyle = '#2b4a1e';
      this._ellipse(ctx, cx, cy + 8, 7, 3.4, '#2b4a1e', 1);
      ctx.fillStyle = '#f4f0d8';
      ctx.fillRect(cx - 5, cy + 6, 2, 2);
      ctx.fillRect(cx - 1, cy + 6, 2, 2);
      ctx.fillRect(cx + 3, cy + 6, 2, 2);
      ctx.fillStyle = '#d48a8a';
      ctx.fillRect(cx - 2, cy + 10, 4, 2);
    }, 2);
  },

  _bow(scene) {
    this._canvas(scene, 'bow', 10, 16, (ctx) => {
      ctx.fillStyle = '#d8d2b8';
      ctx.fillRect(1, 1, 1, 14);
      for (let y = 0; y < 16; y++) {
        const t = (y / 15 - 0.5) * 2;
        const x = 2 + Math.round((1 - t * t) * 4);
        ctx.fillStyle = y > 6 && y < 10 ? '#5a3a22' : '#8a5a2a';
        ctx.fillRect(x, y, 2, 1);
        if (y > 0 && y < 15) {
          ctx.fillStyle = '#b07a3d';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#c9a05a';
      ctx.fillRect(6, 7, 2, 3);
    }, 2);
  },

  _coins(scene) {
    const widths = [6.5, 4.4, 1.8, 4.4];
    widths.forEach((rx, i) => {
      this._canvas(scene, 'coin_' + i, 10, 10, (ctx) => {
        this._ellipse(ctx, 5, 5, rx + 0.9, 3.6, '#8a5a16', 1);
        this._ellipse(ctx, 5, 5, rx, 3.0, '#f2c23e', 1);
        this._ellipse(ctx, 5, 4.6, rx * 0.55, 1.5, '#ffe08a', 1);
        ctx.fillStyle = '#fff6c8';
        ctx.fillRect(4, 3, 1, 1);
      }, 2);
    });
  },

  // ---------------------------------------------------------------- 特效贴图
  makeFX(scene) {
    this._canvas(scene, 'bullet', 16, 8, (ctx) => {
      const g = ctx.createRadialGradient(8, 4, 0, 8, 4, 8);
      g.addColorStop(0, 'rgba(255,250,190,0.95)');
      g.addColorStop(0.4, 'rgba(255,208,80,0.6)');
      g.addColorStop(1, 'rgba(255,160,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(2, 2, 12, 4);
      ctx.fillStyle = '#fffdf0';
      ctx.fillRect(3, 3, 10, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 3, 8, 1);
    });

    this._canvas(scene, 'arrow', 14, 5, (ctx) => {
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(1, 2, 9, 1);
      ctx.fillStyle = '#e0563f';
      ctx.fillRect(0, 1, 2, 3);
      ctx.fillStyle = '#ffb15a';
      ctx.fillRect(10, 1, 2, 3);
      ctx.fillRect(12, 2, 2, 1);
    }, 2);

    this._canvas(scene, 'orb', 16, 16, (ctx) => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(240,255,210,1)');
      g.addColorStop(0.35, 'rgba(140,230,110,0.9)');
      g.addColorStop(0.7, 'rgba(70,170,80,0.45)');
      g.addColorStop(1, 'rgba(40,120,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#eaffd0';
      ctx.fillRect(6, 6, 4, 4);
    });

    this._canvas(scene, 'glow', 64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    });

    this._canvas(scene, 'ring', 96, 96, (ctx) => {
      ctx.fillStyle = '#ffffff';
      for (let a = 0; a < Math.PI * 2; a += 0.045) {
        const x = 48 + Math.cos(a) * 44;
        const y = 48 + Math.sin(a) * 44;
        const s = a % 0.21 < 0.1 ? 4 : 2;
        ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
      }
      ctx.globalAlpha = 0.6;
      for (let a = 0; a < Math.PI * 2; a += 0.07) {
        const x = 48 + Math.cos(a) * 33;
        const y = 48 + Math.sin(a) * 33;
        ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2);
      }
      ctx.globalAlpha = 1;
    });

    this._canvas(scene, 'shadow', 40, 14, (ctx) => {
      this._ellipse(ctx, 20, 7, 17, 5.4, '#000000', 1);
    });

    this._canvas(scene, 'spark', 6, 6, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 1, 4, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(0, 2, 6, 2);
    });

    this._canvas(scene, 'dust', 12, 12, (ctx) => {
      const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
      g.addColorStop(0, 'rgba(220,210,180,0.8)');
      g.addColorStop(1, 'rgba(220,210,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 12, 12);
    });

    this._canvas(scene, 'leaf', 8, 6, (ctx) => {
      ctx.fillStyle = '#4f9a37';
      ctx.fillRect(1, 2, 5, 2);
      ctx.fillRect(2, 1, 4, 1);
      ctx.fillRect(2, 4, 3, 1);
      ctx.fillStyle = '#7cc95a';
      ctx.fillRect(2, 2, 2, 1);
    });

    this._canvas(scene, 'shell', 6, 4, (ctx) => {
      ctx.fillStyle = '#8a5a16';
      ctx.fillRect(1, 1, 4, 2);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(1, 1, 3, 1);
    });

    this._canvas(scene, 'muzzle', 26, 22, (ctx) => {
      const g = ctx.createRadialGradient(13, 11, 0, 13, 11, 12);
      g.addColorStop(0, 'rgba(255,255,230,1)');
      g.addColorStop(0.4, 'rgba(255,220,110,0.9)');
      g.addColorStop(1, 'rgba(255,160,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 26, 22);
      ctx.fillStyle = '#fffdf0';
      ctx.fillRect(10, 3, 6, 16);
      ctx.fillRect(3, 9, 20, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(11, 9, 4, 4);
    });

    this._canvas(scene, 'heal', 16, 16, (ctx) => {
      ctx.fillStyle = '#7ee07a';
      ctx.fillRect(6, 2, 4, 12);
      ctx.fillRect(2, 6, 12, 4);
      ctx.fillStyle = '#c8ffc0';
      ctx.fillRect(6, 4, 4, 2);
      ctx.fillRect(4, 6, 2, 4);
    });

    this._canvas(scene, 'fragment', 10, 14, (ctx) => {
      ctx.fillStyle = '#1a1f26';
      ctx.fillRect(3, 0, 4, 2);
      ctx.fillRect(2, 2, 6, 3);
      ctx.fillRect(1, 5, 8, 5);
      ctx.fillRect(2, 10, 6, 2);
      ctx.fillRect(3, 12, 4, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 2, 3, 2);
      ctx.fillRect(2, 5, 4, 4);
      ctx.fillRect(3, 9, 2, 2);
      ctx.fillStyle = '#c8d8e8';
      ctx.fillRect(2, 6, 2, 2);
      ctx.fillRect(5, 9, 1, 2);
      ctx.fillStyle = '#f4fbff';
      ctx.fillRect(3, 2, 1, 3);
    }, 2);

    this._canvas(scene, 'health_pack', 14, 14, (ctx) => {
      ctx.fillStyle = '#123d16';
      ctx.fillRect(1, 1, 12, 12);
      ctx.fillStyle = '#f4f0d8';
      ctx.fillRect(2, 2, 10, 10);
      ctx.fillStyle = '#2f8f3a';
      ctx.fillRect(5, 3, 4, 8);
      ctx.fillRect(3, 5, 8, 4);
      ctx.fillStyle = '#7ee07a';
      ctx.fillRect(5, 4, 2, 2);
      ctx.fillRect(4, 6, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(5, 5, 1, 1);
    }, 2);

    this._canvas(scene, 'sword', 7, 22, (ctx) => {
      ctx.fillStyle = '#20242e';
      ctx.fillRect(2, 0, 3, 16);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(3, 1, 1, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 1, 1, 6);
      ctx.fillStyle = '#8a94a8';
      ctx.fillRect(4, 1, 1, 14);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(1, 16, 5, 2);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(3, 18, 1, 3);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(2, 21, 3, 1);
    }, 2);

    this._canvas(scene, 'back_sword', 6, 24, (ctx) => {
      ctx.fillStyle = '#20242e';
      ctx.fillRect(2, 0, 2, 17);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(3, 1, 1, 15);
      ctx.fillStyle = '#8a94a8';
      ctx.fillRect(4, 1, 1, 15);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(1, 17, 4, 2);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(2, 19, 2, 4);
      ctx.fillStyle = '#e8b54a';
      ctx.fillRect(2, 23, 2, 1);
    }, 2);

    this._canvas(scene, 'smoke', 20, 20, (ctx) => {
      const g = ctx.createRadialGradient(10, 10, 0, 10, 10, 10);
      g.addColorStop(0, 'rgba(90,90,80,0.55)');
      g.addColorStop(1, 'rgba(90,90,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 20, 20);
    });

    this._canvas(scene, 'spawnring', 64, 64, (ctx) => {
      for (let a = 0; a < Math.PI * 2; a += 0.09) {
        const x = 32 + Math.cos(a) * 25;
        const y = 32 + Math.sin(a) * 25;
        ctx.fillStyle = '#d94f3d';
        ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
      }
    });

    this._canvas(scene, 'target_icon', 16, 16, (ctx) => {
      ctx.fillStyle = '#ffffff';
      // 四角括号
      ctx.fillRect(1, 1, 4, 1);
      ctx.fillRect(1, 1, 1, 4);
      ctx.fillRect(11, 1, 4, 1);
      ctx.fillRect(14, 1, 1, 4);
      ctx.fillRect(1, 14, 4, 1);
      ctx.fillRect(1, 11, 1, 4);
      ctx.fillRect(11, 14, 4, 1);
      ctx.fillRect(14, 11, 1, 4);
      // 中心十字
      ctx.fillRect(7, 5, 2, 2);
      ctx.fillRect(7, 9, 2, 2);
      ctx.fillRect(5, 7, 2, 2);
      ctx.fillRect(9, 7, 2, 2);
      ctx.fillRect(7, 7, 2, 2);
    }, 2);

    this._canvas(scene, 'flame_icon', 18, 22, (ctx) => {
      this._ellipse(ctx, 9, 15, 6, 6, '#ff5a2a', 1);
      this._ellipse(ctx, 9, 10, 4.5, 6, '#ff8a3a', 1);
      this._ellipse(ctx, 9, 4.5, 2.6, 4, '#ffb04a', 1);
      this._ellipse(ctx, 9, 15, 3.6, 3.6, '#ffe066', 1);
      this._ellipse(ctx, 9, 11, 2.4, 3, '#fff2a0', 1);
    }, 2);
  },

  // ---------------------------------------------------------------- UI 贴图
  makeUI(scene) {
    this._canvas(scene, 'coin_icon', 16, 16, (ctx) => {
      this._ellipse(ctx, 8, 8, 7, 7, '#7a4c12', 1);
      this._ellipse(ctx, 8, 8, 5.8, 5.8, '#f2c23e', 1);
      this._ellipse(ctx, 8, 7.4, 3.4, 3.1, '#ffe08a', 1);
      ctx.fillStyle = '#fff8d8';
      ctx.fillRect(5, 4, 2, 2);
      ctx.fillStyle = '#c98f1e';
      ctx.fillRect(7, 9, 2, 2);
    }, 2);

    this._canvas(scene, 'lock_icon', 18, 20, (ctx) => {
      ctx.strokeStyle = '#d8cfae';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(9, 8, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#d8cfae';
      ctx.fillRect(3, 8, 12, 10);
      ctx.fillStyle = '#2b2a24';
      ctx.fillRect(8, 11, 2, 3);
      ctx.fillRect(7, 13, 4, 2);
      ctx.fillStyle = '#f4efdc';
      ctx.fillRect(4, 9, 10, 1);
    }, 2);

    this._canvas(scene, 'skull', 24, 24, (ctx) => {
      this._ellipse(ctx, 12, 10, 8.5, 8, '#e8e4d4', 1);
      ctx.fillStyle = '#e8e4d4';
      ctx.fillRect(7, 16, 10, 5);
      ctx.fillStyle = '#26261e';
      ctx.fillRect(7, 8, 3, 3);
      ctx.fillRect(14, 8, 3, 3);
      ctx.fillRect(11, 12, 2, 2);
      ctx.fillRect(9, 18, 1, 3);
      ctx.fillRect(12, 18, 1, 3);
      ctx.fillRect(15, 18, 1, 3);
      ctx.fillStyle = '#a8a494';
      ctx.fillRect(8, 17, 8, 1);
    }, 2);
  },

  // ---------------------------------------------------------------- 暗角
  makeVignettes(scene) {
    this._canvas(scene, 'vignette', GAME_W, GAME_H, (ctx) => {
      const g = ctx.createRadialGradient(480, 270, 130, 480, 270, 560);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(6,16,6,0.05)');
      g.addColorStop(0.85, 'rgba(4,12,4,0.22)');
      g.addColorStop(1, 'rgba(2,8,2,0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    });

    this._canvas(scene, 'vignette_red', GAME_W, GAME_H, (ctx) => {
      const g = ctx.createRadialGradient(480, 270, 160, 480, 270, 540);
      g.addColorStop(0, 'rgba(160,20,20,0)');
      g.addColorStop(0.7, 'rgba(170,20,20,0.12)');
      g.addColorStop(1, 'rgba(140,10,10,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    });
  },

  makeAnims(scene) {
    const A = scene.anims;
    if (!A.exists('player_walk')) {
      A.create({ key: 'player_walk', frames: [{ key: 'player_idle' }, { key: 'player_walk' }], frameRate: 9, repeat: -1 });
    }
    if (!A.exists('swordsman_walk')) {
      A.create({ key: 'swordsman_walk', frames: [{ key: 'swordsman_idle' }, { key: 'swordsman_walk' }], frameRate: 9, repeat: -1 });
    }
    if (!A.exists('goblin_walk')) {
      A.create({ key: 'goblin_walk', frames: [{ key: 'goblin_idle' }, { key: 'goblin_walk' }], frameRate: 7, repeat: -1 });
    }
    if (!A.exists('bat_fly')) {
      A.create({ key: 'bat_fly', frames: [{ key: 'bat_0' }, { key: 'bat_1' }], frameRate: 11, repeat: -1 });
    }
    if (!A.exists('coin_spin')) {
      A.create({ key: 'coin_spin', frames: [{ key: 'coin_0' }, { key: 'coin_1' }, { key: 'coin_2' }, { key: 'coin_3' }], frameRate: 11, repeat: -1 });
    }
    if (!A.exists('slime_idle')) {
      A.create({ key: 'slime_idle', frames: [{ key: 'slime_0' }, { key: 'slime_1' }], frameRate: 4.5, repeat: -1 });
    }
    if (!A.exists('slime_mini_idle')) {
      A.create({ key: 'slime_mini_idle', frames: [{ key: 'slime_mini_0' }, { key: 'slime_mini_1' }], frameRate: 5, repeat: -1 });
    }
    if (!A.exists('boss_idle')) {
      A.create({ key: 'boss_idle', frames: [{ key: 'boss_0' }, { key: 'boss_1' }], frameRate: 3.4, repeat: -1 });
    }
  },
};
