/* UI 小工具：像素风面板 / 按钮 / 弹窗 */

const UI = {
  textStyle(size, opts) {
    const o = opts || {};
    return {
      fontFamily: FONT,
      fontSize: Math.round(size) + 'px',
      color: o.color || '#fff6dd',
      fontStyle: o.bold === false ? 'normal' : 'bold',
      stroke: o.stroke || '#241a12',
      strokeThickness: o.strokeThickness == null ? Math.max(3, Math.round(size * 0.16)) : o.strokeThickness,
      align: o.align || 'center',
      shadow: o.shadow === false ? undefined : { offsetX: 2, offsetY: 3, color: 'rgba(0,0,0,0.45)', blur: 0, fill: true },
    };
  },

  drawPanel(g, x, y, w, h, opts) {
    const o = opts || {};
    const bg = o.bg == null ? 0x1b2817 : o.bg;
    const alpha = o.alpha == null ? 0.92 : o.alpha;
    const border = o.border == null ? 0xd9b45a : o.border;
    g.clear();
    if (o.shadow !== false) {
      g.fillStyle(0x000000, 0.35);
      g.fillRect(x + 4, y + 4, w, h);
    }
    g.fillStyle(bg, alpha);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, border, 1);
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.lineStyle(1, o.inner == null ? 0x4b6b3e : o.inner, 0.9);
    g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    // 四角像素装饰
    g.fillStyle(border, 1);
    const c = 7;
    g.fillRect(x + 1, y + 1, c, 2);
    g.fillRect(x + 1, y + 1, 2, c);
    g.fillRect(x + w - 1 - c, y + 1, c, 2);
    g.fillRect(x + w - 3, y + 1, 2, c);
    g.fillRect(x + 1, y + h - 3, c, 2);
    g.fillRect(x + 1, y + h - 1 - c, 2, c);
    g.fillRect(x + w - 1 - c, y + h - 3, c, 2);
    g.fillRect(x + w - 3, y + h - 1 - c, 2, c);
  },

  panel(scene, x, y, w, h, opts) {
    const g = scene.add.graphics();
    this.drawPanel(g, x, y, w, h, opts);
    return g;
  },

  button(scene, x, y, w, h, label, onClick, opts) {
    const o = opts || {};
    const primary = o.variant !== 'ghost' && o.variant !== 'danger';
    const bg = o.bg == null ? (primary ? 0x2f5a2a : 0x23301f) : o.bg;
    const bgHover = o.bgHover == null ? (primary ? 0x3c7134 : 0x314329) : o.bgHover;
    const border = o.border == null ? (primary ? 0xe8c467 : 0x6f8a5a) : o.border;
    const textColor = o.color || (primary ? '#fff3c4' : '#dfe8c8');
    const fontSize = o.fontSize || 19;

    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const text = scene.add.text(0, 0, label, this.textStyle(fontSize, {
      color: textColor,
      bold: true,
      stroke: '#1b140c',
      strokeThickness: 3,
      shadow: false,
    })).setOrigin(0.5);
    const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    c.add([g, text, hit]);
    c.setSize(w, h);

    let hover = false;
    let pressed = false;
    let dead = false;

    const draw = () => {
      const b = pressed ? bg : (hover ? bgHover : bg);
      g.clear();
      g.fillStyle(0x000000, 0.32);
      g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
      g.fillStyle(b, 0.97);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(2, border, 1);
      g.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      g.lineStyle(1, primary ? 0x7fae62 : 0x4b6b3e, 0.8);
      g.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
      g.fillStyle(border, 1);
      g.fillRect(-w / 2 + 1, -h / 2 + 1, 5, 2);
      g.fillRect(-w / 2 + 1, -h / 2 + 1, 2, 5);
      g.fillRect(w / 2 - 6, -h / 2 + 1, 5, 2);
      g.fillRect(w / 2 - 3, -h / 2 + 1, 2, 5);
      g.fillRect(-w / 2 + 1, h / 2 - 3, 5, 2);
      g.fillRect(-w / 2 + 1, h / 2 - 6, 2, 5);
      g.fillRect(w / 2 - 6, h / 2 - 3, 5, 2);
      g.fillRect(w / 2 - 3, h / 2 - 6, 2, 5);
      text.setY(hover ? -1 : 0);
    };

    hit.on('pointerover', () => {
      if (dead) return;
      hover = true;
      draw();
      scene.tweens.add({ targets: c, scale: 1.035, duration: 90, ease: 'Sine.Out' });
    });
    hit.on('pointerout', () => {
      hover = false;
      pressed = false;
      c.setScale(1);
      draw();
    });
    hit.on('pointerdown', () => {
      if (dead) return;
      pressed = true;
      c.setScale(0.97);
      draw();
    });
    hit.on('pointerup', () => {
      if (dead) return;
      pressed = false;
      c.setScale(1);
      draw();
      if (o.sound !== false) Sfx.uiClick();
      if (o.once) {
        dead = true;
        hit.disableInteractive();
      }
      onClick();
    });
    draw();
    return c;
  },

  iconText(scene, x, y, iconKey, text, opts) {
    const o = opts || {};
    const size = o.fontSize || 18;
    const c = scene.add.container(x, y);
    const icon = scene.add.image(0, 0, iconKey);
    const t = scene.add.text(12, 0, text, this.textStyle(size, {
      color: o.color || '#ffe9a8',
      strokeThickness: o.strokeThickness == null ? 4 : o.strokeThickness,
    })).setOrigin(0, 0.5);
    c.add([icon, t]);
    if (o.alignRight) {
      t.setOrigin(1, 0.5);
      t.x = -12;
      icon.x = -(t.width + 24);
    }
    return c;
  },

  modal(scene, title, body, opts) {
    const o = opts || {};
    const root = scene.add.container(0, 0).setDepth(5000);
    const dim = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.62);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);
    const panelW = o.width || 620;
    const panelH = o.height || 360;
    const px = GAME_W / 2 - panelW / 2;
    const py = GAME_H / 2 - panelH / 2;
    const g = scene.add.graphics();
    this.drawPanel(g, px, py, panelW, panelH, { bg: 0x1a2616, border: 0xe0bd63, alpha: 0.97 });
    const t = scene.add.text(GAME_W / 2, py + 44, title, this.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 6,
    })).setOrigin(0.5);
    const b = scene.add.text(GAME_W / 2, py + 100, body, this.textStyle(17, {
      color: '#e8efd8', strokeThickness: 3, align: 'left', shadow: false,
    })).setOrigin(0.5, 0);
    b.setLineSpacing(10);
    const close = this.button(scene, GAME_W / 2, py + panelH - 48, 170, 44, o.closeLabel || '知道了', () => {
      root.destroy();
      if (o.onClose) o.onClose();
    }, { variant: 'ghost', fontSize: 17 });
    root.add([dim, g, t, b, close]);
    dim.on('pointerup', () => {
      // 点击遮罩不关闭，避免误触
    });
    return root;
  },

  wrapCJK(text, maxChars) {
    const s = String(text || '');
    const n = Math.max(1, maxChars);
    const punct = '。，、；：！？）》」』…';
    const lines = [];
    let i = 0;
    while (i < s.length) {
      let end = Math.min(s.length, i + n);
      // 避免标点出现在下一行开头：把紧跟的标点并入本行
      while (end < s.length && punct.indexOf(s[end]) >= 0) end++;
      lines.push(s.slice(i, end));
      i = end;
    }
    return lines.join('\n');
  },

  beginModalScene(scene) {
    const paused = [];
    ['Game', 'Menu'].forEach((key) => {
      const s = scene.scene.get(key);
      if (s && s.scene && s.scene.isActive()) {
        s.scene.pause();
        paused.push(s);
      }
    });
    const ui = scene.scene.get('UI');
    if (ui && ui.scene.isActive()) ui.input.enabled = false;
    scene.scene.bringToTop();
    const state = { paused, ui, ended: false };
    scene.events.once('shutdown', () => UI.endModalScene(state));
    return state;
  },

  endModalScene(state) {
    if (!state || state.ended) return;
    state.ended = true;
    state.paused.forEach((s) => {
      try {
        if (s.scene && s.scene.isPaused()) s.scene.resume();
      } catch (e) { /* 避免关闭弹窗时卡住游戏 */ }
    });
    try {
      if (state.ui && state.ui.input) state.ui.input.enabled = true;
    } catch (e) { /* ignore */ }
  },

  toastContainer(scene) {
    const c = scene.add.container(GAME_W / 2, GAME_H - 96).setDepth(4000);
    const g = scene.add.graphics();
    const t = scene.add.text(0, 0, '', this.textStyle(17, {
      color: '#fff1b8', strokeThickness: 4,
    })).setOrigin(0.5);
    c.add([g, t]);
    c.setAlpha(0);
    let tween = null;
    const api = {
      root: c,
      show(msg, color) {
        t.setText(msg);
        t.setColor(color || '#fff1b8');
        const w = Math.max(140, t.width + 44);
        g.clear();
        this._w = w;
        g.fillStyle(0x14200f, 0.92);
        g.fillRoundedRect(-w / 2, -22, w, 44, 6);
        g.lineStyle(2, 0xc9a94f, 0.9);
        g.strokeRoundedRect(-w / 2, -22, w, 44, 6);
        if (tween) tween.stop();
        c.setAlpha(1);
        c.setScale(0.96);
        scene.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.Out' });
        tween = scene.tweens.add({
          targets: c, alpha: 0, delay: 1600, duration: 350,
          onComplete: () => { tween = null; },
        });
      },
    };
    return api;
  },
};
