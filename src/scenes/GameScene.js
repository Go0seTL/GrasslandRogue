class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.characterId = (data && data.character) || 'gunner';
    this.weaponId = 'pistol';
    this.weapon = WEAPONS.pistol;
    this.round = 1;
    this.stage = 1;
    this.enemyLevel = 1;
    this.runCoins = 0;
    this.kills = 0;
    this.runStartTime = 0;
    this.roomState = 'idle';
    this.pendingSpawns = 0;
    this.locked = true;
    this.transitioning = false;
    this.gameOverStarted = false;

    this.touchMode = false;
    this.touch = {
      move: { active: false, id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0, force: 0 },
      aim: { active: false, id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0, force: 0, angle: 0 },
    };
    this.touchDashQueued = false;

    this.skill = {
      type: null,
      active: false,
      endsAt: 0,
      cooldownUntil: 0,
      duration: SKILL.duration,
      cooldown: SKILL.cooldown,
      targets: [],
      locks: [],
      swords: [],
      releaseAt: 0,
      released: false,
      orbit: 0,
      nextShotAt: 0,
      shotIndex: 0,
      aimTarget: null,
      lastSound: 0,
    };

    this.buffs = {
      speed: 1, damage: 1, fireRate: 1, dashCd: 1, skillCd: 1,
      coinBonus: 0, hpBonus: 0, size: 1, healBonus: 0,
      bulletSpeed: 1, spreadMul: 1, lifesteal: 0,
    };
    this.upgradeOpen = false;
    this.lastUpgradeRound = 0;
    this.startUpgradeShown = false;
    this.fragmentPity = 0;

    this.portal = null;
    this.boss = null;
    this.spawnQueue = [];

    this.hud = {
      hpDirty: true,
      coinDirty: true,
      levelDirty: true,
      hurtAt: 0,
      bannerQueue: [],
      toastQueue: [],
      hintText: '',
      hintUntil: 0,
    };
  }

  create() {
    this.runStartTime = this.time.now;
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.setupDecor();

    this.physics.world.setBounds(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);

    this.player = new Player(this, 480, 405, this.characterId);
    this.enemies = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.healthPacks = this.physics.add.group();
    this.fragments = this.physics.add.group();

    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouchPlayer, null, this);

    this.setupFX();
    this.setupAmbient();
    this.setupInput();

    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(900);

    this.scene.launch('UI');
    this.time.addEvent({ delay: 2000, loop: true, callback: () => Store.flush() });
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.autoCollectCoins() });

    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.hud.hintText = coarse
      ? '左半屏拖动移动 · 右半屏拖动瞄准 · 右下「闪」翻滚 · 火焰按钮技能'
      : 'WASD 移动 · 鼠标瞄准 · 左键射击 · 空格翻滚 · E 技能';
    this.hud.hintUntil = this.time.now + 9000;

    this.startRoom(1, 1);

    this.time.delayedCall(700, () => {
      if (!this.scene.isActive()) return;
      this.openUpgrade(true);
    });
  }

  // ------------------------------------------------------------ 场景搭建

  setupDecor() {
    const keys = ['flower_white', 'flower_yellow', 'flower_pink', 'tuft', 'tuft', 'pebble_deco'];
    for (let i = 0; i < 28; i++) {
      const x = rand(ARENA.left + 22, ARENA.right - 22);
      const y = rand(ARENA.top + 22, ARENA.bottom - 12);
      const key = choice(keys);
      const img = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(2).setAlpha(0.95);
      if (key !== 'pebble_deco') {
        this.tweens.add({
          targets: img, angle: rand(-3, 3), duration: rand(1700, 2800),
          yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: rand(0, 1200),
        });
      }
    }
    const bushSpots = [
      [ARENA.left + 60, ARENA.top + 70], [ARENA.right - 70, ARENA.top + 90],
      [ARENA.left + 80, ARENA.bottom - 70], [ARENA.right - 80, ARENA.bottom - 80],
    ];
    bushSpots.forEach(([x, y]) => {
      this.add.image(x, y, 'bush_deco').setOrigin(0.5, 1).setDepth(2).setAlpha(0.9).setScale(1.1);
    });
  }

  setupAmbient() {
    this.add.particles(0, 0, 'leaf', {
      x: { min: ARENA.left, max: ARENA.right },
      y: { min: ARENA.top, max: ARENA.bottom },
      lifespan: 7600,
      speedX: { min: -16, max: 20 },
      speedY: { min: -14, max: 8 },
      scale: { min: 0.5, max: 1.0 },
      alpha: { start: 0.32, end: 0 },
      rotate: { min: 0, max: 360 },
      frequency: 560,
      quantity: 1,
    }).setDepth(3);

    this.add.particles(0, 0, 'spark', {
      x: { min: ARENA.left, max: ARENA.right },
      y: { min: ARENA.top, max: ARENA.bottom },
      lifespan: 5000,
      speedX: { min: -6, max: 14 },
      speedY: { min: -10, max: 4 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.28, end: 0 },
      tint: [0xfff2b0, 0xffffff, 0xc8ffb0],
      frequency: 380,
      quantity: 1,
      blendMode: 'ADD',
    }).setDepth(4);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      dash: 'SPACE', dash2: 'SHIFT', pause: 'ESC', mute: 'M',
    });
    this.input.addPointer(2);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());
    this.input.keyboard.on('keydown-E', () => this.activateSkill());

    this.touchGfx = this.add.graphics().setDepth(950).setScrollFactor(0);
    this.dashLabel = this.add.text(884, 492, '闪', UI.textStyle(20, {
      color: '#fff1c8', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(951).setScrollFactor(0).setVisible(false);
  }

  setupFX() {
    const scene = this;
    const mk = (key, cfg, depth) => scene.add.particles(0, 0, key, Object.assign({ emitting: false }, cfg)).setDepth(depth);

    const sparks = mk('spark', {
      lifespan: { min: 150, max: 380 },
      speed: { min: 60, max: 250 },
      scale: { start: 1.15, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      tint: [0xffe066, 0xffffff, 0xffa53f],
    }, 760);

    const goo = mk('spark', {
      lifespan: { min: 240, max: 560 },
      speed: { min: 60, max: 230 },
      gravityY: 420,
      scale: { start: 0.95, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x67b84a, 0x8fd463, 0x3f7f2d],
    }, 755);

    const dust = mk('dust', {
      lifespan: { min: 300, max: 650 },
      speed: { min: 15, max: 75 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.55, end: 0 },
    }, 20);

    const smoke = mk('smoke', {
      lifespan: { min: 400, max: 900 },
      speed: { min: 20, max: 95 },
      scale: { start: 0.8, end: 1.7 },
      alpha: { start: 0.55, end: 0 },
    }, 30);

    const shells = mk('shell', {
      lifespan: { min: 450, max: 850 },
      speedX: { min: -140, max: 140 },
      speedY: { min: -220, max: -70 },
      gravityY: 950,
      rotate: { min: 0, max: 360 },
      scale: { start: 1, end: 0.8 },
      alpha: { start: 1, end: 0 },
    }, 710);

    const flames = scene.add.particles(0, 0, 'spark', {
      lifespan: { min: 260, max: 520 },
      speedX: { min: -50, max: 50 },
      speedY: { min: -170, max: -60 },
      scale: { start: 1.05, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffe066, 0xff9a3a, 0xff5a2a],
      frequency: 24,
      quantity: 1,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(736);

    const skillGlow = scene.add.image(0, 0, 'glow')
      .setTint(0xff8a3a).setScale(1.35)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(734);

    const fx = { sparks, goo, dust, smoke, shells, flames, skillGlow };

    fx.ring = (x, y, color, from, to, duration, alpha, depth) => {
      const img = scene.add.image(x, y, 'ring')
        .setTint(color).setScale(from).setAlpha(alpha == null ? 0.9 : alpha)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth == null ? 750 : depth);
      scene.tweens.add({
        targets: img, scale: to, alpha: 0, duration, ease: 'Sine.Out',
        onComplete: () => img.destroy(),
      });
      return img;
    };

    fx.muzzle = (x, y) => {
      const img = scene.add.image(x, y, 'muzzle')
        .setRotation(rand(-0.4, 0.4))
        .setScale(rand(0.55, 0.85))
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(705);
      scene.tweens.add({
        targets: img, alpha: 0, scaleX: 1.15, scaleY: 1.15, duration: 90,
        onComplete: () => img.destroy(),
      });
      sparks.explode(2, x, y);
    };

    fx.shell = (x, y) => { shells.explode(1, x, y); };
    fx.hitSpark = (x, y) => { sparks.explode(4, x, y); };
    fx.hopDust = (x, y) => { dust.explode(2, x, y); };

    fx.dash = (x, y) => {
      dust.explode(9, x, y);
      fx.ring(x, y + 8, 0x9ff0e0, 0.2, 0.8, 300, 0.55, 720);
    };

    fx.enemyDeath = (x, y, type) => {
      goo.explode(type === 'bat' ? 10 : 15, x, y);
      smoke.explode(type === 'bat' ? 2 : 4, x, y);
      fx.ring(x, y, 0x9ff0a8, 0.12, 0.6, 300, 0.5, 740);
    };

    fx.coinPop = (x, y) => { sparks.explode(3, x, y); };

    fx.floatingText = (x, y, text, color) => {
      const t = scene.add.text(x, y, text, UI.textStyle(17, {
        color: color || '#ffe9a8', strokeThickness: 4,
      })).setOrigin(0.5).setDepth(780);
      scene.tweens.add({
        targets: t, y: y - 36, alpha: 0, duration: 700, ease: 'Sine.Out',
        onComplete: () => t.destroy(),
      });
    };

    fx.healBurst = (x, y, amount) => {
      goo.explode(10, x, y);
      const img = scene.add.image(x, y - 18, 'heal').setDepth(760).setScale(1.1);
      scene.tweens.add({
        targets: img, y: y - 54, alpha: 0, duration: 650, ease: 'Sine.Out',
        onComplete: () => img.destroy(),
      });
      scene.tweens.add({ targets: img, scale: 1.4, duration: 650 });
      if (amount) fx.floatingText(x, y - 30, '+' + amount, '#9ff0a8');
    };

    fx.spawnWarning = (x, y, delay) => {
      const img = scene.add.image(x, y, 'spawnring')
        .setTint(0xff6a5a).setScale(0.15).setAlpha(0).setDepth(3);
      scene.tweens.add({
        targets: img, alpha: 0.85, scale: 0.62, duration: Math.max(130, delay * 0.7),
        ease: 'Sine.Out',
        onComplete: () => {
          scene.tweens.add({ targets: img, alpha: 0, duration: 110, onComplete: () => img.destroy() });
        },
      });
    };

    fx.telegraph = (x, y, r, color, duration) => {
      const circle = scene.add.circle(x, y, r, color, 0.14).setDepth(3);
      const ring = scene.add.image(x, y, 'ring').setTint(color).setScale(r / 48).setAlpha(0.9).setDepth(3);
      scene.tweens.add({
        targets: [circle, ring], alpha: 0, duration: duration || 500,
        onComplete: () => { circle.destroy(); ring.destroy(); },
      });
      scene.tweens.add({ targets: ring, scale: (r / 48) * 1.25, duration: duration || 500 });
    };

    fx.spawnBurst = (x, y) => {
      fx.ring(x, y, 0xffd76a, 0.1, 0.6, 320, 0.8, 740);
      dust.explode(3, x, y);
    };

    fx.summonBurst = (x, y) => {
      fx.ring(x, y, 0xff9a5a, 0.2, 2.2, 520, 0.9, 745);
      goo.explode(16, x, y);
      smoke.explode(5, x, y);
    };

    fx.bossSlam = (x, y) => {
      dust.explode(18, x, y);
      smoke.explode(6, x, y);
      fx.ring(x, y, 0xffd76a, 0.5, 2.9, 520, 0.9, 745);
      fx.ring(x, y, 0xff9a5a, 0.2, 2.0, 420, 0.7, 744);
    };

    fx.bossEnrage = (x, y) => {
      fx.ring(x, y, 0xff5a4a, 0.3, 3.0, 650, 0.9, 745);
      goo.explode(20, x, y);
      fx.floatingText(x, y - 70, '暴怒', '#ff8a6a');
    };

    fx.bossDeath = (x, y) => {
      for (let i = 0; i < 6; i++) {
        scene.time.delayedCall(i * 110, () => {
          const ox = x + rand(-70, 70);
          const oy = y + rand(-40, 30);
          goo.explode(16, ox, oy);
          smoke.explode(4, ox, oy);
          sparks.explode(10, ox, oy);
        });
      }
      fx.ring(x, y, 0xffd76a, 0.4, 3.4, 900, 0.95, 760);
      fx.ring(x, y, 0x9ff0a8, 0.2, 2.4, 700, 0.8, 759);
    };

    fx.playerDeath = (x, y) => {
      goo.explode(25, x, y);
      sparks.explode(18, x, y);
      smoke.explode(8, x, y);
      fx.ring(x, y, 0xff6a5a, 0.3, 2.6, 700, 0.9, 760);
    };

    this.fx = fx;
  }

  // ------------------------------------------------------------ 房间流程

  startRoom(round, stage) {
    this.round = round;
    this.stage = stage;
    this.enemyLevel = levelIndex(round, stage);
    this.transitioning = false;
    this.locked = true;
    this.roomState = 'intro';
    this.boss = null;
    this.pendingSpawns = 0;
    this.spawnQueue = [];

    this.cancelSkill();
    this.destroyPortal();
    this.clearRoomObjects();

    this.tweens.killTweensOf(this.player);
    this.player.setPosition(480, 405);
    this.player.setAlpha(1).setAngle(0).clearTint();
    this.player.gun.setVisible(true).setAlpha(1);
    this.player.body.enable = true;
    this.player.body.setVelocity(0, 0);
    this.player.invulnUntil = this.time.now + 700;
    this.player.nextShotAt = this.time.now + 350;

    this.hud.hpDirty = true;
    this.hud.bannerQueue.push({
      title: `${round}-${stage}`,
      sub: stage === ROUND_LEN ? 'BOSS 房间 · 史莱姆王' : '草原',
      color: stage === ROUND_LEN ? '#ff9a6a' : '#ffe9a8',
    });

    this.cameras.main.fadeIn(380, 6, 12, 6);

    this.time.delayedCall(960, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.locked = false;
      this.roomState = 'fighting';
      if (stage === ROUND_LEN) this.startBossRoom();
      else this.startNormalRoom();
    });
  }

  clearRoomObjects() {
    this.enemies.getChildren().slice().forEach((e) => {
      if (e.active) e.destroy();
    });
    this.enemies.clear(false, false);
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.coins.getChildren().slice().forEach((c) => {
      if (c.active) c.destroy();
    });
    this.coins.clear(false, false);
    this.healthPacks.getChildren().slice().forEach((h) => {
      if (h.active) h.destroy();
    });
    this.healthPacks.clear(false, false);
    this.fragments.getChildren().slice().forEach((f) => {
      if (f.glow && f.glow.active) f.glow.destroy();
      if (f.active) f.destroy();
    });
    this.fragments.clear(false, false);
    this.pendingSpawns = 0;
    this.spawnQueue = [];
  }

  buildEnemyList() {
    const n = this.enemyLevel;
    const total = Math.min(4 + Math.floor((n - 1) * 1.15), 16);
    const types = [];
    for (let i = 0; i < total; i++) {
      const r = Math.random();
      let type = 'slime';
      if (n >= 4 && r < 0.24) type = 'bat';
      else if (n >= 2 && r < 0.52) type = 'goblin';
      else if (r < 0.93) type = 'slime';
      else type = 'goblin';
      types.push(type);
    }
    return types;
  }

  startNormalRoom() {
    const types = this.buildEnemyList();
    this.spawnQueue = types;
    this.pendingSpawns = types.length;
    this.spawnNextBatch();
  }

  spawnNextBatch() {
    if (this.roomState !== 'fighting' || this.spawnQueue.length === 0) return;
    const batch = Math.min(2 + (this.enemyLevel >= 5 ? 1 : 0), this.spawnQueue.length);
    for (let i = 0; i < batch; i++) {
      const type = this.spawnQueue.shift();
      const pt = this.pickSpawnPoint();
      this.scheduleSpawn(type, pt.x, pt.y, 480 + i * 170);
    }
    if (this.spawnQueue.length > 0) {
      this.time.delayedCall(1350, () => {
        if (this.scene.isActive()) this.spawnNextBatch();
      });
    }
  }

  scheduleSpawn(type, x, y, delay) {
    this.fx.spawnWarning(x, y, delay);
    this.time.delayedCall(delay, () => {
      if (!this.scene.isActive()) return;
      this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
      if (this.roomState !== 'fighting' || this.transitioning) return;
      this.spawnEnemyAt(type, x, y, false);
    });
  }

  pickSpawnPoint() {
    for (let i = 0; i < 40; i++) {
      const x = rand(ARENA.left + 48, ARENA.right - 48);
      const y = rand(ARENA.top + 48, ARENA.bottom - 48);
      if (dist2(x, y, this.player.x, this.player.y) > 185 * 185) return { x, y };
    }
    return { x: 480, y: ARENA.top + 80 };
  }

  startBossRoom() {
    this.pendingSpawns = 1;
    this.time.delayedCall(750, () => {
      if (!this.scene.isActive() || this.roomState !== 'fighting') return;
      this.pendingSpawns = 0;
      this.spawnEnemyAt('boss', 480, 205, true);
      this.spawnEnemyAt('slime', 300, 250, true);
      this.spawnEnemyAt('slime', 660, 250, true);
    });
  }

  spawnEnemyAt(type, x, y, instant) {
    let enemy;
    if (type === 'boss') {
      enemy = new Boss(this, x, y, this.enemyLevel);
      this.boss = enemy;
      this.cameras.main.shake(320, 0.008);
      Sfx.bossRoar();
      this.hud.toastQueue.push('史莱姆王 出现了！');
    } else {
      enemy = new Enemy(this, x, y, type, this.enemyLevel);
    }
    this.enemies.add(enemy);
    this.fx.spawnBurst(x, y);
    if (instant) enemy.setAlpha(1);
    return enemy;
  }

  finishRoom() {
    if (this.roomState !== 'fighting') return;
    this.roomState = 'cleared';
    const isBoss = this.stage === ROUND_LEN;
    const heal = (isBoss ? BALANCE.bossClearHeal : BALANCE.clearHeal) + this.buffs.healBonus;
    if (!this.player.isDead) {
      this.player.heal(heal);
      this.fx.healBurst(this.player.x, this.player.y, heal);
      Sfx.heal();
    }
    Store.flush();
    this.time.delayedCall(340, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.spawnPortal();
      this.hud.bannerQueue.push({
        title: isBoss ? 'BOSS 击破' : '房间清理',
        sub: isBoss ? `第 ${this.round} 轮完成 · 踏入传送门` : '踏入传送门，继续深入',
        color: isBoss ? '#ffe08a' : '#9ff0a8',
      });
      Sfx.levelClear();
    });
    if (isBoss) {
      this.time.delayedCall(900, () => {
        if (!this.scene.isActive() || this.player.isDead) return;
        this.openUpgrade(false);
      });
    }
  }

  spawnPortal() {
    this.destroyPortal();
    const x = 480, y = 252;
    const c = this.add.container(x, y).setDepth(4);
    const groundGlow = this.add.image(0, 22, 'glow').setScale(1.9, 0.7)
      .setTint(0x67d8ff).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD);
    const ring1 = this.add.image(0, 0, 'ring').setTint(0x7fe8ff).setAlpha(0.9).setScale(0.8);
    const ring2 = this.add.image(0, 0, 'ring').setTint(0xbf7bff).setAlpha(0.62).setScale(0.56);
    const glow = this.add.image(0, 0, 'glow').setScale(1.45).setTint(0x63e8ff)
      .setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.image(0, 0, 'glow').setScale(0.5).setTint(0xffffff)
      .setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
    c.add([groundGlow, ring1, ring2, glow, core]);

    this.tweens.add({ targets: ring1, rotation: Math.PI * 2, duration: 3600, repeat: -1 });
    this.tweens.add({ targets: ring2, rotation: -Math.PI * 2, duration: 2500, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.22, scale: 1.65, duration: 850, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: core, scale: 0.62, alpha: 0.7, duration: 620, yoyo: true, repeat: -1 });

    const particles = this.add.particles(x, y, 'spark', {
      speed: { min: 12, max: 70 },
      lifespan: 900,
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 110,
      blendMode: 'ADD',
      tint: [0x7fe8ff, 0xbf7bff, 0xffffff],
    }).setDepth(5);

    const label = this.add.text(x, 190, '踏入传送门', UI.textStyle(16, {
      color: '#c8f4ff', strokeThickness: 4,
    })).setOrigin(0.5).setDepth(890).setAlpha(0.9);
    this.tweens.add({ targets: label, y: 184, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.portal = { container: c, label, particles, armed: false, x, y };
    this.time.delayedCall(700, () => {
      if (this.portal) this.portal.armed = true;
    });
    Sfx.portal();
  }

  destroyPortal() {
    if (!this.portal) return;
    if (this.portal.container) this.portal.container.destroy();
    if (this.portal.label) this.portal.label.destroy();
    if (this.portal.particles) this.portal.particles.destroy();
    this.portal = null;
  }

  nextLevel() {
    if (this.transitioning || this.player.isDead) return;
    this.transitioning = true;
    this.locked = true;
    this.player.body.setVelocity(0, 0);
    this.coins.getChildren().slice().forEach((c) => {
      if (c.active) this.collectCoin(c, true);
    });
    this.fragments.getChildren().slice().forEach((f) => {
      if (f.active) this.collectFragment(f, true);
    });
    Sfx.portal();
    this.cameras.main.flash(220, 170, 235, 255);
    this.cameras.main.fadeOut(340, 6, 12, 6);

    let nr = this.round;
    let ns = this.stage + 1;
    if (ns > ROUND_LEN) { ns = 1; nr += 1; }
    Store.updateBest(this.round, this.stage, this.kills);
    Store.flush();

    this.time.delayedCall(360, () => {
      if (!this.scene.isActive()) return;
      this.destroyPortal();
      this.startRoom(nr, ns);
    });
  }

  // ------------------------------------------------------------ 战斗

  spawnPlayerBullet(x, y, angle, damage, opts) {
    const o = opts || {};
    const b = this.physics.add.image(x, y, 'bullet');
    this.playerBullets.add(b);
    b.setDepth(700).setBlendMode(Phaser.BlendModes.ADD);
    b.setRotation(angle);
    b.body.setSize(6, 6);
    b.body.setAllowGravity(false);
    const speed = o.speed || BALANCE.bulletSpeed;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (o.tint != null) b.setTint(o.tint);
    b.damage = damage || BALANCE.bulletDamage;
    b.pierce = o.pierce || 0;
    b.hitEnemies = new Set();
    b.bornAt = this.time.now;
    return b;
  }

  spawnEnemyArrow(x, y, angle, damage) {
    const b = this.physics.add.image(x, y, 'arrow');
    this.enemyBullets.add(b);
    b.setDepth(705).setRotation(angle);
    b.body.setSize(12, 6);
    b.body.setAllowGravity(false);
    b.setVelocity(Math.cos(angle) * 385, Math.sin(angle) * 385);
    b.damage = damage || 9;
    b.bornAt = this.time.now;
    return b;
  }

  spawnEnemyOrb(x, y, angle, damage) {
    const b = this.physics.add.image(x, y, 'orb');
    this.enemyBullets.add(b);
    b.setDepth(705).setBlendMode(Phaser.BlendModes.ADD);
    b.body.setCircle(6, 2, 2);
    b.body.setAllowGravity(false);
    b.setVelocity(Math.cos(angle) * 255, Math.sin(angle) * 255);
    b.damage = damage || 12;
    b.bornAt = this.time.now;
    return b;
  }

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.dying) return;
    if (bullet.hitEnemies && bullet.hitEnemies.has(enemy)) return;
    if (bullet.hitEnemies) bullet.hitEnemies.add(enemy);
    const bx = bullet.x, by = bullet.y;
    const dmg = bullet.damage || BALANCE.bulletDamage;
    const ang = bullet.rotation;
    if (bullet.pierce > 0) {
      bullet.pierce--;
    } else {
      bullet.destroy();
    }
    const wasBoss = enemy.enemyType === 'boss';
    enemy.takeDamage(dmg, ang);
    this.fx.hitSpark(bx, by);
    if (enemy.dying) {
      this.cameras.main.shake(wasBoss ? 140 : 80, wasBoss ? 0.006 : 0.0028);
    } else {
      this.cameras.main.shake(wasBoss ? 70 : 38, wasBoss ? 0.0022 : 0.0009);
    }
    if (Math.random() < 0.6) Sfx.hit();
  }

  equipWeapon(id) {
    const w = WEAPONS[id];
    if (!w) return;
    this.weaponId = id;
    this.weapon = w;
    this.hud.toastQueue.push(`已装备：${w.name}`);
  }

  openUpgrade(isStart) {
    if (this.upgradeOpen || this.player.isDead || !this.scene.isActive()) return;
    this.upgradeOpen = true;
    if (isStart) this.startUpgradeShown = true;
    this.scene.launch('Upgrade', { from: 'game', isStart: !!isStart });
    this.scene.pause();
  }

  applyUpgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    switch (id) {
      case 'big':
        this.buffs.size *= 1.10;
        this.player.setScale(this.buffs.size);
        if (this.player.shadow) this.player.shadow.setScale(this.buffs.size);
        if (this.player.backSword) this.player.backSword.setScale(this.buffs.size);
        this.player.addMaxHp(35);
        break;
      case 'swift':
        this.buffs.speed *= 1.12;
        this.buffs.dashCd *= 0.8;
        break;
      case 'firepower':
        this.buffs.damage *= 1.15;
        this.buffs.fireRate *= 0.9;
        break;
      case 'greed':
        this.buffs.coinBonus += 1;
        break;
      case 'tough':
        this.player.addMaxHp(25);
        this.buffs.healBonus += 5;
        break;
      case 'skillmaster':
        this.buffs.skillCd *= 0.8;
        break;
      case 'vampire':
        this.buffs.lifesteal += 2;
        break;
      case 'focus':
        this.buffs.bulletSpeed *= 1.15;
        this.buffs.spreadMul *= 0.72;
        break;
      default:
        break;
    }
    this.hud.hpDirty = true;
    this.hud.toastQueue.push(`获得强化：${u.name}`);
    Sfx.unlock();
  }

  onEnemyBulletHitPlayer(player, bullet) {
    if (!bullet.active || player.isDead) return;
    const bx = bullet.x, by = bullet.y;
    const dmg = bullet.damage || 8;
    bullet.destroy();
    player.takeDamage(dmg, bx, by, this.time.now);
    this.fx.hitSpark(bx, by);
  }

  onEnemyTouchPlayer(player, enemy) {
    if (!enemy.active || enemy.dying || player.isDead) return;
    player.takeDamage(enemy.damage, enemy.x, enemy.y, this.time.now);
  }

  onEnemyKilled(enemy) {
    this.kills++;
    const def = enemy.def;
    const count = enemy.enemyType === 'boss'
      ? randInt(24, 34)
      : randInt(def.coins[0], def.coins[1]);
    this.dropCoins(enemy.x, enemy.y, count + this.buffs.coinBonus);

    const hpChance = enemy.enemyType === 'boss'
      ? 1
      : (this.player.hp < this.player.maxHp * 0.4 ? 0.16 : 0.09);
    if (Math.random() < hpChance) this.dropHealthPack(enemy.x, enemy.y);
    if (this.buffs.lifesteal > 0 && !this.player.isDead) this.player.heal(this.buffs.lifesteal);
    this.maybeDropFragment(enemy);

    if (enemy.enemyType === 'slime' && this.roomState === 'fighting' && Math.random() < 0.3) {
      const x = clamp(enemy.x, ARENA.left + 30, ARENA.right - 30);
      const y = clamp(enemy.y, ARENA.top + 30, ARENA.bottom - 30);
      this.time.delayedCall(90, () => {
        if (this.roomState !== 'fighting' || !this.scene.isActive()) return;
        this.spawnEnemyAt('slime_mini', x - 15, y, true);
        this.spawnEnemyAt('slime_mini', x + 15, y, true);
      });
    }
  }

  onBossDefeated(boss) {
    if (this.boss === boss) this.boss = null;
    this.hud.toastQueue.push('史莱姆王 被击败了！');
  }

  onPlayerHurt() {
    this.hud.hurtAt = this.time.now;
  }

  onPlayerDeath() {
    if (this.gameOverStarted) return;
    this.gameOverStarted = true;
    this.locked = true;
    this.cancelSkill();
    this.hud.hurtAt = this.time.now;
    Sfx.explosion();
    this.fx.playerDeath(this.player.x, this.player.y);
    this.cameras.main.shake(420, 0.012);

    this.time.delayedCall(500, () => {
      this.coins.getChildren().slice().forEach((c) => {
        if (c.active) this.collectCoin(c, true);
      });
      this.fragments.getChildren().slice().forEach((f) => {
        if (f.active) this.collectFragment(f, true);
      });
    });

    this.time.delayedCall(1400, () => {
      Store.markRunFinished(this.round, this.stage, this.kills);
      Store.flush();
      const data = {
        runCoins: this.runCoins,
        kills: this.kills,
        round: this.round,
        stage: this.stage,
        timeMs: this.time.now - this.runStartTime,
        character: this.characterId,
      };
      this.scene.stop('UI');
      this.scene.start('Over', data);
    });
  }

  // ------------------------------------------------------------ 技能

  isSkillActive() {
    return !!(this.skill && this.skill.active);
  }

  isAimLockSkillActive() {
    return !!(this.skill && this.skill.active && this.skill.type === 'gunner');
  }

  activateSkill() {
    if (!this.scene.isActive() || !this.canPlayerAct() || this.player.isDead) return;
    const s = this.skill;
    if (s.active || this.time.now < s.cooldownUntil) {
      Sfx.uiDeny();
      return;
    }
    if (this.characterId === 'swordsman') this.activateSwordSkill();
    else this.activateGunnerSkill();
  }

  activateGunnerSkill() {
    const s = this.skill;
    s.type = 'gunner';
    s.active = true;
    s.endsAt = this.time.now + SKILL.duration;
    s.cooldown = SKILL.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = this.time.now + s.cooldown;
    s.duration = SKILL.duration;
    s.nextShotAt = this.time.now + 80;
    s.shotIndex = 0;
    s.aimTarget = null;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.lastSound = 0;
    this.pickSkillTargets();
    this.fx.flames.start();
    this.fx.flames.setPosition(this.player.x, this.player.y + 2);
    this.fx.skillGlow.setPosition(this.player.x, this.player.y - 6);
    this.fx.skillGlow.setAlpha(0.3);
    this.fx.ring(this.player.x, this.player.y + 6, 0xff9a3a, 0.25, 1.8, 520, 0.9, 732);
    this.cameras.main.shake(160, 0.004);
    Sfx.skillStart();
    this.hud.toastQueue.push('技能发动：锁定最近的 3 名敌人');
  }

  activateSwordSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'sword';
    s.active = true;
    s.endsAt = now + 4200;
    s.cooldown = 10000 * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = 4200;
    s.releaseAt = now + 1000;
    s.released = false;
    s.orbit = 0;
    s.targets = [];
    s.locks = [];
    s.aimTarget = null;
    s.swords = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const img = this.add.image(this.player.x, this.player.y, 'sword')
        .setDepth(845).setScale(0.9);
      const glow = this.add.image(this.player.x, this.player.y, 'glow')
        .setTint(0xa8e8ff).setAlpha(0.22).setScale(0.45)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(844);
      s.swords.push({
        img, glow, angle, state: 'hover', hits: new Set(),
        travelAngle: angle, speed: 820, x: this.player.x, y: this.player.y, spin: 0,
        target: null, homingUntil: 0,
      });
    }
    this.cameras.main.shake(120, 0.003);
    this.fx.ring(this.player.x, this.player.y, 0xa8e8ff, 0.2, 1.6, 500, 0.9, 732);
    Sfx.swordSummon();
    this.hud.toastQueue.push('剑阵：一秒后锁定敌人刺击！');
  }

  pickSkillTargets() {
    const s = this.skill;
    const list = this.enemies.getChildren()
      .filter((e) => e.active && !e.dying)
      .sort((a, b) => dist2(this.player.x, this.player.y, a.x, a.y) - dist2(this.player.x, this.player.y, b.x, b.y));
    s.targets = list.slice(0, SKILL.maxTargets);
  }

  lockOffset(e) {
    if (e.enemyType === 'boss') return 78;
    if (e.enemyType === 'goblin') return 42;
    if (e.enemyType === 'bat') return 26;
    if (e.enemyType === 'slime_mini') return 24;
    return 32;
  }

  updateSkill(time, delta) {
    const s = this.skill;
    if (!s.active) return;
    if (s.type === 'sword') this.updateSwordSkill(time, delta);
    else this.updateGunnerSkill(time);
  }

  updateGunnerSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }

    // 目标阵亡则移除，并从当前最近的敌人里补位
    s.targets = s.targets.filter((e) => e && e.active && !e.dying);
    if (s.targets.length < SKILL.maxTargets) {
      const candidates = this.enemies.getChildren()
        .filter((e) => e.active && !e.dying && !s.targets.includes(e))
        .sort((a, b) => dist2(this.player.x, this.player.y, a.x, a.y) - dist2(this.player.x, this.player.y, b.x, b.y));
      while (s.targets.length < SKILL.maxTargets && candidates.length > 0) {
        s.targets.push(candidates.shift());
      }
    }

    // 标记清理
    s.locks = s.locks.filter((lock) => {
      const keep = lock.enemy && lock.enemy.active && !lock.enemy.dying && s.targets.includes(lock.enemy);
      if (!keep) {
        this.tweens.killTweensOf(lock.icon);
        if (lock.icon.active) lock.icon.destroy();
      }
      return keep;
    });

    // 给目标挂瞄准标记
    s.targets.forEach((e) => {
      let lock = s.locks.find((l) => l.enemy === e);
      if (!lock) {
        const icon = this.add.image(e.x, e.y - 40, 'target_icon')
          .setTint(0xff7a4a)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(850)
          .setScale(e.enemyType === 'boss' ? 1.2 : 0.9);
        this.tweens.add({ targets: icon, angle: 360, duration: 1400, repeat: -1 });
        this.tweens.add({ targets: icon, scale: e.enemyType === 'boss' ? 1.4 : 1.08, duration: 260, yoyo: true, repeat: -1 });
        lock = { enemy: e, icon };
        s.locks.push(lock);
      }
      lock.icon.setPosition(e.x, e.y - this.lockOffset(e));
    });

    // 机枪扫射
    if (s.targets.length > 0 && time >= s.nextShotAt) {
      s.nextShotAt = time + SKILL.interval;
      const target = s.targets[s.shotIndex % s.targets.length];
      s.shotIndex++;
      s.aimTarget = target;
      const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + rand(-0.04, 0.04);
      const px = this.player.x + Math.cos(angle) * 2;
      const py = this.player.y - 2 + Math.sin(angle) * 2;
      const fxX = this.player.x + Math.cos(angle) * 27;
      const fxY = this.player.y - 5 + Math.sin(angle) * 27;
      this.spawnPlayerBullet(px, py, angle, SKILL.damage);
      this.fx.muzzle(fxX, fxY);
      if (s.shotIndex % 2 === 0) this.fx.shell(this.player.x, this.player.y - 5, angle);
      this.cameras.main.shake(28, 0.0007);
      if (time - s.lastSound > 115) {
        Sfx.mg();
        s.lastSound = time;
      }
    }

    // 身上冒火
    this.fx.flames.setPosition(this.player.x, this.player.y + 2);
    this.fx.skillGlow.setPosition(this.player.x, this.player.y - 6);
    this.fx.skillGlow.setAlpha(0.24 + Math.sin(time * 0.022) * 0.08);
  }

  updateSwordSkill(time, delta) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    const hovering = time < s.releaseAt;
    if (!hovering && !s.released) {
      s.released = true;
      Sfx.swordLaunch();
      this.cameras.main.shake(100, 0.003);
      this.fx.ring(this.player.x, this.player.y, 0xc8f4ff, 0.2, 2.0, 420, 0.9, 846);

      // 剑阵解除后：把剑分配给自己附近的敌人，朝敌人方向刺出
      const alive = this.enemies.getChildren()
        .filter((e) => e.active && !e.dying)
        .sort((a, b) => dist2(this.player.x, this.player.y, a.x, a.y) - dist2(this.player.x, this.player.y, b.x, b.y));
      s.swords.forEach((sw, i) => {
        sw.target = alive.length > 0 ? alive[i % alive.length] : null;
        sw.homingUntil = time + 1100;
        if (sw.target) {
          sw.travelAngle = Math.atan2(sw.target.y - sw.y, sw.target.x - sw.x);
        }
      });
    }
    if (hovering) s.orbit += delta * 0.0015;
    const radius = 52;
    const dt = delta / 1000;

    s.swords.forEach((sw) => {
      if (sw.state === 'hover') {
        const a = sw.angle + s.orbit;
        sw.x = this.player.x + Math.cos(a) * radius;
        sw.y = this.player.y - 6 + Math.sin(a) * radius;
        sw.img.setPosition(sw.x, sw.y);
        sw.glow.setPosition(sw.x, sw.y).setAlpha(0.22);
        if (hovering) {
          sw.travelAngle = a;
          sw.img.setRotation(a + Math.PI / 2);
        } else {
          sw.state = 'fly';
          sw.img.setRotation(sw.travelAngle + Math.PI / 2);
        }
      } else {
        // 目标死了/已经刺过就换最近的可命中敌人
        if (time < sw.homingUntil) {
          let target = sw.target;
          if (!target || !target.active || target.dying || sw.hits.has(target)) {
            target = null;
            let bestD = Infinity;
            this.enemies.getChildren().forEach((e) => {
              if (!e.active || e.dying || sw.hits.has(e)) return;
              const d = dist2(sw.x, sw.y, e.x, e.y);
              if (d < bestD) { bestD = d; target = e; }
            });
            sw.target = target;
          }
          if (target) {
            const desired = Math.atan2(target.y - sw.y, target.x - sw.x);
            const diff = Phaser.Math.Angle.Wrap(desired - sw.travelAngle);
            const maxTurn = 7 * dt;
            sw.travelAngle += clamp(diff, -maxTurn, maxTurn);
          }
        }

        sw.x += Math.cos(sw.travelAngle) * sw.speed * dt;
        sw.y += Math.sin(sw.travelAngle) * sw.speed * dt;
        sw.spin += dt * 4.5;
        sw.img.setPosition(sw.x, sw.y).setRotation(sw.travelAngle + Math.PI / 2 + Math.sin(sw.spin) * 0.35);
        sw.glow.setPosition(sw.x, sw.y).setAlpha(0.16);

        this.enemies.getChildren().forEach((e) => {
          if (!e.active || e.dying || sw.hits.has(e)) return;
          const rad = e.enemyType === 'boss' ? 64 : 38;
          if (dist2(sw.x, sw.y, e.x, e.y) < rad * rad) {
            sw.hits.add(e);
            e.takeDamage(34, sw.travelAngle);
            this.fx.hitSpark(sw.x, sw.y);
            this.cameras.main.shake(45, 0.0012);
            Sfx.hit();
          }
        });

        if (sw.x < ARENA.left - 90 || sw.x > ARENA.right + 90 || sw.y < ARENA.top - 90 || sw.y > ARENA.bottom + 90) {
          sw.dead = true;
        }
      }
    });

    s.swords = s.swords.filter((sw) => {
      if (sw.dead) {
        sw.img.destroy();
        sw.glow.destroy();
        return false;
      }
      return true;
    });
    if (s.released && s.swords.length === 0) this.endSkill();
  }

  endSkill() {
    const s = this.skill;
    if (!s.active) return;
    s.active = false;
    s.aimTarget = null;
    if (this.fx) {
      this.fx.flames.stop();
      this.tweens.add({ targets: this.fx.skillGlow, alpha: 0, duration: 260 });
    }
    s.locks.forEach((lock) => {
      this.tweens.killTweensOf(lock.icon);
      if (lock.icon.active) lock.icon.destroy();
    });
    s.locks = [];
    s.targets = [];
    if (s.swords) {
      s.swords.forEach((sw) => {
        if (sw.img.active) sw.img.destroy();
        if (sw.glow.active) sw.glow.destroy();
      });
    }
    s.swords = [];
    Sfx.skillEnd();
  }

  cancelSkill() {
    const s = this.skill;
    if (!s) return;
    s.active = false;
    s.aimTarget = null;
    if (this.fx && this.fx.flames) this.fx.flames.stop();
    if (this.fx && this.fx.skillGlow) {
      this.tweens.killTweensOf(this.fx.skillGlow);
      this.fx.skillGlow.setAlpha(0);
    }
    s.locks.forEach((lock) => {
      this.tweens.killTweensOf(lock.icon);
      if (lock.icon.active) lock.icon.destroy();
    });
    s.locks = [];
    s.targets = [];
    if (s.swords) {
      s.swords.forEach((sw) => {
        if (sw.img.active) sw.img.destroy();
        if (sw.glow.active) sw.glow.destroy();
      });
    }
    s.swords = [];
  }

  isSkillButton(x, y) {
    return dist2(x, y, 884, 418) <= 42 * 42;
  }

  // ------------------------------------------------------------ 金币

  dropCoins(x, y, count) {
    for (let i = 0; i < count; i++) {
      const c = this.physics.add.sprite(x + rand(-10, 10), y + rand(-8, 8), 'coin_0');
      this.coins.add(c);
      c.setDepth(8);
      c.body.setCircle(7, 3, 3);
      c.body.setAllowGravity(true);
      c.body.setGravityY(720);
      c.setCollideWorldBounds(true);
      c.setBounce(0.42);
      c.setDrag(120);
      const a = rand(0, Math.PI * 2);
      const sp = rand(50, 180);
      c.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp - 80);
      c.play('coin_spin');
      c.setScale(0);
      c.value = 1;
      c.collectReadyAt = this.time.now + 300;
      this.tweens.add({ targets: c, scale: 1, duration: 180, ease: 'Back.Out' });
    }
  }

  autoCollectCoins() {
    if (!this.player || this.player.isDead) return;
    this.coins.getChildren().slice().forEach((c) => {
      if (!c.active) return;
      if (this.time.now > c.collectReadyAt) {
        const d2 = dist2(c.x, c.y, this.player.x, this.player.y);
        if (d2 < 36 * 36) this.collectCoin(c, true);
      }
    });
  }

  collectCoin(c, silent) {
    if (!c.active) return;
    const x = c.x, y = c.y;
    const v = c.value || 1;
    c.destroy();
    this.runCoins += v;
    Store.addCoins(v);
    this.hud.coinDirty = true;
    if (!silent) {
      Sfx.coin();
      this.fx.coinPop(x, y);
    }
  }

  dropHealthPack(x, y) {
    const h = this.physics.add.sprite(x + rand(-8, 8), y + rand(-6, 6), 'health_pack');
    this.healthPacks.add(h);
    h.setDepth(9);
    h.body.setCircle(11, 3, 3);
    h.body.setAllowGravity(true);
    h.body.setGravityY(700);
    h.setCollideWorldBounds(true);
    h.setBounce(0.4);
    h.setDrag(140);
    const a = rand(0, Math.PI * 2);
    const sp = rand(40, 130);
    h.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp - 90);
    h.healAmount = 18;
    h.collectReadyAt = this.time.now + 350;
    h.setScale(0);
    this.tweens.add({ targets: h, scale: 1, duration: 180, ease: 'Back.Out' });
  }

  collectHealthPack(h) {
    if (!h.active) return;
    const amount = h.healAmount || 18;
    h.destroy();
    this.player.heal(amount + this.buffs.healBonus);
    this.hud.hpDirty = true;
    this.fx.healBurst(this.player.x, this.player.y, amount + this.buffs.healBonus);
    Sfx.heal();
  }

  pickFragmentWeapon() {
    const available = Object.values(WEAPONS).filter((w) => (
      w.quality !== 'white' && w.quality !== 'rainbow' && !Store.hasWeapon(w.id)
    ));
    if (available.length === 0) return null;
    const weighted = Object.entries(FRAGMENT_RULES.weights)
      .filter(([q]) => available.some((w) => w.quality === q));
    if (weighted.length === 0) return null;
    const total = weighted.reduce((s, x) => s + x[1], 0);
    let r = Math.random() * total;
    for (const [q, weight] of weighted) {
      r -= weight;
      if (r <= 0) return available.find((w) => w.quality === q);
    }
    return available[0];
  }

  maybeDropFragment(enemy) {
    if (enemy.enemyType === 'boss') {
      this.dropFragment(FRAGMENT_RULES.bossWeapon, enemy.x, enemy.y, 1, true);
      return;
    }
    this.fragmentPity++;
    if (Math.random() >= FRAGMENT_RULES.dropChance && this.fragmentPity < FRAGMENT_RULES.pityKills) return;
    const w = this.pickFragmentWeapon();
    if (!w) return;
    const amount = Math.random() < FRAGMENT_RULES.bundleChance ? 2 : 1;
    this.dropFragment(w.id, enemy.x, enemy.y, amount, false);
    this.fragmentPity = 0;
  }

  dropFragment(id, x, y, amount, special) {
    const w = WEAPONS[id];
    if (!w) return;
    const q = QUALITIES[w.quality];
    const f = this.physics.add.sprite(x + rand(-8, 8), y + rand(-6, 6), 'fragment');
    this.fragments.add(f);
    f.setTint(q.color).setDepth(11);
    f.body.setCircle(10, 1, 2);
    f.body.setAllowGravity(true);
    f.body.setGravityY(650);
    f.setCollideWorldBounds(true);
    f.setBounce(0.4);
    f.setDrag(140);
    const a = rand(0, Math.PI * 2);
    const sp = rand(50, 160);
    f.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp - 70);
    f.weaponId = id;
    f.amount = amount;
    f.special = !!special;
    f.collectReadyAt = this.time.now + 300;
    f.glow = this.add.image(f.x, f.y, 'glow')
      .setTint(q.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(special ? 0.65 : 0.4)
      .setScale(special ? 0.95 : 0.35)
      .setDepth(10);
    f.setScale(0);
    this.tweens.add({ targets: f, scale: special ? 1.15 : 0.9, duration: 200, ease: 'Back.Out' });
    if (special) {
      this.cameras.main.flash(220, 240, 150, 255);
      this.hud.bannerQueue.push({ title: '彩色碎片', sub: `${w.name} ×${amount}`, color: '#ff8ae8' });
      Sfx.unlock();
    }
  }

  collectFragment(f, silent) {
    if (!f.active) return;
    const w = WEAPONS[f.weaponId];
    const x = f.x, y = f.y;
    const amount = f.amount || 1;
    const special = f.special;
    if (f.glow && f.glow.active) f.glow.destroy();
    f.destroy();
    if (!w) return;
    const q = QUALITIES[w.quality];
    Store.addFragment(w.id, amount);
    this.fx.floatingText(x, y - 10, `${w.name}碎片 +${amount}`, q.hex);
    if (!silent) Sfx.shard();
    if (special) this.hud.toastQueue.push(`获得彩色碎片：${w.name} ×${amount}`);
  }

  // ------------------------------------------------------------ 输入

  onPointerDown(pointer) {
    if (!this.scene.isActive() || this.scene.isPaused()) return;
    if (!pointer.wasTouch) return;
    if (!this.touchMode) {
      this.touchMode = true;
      this.dashLabel.setVisible(true);
      this.hud.hintText = '左半屏拖动移动 · 右半屏拖动瞄准 · 右下「闪」翻滚 · 火焰按钮放技能';
      this.hud.hintUntil = this.time.now + 6500;
    }
    const x = pointer.x, y = pointer.y;
    if (this.isDashButton(x, y)) {
      this.touchDashQueued = true;
      return;
    }
    if (this.isSkillButton(x, y)) return;
    if (x < GAME_W / 2) {
      if (!this.touch.move.active) {
        this.touch.move = { active: true, id: pointer.id, baseX: x, baseY: y, dx: 0, dy: 0, force: 0 };
      }
    } else if (!this.touch.aim.active) {
      this.touch.aim = { active: true, id: pointer.id, baseX: x, baseY: y, dx: 0, dy: 0, force: 0, angle: 0 };
    }
  }

  onPointerMove(pointer) {
    if (!this.touchMode || !this.scene.isActive()) return;
    const max = 60;
    ['move', 'aim'].forEach((key) => {
      const s = this.touch[key];
      if (!s.active || s.id !== pointer.id) return;
      let dx = pointer.x - s.baseX;
      let dy = pointer.y - s.baseY;
      const len = Math.hypot(dx, dy);
      const force = Math.min(1, len / max);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      s.dx = dx / max;
      s.dy = dy / max;
      s.force = force;
      if (key === 'aim' && force > 0.12) s.angle = Math.atan2(dy, dx);
    });
  }

  onPointerUp(pointer) {
    ['move', 'aim'].forEach((key) => {
      const s = this.touch[key];
      if (s.active && s.id === pointer.id) s.active = false;
    });
  }

  resetTouch() {
    this.touch.move = { active: false, id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0, force: 0 };
    this.touch.aim = { active: false, id: -1, baseX: 0, baseY: 0, dx: 0, dy: 0, force: 0, angle: 0 };
    this.touchDashQueued = false;
  }

  isDashButton(x, y) {
    return dist2(x, y, 884, 492) <= 40 * 40;
  }

  consumeDash() {
    if (this.touchDashQueued) {
      this.touchDashQueued = false;
      return true;
    }
    return false;
  }

  wantsToFire() {
    if (this.touchMode) return true;
    const p = this.input.activePointer;
    return !!(p && p.isDown && p.leftButtonDown());
  }

  computeAimAngle(player) {
    if (this.skill && this.skill.active) {
      let t = this.skill.aimTarget;
      if (!t || !t.active || t.dying) {
        t = this.skill.targets.find((e) => e.active && !e.dying);
      }
      if (t) return Math.atan2(t.y - player.y, t.x - player.x);
    }
    if (this.touchMode) {
      const aim = this.touch.aim;
      if (aim.active && aim.force > 0.15) return aim.angle;
      const target = this.findNearestEnemy(player.x, player.y, 680);
      if (target) return Math.atan2(target.y - player.y, target.x - player.x);
      const m = this.touch.move;
      if (m.active && Math.hypot(m.dx, m.dy) > 0.2) return Math.atan2(m.dy, m.dx);
      return player.aimAngle || 0;
    }
    const p = this.input.activePointer;
    return Math.atan2(p.worldY - player.y, p.worldX - player.x);
  }

  findNearestEnemy(x, y, maxDist) {
    let best = null;
    let bestD2 = maxDist * maxDist;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      const d2 = dist2(x, y, e.x, e.y);
      if (d2 < bestD2) { bestD2 = d2; best = e; }
    });
    return best;
  }

  canPlayerAct() {
    return !this.locked && !this.transitioning && this.player && !this.player.isDead;
  }

  updateTouchUI() {
    const g = this.touchGfx;
    g.clear();
    if (!this.touchMode) return;

    const dx = 884, dy = 492;
    const cd = BALANCE.dashCooldown * 1000;
    const readyAt = this.player ? this.player.dashReadyAt : 0;
    const pct = clamp(1 - Math.max(0, readyAt - this.time.now) / cd, 0, 1);

    g.fillStyle(0x111b0e, 0.55);
    g.fillCircle(dx, dy, 34);
    g.lineStyle(2, 0xd9b45a, 0.75);
    g.strokeCircle(dx, dy, 34);
    if (pct < 1) {
      g.lineStyle(3, 0x6f8a5a, 0.9);
      g.beginPath();
      g.arc(dx, dy, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
      g.strokePath();
    } else {
      g.lineStyle(3, 0xffd76a, 0.9);
      g.strokeCircle(dx, dy, 29);
    }
    if (this.dashLabel) this.dashLabel.setAlpha(pct >= 1 ? 1 : 0.45);

    ['move', 'aim'].forEach((key) => {
      const s = this.touch[key];
      if (!s.active) return;
      g.fillStyle(0x1a2a16, 0.35);
      g.fillCircle(s.baseX, s.baseY, 52);
      g.lineStyle(2, 0xdfe8c8, 0.32);
      g.strokeCircle(s.baseX, s.baseY, 52);
      const kx = s.baseX + s.dx * 52;
      const ky = s.baseY + s.dy * 52;
      g.fillStyle(0xffe9a8, 0.5);
      g.fillCircle(kx, ky, 22);
      g.lineStyle(2, 0xfff6d8, 0.55);
      g.strokeCircle(kx, ky, 22);
    });
  }

  openPause() {
    if (!this.scene.isActive() || this.scene.isPaused() || this.player.isDead) return;
    Sfx.uiClick();
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // ------------------------------------------------------------ 主循环

  update(time, delta) {
    if (!this.player) return;
    this.updateSkill(time, delta);
    if (!this.player.isDead) this.player.update(time, delta);
    this.updateTouchUI();

    this.enemies.getChildren().forEach((e) => {
      if (e.active && !e.dying && e.updateAI) e.updateAI(time, delta);
    });

    // 清理越界子弹
    const out = (o) => o.x < ARENA.left - 60 || o.x > ARENA.right + 60 || o.y < ARENA.top - 60 || o.y > ARENA.bottom + 60;
    this.playerBullets.getChildren().slice().forEach((b) => {
      if (!b.active) return;
      if (time - b.bornAt > BALANCE.bulletLife * 1000 || out(b)) b.destroy();
    });
    this.enemyBullets.getChildren().slice().forEach((b) => {
      if (!b.active) return;
      if (time - b.bornAt > 3400 || out(b)) b.destroy();
    });

    // 金币吸附
    if (!this.player.isDead) {
      this.coins.getChildren().slice().forEach((c) => {
        if (!c.active) return;
        if (time < c.collectReadyAt) return;
        const d2 = dist2(c.x, c.y, this.player.x, this.player.y);
        if (d2 < 185 * 185) {
          const ang = Math.atan2(this.player.y - c.y, this.player.x - c.x);
          const sp = d2 < 60 * 60 ? 620 : 390;
          c.body.setGravityY(0);
          c.body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
        }
        if (d2 < 27 * 27) this.collectCoin(c, false);
      });
    }

    // 血包吸附
    if (!this.player.isDead) {
      this.healthPacks.getChildren().slice().forEach((h) => {
        if (!h.active || time < h.collectReadyAt) return;
        const d2 = dist2(h.x, h.y, this.player.x, this.player.y);
        if (d2 < 130 * 130) {
          const ang = Math.atan2(this.player.y - h.y, this.player.x - h.x);
          h.body.setGravityY(0);
          h.body.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
        }
        if (d2 < 30 * 30) this.collectHealthPack(h);
      });
    }

    // 碎片吸附
    if (!this.player.isDead) {
      this.fragments.getChildren().slice().forEach((f) => {
        if (!f.active) return;
        if (f.glow && f.glow.active) f.glow.setPosition(f.x, f.y);
        if (time < f.collectReadyAt) return;
        const d2 = dist2(f.x, f.y, this.player.x, this.player.y);
        if (d2 < 160 * 160) {
          const ang = Math.atan2(this.player.y - f.y, this.player.x - f.x);
          f.body.setGravityY(0);
          f.body.setVelocity(Math.cos(ang) * 360, Math.sin(ang) * 360);
        }
        if (d2 < 30 * 30) this.collectFragment(f, false);
      });
    }

    // 传送门
    if (this.portal && this.portal.armed && this.roomState === 'cleared' && !this.player.isDead) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);
      if (d < 46) this.nextLevel();
    }

    // 房间清理判定
    if (this.roomState === 'fighting' && this.pendingSpawns <= 0 && !this.player.isDead) {
      let alive = false;
      this.enemies.getChildren().forEach((e) => {
        if (e.active && !e.dying) alive = true;
      });
      if (!alive) this.finishRoom();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) && !this.scene.isPaused()) {
      this.openPause();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.mute)) {
      const muted = Store.toggleMute();
      Sfx.setMuted(muted);
      this.hud.toastQueue.push(muted ? '已静音（按 M 恢复）' : '音效已开启');
    }
  }
}
