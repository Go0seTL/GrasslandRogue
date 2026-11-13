class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.starting = false;
    const checkpoint = Store.data.runCheckpoint;
    const hasResume = !!(checkpoint && checkpoint.round && checkpoint.stage);
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x081108, 0.52).setOrigin(0).setDepth(1);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(2);

    // 飘落叶子
    this.add.particles(0, 0, 'leaf', {
      x: { min: 0, max: GAME_W },
      y: -20,
      lifespan: 9000,
      speedX: { min: 8, max: 34 },
      speedY: { min: 18, max: 48 },
      scale: { min: 0.5, max: 1.1 },
      alpha: { start: 0.4, end: 0 },
      rotate: { min: 0, max: 360 },
      frequency: 420,
      quantity: 1,
    }).setDepth(3);

    // 标题
    const title = this.add.text(GAME_W / 2, 118, '草原枪手', UI.textStyle(66, {
      color: '#ffe08a', stroke: '#2a1a12', strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.55)', blur: 0, fill: true },
    })).setOrigin(0.5).setDepth(10);
    title.setScale(0.2);
    this.tweens.add({ targets: title, scale: 1, duration: 520, ease: 'Back.Out' });

    this.add.text(GAME_W / 2, 176, 'G R A S S L A N D   G U N N E R', UI.textStyle(14, {
      color: '#a9c98c', strokeThickness: 3, bold: true,
    })).setOrigin(0.5).setDepth(10).setAlpha(0.9);
    this.add.text(GAME_W / 2, 198, '像素肉鸽 · 单机原型', UI.textStyle(13, {
      color: '#7f9a6d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(10).setAlpha(0.8);

    // 主角展示
    const heroX = GAME_W / 2;
    const heroY = 312;
    const shadow = this.add.image(heroX, heroY + 30, 'shadow').setScale(1.4).setAlpha(0.4).setDepth(9);
    const hero = this.add.image(heroX, heroY, 'player_idle').setScale(2.6).setDepth(11);
    const gun = this.add.image(heroX + 30, heroY - 8, 'gun').setOrigin(0.22, 0.5).setScale(2.2).setRotation(-0.25).setDepth(12);
    this.tweens.add({ targets: hero, y: heroY - 5, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: gun, y: heroY - 13, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: shadow, scaleX: 1.32, alpha: 0.32, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // 两只欢迎的史莱姆
    this.addWelcomeSlime(238, 352, 1.9, 900);
    this.addWelcomeSlime(724, 360, 1.6, 1250);

    // 金币
    const coinPanel = UI.panel(this, 16, 12, 196, 44, { border: 0x9aa86a, bg: 0x15200f, alpha: 0.82 });
    coinPanel.setDepth(20);
    this.add.image(40, 34, 'coin_icon').setDepth(21);
    this.coinText = this.add.text(58, 34, String(Store.data.coins), UI.textStyle(19, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0, 0.5).setDepth(21);

    // 音效开关
    const soundLabel = Store.data.muted ? '音效：关' : '音效：开';
    this.soundBtn = UI.button(this, 872, 34, 148, 38, soundLabel, () => {
      const muted = Store.toggleMute();
      Sfx.setMuted(muted);
      this.soundBtn.list[1].setText(muted ? '音效：关' : '音效：开');
      const t = this.add.text(872, 66, muted ? '已静音' : '音效已开启', UI.textStyle(13, {
        color: '#cfe3b8', strokeThickness: 3,
      })).setOrigin(0.5).setDepth(30).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: 72, duration: 150, yoyo: true, hold: 700, onComplete: () => t.destroy() });
    }, { variant: 'ghost', fontSize: 15 });
    this.soundBtn.setDepth(20);

    UI.button(this, 872, 82, 148, 36, '怪物图鉴', () => {
      this.scene.launch('Bestiary', { from: 'menu' });
    }, { variant: 'ghost', fontSize: 14 }).setDepth(20);

    UI.button(this, 110, 100, 148, 36, '激活码', () => this.showActivation(), {
      variant: 'ghost', fontSize: 14,
    }).setDepth(20);

    UI.button(this, 872, 174, 148, 36, '武器锻造', () => {
      this.scene.launch('Forge', { from: 'menu' });
    }, { variant: 'ghost', fontSize: 14 }).setDepth(20);

    UI.button(this, 110, 144, 148, 36, '全屏模式', () => this.tryFullscreen(), {
      variant: 'ghost', fontSize: 14,
    }).setDepth(20);

    // 按钮：有检查点时显示「继续游戏」
    if (hasResume) {
      UI.button(this, GAME_W / 2, 392, 300, 48, `继 续 游 戏  ·  ${checkpoint.round}-${checkpoint.stage}`, () => this.continueGame(), {
        fontSize: 20, once: true,
      }).setDepth(20);
      UI.button(this, GAME_W / 2, 448, 220, 40, '开始新冒险', () => this.startGame(), {
        variant: 'ghost', fontSize: 16, once: true,
      }).setDepth(20);
      UI.button(this, GAME_W / 2, 496, 178, 34, '操作说明', () => this.showHelp(), {
        variant: 'ghost', fontSize: 13,
      }).setDepth(20);
    } else {
      UI.button(this, GAME_W / 2, 408, 264, 56, '开 始 冒 险', () => this.startGame(), {
        fontSize: 24, once: true,
      }).setDepth(20);
      UI.button(this, GAME_W / 2, 472, 196, 42, '操作说明', () => this.showHelp(), {
        variant: 'ghost', fontSize: 17,
      }).setDepth(20);
    }

    // 最佳进度
    const best = Store.data.best;
    const bestText = best
      ? `最佳进度  ${best.round}-${best.stage}    击杀 ${best.kills || 0}`
      : '最佳进度  尚无记录';
    this.add.text(20, 512, bestText, UI.textStyle(14, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0, 0.5).setDepth(20);
    this.add.text(940, 512, 'v0.1  ·  60 FPS  ·  单机试玩版', UI.textStyle(13, {
      color: '#7d9169', strokeThickness: 2, bold: false,
    })).setOrigin(1, 0.5).setDepth(20);

    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.activationRoot) return;
      if (Store.data.runCheckpoint) this.continueGame();
      else this.startGame();
    });
    this.events.once('shutdown', () => {
      if (this.activationInput && this.activationInput.parentNode) this.activationInput.remove();
      this.activationInput = null;
    });

    this.cameras.main.fadeIn(420, 6, 12, 6);
  }

  addWelcomeSlime(x, y, scale, delay) {
    const shadow = this.add.image(x, y + 16 * scale, 'shadow').setScale(scale * 0.9).setAlpha(0.32).setDepth(8);
    const s = this.add.sprite(x, y, 'slime_0').setScale(scale).setDepth(10);
    s.play('slime_idle');
    this.tweens.add({
      targets: s, y: y - 10, duration: 720, yoyo: true, repeat: -1,
      ease: 'Quad.InOut', delay,
    });
    this.tweens.add({
      targets: shadow, scaleX: scale * 1.05, alpha: 0.2, duration: 720, yoyo: true, repeat: -1,
      ease: 'Quad.InOut', delay,
    });
  }

  startGame() {
    if (this.starting || this.activationRoot) return;
    this.starting = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(280, 6, 12, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Select');
    });
  }

  continueGame() {
    if (this.starting || this.activationRoot) return;
    if (!Store.data.runCheckpoint) {
      this.startGame();
      return;
    }
    this.starting = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(280, 6, 12, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { resume: true });
    });
  }

  tryFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) {
      this.showFullscreenHelp();
      return;
    }
    try {
      const p = req.call(el);
      if (p && p.catch) p.catch(() => this.showFullscreenHelp());
      setTimeout(() => {
        if (this.scale) this.scale.refresh();
      }, 400);
    } catch (e) {
      this.showFullscreenHelp();
    }
  }

  showFullscreenHelp() {
    UI.modal(this, '全屏游玩',
      'iPhone Safari 不支持网页直接全屏。\n\n' +
      '请按以下步骤：\n' +
      '1. 点 Safari 底部的「分享」按钮\n' +
      '2. 选择「添加到主屏幕」\n' +
      '3. 从桌面图标打开「草原枪手」\n\n' +
      '这样会隐藏浏览器地址栏和底部工具栏。\n\n' +
      '安卓 / 电脑：点「全屏模式」即可进入全屏。\n' +
      '游戏已自动避开刘海和底部横条的安全区域。',
      { width: 640, height: 420 }
    );
  }

  showActivation() {
    if (this.activationRoot) return;
    Sfx.uiClick();

    const root = this.add.container(0, 0).setDepth(5000);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.66).setOrigin(0);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);
    const g = this.add.graphics();
    UI.drawPanel(g, 300, 150, 360, 240, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });
    const title = this.add.text(480, 182, '输入激活码', UI.textStyle(26, {
      color: '#ffe9a8', strokeThickness: 6,
    })).setOrigin(0.5);
    const box = this.add.rectangle(480, 246, 280, 44, 0x0b1208, 1);
    box.setStrokeStyle(2, 0x7e9a5e, 1);
    const usedAll = Store.data.activationUsed && Store.data.superActivationUsed;
    const hint = usedAll ? '激活码已全部使用' : '请输入激活码';
    const status = this.add.text(480, 284, hint, UI.textStyle(12, {
      color: usedAll ? '#ffd0a0' : '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5);
    const confirm = UI.button(this, 480, 330, 160, 36, '确 认', () => this.submitActivation(status), {
      fontSize: 14,
    });
    const cancel = UI.button(this, 480, 372, 160, 30, '取 消', () => this.closeActivation(), {
      variant: 'ghost', fontSize: 12,
    });
    root.add([dim, g, title, box, status, confirm, cancel]);
    this.activationRoot = root;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / GAME_W;
    const sy = rect.height / GAME_H;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 32;
    input.autocomplete = 'off';
    input.placeholder = '激活码';
    Object.assign(input.style, {
      position: 'fixed',
      left: `${rect.left + 480 * sx - 140 * sx}px`,
      top: `${rect.top + 246 * sy - 22 * sy}px`,
      width: `${280 * sx}px`,
      height: `${44 * sy}px`,
      background: 'rgba(11,18,8,0.98)',
      color: '#fff6dd',
      border: '2px solid #7e9a5e',
      outline: 'none',
      borderRadius: '4px',
      boxSizing: 'border-box',
      textAlign: 'center',
      fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
      fontSize: `${Math.max(14, 20 * sy)}px`,
      letterSpacing: '2px',
      zIndex: 9999,
      caretColor: '#ffe9a8',
      display: 'block',
    });
    document.body.appendChild(input);
    this.activationInput = input;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitActivation(status);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeActivation();
      }
      e.stopPropagation();
    });
    setTimeout(() => { if (this.activationInput === input) input.focus(); }, 60);
  }

  submitActivation(statusText) {
    if (!this.activationInput) return;
    const code = (this.activationInput.value || '').trim().toLowerCase();
    const h = hashActivation(code);
    if (h === ACTIVATION_HASH.tangle) {
      if (Store.data.activationUsed) {
        Sfx.uiDeny();
        statusText.setText('该激活码已经使用过了').setColor('#ffd0a0');
        return;
      }
      Store.data.activationUsed = true;
      Store.addCoins(500);
      Store.save();
      this.coinText.setText(String(Store.data.coins));
      this.tweens.add({ targets: this.coinText, scale: 1.3, duration: 160, yoyo: true });
      Sfx.unlock();
      this.activationInput.value = '';
      statusText.setText('激活成功：金币 +500').setColor('#9ff0a8');
      this.time.delayedCall(1400, () => this.closeActivation());
      return;
    }
    if (h === ACTIVATION_HASH.super) {
      if (Store.data.superActivationUsed) {
        Sfx.uiDeny();
        statusText.setText('该激活码已经使用过了').setColor('#ffd0a0');
        return;
      }
      Store.data.superActivationUsed = true;
      CHAR_DEFS.forEach((def) => {
        if (!Store.data.unlocked.includes(def.id)) Store.data.unlocked.push(def.id);
      });
      Object.keys(WEAPONS).forEach((id) => {
        if (!Store.data.ownedWeapons.includes(id)) Store.data.ownedWeapons.push(id);
      });
      Store.addCoins(5000);
      Store.save();
      this.coinText.setText(String(Store.data.coins));
      this.tweens.add({ targets: this.coinText, scale: 1.35, duration: 180, yoyo: true });
      Sfx.unlock();
      this.activationInput.value = '';
      statusText.setText('全解锁成功！所有角色/武器已解锁，金币 +5000').setColor('#ffd76a');
      this.time.delayedCall(1600, () => this.closeActivation());
      return;
    }
    if (!code) {
      Sfx.uiDeny();
      statusText.setText('请输入激活码').setColor('#ffd0a0');
    } else {
      Sfx.uiDeny();
      statusText.setText('激活码无效').setColor('#ffb09a');
    }
  }

  closeActivation() {
    if (this.activationInput && this.activationInput.parentNode) this.activationInput.remove();
    this.activationInput = null;
    if (this.activationRoot) {
      this.activationRoot.destroy();
      this.activationRoot = null;
    }
  }

  showHelp() {
    UI.modal(this,
      '操作说明',
      '移动：W A S D / 方向键\n' +
      '瞄准：鼠标指向\n' +
      '射击：按住鼠标左键（无限子弹）\n' +
      '翻滚：空格 / Shift（短暂无敌）\n' +
      '技能：E（或点右下角火焰按钮）\n' +
      '暂停：Esc / P\n\n' +
      '枪手技能：锁定最近 3 名敌人，机枪扫射 3 秒。\n' +
      '目标死亡会自动转火到最近的敌人。\n\n' +
      '手机端：左半屏拖动移动，右半屏拖动瞄准\n' +
      '右下角「闪」按钮翻滚，火焰按钮放技能\n\n' +
      '每关击杀怪物掉落 1-3 金币，金币永久保存。\n' +
      '第 1-6 关是 Boss「史莱姆王」，击败后进入 2-1。',
      { width: 660, height: 430 }
    );
  }
}
