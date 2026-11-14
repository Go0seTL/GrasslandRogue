class GuestScene extends Phaser.Scene {
  constructor() {
    super('Guest');
  }

  init(data) {
    this.characterId = (data && data.character) || Store.data.lastChar || 'gunner';
  }

  create() {
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

    this.portalA = this.add.image(0, 0, 'ring').setTint(0x7fe8ff).setAlpha(0.75)
      .setDepth(5).setVisible(false);
    this.portalB = this.add.image(0, 0, 'ring').setTint(0xbf7bff).setAlpha(0.5)
      .setScale(0.7).setDepth(5).setVisible(false);

    this.hostSprite = this.add.sprite(480, 405, 'player_idle').setDepth(700);
    this.guestSprite = this.add.sprite(480, 405, 'player_idle').setDepth(701).setTint(0xbfe8ff);
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
      'position:absolute', 'box-sizing:border-box', 'padding:8px 11px',
      'background:rgba(15,23,12,.93)', 'border:2px solid #d9b45a',
      'border-radius:6px', 'pointer-events:none', 'text-shadow:0 2px 0 #000',
    ].join(';'), this.hud);
    const head = this.makeEl('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;', this.hpPanel);
    this.hudName = this.makeEl('div', 'font-size:14px;font-weight:700;color:#9fe8ff;', head);
    this.hudName.textContent = '玩家2';
    this.hudStatus = this.makeEl('div', 'font-size:10px;color:#9fe8ff;', head);
    this.hudStatus.textContent = '联机中';
    this.hpBar = this.makeEl('div', 'position:relative;height:14px;background:#3a1616;border:1px solid #7a3a2a;border-radius:3px;overflow:hidden;margin-bottom:3px;', this.hpPanel);
    this.hpFill = this.makeEl('div', 'height:100%;width:100%;background:linear-gradient(90deg,#c83a2a,#ff7a5a);', this.hpBar);
    this.hpText = this.makeEl('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 0 #000;', this.hpBar);
    this.enBar = this.makeEl('div', 'position:relative;height:10px;background:#12283a;border:1px solid #2a5a7a;border-radius:3px;overflow:hidden;', this.hpPanel);
    this.enFill = this.makeEl('div', 'height:100%;width:100%;background:linear-gradient(90deg,#2a8ac8,#8ff0ff);', this.enBar);
    this.enText = this.makeEl('div', 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 0 #000;', this.enBar);

    // 顶部关卡 / Boss
    this.levelText = this.makeEl('div', 'position:absolute;font-size:16px;font-weight:700;color:#ffe9a8;text-shadow:0 2px 0 #000;', this.hud);
    this.levelSub = this.makeEl('div', 'position:absolute;font-size:10px;color:#a9bd8f;text-shadow:0 2px 0 #000;', this.hud);
    this.bossText = this.makeEl('div', 'position:absolute;font-size:12px;font-weight:700;color:#ff9a6a;text-shadow:0 2px 0 #000;', this.hud);

    // 左下武器
    this.weaponPanel = this.makeEl('div', [
      'position:absolute', 'box-sizing:border-box', 'padding:7px 11px',
      'background:rgba(15,23,12,.93)', 'border:2px solid #6f8a5a',
      'border-radius:6px', 'font-size:12px;color:#dfe8c8;pointer-events:none',
    ].join(';'), this.hud);
    this.weaponText = this.makeEl('div', '', this.weaponPanel);
    this.weaponText.textContent = '武器：手枪';

    // 右下操作区
    this.ctrlPanel = this.makeEl('div', [
      'position:absolute', 'box-sizing:border-box', 'border-radius:8px',
      'background:rgba(12,18,10,.72)', 'border:1px solid rgba(217,180,90,.55)',
      'pointer-events:none',
    ].join(';'), this.hud);
    this.btnSwitch = this.makeButton('切枪', () => this.sendAction('switch'));
    this.btnSkill = this.makeButton('技能', () => this.sendAction('skill'));
    this.btnFire = this.makeButton('开火', null);
    this.btnDash = this.makeButton('翻滚', () => this.sendAction('dash'));
    this.btnExit = this.makeButton('退出', () => this.exitToMenu());
    this.bindFireButton(this.btnFire);

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

  makeButton(label, action) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = [
      'position:absolute', 'display:flex', 'align-items:center', 'justify-content:center',
      'box-sizing:border-box', 'border:2px solid #d9b45a',
      'background:rgba(35,52,28,.96)', 'color:#ffe9a8', 'font-size:13px',
      'font-weight:700', 'border-radius:6px', 'padding:0 6px',
      'touch-action:none', 'pointer-events:auto', 'white-space:nowrap',
    ].join(';');
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
    place(this.hpPanel, 10, 10, 332, 78);
    place(this.levelText, 370, 14, 220, 24);
    place(this.levelSub, 370, 38, 220, 16);
    place(this.bossText, 360, 58, 240, 18);
    place(this.weaponPanel, 10, 486, 260, 42);
    place(this.ctrlPanel, 686, 374, 268, 126);
    place(this.btnSwitch, 696, 410, 62, 32);
    place(this.btnSkill, 766, 386, 82, 60);
    place(this.btnFire, 856, 382, 88, 68);
    place(this.btnDash, 856, 458, 88, 34);
    place(this.btnExit, 696, 452, 62, 34);
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
          this.moveTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0 };
        } else {
          this.aimTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0 };
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
    });
    const release = (e) => {
      if (this.moveTouch && this.moveTouch.id === e.pointerId) this.moveTouch = null;
      if (this.aimTouch && this.aimTouch.id === e.pointerId) {
        this.aimTouch = null;
        this.fire = false;
      } else if (e.pointerType !== 'touch') {
        this.fire = false;
      }
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

  sendInput() {
    if (this.ended) return;
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
  }

  // ------------------------------------------------------------ 状态渲染

  mapTexture(map) {
    if (!map || map === 'grass' || map === 'endless') return 'ground';
    const key = `ground_${map}`;
    return this.textures.exists(key) ? key : 'ground';
  }

  applyState(d) {
    if (!d || this.ended) return;
    this.state = d;
    if (this.statusText && this.statusText.textContent !== '已连接') this.statusText.textContent = '已连接';
    const tex = this.mapTexture(d.map);
    if (this.bg.texture.key !== tex) this.bg.setTexture(tex);
    this.applyPlayer(this.hostSprite, this.hostTag, d.p, false);
    this.applyPlayer(this.guestSprite, this.guestTag, d.g, true);
    this.applyEnemies(d.enemies || []);
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
    this.updateHud(d);
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
  }

  applyEnemies(list) {
    const seen = new Set();
    list.forEach((d) => {
      seen.add(d.id);
      let entry = this.enemyMap.get(d.id);
      if (!entry) {
        const tex = this.textures.exists(d.tex) ? d.tex : 'slime_0';
        const sprite = this.add.sprite(d.x, d.y, tex).setDepth(500);
        entry = { sprite, id: d.id };
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
      if (d.boss) s.setTint(0xfff2c8);
      else if (d.elite) s.setTint(0xffd76a);
      else if (s.isTinted) s.clearTint();
      entry.meta = d;
    });
    this.enemyMap.forEach((entry, id) => {
      if (seen.has(id)) return;
      entry.sprite.destroy();
      this.enemyMap.delete(id);
    });
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
      : '联机中';
    this.weaponText.textContent = `武器：${(d.gs && d.gs.weapon) || '手枪'}`;
    if (g.dead) {
      this.helpText.textContent = '你倒下了 · 房主靠近并站立 5 秒可以救你';
    } else if (d.hostDowned) {
      this.helpText.textContent = d.reviveWho === 'p' && d.reviveProgress > 0
        ? `救援房主 ${d.reviveProgress}% · 继续站在房主身边`
        : '房主倒地 · 靠近房主站立 5 秒救援';
    } else {
      this.helpText.textContent = '左半屏移动 · 右半屏瞄准开火 · E 技能 · 空格翻滚 · Q 切枪';
    }
    this.levelText.textContent = d.endless ? `第 ${d.endlessWave || 1} 波` : `${d.round || 1}-${d.stage || 1}`;
    this.levelSub.textContent = d.endless ? '无尽挑战' : (d.mapName || '草原');
    const boss = (d.enemies || []).find((e) => e.boss);
    this.bossText.textContent = boss ? boss.name : '';
    const cd = (d.gs && d.gs.cd) || 0;
    this.btnSkill.textContent = cd > 0 ? `技能 ${cd}s` : '技能';
    this.btnSkill.style.opacity = cd > 0 ? '0.55' : '1';
  }

  update(time, delta) {
    const lerp = (obj, tx, ty, k) => {
      if (!obj || tx == null) return;
      obj.x += (tx - obj.x) * k;
      obj.y += (ty - obj.y) * k;
    };
    lerp(this.hostSprite, this.hostSprite.tx, this.hostSprite.ty, 0.35);
    lerp(this.guestSprite, this.guestSprite.tx, this.guestSprite.ty, 0.35);
    this.hostTag.setPosition(this.hostSprite.x, this.hostSprite.y - 34);
    this.guestTag.setPosition(this.guestSprite.x, this.guestSprite.y - 34);
    this.enemyMap.forEach((entry) => {
      lerp(entry.sprite, entry.sprite.tx, entry.sprite.ty, 0.4);
      entry.sprite.setDepth(500 + Math.floor(entry.sprite.y));
    });
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
    if (this.endMask && this.endMask.parentNode) this.endMask.remove();
    if (this.hud && this.hud.parentNode) this.hud.remove();
    if (this.touchLayer && this.touchLayer.parentNode) this.touchLayer.remove();
    this.endMask = null;
    this.hud = null;
    this.touchLayer = null;
    if (this.game && this.game.canvas) this.game.canvas.style.display = '';
  }
}
