class GuestScene extends Phaser.Scene {
  constructor(key) {
    super(key || 'Guest');
  }

  init(data) {
    this.characterId = (data && data.character) || Store.data.lastChar || 'gunner';
  }

  create() {
    this.input.addPointer(3);
    this.isRemoteHud = true;
    this.characterId = this.characterId || Store.data.lastChar || 'gunner';
    this.player = { hp: 100, maxHp: 100, energy: 100, maxEnergy: 100, isDead: false };
    this.player2 = null;
    this.weapon = WEAPONS.pistol;
    this.weaponId = 'pistol';
    this.secondaryWeapon = null;
    this.secondaryId = null;
    this.dualWield = false;
    this.skill = { active: false, type: null, cooldownUntil: 0, cooldown: 12000, duration: 0 };
    this.boss = null;
    this.remoteBosses = [];
    this.enemies = { getChildren: () => this.remoteBosses };
    this.hudState = { bannerQueue: [], toastQueue: [], hintText: '', hintUntil: 0, hurtAt: 0 };
    this.round = 1;
    this.stage = 1;
    this.endless = false;
    this.endlessWave = 1;
    this.demonRealm = false;
    this.mapName = '草原';
    this.coins = 0;
    this.kills = 0;
    this.runCoins = 0;
    this.treasurePot = 0;
    this.touchMode = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.netHost = false;
    this.uiLaunched = false;
    this.ended = false;
    this.closing = false;
    this.state = null;
    this.keys = {};
    this.moveTouch = null;
    this.aimTouch = null;
    this.aimX = null;
    this.aimY = null;
    this.aimSet = false;
    this.fire = false;
    this.predX = 480;
    this.predY = 405;
    this.predReady = false;
    this.nextLocalMuzzle = 0;
    this.inputTimer = null;
    this.hudRoots = [];
    this.enemyMap = new Map();
    this.pbSprites = [];
    this.ebSprites = [];
    this.coinSprites = [];
    this.hpSprites = [];
    this.epSprites = [];
    this.fragSprites = [];

    this.game.canvas.style.display = '';
    this.cameras.main.setBackgroundColor('#0b120a');
    this.bg = this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(900).setScrollFactor(0);
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: { min: 120, max: 320 }, speed: { min: 60, max: 220 },
      scale: { start: 1.0, end: 0 }, alpha: { start: 1, end: 0 },
      blendMode: 'ADD', emitting: false,
    }).setDepth(820);
    this.poisonG = this.add.graphics().setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.stickG = this.add.graphics().setDepth(840).setScrollFactor(0);
    this.localVampireG = this.add.graphics().setDepth(828).setBlendMode(Phaser.BlendModes.ADD);
    this.hostAura = this.add.image(0, 0, 'ring').setTint(0xb07bff)
      .setScale(1.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(703).setVisible(false);
    this.hostBeamObjs = null;
    this.syncBeamsG = this.add.graphics().setDepth(735).setBlendMode(Phaser.BlendModes.ADD);
    this.swordSprites = [];
    this.goo = this.add.particles(0, 0, 'spark', {
      lifespan: { min: 220, max: 520 }, speed: { min: 50, max: 190 },
      gravityY: 360, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0x67b84a, 0x8fd463, 0xffd76a], emitting: false,
    }).setDepth(819);

    this.portalA = this.add.image(0, 0, 'ring').setTint(0x7fe8ff).setAlpha(0.75)
      .setDepth(5).setVisible(false);
    this.portalB = this.add.image(0, 0, 'ring').setTint(0xbf7bff).setAlpha(0.5)
      .setScale(0.7).setDepth(5).setVisible(false);

    this.hostSprite = this.add.sprite(480, 405, 'player_idle').setDepth(700);
    this.guestSprite = this.add.sprite(480, 405, 'player_idle').setDepth(701).setTint(0xbfe8ff);
    this.guestShieldAura = this.add.image(480, 405, 'ring').setTint(0x7dffb0)
      .setScale(1.3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(702);
    this.mercSprite = this.add.sprite(480, 405, 'merc_xuan_0').setVisible(false).setDepth(699);
    this.merchantSprite = this.add.sprite(480, 405, 'merchant_0').setVisible(false).setDepth(698);
    this.ghostSprite = this.add.image(480, 405, 'ghost_baby').setVisible(false).setDepth(697).setAlpha(0.85);
    this.merchantTag = this.add.text(480, 375, '奇旅商人', UI.textStyle(9, {
      color: '#ffd76a', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(880).setVisible(false);
    this.mercTag = this.add.text(480, 375, '', UI.textStyle(9, {
      color: '#ffe9a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(880).setVisible(false);
    this.mercHpG = this.add.graphics().setDepth(832);
    this.hostGun = this.add.image(480, 405, 'gun').setOrigin(0.22, 0.5).setDepth(705);
    this.guestGun = this.add.image(480, 405, 'gun').setOrigin(0.22, 0.5).setDepth(706);
    this.hostTag = this.add.text(480, 375, '房主', UI.textStyle(9, {
      color: '#ffe9a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(880);
    this.guestTag = this.add.text(480, 375, '玩家2', UI.textStyle(9, {
      color: '#9fe8ff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(880);

    this.buildHud();
    this.bindInputs();

    Net.onState = (data) => this.applyState(data);
    Net.onWait = (text) => { if (this.statusText) this.statusText.textContent = text; };
    Net.onGameOver = (data) => this.showGameOver(data);
    Net.onEnded = (reason) => this.showEnded(reason);
    Net.onStatus = (text) => { if (this.statusText) this.statusText.textContent = text; };
    if (Net.conn && !Net.conn.open) this.showEnded('与房主断开连接');

    this.inputTimer = setInterval(() => this.sendInput(), 16);
    this.onResize = () => this.layoutHud();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.events.once('shutdown', () => this.cleanup());
    this.time.delayedCall(120, () => this.launchHud());
    this.time.delayedCall(60, () => this.layoutHud());
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  // ------------------------------------------------------------ HUD

  makeEl(tag, css, parent) {
    const el = document.createElement(tag);
    el.style.cssText = css;
    if (parent) parent.appendChild(el);
    return el;
  }

  buildHud() {
    this.touchLayer = this.makeEl('div', [
      'position:fixed', 'inset:0', 'z-index:850', 'background:transparent',
      'touch-action:none', 'user-select:none',
    ].join(';'));
    document.body.appendChild(this.touchLayer);

    this.hud = this.makeEl('div', [
      'position:fixed', 'inset:0', 'z-index:901', 'pointer-events:none',
      'font-family:"Microsoft YaHei","PingFang SC",sans-serif', 'color:#e8d9a8',
      'user-select:none',
    ].join(';'));
    document.body.appendChild(this.hud);

    // 左上生命/能量
    this.hpPanel = this.makeEl('div', [
      'position:absolute', 'box-sizing:border-box', 'padding:7px 10px',
      'display:flex', 'gap:8px', 'align-items:center',
      'background:rgba(20,30,16,.95)', 'border:2px solid #d9b45a',
      'border-radius:6px', 'pointer-events:none', 'text-shadow:0 2px 0 #000',
      'box-shadow:inset 0 0 0 2px rgba(75,107,62,.55)',
    ].join(';'), this.hud);
    this.portraitImg = this.makeEl('img', [
      'width:40px', 'height:52px', 'object-fit:contain', 'image-rendering:pixelated',
      'background:rgba(8,14,6,.8)', 'border:1px solid #6f8a5a', 'border-radius:3px',
    ].join(';'), this.hpPanel);
    const statusCol = this.makeEl('div', 'flex:1;min-width:0;', this.hpPanel);
    const head = this.makeEl('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;', statusCol);
    this.hudName = this.makeEl('div', 'font-size:13px;font-weight:700;color:#9fe8ff;white-space:nowrap;', head);
    this.hudName.textContent = '玩家2';
    this.hudStatus = this.makeEl('div', 'font-size:9px;color:#9fe8ff;white-space:nowrap;', head);
    this.hudStatus.textContent = '联机中';
    const hpRow = this.makeEl('div', 'display:flex;align-items:center;gap:5px;margin-bottom:3px;', statusCol);
    this.makeEl('div', 'font-size:9px;color:#dfe8c8;width:24px;text-align:right;', hpRow).textContent = '生命';
    this.hpBar = this.makeEl('div', 'position:relative;flex:1;height:14px;background:#1e2e18;border:1px solid #5d7048;border-radius:2px;overflow:hidden;', hpRow);
    this.hpFill = this.makeEl('div', 'height:100%;width:100%;background:linear-gradient(180deg,#8fe06a,#4a9a3a);box-shadow:inset 0 1px 0 rgba(255,255,255,.25);', this.hpBar);
    this.hpText = this.makeEl('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 0 #000;', this.hpBar);
    const enRow = this.makeEl('div', 'display:flex;align-items:center;gap:5px;', statusCol);
    this.makeEl('div', 'font-size:9px;color:#dfe8c8;width:24px;text-align:right;', enRow).textContent = '能量';
    this.enBar = this.makeEl('div', 'position:relative;flex:1;height:10px;background:#12283a;border:1px solid #2a5a7a;border-radius:2px;overflow:hidden;', enRow);
    this.enFill = this.makeEl('div', 'height:100%;width:100%;background:linear-gradient(90deg,#2a8ac8,#8ff0ff);', this.enBar);
    this.enText = this.makeEl('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 0 #000;', this.enBar);

    // 顶部关卡 / Boss
    this.levelText = this.makeEl('div', 'position:absolute;font-size:16px;font-weight:700;color:#ffe9a8;text-shadow:0 2px 0 #000;', this.hud);
    this.levelSub = this.makeEl('div', 'position:absolute;font-size:10px;color:#a9bd8f;text-shadow:0 2px 0 #000;', this.hud);
    this.bossText = this.makeEl('div', 'position:absolute;font-size:12px;font-weight:700;color:#ff9a6a;text-shadow:0 2px 0 #000;', this.hud);

    // 左下武器
    this.weaponPanel = this.makeEl('div', [
      'position:absolute', 'box-sizing:border-box', 'padding:6px 10px',
      'display:flex', 'align-items:center', 'gap:8px',
      'background:rgba(20,30,16,.95)', 'border:2px solid #6f8a5a',
      'border-radius:6px', 'pointer-events:none',
      'box-shadow:inset 0 0 0 2px rgba(75,107,62,.4)',
    ].join(';'), this.hud);
    this.weaponIcon = this.makeEl('img', [
      'width:34px', 'height:24px', 'object-fit:contain', 'image-rendering:pixelated',
    ].join(';'), this.weaponPanel);
    const weaponCol = this.makeEl('div', 'display:flex;flex-direction:column;gap:1px;', this.weaponPanel);
    this.weaponText = this.makeEl('div', 'font-size:12px;color:#dfe8c8;white-space:nowrap;', weaponCol);
    this.weaponText.textContent = '手枪';
    this.weaponSub = this.makeEl('div', 'font-size:8px;color:#93a97d;white-space:nowrap;', weaponCol);
    this.weaponSub.textContent = '无限弹药';

    // 右下操作区
    this.ctrlPanel = this.makeEl('div', [
      'position:absolute', 'box-sizing:border-box', 'border-radius:8px',
      'background:rgba(12,18,10,.72)', 'border:1px solid rgba(217,180,90,.55)',
      'pointer-events:none',
    ].join(';'), this.hud);
    this.btnSwitch = this.makeButton('切枪', () => this.sendAction('switch'));
    this.btnSkill = this.makeButton('技能', () => this.sendAction('skill'), 'flame_icon', true);
    this.btnFire = this.makeButton('射击', null, 'gun', true);
    this.btnDash = this.makeButton('翻滚', () => this.sendAction('dash'));
    this.btnExit = this.makeButton('退出', () => this.exitToMenu());
    this.bindFireButton(this.btnFire);
    this.btnSkill.style.borderRadius = '50%';
    this.btnFire.style.borderRadius = '50%';
    this.btnSkill.style.boxShadow = 'inset 0 0 0 3px rgba(75,107,62,.55),0 2px 0 #0a1208';
    this.btnFire.style.boxShadow = 'inset 0 0 0 3px rgba(75,107,62,.55),0 2px 0 #0a1208';

    this.btnPause = this.makeButton('暂停', () => this.showGuestMenu());
    this.btnBestiary = this.makeButton('图鉴', () => this.openGuestModal('Bestiary'));
    this.btnWeapon = this.makeButton('武器', () => this.openGuestModal('Forge'));
    this.btnUpgrade = this.makeButton('升级', () => this.showToast('联机中角色升级请回主菜单', '#ffd0a0'));
    this.btnBag = this.makeButton('背包', () => this.openGuestModal('Inventory'));

    this.connection = this.makeEl('div', [
      'position:absolute', 'font-size:10px;color:#9fe8ff',
      'text-shadow:0 2px 0 #000;white-space:nowrap;',
    ].join(';'), this.hud);
    this.connection.textContent = `联机合作 · 房间 ${Net.code || ''}`;
    this.statusText = this.makeEl('div', [
      'position:absolute', 'font-size:10px;color:#a9bd8f',
      'text-shadow:0 2px 0 #000;white-space:nowrap;',
    ].join(';'), this.hud);
    this.statusText.textContent = '已连接';

    this.helpText = this.makeEl('div', [
      'position:absolute', 'font-size:10px;color:#b9cba0',
      'text-shadow:0 2px 0 #000;white-space:nowrap;',
    ].join(';'), this.hud);
    this.helpText.textContent = '左半屏移动 · 右半屏瞄准开火 · E 技能 · 空格翻滚 · Q 切枪';
  }

  makeButton(label, action, iconKey, big) {
    const b = document.createElement('button');
    b.style.cssText = [
      'position:absolute', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center', 'gap:1px',
      'box-sizing:border-box', 'border:2px solid #d9b45a',
      'background:radial-gradient(circle at 50% 35%,#3d5a30,#1a2a15 75%)',
      'color:#ffe9a8', big ? 'font-size:11px' : 'font-size:12px',
      'font-weight:700', 'border-radius:8px', 'padding:2px 4px',
      'touch-action:none', 'pointer-events:auto', 'white-space:nowrap',
      'box-shadow:inset 0 0 0 2px rgba(75,107,62,.55),0 2px 0 #0a1208',
    ].join(';');
    let icon = null;
    if (iconKey) {
      icon = this.makeEl('img', [
        'width:26px', 'height:26px', 'object-fit:contain',
        'image-rendering:pixelated', 'pointer-events:none',
      ].join(';'), b);
      const url = this.textureURL(iconKey);
      if (url) icon.src = url;
    }
    const labelEl = this.makeEl('span', 'pointer-events:none;line-height:1;', b);
    labelEl.textContent = label;
    b.labelEl = labelEl;
    b.iconEl = icon;
    if (action) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      });
    }
    this.hud.appendChild(b);
    return b;
  }

  textureURL(key) {
    if (!key) return null;
    if (!this.iconUrls) this.iconUrls = {};
    if (this.iconUrls[key] !== undefined) return this.iconUrls[key];
    try {
      const tex = this.textures.get(key);
      const src = tex && tex.getSourceImage && tex.getSourceImage();
      const url = src && src.toDataURL ? src.toDataURL() : null;
      this.iconUrls[key] = url;
      return url;
    } catch (e) {
      this.iconUrls[key] = null;
      return null;
    }
  }

  bindFireButton(b) {
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.fire = false;
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.fire = true;
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.fire = false; });
  }

  layoutHud() {
    if (!this.game || !this.game.canvas) return;
    const r = this.game.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.canvasRect = r;
    const sx = r.width / 960;
    const sy = r.height / 540;
    const place = (el, x, y, w, h) => {
      if (!el) return;
      el.style.left = `${r.left + x * sx}px`;
      el.style.top = `${r.top + y * sy}px`;
      if (w != null) el.style.width = `${w * sx}px`;
      if (h != null) el.style.height = `${h * sy}px`;
    };
    place(this.hpPanel, 12, 10, 306, 80);
    place(this.levelText, 380, 14, 200, 24);
    place(this.levelSub, 380, 38, 200, 16);
    place(this.bossText, 360, 58, 240, 18);
    place(this.weaponPanel, 10, 484, 260, 46);
    place(this.ctrlPanel, 0, 0, 0, 0);
    place(this.btnSwitch, 728, 410, 58, 34);
    place(this.btnSkill, 806, 410, 78, 78);
    place(this.btnFire, 884, 410, 84, 84);
    place(this.btnDash, 884, 492, 64, 28);
    place(this.btnExit, 660, 492, 64, 28);
    place(this.btnPause, 895, 76, 54, 32);
    place(this.btnBestiary, 895, 124, 54, 32);
    place(this.btnWeapon, 895, 172, 54, 32);
    place(this.btnUpgrade, 895, 220, 54, 32);
    place(this.btnBag, 895, 268, 54, 32);
    place(this.connection, 400, 464, 200, 16);
    place(this.statusText, 400, 480, 200, 16);
    place(this.helpText, 290, 514, 380, 16);
    this.updateTextAlign();
  }

  updateTextAlign() {
    [this.levelText, this.levelSub, this.bossText, this.connection, this.statusText, this.helpText]
      .forEach((el) => { if (el) el.style.transform = 'translateX(0)'; });
    [this.levelText, this.levelSub, this.bossText, this.connection, this.statusText, this.helpText]
      .forEach((el) => { if (el) { el.style.paddingLeft = '0'; } });
    // 这些元素宽度已经按游戏坐标换算，用 text-align 居中
    [this.levelText, this.levelSub, this.bossText, this.connection, this.statusText, this.helpText]
      .forEach((el) => { if (el) el.style.textAlign = 'center'; });
  }

  // ------------------------------------------------------------ 输入

  attachPointer() {
    const mapPoint = (clientX, clientY) => {
      const r = this.canvasRect || this.game.canvas.getBoundingClientRect();
      const sx = r.width / 960;
      const sy = r.height / 540;
      return {
        x: Math.max(0, Math.min(960, (clientX - r.left) / sx)),
        y: Math.max(0, Math.min(540, (clientY - r.top) / sy)),
        left: clientX - r.left,
        top: clientY - r.top,
        width: r.width,
      };
    };
    this.touchLayer.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.tagName === 'BUTTON') return;
      const pt = mapPoint(e.clientX, e.clientY);
      if (e.pointerType === 'touch') {
        if (pt.left < pt.width / 2) {
          this.moveTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0, gx: pt.x, gy: pt.y };
        } else {
          this.aimTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0, gx: pt.x, gy: pt.y };
          this.fire = true;
          this.aimX = pt.x;
          this.aimY = pt.y;
          this.aimSet = true;
        }
      } else {
        this.fire = true;
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
      }
      this.drawSticks();
      e.preventDefault();
    });
    this.touchLayer.addEventListener('pointermove', (e) => {
      const pt = mapPoint(e.clientX, e.clientY);
      if (this.moveTouch && this.moveTouch.id === e.pointerId) {
        this.moveTouch.dx = e.clientX - this.moveTouch.baseX;
        this.moveTouch.dy = e.clientY - this.moveTouch.baseY;
      }
      if (this.aimTouch && this.aimTouch.id === e.pointerId) {
        this.aimTouch.dx = e.clientX - this.aimTouch.baseX;
        this.aimTouch.dy = e.clientY - this.aimTouch.baseY;
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
        this.fire = true;
      } else if (e.pointerType !== 'touch') {
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
      }
      this.drawSticks();
    });
    const release = (e) => {
      if (this.moveTouch && this.moveTouch.id === e.pointerId) this.moveTouch = null;
      if (this.aimTouch && this.aimTouch.id === e.pointerId) {
        this.aimTouch = null;
        this.fire = false;
      } else if (e.pointerType !== 'touch') {
        this.fire = false;
      }
      this.drawSticks();
    };
    this.touchLayer.addEventListener('pointerup', release);
    this.touchLayer.addEventListener('pointercancel', release);
    this.touchLayer.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') this.fire = false;
    });
    this.touchLayer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindInputs() {
    this.attachPointer();
    this.setupRemotePointer();
    window.addEventListener('keydown', this.onKeyDown = (e) => {
      const k = e.code;
      this.keys[k] = true;
      if (k === 'KeyE') this.sendAction('skill');
      if (k === 'Space') { e.preventDefault(); this.sendAction('dash'); }
      if (k === 'KeyQ') this.sendAction('switch');
      if (k === 'Escape') this.exitToMenu();
    });
    window.addEventListener('keyup', this.onKeyUp = (e) => { this.keys[e.code] = false; });
  }

  isUiZone(x, y) {
    return (x > 888 && y > 58 && y < 320)
      || (x > 688 && y > 360 && y < 532)
      || (x > 620 && y > 470 && x < 700);
  }

  handleUiPress(x, y, pointerId) {
    if (x > 895 && x < 949) {
      if (y > 76 && y < 108) { this.showGuestMenu(); return true; }
      if (y > 124 && y < 156) { this.openGuestModal('Bestiary'); return true; }
      if (y > 172 && y < 204) { this.openGuestModal('Forge'); return true; }
      if (y > 220 && y < 252) { this.showToast('联机中角色升级请回主菜单', '#ffd0a0'); return true; }
      if (y > 268 && y < 300) { this.openGuestModal('Inventory'); return true; }
    }
    if (x > 699 && x < 757 && y > 393 && y < 427) { this.sendAction('switch'); return true; }
    if (x > 767 && x < 845 && y > 371 && y < 449) { this.sendAction('skill'); return true; }
    if (x > 845 && x < 923 && y > 371 && y < 449) {
      this.fire = true;
      this.uiFirePointer = pointerId;
      return true;
    }
    if (x > 852 && x < 916 && y > 478 && y < 506) { this.sendAction('dash'); return true; }
    if (x > 628 && x < 692 && y > 478 && y < 506) { this.exitToMenu(); return true; }
    return false;
  }

  setupRemotePointer() {
    const touchInfo = (pointer) => !!(pointer.wasTouch || (pointer.event && pointer.event.pointerType === 'touch'));
    this.input.on('pointerdown', (pointer) => {
      if (this.ended || this.uiModalOpen || this.menuEl) return;
      const x = pointer.x, y = pointer.y;
      if (this.handleUiPress(x, y, pointer.id)) return;
      if (touchInfo(pointer)) {
        if (x < 480) {
          this.moveTouch = { id: pointer.id, gx: x, gy: y, dx: 0, dy: 0 };
        } else {
          this.aimTouch = { id: pointer.id, gx: x, gy: y, dx: 0, dy: 0 };
          this.fire = true;
          this.aimX = x; this.aimY = y; this.aimSet = true;
        }
      } else {
        this.fire = true;
        this.aimX = x; this.aimY = y; this.aimSet = true;
      }
      this.drawSticks();
    });
    this.input.on('pointermove', (pointer) => {
      const x = pointer.x, y = pointer.y;
      if (this.moveTouch && this.moveTouch.id === pointer.id) {
        this.moveTouch.dx = x - this.moveTouch.gx;
        this.moveTouch.dy = y - this.moveTouch.gy;
      }
      if (this.aimTouch && this.aimTouch.id === pointer.id) {
        this.aimTouch.dx = x - this.aimTouch.gx;
        this.aimTouch.dy = y - this.aimTouch.gy;
        this.aimX = x; this.aimY = y; this.aimSet = true; this.fire = true;
      } else if (!touchInfo(pointer)) {
        this.aimX = x; this.aimY = y; this.aimSet = true;
      }
      this.drawSticks();
    });
    const release = (pointer) => {
      if (this.moveTouch && this.moveTouch.id === pointer.id) this.moveTouch = null;
      if (this.aimTouch && this.aimTouch.id === pointer.id) {
        this.aimTouch = null;
        this.fire = false;
      } else if (!touchInfo(pointer)) {
        this.fire = false;
      }
      if (this.uiFirePointer === pointer.id) {
        this.uiFirePointer = null;
        this.fire = false;
      }
      this.drawSticks();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  drawSticks() {
    if (!this.stickG) return;
    this.stickG.clear();
    const draw = (touch, color) => {
      if (!touch) return;
      const dx = touch.dx || 0;
      const dy = touch.dy || 0;
      const max = 36;
      const len = Math.hypot(dx, dy);
      const k = len > max ? max / len : 1;
      const kx = touch.gx + dx * k;
      const ky = touch.gy + dy * k;
      this.stickG.lineStyle(3, color, 0.55);
      this.stickG.strokeCircle(touch.gx, touch.gy, 38);
      this.stickG.fillStyle(color, 0.18);
      this.stickG.fillCircle(touch.gx, touch.gy, 38);
      this.stickG.fillStyle(color, 0.6);
      this.stickG.fillCircle(kx, ky, 16);
      this.stickG.lineStyle(2, 0xffffff, 0.5);
      this.stickG.strokeCircle(kx, ky, 16);
    };
    draw(this.moveTouch, 0x9fe8ff);
    draw(this.aimTouch, 0xffd76a);
  }

  showToast(text, color) {
    if (!this.toastEl) {
      this.toastEl = this.makeEl('div', [
        'position:fixed', 'left:50%', 'bottom:20%', 'transform:translateX(-50%)',
        'padding:8px 16px', 'border-radius:6px', 'background:rgba(15,23,12,.95)',
        'border:2px solid #d9b45a', 'font-size:13px;font-weight:700;',
        'color:#ffe9a8;pointer-events:none;z-index:970;white-space:nowrap;',
        'font-family:"Microsoft YaHei","PingFang SC",sans-serif',
      ].join(';'));
      document.body.appendChild(this.toastEl);
    }
    this.toastEl.textContent = text;
    this.toastEl.style.color = color || '#ffe9a8';
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.toastEl) this.toastEl.style.opacity = '0';
    }, 1600);
  }

  openGuestModal(key) {
    if (this.uiModalOpen) return;
    this.uiModalOpen = true;
    this.fire = false;
    if (this.hud) this.hud.style.display = 'none';
    if (this.touchLayer) this.touchLayer.style.display = 'none';
    this.scene.launch(key, { from: 'guest' });
    this.modalCheck = setInterval(() => {
      if (!this.scene.isActive(key)) {
        clearInterval(this.modalCheck);
        this.modalCheck = null;
        this.uiModalOpen = false;
        if (this.hud) this.hud.style.display = this.domHudHidden ? 'none' : '';
        if (this.touchLayer) this.touchLayer.style.display = this.domHudHidden ? 'none' : '';
        this.layoutHud();
      }
    }, 200);
  }

  showGuestMenu() {
    if (this.menuEl) return;
    this.fire = false;
    const mask = this.makeEl('div', [
      'position:fixed', 'inset:0', 'z-index:960', 'background:rgba(4,8,4,.72)',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'gap:14px', 'pointer-events:auto',
      'font-family:"Microsoft YaHei","PingFang SC",sans-serif',
    ].join(';'));
    const title = this.makeEl('div', 'font-size:24px;color:#ffe9a8;font-weight:700;', mask);
    title.textContent = '联机菜单';
    const note = this.makeEl('div', 'font-size:11px;color:#a9bd8f;', mask);
    note.textContent = '房主的游戏不会暂停';
    const resume = this.makeEl('button', 'min-width:180px;height:44px;border:2px solid #d9b45a;background:#23301f;color:#ffe9a8;font-size:16px;font-weight:700;border-radius:4px;', mask);
    resume.textContent = '继续游戏';
    resume.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.closeGuestMenu(); });
    const exit = this.makeEl('button', 'min-width:180px;height:44px;border:2px solid #a85a4a;background:#2a1712;color:#ffb09a;font-size:15px;border-radius:4px;', mask);
    exit.textContent = '退出联机';
    exit.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.exitToMenu(); });
    document.body.appendChild(mask);
    this.menuEl = mask;
  }

  closeGuestMenu() {
    if (this.menuEl) this.menuEl.remove();
    this.menuEl = null;
  }

  sendInput() {
    if (this.ended) return;
    if (this.uiModalOpen || this.menuEl) {
      Net.send({ t: 'input', moveX: 0, moveY: 0, fire: false, aimX: null, aimY: null });
      return;
    }
    let mx = 0, my = 0;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.moveTouch) {
      mx = this.moveTouch.dx / 60;
      my = this.moveTouch.dy / 60;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    Net.send({
      t: 'input',
      moveX: mx,
      moveY: my,
      fire: !!this.fire,
      aimX: this.aimSet ? this.aimX : null,
      aimY: this.aimSet ? this.aimY : null,
    });
  }

  sendAction(key) {
    if (this.ended) return;
    Net.send({ t: 'action', key });
    if (key === 'skill' && (!this.state || !this.state.gs || !this.state.gs.cd)) {
      this.playLocalSkill();
    }
  }

  playLocalSkill() {
    const char = (this.state && this.state.g && this.state.g.character) || 'gunner';
    const colors = {
      gunner: 0xff9a3a, swordsman: 0xbfe8ff, frankenstein: 0x7dff5a,
      mage: 0xb07bff, guitarist: 0xd96a9a, demon: 0xff5a3a,
      vampire: 0xd92a3a, knight: 0xfff2c8, ranger: 0x8ff0b0,
      rogue: 0xff4a6a, alchemist: 0x7ad9a0,
    };
    const color = colors[char] || 0x9fe8ff;
    const x = this.predX;
    const y = this.predY;
    if (char === 'mage') {
      const aim = this.aimSet ? Math.atan2((this.aimY || 0) - y, (this.aimX || 0) - x) : (this.state.g.aim || 0);
      const glow = this.add.rectangle(x, y - 6, 560, 24, color, 0.3)
        .setOrigin(0, 0.5).setRotation(aim).setBlendMode(Phaser.BlendModes.ADD).setDepth(829);
      const core = this.add.rectangle(x, y - 6, 560, 8, 0xffffff, 0.95)
        .setOrigin(0, 0.5).setRotation(aim).setBlendMode(Phaser.BlendModes.ADD).setDepth(830);
      this.localBeam = { glow, core };
      this.tweens.add({
        targets: [glow, core], alpha: 0, duration: 1700, ease: 'Sine.In',
        onComplete: () => {
          if (this.localBeam && this.localBeam.glow === glow) this.localBeam = null;
          glow.destroy(); core.destroy();
        },
      });
    } else if (char === 'vampire') {
      const aura = this.add.image(x, y, 'ring').setTint(0xff3a4a)
        .setScale(0.5).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(829);
      this.localAura = aura;
      this.localVampireUntil = this.time.now + 5000;
      this.tweens.add({
        targets: aura, scale: 2.0, alpha: 0.25, duration: 650,
        yoyo: true, repeat: 5,
      });
      this.time.delayedCall(5000, () => {
        if (this.localAura === aura) this.localAura = null;
        this.localVampireUntil = 0;
        if (this.localVampireG) this.localVampireG.clear();
        if (aura.active) aura.destroy();
      });
    } else if (char === 'guitarist' || char === 'knight' || char === 'demon') {
      const aura = this.add.image(x, y, 'ring').setTint(color)
        .setScale(0.4).setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD).setDepth(829);
      this.localAura = aura;
      this.tweens.add({ targets: aura, scale: 1.8, alpha: 0.2, duration: 500, yoyo: true, repeat: 5 });
      this.time.delayedCall(3200, () => {
        if (this.localAura === aura) this.localAura = null;
        if (aura.active) aura.destroy();
      });
    } else {
      const ring = this.add.image(x, y, 'ring').setTint(color)
        .setScale(0.2).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(830);
      this.tweens.add({
        targets: ring, scale: 1.8, alpha: 0, duration: 360,
        onComplete: () => ring.destroy(),
      });
    }
  }

  // ------------------------------------------------------------ 状态渲染

  mapTexture(map) {
    if (!map || map === 'grass' || map === 'endless') return 'ground';
    const key = `ground_${map}`;
    return this.textures.exists(key) ? key : 'ground';
  }

  launchHud() {
    if (this.uiLaunched || this.ended) return;
    this.uiLaunched = true;
    this.domHudHidden = true;
    if (this.hud) this.hud.style.display = 'none';
    if (this.touchLayer) this.touchLayer.style.display = 'none';
    this.scene.launch('UI');
    this.scene.bringToTop('UI');
    this.time.delayedCall(80, () => {
      const ui = this.scene.get('UI');
      if (ui && ui.input) ui.input.enabled = false;
    });
  }

  activateSkill() { this.sendAction('skill'); }
  switchWeapon() { this.sendAction('switch'); }
  setTouchFire(active) { this.fire = !!active; }
  openPause() { this.showGuestMenu(); }
  collectTreasure() { this.showToast('联机取财请让房主操作', '#ffd0a0'); }

  updateHudModel(d) {
    const g = d.g || {};
    this.player.hp = g.hp || 0;
    this.player.maxHp = Math.max(1, g.maxHp || 1);
    this.player.energy = g.energy || 0;
    this.player.maxEnergy = Math.max(1, g.maxEnergy || 1);
    this.player.isDead = !!g.dead;
    this.characterId = g.character || this.characterId;
    if (d.gs && d.gs.weaponId && WEAPONS[d.gs.weaponId]) {
      this.weaponId = d.gs.weaponId;
      this.weapon = WEAPONS[d.gs.weaponId];
    }
    if (d.gs) {
      this.skill.cooldown = d.gs.total || 12000;
      this.skill.cooldownUntil = this.time.now + (d.gs.cd || 0) * 1000;
      this.skill.active = false;
    }
    this.remoteBosses = (d.enemies || []).filter((e) => e.boss).map((e) => ({
      isBoss: true, active: true, dying: false,
      bossName: e.name, hp: e.hp, maxHp: e.maxHp, x: e.x, y: e.y,
    }));
    this.boss = this.remoteBosses[0] || null;
    this.hostDowned = !!d.hostDowned;
    this.reviveWho = d.reviveWho || null;
    this.reviveProgress = d.reviveProgress || 0;
    this.round = d.round || 1;
    this.stage = d.stage || 1;
    this.endless = !!d.endless;
    this.endlessWave = d.endlessWave || 1;
    this.demonRealm = d.map === 'demon_realm';
    this.mapName = d.mapName || '草原';
  }

  applyState(d) {
    if (!d || this.ended) return;
    this.state = d;
    this.updateHudModel(d);
    const tex = this.mapTexture(d.map);
    if (this.bg.texture.key !== tex) this.bg.setTexture(tex);
    this.applyPlayer(this.hostSprite, this.hostTag, d.p, false);
    this.applyPlayer(this.guestSprite, this.guestTag, d.g, true);
    this.applyEnemies(d.enemies || []);
    this.applyMercenary(d.merc);
    this.applyMerchant(d.merchant);
    this.applyGhostBaby(d.ghostBaby);
    this.updatePool(this.pbSprites, d.pb || [], 'bullet', 690);
    this.updatePool(this.ebSprites, d.eb || [], 'orb', 692);
    this.updatePickups(d);
    if (d.portal) {
      this.portalA.setVisible(true).setPosition(d.portal.x, d.portal.y);
      this.portalB.setVisible(true).setPosition(d.portal.x, d.portal.y);
    } else {
      this.portalA.setVisible(false);
      this.portalB.setVisible(false);
    }
    if (this.poisonG) {
      this.poisonG.clear();
      (d.pools || []).forEach((p) => {
        this.poisonG.fillStyle(0x3a9a5a, 0.16);
        this.poisonG.fillCircle(p.x, p.y, p.r);
        this.poisonG.lineStyle(2, 0x7ad9a0, 0.6);
        this.poisonG.strokeCircle(p.x, p.y, p.r);
      });
    }
    if (this.syncBeamsG) {
      this.syncBeamsG.clear();
      (d.beams || []).forEach((b) => {
        this.syncBeamsG.lineStyle(b.w, b.c, b.a);
        this.syncBeamsG.lineBetween(b.x1, b.y1, b.x2, b.y2);
      });
    }
    this.updateSwords(d.swords || []);
    this.drawHostSkill(d);
    this.updateHud(d);
    if (d.fx && d.fx.length) this.playFx(d.fx);
  }

  updateSwords(list) {
    for (let i = 0; i < list.length; i++) {
      let img = this.swordSprites[i];
      if (!img) {
        img = this.add.image(0, 0, 'sword').setDepth(820).setBlendMode(Phaser.BlendModes.ADD);
        this.swordSprites[i] = img;
      }
      img.setVisible(true).setPosition(list[i].x, list[i].y).setRotation(list[i].r);
    }
    for (let i = list.length; i < this.swordSprites.length; i++) this.swordSprites[i].setVisible(false);
  }

  drawHostSkill(d) {
    const skill = d.hostSkill;
    const beam = d.hostBeam;
    let b = beam;
    if (!b && skill && skill.type === 'mage') {
      b = { kind: 'mage', x: d.p.x, y: d.p.y - 5, angle: d.p.aim || 0,
        len: 700, width: 640, height: 26, core: 8,
        color: 0xb07bff, mid: 0xd8b8ff, coreColor: 0xffffff };
    }
    if (!b) {
      if (this.hostBeamObjs) this.hostBeamObjs.forEach((o) => o.setVisible(false));
    } else {
      if (!this.hostBeamObjs) {
        this.hostBeamObjs = [
          this.add.rectangle(0, 0, 10, 10, 0xff0000, 0.4).setOrigin(0, 0.5).setDepth(736),
          this.add.rectangle(0, 0, 10, 10, 0xff0000, 0.6).setOrigin(0, 0.5).setDepth(737),
          this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.95).setOrigin(0, 0.5).setDepth(738),
        ];
        this.hostBeamObjs[0].setBlendMode(b.kind === 'sulfur' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        this.hostBeamObjs[1].setBlendMode(Phaser.BlendModes.ADD);
        this.hostBeamObjs[2].setBlendMode(Phaser.BlendModes.ADD);
      }
      const [glow, mid, core] = this.hostBeamObjs;
      glow.setVisible(true).setPosition(b.x, b.y).setRotation(b.angle)
        .setFillStyle(b.color == null ? 0xff2a1a : b.color, b.kind === 'sulfur' ? 0.5 : 0.3)
        .setDisplaySize(b.width, b.height);
      mid.setVisible(true).setPosition(b.x, b.y).setRotation(b.angle)
        .setFillStyle(b.mid == null ? 0xff8a2a : b.mid, 0.55)
        .setDisplaySize(b.width, (b.height + b.core) * 0.5);
      core.setVisible(true).setPosition(b.x, b.y).setRotation(b.angle)
        .setFillStyle(b.coreColor == null ? 0xffffff : b.coreColor, 0.95)
        .setDisplaySize(b.width, b.core);
    }
    let auraColor = 0;
    if (skill) {
      auraColor = { mage: 0xb07bff, guitarist: 0xd96a9a, vampire: 0xd92a3a,
        demon: 0xff5a3a, knight: 0xfff2c8, frankenstein: 0x7dff5a }[skill.type] || 0;
    }
    if (!auraColor && d.hostShield > 0) auraColor = 0x7dffb0;
    if (auraColor) {
      this.hostAura.setVisible(true).setTint(auraColor)
        .setPosition(this.hostSprite.x, this.hostSprite.y)
        .setScale(1.4);
    } else {
      this.hostAura.setVisible(false);
    }
  }

  playFx(list) {
    list.forEach((fx) => {
      if (fx.k === 'hit') {
        const p = Math.min(5, fx.p || 0);
        const color = fx.c == null ? 0xffe066 : fx.c;
        this.sparks.explode(3 + p, fx.x, fx.y);
        const ring = this.add.image(fx.x, fx.y, 'ring').setTint(color)
          .setScale(0.12 + p * 0.02).setAlpha(0.8)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(821);
        this.tweens.add({
          targets: ring, scale: 0.4 + p * 0.08, alpha: 0,
          duration: 200, onComplete: () => ring.destroy(),
        });
      } else if (fx.k === 'ring') {
        const img = this.add.image(fx.x, fx.y, 'ring').setTint(fx.c == null ? 0xffe066 : fx.c)
          .setScale(fx.s || 0.2).setAlpha(fx.a == null ? 0.8 : fx.a)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(821);
        this.tweens.add({
          targets: img, scale: fx.e || 1.2, alpha: 0, duration: fx.d || 300,
          onComplete: () => img.destroy(),
        });
      } else if (fx.k === 'muzzle') {
        const m = this.add.image(fx.x, fx.y, 'muzzle').setRotation(fx.r || 0)
          .setTint(fx.c == null ? 0xffe066 : fx.c)
          .setScale(0.6).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(820);
        this.tweens.add({ targets: m, alpha: 0, scale: 1.05, duration: 90, onComplete: () => m.destroy() });
      } else if (fx.k === 'death') {
        this.goo.explode(fx.t === 'bat' ? 10 : 15, fx.x, fx.y);
        this.sparks.explode(6, fx.x, fx.y);
        const ring = this.add.image(fx.x, fx.y, 'ring').setTint(0x9ff0a8)
          .setScale(0.12).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(821);
        this.tweens.add({ targets: ring, scale: 1.0, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      } else if (fx.k === 'text') {
        const t = this.add.text(fx.x, fx.y, fx.t, UI.textStyle(15, {
          color: fx.c || '#ffe9a8', strokeThickness: 3,
        })).setOrigin(0.5).setDepth(835);
        this.tweens.add({
          targets: t, y: fx.y - 34, alpha: 0, duration: 700,
          onComplete: () => t.destroy(),
        });
      } else if (fx.k === 'heal') {
        this.goo.explode(8, fx.x, fx.y);
        if (fx.n) {
          const t = this.add.text(fx.x, fx.y - 20, '+' + fx.n, UI.textStyle(15, {
            color: '#9ff0a8', strokeThickness: 3,
          })).setOrigin(0.5).setDepth(835);
          this.tweens.add({ targets: t, y: fx.y - 52, alpha: 0, duration: 600, onComplete: () => t.destroy() });
        }
      } else if (fx.k === 'telegraph') {
        const circle = this.add.circle(fx.x, fx.y, fx.rad, fx.c, 0.14).setDepth(3);
        const ring = this.add.image(fx.x, fx.y, 'ring').setTint(fx.c)
          .setScale(fx.rad / 48).setAlpha(0.9).setDepth(3);
        this.tweens.add({
          targets: [circle, ring], alpha: 0, duration: fx.d,
          onComplete: () => { circle.destroy(); ring.destroy(); },
        });
      } else if (fx.k === 'bossSlam' || fx.k === 'bossDeath') {
        const big = fx.k === 'bossDeath';
        this.goo.explode(big ? 30 : 14, fx.x, fx.y);
        this.sparks.explode(big ? 24 : 8, fx.x, fx.y);
        for (let i = 0; i < (big ? 3 : 2); i++) {
          const ring = this.add.image(fx.x, fx.y, 'ring').setTint(i === 0 ? 0xffd76a : 0xff9a5a)
            .setScale(0.3 + i * 0.2).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(821);
          this.tweens.add({ targets: ring, scale: 2.2 + i * 0.5, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
        }
        this.cameras.main.shake(big ? 300 : 120, big ? 0.007 : 0.004);
      } else if (fx.k === 'kill') {
        this.goo.explode(fx.boss ? 24 : 12, fx.x, fx.y);
        this.sparks.explode(fx.boss ? 16 : 6, fx.x, fx.y);
        const ring = this.add.image(fx.x, fx.y, 'ring').setTint(0xffd76a)
          .setScale(0.15).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(821);
        this.tweens.add({
          targets: ring, scale: 1.4, alpha: 0, duration: 300,
          onComplete: () => ring.destroy(),
        });
        this.cameras.main.shake(fx.boss ? 120 : 45, fx.boss ? 0.003 : 0.001);
      }
    });
  }

  applyPlayer(sprite, tag, p, isGuest) {
    if (!p) return;
    if (p.anim && this.anims.exists(p.anim)) {
      if (!sprite.anims.isPlaying || !sprite.anims.currentAnim || sprite.anims.currentAnim.key !== p.anim) {
        sprite.play(p.anim, true);
      }
    } else {
      if (p.tex && this.textures.exists(p.tex) && sprite.texture.key !== p.tex) sprite.setTexture(p.tex);
      if (sprite.anims.isPlaying) sprite.anims.stop();
    }
    sprite.tx = p.x;
    sprite.ty = p.y;
    sprite.setFlipX(!!p.flip);
    sprite.setAlpha(p.dead ? 0.25 : 1);
    if (isGuest) sprite.setTint(p.dead ? 0x666666 : 0xbfe8ff);
    tag.setPosition(p.x, p.y - 34);
    tag.setText(isGuest ? (p.dead ? '玩家2 · 倒地' : '玩家2') : (p.dead ? '房主 · 倒地' : '房主'));
    tag.setAlpha(1);
    if (isGuest && this.guestGun) {
      const giant = p.tex && p.tex.indexOf('giant') >= 0;
      this.guestGun.setVisible(!p.dead && !giant);
      if (p.weaponTex && this.textures.exists(p.weaponTex)) this.guestGun.setTexture(p.weaponTex);
    } else if (this.hostGun) {
      this.hostGun.setVisible(!p.dead);
      if (p.weaponTex && this.textures.exists(p.weaponTex)) this.hostGun.setTexture(p.weaponTex);
    }
    if (isGuest && this.guestShieldAura) {
      this.guestShieldAura.setVisible((p.shield || 0) > 0)
        .setPosition(p.x, p.y)
        .setAlpha((p.shield || 0) > 0 ? 0.5 : 0);
    }
    if (isGuest) {
      const dx = p.x - this.predX;
      const dy = p.y - this.predY;
      if (!this.predReady || p.dead || dx * dx + dy * dy > 140 * 140) {
        this.predX = p.x;
        this.predY = p.y;
        this.predReady = true;
      } else {
        // 轻微向权威位置修正，避免长期偏离
        this.predX += dx * 0.08;
        this.predY += dy * 0.08;
      }
    }
  }

  applyGhostBaby(g) {
    if (!g) {
      this.ghostSprite.setVisible(false);
      return;
    }
    this.ghostSprite.setVisible(true).setPosition(g.x, g.y);
    this.ghostSprite.tx = g.x;
    this.ghostSprite.ty = g.y;
  }

  applyMerchant(m) {
    if (!m) {
      this.merchantSprite.setVisible(false);
      this.merchantTag.setVisible(false);
      return;
    }
    this.merchantSprite.setVisible(true);
    this.merchantSprite.tx = m.x;
    this.merchantSprite.ty = m.y;
    if (m.tex && this.textures.exists(m.tex) && this.merchantSprite.texture.key !== m.tex) {
      this.merchantSprite.setTexture(m.tex);
    }
    if (m.anim && this.anims.exists(m.anim)) {
      if (!this.merchantSprite.anims.isPlaying || !this.merchantSprite.anims.currentAnim
        || this.merchantSprite.anims.currentAnim.key !== m.anim) {
        this.merchantSprite.play(m.anim, true);
      }
    }
    this.merchantTag.setVisible(true);
  }

  applyMercenary(m) {
    if (!m) {
      this.mercSprite.setVisible(false);
      this.mercTag.setVisible(false);
      this.mercHpG.clear();
      return;
    }
    this.mercSprite.setVisible(true).setFlipX(!!m.flip);
    this.mercSprite.tx = m.x;
    this.mercSprite.ty = m.y;
    if (m.tex && this.textures.exists(m.tex) && this.mercSprite.texture.key !== m.tex) {
      this.mercSprite.setTexture(m.tex);
    }
    if (m.anim && this.anims.exists(m.anim)) {
      if (!this.mercSprite.anims.isPlaying || !this.mercSprite.anims.currentAnim
        || this.mercSprite.anims.currentAnim.key !== m.anim) {
        this.mercSprite.play(m.anim, true);
      }
    } else if (this.mercSprite.anims.isPlaying) {
      this.mercSprite.anims.stop();
    }
    this.mercTag.setVisible(true).setText(m.name || '佣兵');
    this.mercHp = m.hp;
    this.mercMaxHp = m.maxHp;
  }

  applyEnemies(list) {
    const seen = new Set();
    list.forEach((d) => {
      seen.add(d.id);
      let entry = this.enemyMap.get(d.id);
      if (!entry) {
        const tex = this.textures.exists(d.tex) ? d.tex : 'slime_0';
        const sprite = this.add.sprite(d.x, d.y, tex).setDepth(500);
        const poisonIcon = this.add.image(d.x, d.y - 42, 'skull').setTint(0x7ad9a0)
          .setScale(d.boss ? 0.55 : 0.24).setDepth(831).setVisible(false);
        const glow = (d.elite || d.boss) ? this.add.image(d.x, d.y, 'glow')
          .setTint(d.boss ? 0xfff2c8 : 0xffd76a)
          .setScale(d.boss ? 1.6 : 0.8)
          .setAlpha(d.boss ? 0.22 : 0.28)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(499) : null;
        entry = { sprite, poisonIcon, glow, id: d.id };
        this.enemyMap.set(d.id, entry);
      }
      const s = entry.sprite;
      if (d.anim && this.anims.exists(d.anim)) {
        if (!s.anims.isPlaying || !s.anims.currentAnim || s.anims.currentAnim.key !== d.anim) s.play(d.anim, true);
      } else if (d.tex && this.textures.exists(d.tex) && s.texture.key !== d.tex) {
        s.setTexture(d.tex);
      }
      s.tx = d.x;
      s.ty = d.y;
      s.setScale(d.scale || 1);
      s.setFlipX(!!d.flip);
      s.setAlpha(d.alpha == null ? 1 : d.alpha);
      s.setDepth(500 + Math.floor(d.y));
      if (entry.glow && entry.glow.active) {
        entry.glow.setPosition(d.x, d.y).setDepth(499);
      }
      if (d.poison) {
        s.setTint(0x9ff0b0);
        entry.poisonIcon.setVisible(true).setPosition(d.x, d.y - (d.boss ? 74 : 42));
      } else {
        entry.poisonIcon.setVisible(false);
        if (d.boss) s.setTint(0xfff2c8);
        else if (d.elite) s.setTint(0xffd76a);
        else if (s.isTinted) s.clearTint();
      }
      entry.meta = d;
      if (entry.lastHp != null && d.hp < entry.lastHp) {
        s.setTintFill(0xffffff);
        this.sparks.explode(2, d.x, d.y - 8);
        this.time.delayedCall(70, () => {
          if (s.active) this.applyEnemyTint(entry);
        });
      }
      entry.lastHp = d.hp;
    });
    this.enemyMap.forEach((entry, id) => {
      if (seen.has(id)) return;
      entry.sprite.destroy();
      if (entry.poisonIcon) entry.poisonIcon.destroy();
      if (entry.glow) entry.glow.destroy();
      this.enemyMap.delete(id);
    });
  }

  applyEnemyTint(entry) {
    if (!entry || !entry.sprite || !entry.sprite.active) return;
    const d = entry.meta || {};
    const s = entry.sprite;
    if (d.poison) s.setTint(0x9ff0b0);
    else if (d.boss) s.setTint(0xfff2c8);
    else if (d.elite) s.setTint(0xffd76a);
    else s.clearTint();
  }

  updatePool(pool, data, defaultTex, depth) {
    for (let i = 0; i < data.length; i++) {
      let img = pool[i];
      if (!img) {
        img = this.add.image(0, 0, defaultTex).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
        pool[i] = img;
      }
      const d = data[i];
      img.setVisible(true);
      img.setTexture(this.textures.exists(d.tex) ? d.tex : defaultTex);
      img.setPosition(d.x, d.y);
      img.vx = d.vx || 0;
      img.vy = d.vy || 0;
      img.setRotation(d.r || 0);
      img.setScale(d.s || 1);
      if (d.tint != null) img.setTint(d.tint);
      else img.clearTint();
      img.setAlpha(d.a == null ? 1 : d.a);
    }
    for (let i = data.length; i < pool.length; i++) pool[i].setVisible(false);
  }

  updatePickups(d) {
    this.layoutPickups(this.coinSprites, d.coins || [], 'coin_0', 1, null, 300);
    this.layoutPickups(this.hpSprites, d.hpacks || [], 'health_pack', 1, null, 300);
    this.layoutPickups(this.epSprites, d.epacks || [], 'energy_pack', 1, null, 300);
    const frags = (d.frags || []).map((f) => ({ x: f.x, y: f.y, tint: f.color }));
    this.layoutPickups(this.fragSprites, frags, 'fragment', 0.9, (item) => item.tint, 301);
  }

  layoutPickups(pool, data, tex, scale, tintFn, depth) {
    for (let i = 0; i < data.length; i++) {
      let img = pool[i];
      if (!img) {
        img = this.add.image(0, 0, tex).setDepth(depth).setScale(scale);
        pool[i] = img;
      }
      const d = data[i];
      img.setVisible(true).setPosition(d.x, d.y);
      img.vx = d.vx || 0;
      img.vy = d.vy || 0;
      if (tintFn) img.setTint(tintFn(d));
      else img.clearTint();
    }
    for (let i = data.length; i < pool.length; i++) pool[i].setVisible(false);
  }

  updateHud(d) {
    const g = d.g || {};
    const maxHp = Math.max(1, g.maxHp || 1);
    const maxEn = Math.max(1, g.maxEnergy || 1);
    this.hpFill.style.width = `${Math.max(0, Math.min(100, (g.hp || 0) / maxHp * 100))}%`;
    this.hpText.textContent = `${Math.ceil(g.hp || 0)} / ${Math.ceil(maxHp)}`;
    this.enFill.style.width = `${Math.max(0, Math.min(100, (g.energy || 0) / maxEn * 100))}%`;
    this.enText.textContent = `${Math.floor(g.energy || 0)} / ${Math.ceil(maxEn)}`;
    this.hudName.textContent = g.dead ? '玩家2 · 倒地' : '玩家2';
    this.hudStatus.textContent = g.dead
      ? (d.reviveWho === 'g' && d.reviveProgress > 0 ? `救援中 ${d.reviveProgress}%` : '等待救援')
      : ((g.shield || 0) > 0 ? `护盾 ${g.shield}` : '联机中');
    if (this.statusText) {
      this.statusText.textContent = d.paused ? '房主暂停 / 选择强化中' : '已连接';
    }
    this.weaponText.textContent = (d.gs && d.gs.weapon) || '手枪';
    if (this.weaponSub && d.gs) {
      const w = WEAPONS[d.gs.weaponId];
      if (w) {
        this.weaponSub.textContent = w.melee
          ? `近战 · ${w.energyCost || 0} 能量/次`
          : (w.charge ? `蓄力 · ${w.energyCost || 0} 能量/发`
            : (w.energyCost ? `无限弹药 · ${w.energyCost} 能量/发` : '无限弹药 · 不耗能量'));
      }
    }
    if (this.weaponIcon && d.gs && d.gs.weaponTex && this.weaponIcon.dataset.tex !== d.gs.weaponTex) {
      this.weaponIcon.dataset.tex = d.gs.weaponTex;
      const url = this.textureURL(d.gs.weaponTex);
      if (url) this.weaponIcon.src = url;
    }
    if (this.portraitImg && d.g && d.g.tex && this.portraitImg.dataset.tex !== d.g.tex) {
      this.portraitImg.dataset.tex = d.g.tex;
      const url = this.textureURL(d.g.tex);
      if (url) this.portraitImg.src = url;
    }
    if (this.btnSkill && d.gs && d.gs.skillTex && this.btnSkill.dataset.tex !== d.gs.skillTex) {
      this.btnSkill.dataset.tex = d.gs.skillTex;
      const url = this.textureURL(d.gs.skillTex);
      if (url && this.btnSkill.iconEl) this.btnSkill.iconEl.src = url;
    }
    if (this.hudName && d.g && d.g.character) {
      const def = CHAR_DEFS.find((x) => x.id === d.g.character);
      const lv = (d.gs && d.gs.level) || 0;
      this.hudName.textContent = `玩家2 · ${def ? def.name : ''} Lv.${lv}`;
    }
    if (g.dead) {
      this.helpText.textContent = '你倒下了 · 房主靠近并站立 4 秒可以救你';
    } else if (d.hostDowned) {
      this.helpText.textContent = d.reviveWho === 'p' && d.reviveProgress > 0
        ? `救援房主 ${d.reviveProgress}% · 继续站在房主身边`
        : '房主倒地 · 靠近房主站立 4 秒救援';
    } else {
      this.helpText.textContent = '左半屏移动 · 右半屏瞄准开火 · E 技能 · 空格翻滚 · Q 切枪';
    }
    this.levelText.textContent = d.endless ? `第 ${d.endlessWave || 1} 波` : `${d.round || 1}-${d.stage || 1}`;
    this.levelSub.textContent = d.endless ? '无尽挑战' : (d.mapName || '草原');
    const boss = (d.enemies || []).find((e) => e.boss);
    this.bossText.textContent = boss ? boss.name : '';
    const cd = (d.gs && d.gs.cd) || 0;
    if (this.btnSkill) {
      if (this.btnSkill.labelEl) this.btnSkill.labelEl.textContent = cd > 0 ? `${cd}s` : '技能';
      this.btnSkill.style.opacity = cd > 0 ? '0.5' : '1';
    }
  }

  readMove() {
    let mx = 0, my = 0;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.moveTouch) {
      mx = this.moveTouch.dx / 60;
      my = this.moveTouch.dy / 60;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    return { mx, my, len };
  }

  update(time, delta) {
    const lerp = (obj, tx, ty, k) => {
      if (!obj || tx == null) return;
      obj.x += (tx - obj.x) * k;
      obj.y += (ty - obj.y) * k;
    };
    const dt = Math.min(0.05, delta / 1000);
    const g = this.state && this.state.g;
    if (g && !g.dead && !this.ended) {
      const mv = this.readMove();
      const predSpeed = (this.state.gs && this.state.gs.speed) || BALANCE.playerSpeed;
      this.predX = Math.max(62, Math.min(898, this.predX + mv.mx * predSpeed * dt));
      this.predY = Math.max(78, Math.min(470, this.predY + mv.my * predSpeed * dt));
      this.guestSprite.setPosition(this.predX, this.predY);
      if (this.fire && time >= this.nextLocalMuzzle) {
        this.nextLocalMuzzle = time + 85;
        const aim = this.aimSet ? Math.atan2((this.aimY || 0) - this.predY, (this.aimX || 0) - this.predX) : (g.aim || 0);
        const mx = this.predX + Math.cos(aim) * 18;
        const my = this.predY + 4 + Math.sin(aim) * 12;
        const m = this.add.image(mx, my, 'muzzle').setRotation(aim).setTint(0xffe066)
          .setScale(0.6).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(831);
        this.tweens.add({
          targets: m, alpha: 0, scaleX: 1.05, scaleY: 1.05, duration: 90,
          onComplete: () => m.destroy(),
        });
      }
    } else {
      lerp(this.guestSprite, this.guestSprite.tx, this.guestSprite.ty, 0.35);
    }
    lerp(this.hostSprite, this.hostSprite.tx, this.hostSprite.ty, 0.35);
    if (this.ghostSprite && this.ghostSprite.visible) {
      lerp(this.ghostSprite, this.ghostSprite.tx, this.ghostSprite.ty, 0.3);
    }
    if (this.merchantSprite && this.merchantSprite.visible) {
      lerp(this.merchantSprite, this.merchantSprite.tx, this.merchantSprite.ty, 0.25);
      this.merchantSprite.setDepth(500 + Math.floor(this.merchantSprite.y));
      this.merchantTag.setPosition(this.merchantSprite.x, this.merchantSprite.y - 46);
    }
    if (this.mercSprite && this.mercSprite.visible) {
      lerp(this.mercSprite, this.mercSprite.tx, this.mercSprite.ty, 0.35);
      this.mercSprite.setDepth(500 + Math.floor(this.mercSprite.y));
      this.mercTag.setPosition(this.mercSprite.x, this.mercSprite.y - 46);
      this.mercHpG.clear();
      this.mercHpG.fillStyle(0x2a1a12, 0.9);
      this.mercHpG.fillRect(this.mercSprite.x - 22, this.mercSprite.y - 48, 44, 4);
      this.mercHpG.fillStyle(0x6fdd68, 1);
      this.mercHpG.fillRect(this.mercSprite.x - 21, this.mercSprite.y - 47,
        42 * Math.max(0, Math.min(1, (this.mercHp || 0) / Math.max(1, this.mercMaxHp || 1))), 2);
    }
    this.hostTag.setPosition(this.hostSprite.x, this.hostSprite.y - 34);
    this.guestTag.setPosition(this.guestSprite.x, this.guestSprite.y - 34);
    const placeGun = (gun, sprite, p) => {
      if (!gun || !p) return;
      const aim = p.aim || 0;
      const cos = Math.cos(aim);
      gun.setPosition(sprite.x + cos * 10, sprite.y + 5 + Math.sin(aim) * 8)
        .setRotation(aim).setFlipY(cos < 0)
        .setDepth(sprite.y + 21);
    };
    if (this.state) {
      placeGun(this.hostGun, this.hostSprite, this.state.p);
      placeGun(this.guestGun, this.guestSprite, this.state.g);
    }
    if (this.hostAura && this.hostAura.visible) {
      this.hostAura.setPosition(this.hostSprite.x, this.hostSprite.y)
        .setAlpha(0.35 + Math.sin(time * 0.012) * 0.15)
        .setScale(1.35 + Math.sin(time * 0.01) * 0.15);
    }
    if (this.localAura && this.localAura.active) {
      this.localAura.setPosition(this.guestSprite.x, this.guestSprite.y);
    }
    if (this.localVampireG) {
      this.localVampireG.clear();
      if (this.localVampireUntil > this.time.now && this.state && this.state.enemies) {
        const targets = this.state.enemies
          .filter((e) => e.active !== false && Math.hypot(e.x - this.guestSprite.x, e.y - this.guestSprite.y) < 300)
          .slice(0, 5);
        targets.forEach((e) => {
          this.localVampireG.lineStyle(3, 0xff3a4a, 0.55);
          this.localVampireG.lineBetween(this.guestSprite.x, this.guestSprite.y, e.x, e.y);
        });
      }
    }
    if (this.localBeam && this.localBeam.glow.active) {
      const aim = this.state && this.state.g ? (this.state.g.aim || 0) : 0;
      this.localBeam.glow.setPosition(this.guestSprite.x, this.guestSprite.y - 6).setRotation(aim);
      this.localBeam.core.setPosition(this.guestSprite.x, this.guestSprite.y - 6).setRotation(aim);
    }
    if (this.guestShieldAura && this.guestShieldAura.visible) {
      this.guestShieldAura.setPosition(this.guestSprite.x, this.guestSprite.y)
        .setAlpha(0.35 + Math.sin(time * 0.01) * 0.15);
    }
    this.enemyMap.forEach((entry) => {
      lerp(entry.sprite, entry.sprite.tx, entry.sprite.ty, 0.4);
      entry.sprite.setDepth(500 + Math.floor(entry.sprite.y));
      if (entry.poisonIcon && entry.poisonIcon.visible) {
        entry.poisonIcon.setPosition(entry.sprite.x, entry.sprite.y - (entry.meta && entry.meta.boss ? 74 : 42));
      }
    });
    if (this.poisonG && this.poisonG.active) {
      this.poisonG.setAlpha(0.75 + Math.sin(time * 0.006) * 0.2);
    }
    // 子弹/掉落物按速度在两次快照之间平滑移动，避免 30Hz 的跳格感
    const advance = (pool) => {
      pool.forEach((img) => {
        if (!img.visible) return;
        if (img.vx) img.x += img.vx * dt;
        if (img.vy) img.y += img.vy * dt;
      });
    };
    advance(this.pbSprites);
    advance(this.ebSprites);
    advance(this.coinSprites);
    advance(this.hpSprites);
    advance(this.epSprites);
    advance(this.fragSprites);
    if (this.portalA.visible) {
      this.portalA.rotation += 0.04;
      this.portalB.rotation -= 0.03;
    }
  }

  // ------------------------------------------------------------ 结束

  showGameOver(data) {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    this.ended = true;
    this.fire = false;
    Store.loseRingOnDeath();
    Store.save();
    const mask = this.makeEl('div', [
      'position:fixed', 'inset:0', 'z-index:960', 'background:rgba(4,8,4,.82)',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'gap:14px', 'pointer-events:auto',
      'font-family:"Microsoft YaHei","PingFang SC",sans-serif', 'color:#e8d9a8',
      'text-align:center',
    ].join(';'));
    const title = this.makeEl('div', 'font-size:36px;color:#ff9a8a;font-weight:700;text-shadow:0 3px 0 #000;', mask);
    title.textContent = '全队阵亡';
    const sub = this.makeEl('div', 'font-size:13px;color:#a9bd8f;', mask);
    sub.textContent = '联机模式 · 两名玩家都倒下了，本局结束';
    const stats = this.makeEl('div', 'font-size:15px;line-height:1.9;color:#dfe8c8;', mask);
    stats.textContent = [
      `到达关卡：${data.endless ? `无尽第 ${data.wave || 1} 波` : `${data.round || 1}-${data.stage || 1}`}`,
      `击杀数量：${data.kills || 0}`,
      `本局金币：+${data.runCoins || 0}`,
      `存活时间：${fmtTime(data.timeMs || 0)}`,
      `当前装备戒指已遗失`,
    ].join('\n');
    const b = this.makeEl('button', [
      'min-width:180px', 'height:46px', 'border:2px solid #d9b45a',
      'background:#23301f', 'color:#ffe9a8', 'font-size:16px',
      'font-weight:700', 'border-radius:4px', 'margin-top:8px',
    ].join(';'), mask);
    b.textContent = '返回主菜单';
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.exitToMenu();
    });
    document.body.appendChild(mask);
    this.endMask = mask;
  }

  showEnded(reason) {
    if (this.ended || this.gameOverShown) return;
    this.ended = true;
    this.fire = false;
    const mask = this.makeEl('div', [
      'position:fixed', 'inset:0', 'z-index:950', 'background:rgba(4,8,4,.72)',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'gap:16px', 'pointer-events:auto',
      'font-family:"Microsoft YaHei","PingFang SC",sans-serif',
    ].join(';'));
    const t = this.makeEl('div', 'font-size:22px;color:#ffb09a;font-weight:700;', mask);
    t.textContent = reason || '联机已结束';
    const b = this.makeEl('button', [
      'min-width:160px', 'height:44px', 'border:2px solid #d9b45a',
      'background:#23301f', 'color:#ffe9a8', 'font-size:16px',
      'font-weight:700', 'border-radius:4px',
    ].join(';'), mask);
    b.textContent = '返回主菜单';
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.exitToMenu();
    });
    document.body.appendChild(mask);
    this.endMask = mask;
  }

  exitToMenu() {
    if (this.closing) return;
    this.closing = true;
    Net.close();
    this.cleanup();
    this.scene.start('Menu');
  }

  cleanup() {
    if (this.inputTimer) {
      clearInterval(this.inputTimer);
      this.inputTimer = null;
    }
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('orientationchange', this.onResize);
    }
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onResize = null;
    Net.onState = null;
    Net.onWait = null;
    Net.onGameOver = null;
    Net.onEnded = null;
    Net.onHud = null;
    Net.onStream = null;
    if (this.uiLaunched) { try { this.scene.stop('UI'); } catch (e) {} }
    if (this.modalCheck) clearInterval(this.modalCheck);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastEl && this.toastEl.parentNode) this.toastEl.remove();
    if (this.menuEl && this.menuEl.parentNode) this.menuEl.remove();
    if (this.endMask && this.endMask.parentNode) this.endMask.remove();
    if (this.hud && this.hud.parentNode) this.hud.remove();
    if (this.touchLayer && this.touchLayer.parentNode) this.touchLayer.remove();
    this.endMask = null;
    this.hud = null;
    this.touchLayer = null;
    if (this.game && this.game.canvas) this.game.canvas.style.display = '';
  }
}
