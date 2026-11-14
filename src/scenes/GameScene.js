class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.endless = !!(data && data.endless);
    this.endlessWave = 1;
    this.endlessAwaitUpgrade = false;
    this.endlessAtkMul = 1;
    this.worldW = this.endless ? ENDLESS_W : GAME_W;
    this.worldH = this.endless ? ENDLESS_H : GAME_H;
    Object.assign(ARENA, this.endless ? ENDLESS_ARENA : ARENA_BASE);
    this.netHost = !!(data && data.netHost);
    this.guestCharacter = (data && data.guestCharacter) || 'gunner';
    this.guestRing = (data && data.guestRing) || null;
    this.guestLevel = Math.max(0, Math.floor(Number(data && data.guestLevel) || 0));
    this.guestSkillLevel = Math.max(0, Math.floor(Number(data && data.guestSkillLevel) || 0));
    this.guestRingUndyingUsed = false;
    this.guestRingExecuteUsed = false;
    this.guestRingBloodBonus = 0;
    this.guestInput = { moveX: 0, moveY: 0, fire: false, aimX: null, aimY: null };
    this.player2 = null;
    this.guestTag = null;
    this.guestRespawnAt = 0;
    this.guestDead = false;
    this.guestTouchAt = 0;
    this.guestWeaponId = null;
    this.guestSkill = {
      cooldownUntil: 0, total: 12000, type: null, activeUntil: 0,
      nextTick: 0, targets: [], beam: null, aura: null,
    };
    this.nextGuestStateReal = 0;
    this.guestFx = [];
    this.poisonPools = [];
    this.guestDrops = [];
    this.netIdSeq = 0;
    this.netIds = new WeakMap();
    this.hostDowned = false;
    this.guestDowned = false;
    this.hostReviveTimer = 0;
    this.guestReviveTimer = 0;
    this.reviveProgress = 0;
    this.reviveWho = null;
    this.coopEnding = false;
    // 「继续游戏」：读取上一次退出时的房间检查点
    const cp = (data && data.resume && Store.data.runCheckpoint
      && Number(Store.data.runCheckpoint.round) > 0)
      ? Store.data.runCheckpoint : null;
    this.resumeData = cp;
    this.acquiredUpgrades = cp && Array.isArray(cp.upgrades)
      ? cp.upgrades.filter((id) => UPGRADES.some((u) => u.id === id))
      : [];
    this.characterId = cp
      ? (cp.characterId || 'gunner')
      : ((data && data.character) || 'gunner');
    this.weaponId = cp && WEAPONS[cp.weaponId] ? cp.weaponId : 'pistol';
    this.weapon = WEAPONS[this.weaponId] || WEAPONS.pistol;
    this.previousWeaponId = null;
    this.round = cp ? Math.max(1, Math.floor(cp.round)) : 1;
    this.stage = cp ? Math.min(ROUND_LEN, Math.max(1, Math.floor(cp.stage))) : 1;
    this.mapKey = 'grass';
    this.mapName = '草原';
    this.currentMap = null;
    this.enemyLevel = 1;
    this.runCoins = cp ? Math.max(0, Math.floor(cp.runCoins || 0)) : 0;
    this.kills = cp ? Math.max(0, Math.floor(cp.kills || 0)) : 0;
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
      fireHeld: false,
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
      bulletSpeed: 1, spreadMul: 1, lifesteal: 0, twinChance: 0, deathBlast: 0,
      armor: 0, regen: 0, energyRegen: 1, luck: 0, pickup: 1, coinMul: 0,
      dashInvuln: 0, pierceBonus: 0, critChance: 0, thorns: 0, bulletLife: 1,
      healMul: 1, dropRate: 0, executioner: 0,
      freezeChance: 0, chainChance: 0, explosiveChance: 0, berserk: 0,
      lastStand: 0, bloodlust: 0,
    };
    if (cp && cp.buffs && typeof cp.buffs === 'object') {
      Object.keys(this.buffs).forEach((key) => {
        const v = cp.buffs[key];
        if (typeof v === 'number' && isFinite(v)) this.buffs[key] = v;
      });
    }
    if (this.endless && Store.data.equippedRing === 'teleport') Store.unequipRing();
    this.charLevel = Store.getCharLevel(this.characterId);
    if (!cp) {
      this.buffs.damage *= 1 + this.charLevel * CHAR_UPGRADE.damagePerLevel;
      this.buffs.fireRate *= Math.max(1 - CHAR_UPGRADE.maxSpeedBonus, 1 - this.charLevel * CHAR_UPGRADE.speedPerLevel);
    }
    this.lastEnergyWarn = 0;
    this.ghost = null;
    this.mercenary = null;
    this.mercPrompt = null;
    this.merchant = null;
    this.merchantPrompt = null;
    this.spawnRound = -1;
    this.mercSpawnsThisRound = 0;
    this.merchantSpawnsThisRound = 0;
    this.giantAura = null;
    this.guitarAura = null;
    this.guitarNextTick = 0;
    this.demonAura = null;
    this.mageBeam = null;
    this.mageNextTick = 0;
    this.vampireAura = null;
    this.vampireBeams = [];
    this.vampireNextTick = 0;
    this.sulfurBeam = null;
    this.sulfurNextTick = 0;
    this.sulfurLastAt = 0;
    this.visionUntil = 0;
    this.visionRadius = 120;
    this.visionOverlay = null;
    this.visionMask = null;
    this.visionMaskG = null;
    this.dualWield = cp ? !!cp.dualWield : false;
    this.secondaryId = cp && cp.secondaryId && WEAPONS[cp.secondaryId] ? cp.secondaryId : null;
    this.secondaryWeapon = this.secondaryId ? WEAPONS[this.secondaryId] : null;
    this.upgradeOpen = false;
    this.lastUpgradeRound = 0;
    this.startUpgradeShown = false;
    this.fragmentPity = 0;
    this.slimeStaffShots = 0;
    this.ringUndyingUsed = false;
    this.secondWindReady = false;
    this.ringTeleportUsed = false;
    this.ringExecuteUsed = false;
    this.ringBloodBonus = 0;
    this.treasurePot = 0;
    this.treasureEnabled = false;
    this.noScratchEnabled = false;
    this.roundNoDamage = true;
    this.noScratchTrackRound = -1;
    this.noScratchRound = -1;

    this.portal = null;
    this.demonPortal = null;
    this.demonReturnPortal = null;
    this.demonPortalShown = false;
    this.demonRealm = false;
    this.demonReturn = null;
    this.satanDefeated = false;
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
    this.groundImage = this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    if (this.endless) {
      this.groundImage.setTexture('ground_endless').setDisplaySize(ENDLESS_W, ENDLESS_H);
      this.currentMap = 'endless';
      this.mapName = '无尽草原';
    }
    this.decorObjects = [];

    this.physics.world.setBounds(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);

    const spawnX = this.endless ? (ENDLESS_ARENA.left + ENDLESS_ARENA.right) / 2 : 480;
    const spawnY = this.endless ? (ENDLESS_ARENA.top + ENDLESS_ARENA.bottom) / 2 + 40 : 405;
    this.player = new Player(this, spawnX, spawnY, this.characterId);
    if (this.resumeData) {
      const cp = this.resumeData;
      if (Number(cp.maxHp) > 0) this.player.maxHp = Math.floor(cp.maxHp);
      if (Number(cp.maxEnergy) > 0) this.player.maxEnergy = Math.floor(cp.maxEnergy);
      this.player.hp = this.player.maxHp;
      this.player.energy = this.player.maxEnergy;
      const size = this.buffs.size || 1;
      this.player.setScale(size);
      if (this.player.shadow) this.player.shadow.setScale(size);
      if (this.player.backSword) this.player.backSword.setScale(size);
    }
    if (this.netHost) {
      this.player2 = new Player(this, spawnX - 50, spawnY + 20, this.guestCharacter, this.guestLevel);
      this.player2.networkGuest = true;
      this.guestTag = this.add.text(spawnX - 50, spawnY - 32, '玩家2', UI.textStyle(10, {
        color: '#9fe8ff', strokeThickness: 3, bold: true, shadow: false,
      })).setOrigin(0.5).setDepth(880);
    }
    if (this.endless) {
      this.cameras.main.setBounds(0, 0, ENDLESS_W, ENDLESS_H);
      this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
      this.setupDecor('grass');
    }
    this.reviveText = this.add.text(0, 0, '', UI.textStyle(10, {
      color: '#9fe8ff', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(890).setVisible(false);
    this.enemies = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.healthPacks = this.physics.add.group();
    this.energyPacks = this.physics.add.group();
    this.fragments = this.physics.add.group();
    this.mercenaries = this.physics.add.group();

    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouchPlayer, null, this);
    this.physics.add.overlap(this.enemyBullets, this.mercenaries, this.onEnemyBulletHitMerc, null, this);
    this.physics.add.overlap(this.enemies, this.mercenaries, this.onEnemyTouchMerc, null, this);
    if (this.player2) {
      this.physics.add.overlap(this.player2, this.enemyBullets, this.onEnemyBulletHitGuest, null, this);
      this.physics.add.overlap(this.player2, this.enemies, this.onEnemyTouchGuest, null, this);
    }

    if (this.resumeData && this.resumeData.mercenary) {
      const mc = this.resumeData.mercenary;
      const merc = new Mercenary(this, 430, 425, mc.type);
      this.mercenaries.add(merc);
      merc.recruit();
      if (Number(mc.hp) > 0) merc.hp = Math.min(merc.maxHp, Math.floor(mc.hp));
      if (mc.weaponId && WEAPONS[mc.weaponId]) {
        merc.giveWeapon(mc.weaponId, WEAPONS[mc.weaponId]);
      }
      this.mercenary = merc;
    }

    this.setupFX();
    if (this.resumeData && this.resumeData.ghost) {
      this.summonGhost();
      if (this.ghost) {
        this.ghost.level = Math.max(1, Math.floor(this.resumeData.ghost.level || 1));
        this.ghost.ready = this.resumeData.ghost.ready !== false;
      }
    }
    this.setupAmbient();
    this.setupInput();

    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(900).setScrollFactor(0);

    this.scene.launch('UI');
    this.mercPrompt = UI.button(this, 480, 300, 190, 36, '收买', () => this.mercAction(), {
      fontSize: 13,
    }).setDepth(1200).setVisible(false).setScrollFactor(0);
    this.merchantPrompt = UI.button(this, 480, 300, 150, 34, '交易', () => this.openMerchant(), {
      fontSize: 13,
    }).setDepth(1200).setVisible(false).setScrollFactor(0);
    this.time.addEvent({ delay: 2000, loop: true, callback: () => Store.flush() });
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.autoCollectCoins() });

    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.touchMode = coarse;
    if (this.dashLabel) this.dashLabel.setVisible(coarse);
    this.hud.hintText = coarse
      ? '左半屏移动 · 右半屏瞄准 · 右下「射击/技能/切枪/闪」'
      : 'WASD 移动 · 鼠标瞄准 · 左键射击 · 空格翻滚 · E 技能';
    this.hud.hintUntil = this.time.now + 9000;

    if (this.netHost) {
      Net.onInput = (data) => {
        if (!this.netHost) return;
        this.guestInput = data || this.guestInput;
      };
      Net.onAction = (data) => this.handleGuestAction(data);
      Net.onGuestLeft = () => this.removeGuest();
      this.time.delayedCall(120, () => {
        if (this.netHost && this.player2) this.sendGuestState(this.time.now, true);
      });
      // 房主暂停/选强化时 Game.update 不跑，但客人仍需要画面
      this.guestStateTimer = setInterval(() => {
        if (!this.netHost || !this.player2 || !this.scene.isActive()) return;
        if (this.upgradeOpen || (this.scene.isPaused && this.scene.isPaused())) {
          this.sendGuestState(this.time.now, true);
        }
      }, 100);
    }

    if (this.endless) {
      this.startEndlessWave();
    } else {
      this.startRoom(this.round, this.stage);
    }
    this.events.once('shutdown', () => Object.assign(ARENA, ARENA_BASE));
    if (this.netHost) {
      this.events.once('shutdown', () => {
        Net.onInput = null;
        Net.onAction = null;
        Net.onGuestLeft = null;
        if (this.guestStateTimer) {
          clearInterval(this.guestStateTimer);
          this.guestStateTimer = null;
        }
        Net.close();
      });
    }

    // 继续游戏时不重复弹出开局强化；无尽挑战/联机不弹开局强化（避免开局就暂停）
    if (!this.resumeData && !this.endless && !this.netHost) {
      this.time.delayedCall(700, () => {
        if (!this.scene.isActive()) return;
        this.openUpgrade(true);
      });
    }
  }

  // ------------------------------------------------------------ 场景搭建

  setupDecor(mapKey) {
    if (this.decorObjects) {
      this.decorObjects.forEach((img) => {
        this.tweens.killTweensOf(img);
        if (img.active) img.destroy();
      });
    }
    this.decorObjects = [];

    if (mapKey === 'mountain') {
      const keys = ['pebble_deco', 'pebble_deco', 'tuft', 'bush_deco'];
      for (let i = 0; i < 18; i++) {
        const x = rand(ARENA.left + 24, ARENA.right - 24);
        const y = rand(ARENA.top + 24, ARENA.bottom - 12);
        const key = choice(keys);
        const img = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(2).setAlpha(0.92);
        if (key === 'tuft') img.setTint(0x9aa88a);
        if (key === 'bush_deco') img.setTint(0x6f7f5a).setScale(0.9);
        if (key !== 'pebble_deco') {
          this.tweens.add({
            targets: img, angle: rand(-2, 2), duration: rand(1800, 3000),
            yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: rand(0, 1200),
          });
        }
        this.decorObjects.push(img);
      }
      const bushSpots = [
        [ARENA.left + 60, ARENA.top + 80], [ARENA.right - 70, ARENA.top + 100],
        [ARENA.left + 80, ARENA.bottom - 80], [ARENA.right - 80, ARENA.bottom - 90],
      ];
      bushSpots.forEach(([x, y]) => {
        const img = this.add.image(x, y, 'bush_deco').setOrigin(0.5, 1)
          .setDepth(2).setAlpha(0.9).setScale(1.1).setTint(0x6f7f5a);
        this.decorObjects.push(img);
      });
      return;
    }

    if (mapKey === 'demon_realm') {
      const keys = ['demon_pillar_deco', 'lava_rock_deco', 'demon_skull_deco', 'lava_rock_deco'];
      for (let i = 0; i < 16; i++) {
        const x = rand(ARENA.left + 30, ARENA.right - 30);
        const y = rand(ARENA.top + 30, ARENA.bottom - 20);
        const key = choice(keys);
        const img = this.add.image(x, y, key).setOrigin(0.5, 1)
          .setDepth(2).setAlpha(0.92);
        if (key === 'demon_pillar_deco') img.setScale(0.9 + Math.random() * 0.3);
        this.decorObjects.push(img);
      }
      for (let i = 0; i < 6; i++) {
        const fog = this.add.image(rand(80, 880), rand(100, 440), 'fog_deco')
          .setDepth(3).setAlpha(0.14 + Math.random() * 0.1)
          .setTint(0xff5a4a).setScale(0.9 + Math.random() * 0.5);
        this.tweens.add({
          targets: fog, x: fog.x + rand(20, 50), alpha: 0.06,
          duration: rand(4000, 8000), yoyo: true, repeat: -1, ease: 'Sine.InOut',
        });
        this.decorObjects.push(fog);
      }
      return;
    }

    if (mapKey === 'dragon_nest') {
      const keys = ['nest_deco', 'dragon_egg_deco', 'dragon_bone_deco', 'crystal_deco', 'dragon_egg_deco'];
      for (let i = 0; i < 18; i++) {
        const x = rand(ARENA.left + 28, ARENA.right - 28);
        const y = rand(ARENA.top + 36, ARENA.bottom - 20);
        const img = this.add.image(x, y, choice(keys)).setOrigin(0.5, 1)
          .setDepth(2).setAlpha(0.9);
        if (img.texture.key === 'crystal_deco') {
          this.tweens.add({
            targets: img, alpha: 0.55, duration: rand(700, 1300),
            yoyo: true, repeat: -1, ease: 'Sine.InOut',
          });
        }
        this.decorObjects.push(img);
      }
      return;
    }

    if (mapKey === 'heaven') {
      const keys = ['cloud_deco', 'cloud_deco', 'holy_pillar_deco', 'star_deco', 'cloud_deco'];
      for (let i = 0; i < 20; i++) {
        const x = rand(ARENA.left + 24, ARENA.right - 24);
        const y = rand(ARENA.top + 28, ARENA.bottom - 14);
        const img = this.add.image(x, y, choice(keys)).setOrigin(0.5, 1)
          .setDepth(2).setAlpha(0.9);
        if (img.texture.key === 'cloud_deco') {
          img.setScale(0.8 + Math.random() * 0.6).setAlpha(0.55 + Math.random() * 0.25);
          this.tweens.add({
            targets: img, x: img.x + rand(14, 40), alpha: 0.35,
            duration: rand(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.InOut',
          });
        }
        if (img.texture.key === 'star_deco') {
          this.tweens.add({
            targets: img, alpha: 0.3, duration: rand(600, 1200),
            yoyo: true, repeat: -1, ease: 'Sine.InOut',
          });
        }
        this.decorObjects.push(img);
      }
      for (let i = 0; i < 5; i++) {
        const fog = this.add.image(rand(90, 870), rand(120, 430), 'fog_deco')
          .setDepth(3).setAlpha(0.12 + Math.random() * 0.08)
          .setTint(0xfff2c8).setScale(1.0 + Math.random() * 0.7);
        this.tweens.add({
          targets: fog, x: fog.x + rand(20, 60), alpha: 0.04,
          duration: rand(6000, 10000), yoyo: true, repeat: -1, ease: 'Sine.InOut',
        });
        this.decorObjects.push(fog);
      }
      return;
    }

    if (mapKey === 'graveyard') {
      const keys = ['tombstone_deco', 'tombstone_deco', 'tombcross_deco', 'dead_tree_deco', 'candle_deco', 'tombstone_deco'];
      for (let i = 0; i < 18; i++) {
        const x = rand(ARENA.left + 30, ARENA.right - 30);
        const y = rand(ARENA.top + 34, ARENA.bottom - 22);
        const key = choice(keys);
        const img = this.add.image(x, y, key).setOrigin(0.5, 1)
          .setDepth(2).setAlpha(0.9);
        if (key === 'dead_tree_deco') {
          img.setScale(0.75 + Math.random() * 0.3).setTint(0x7a8a78);
        }
        if (key === 'candle_deco') {
          img.setScale(0.8);
          this.tweens.add({
            targets: img, alpha: 0.55, duration: rand(420, 720), yoyo: true,
            repeat: -1, ease: 'Sine.InOut',
          });
        }
        this.decorObjects.push(img);
      }
      for (let i = 0; i < 7; i++) {
        const fog = this.add.image(rand(80, 880), rand(100, 440), 'fog_deco')
          .setDepth(3).setAlpha(0.18 + Math.random() * 0.12)
          .setScale(0.8 + Math.random() * 0.6);
        this.tweens.add({
          targets: fog,
          x: fog.x + rand(20, 60),
          alpha: 0.08,
          duration: rand(5000, 9000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        this.decorObjects.push(fog);
      }
      return;
    }

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
      this.decorObjects.push(img);
    }
    const bushSpots = [
      [ARENA.left + 60, ARENA.top + 70], [ARENA.right - 70, ARENA.top + 90],
      [ARENA.left + 80, ARENA.bottom - 70], [ARENA.right - 80, ARENA.bottom - 80],
    ];
    bushSpots.forEach(([x, y]) => {
      const img = this.add.image(x, y, 'bush_deco').setOrigin(0.5, 1).setDepth(2).setAlpha(0.9).setScale(1.1);
      this.decorObjects.push(img);
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
    this.input.keyboard.on('keydown-Q', () => this.switchWeapon());

    this.touchGfx = this.add.graphics().setDepth(950).setScrollFactor(0);
    this.dashLabel = this.add.text(700, 370, '闪', UI.textStyle(22, {
      color: '#fff1c8', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(951).setScrollFactor(0).setVisible(false);
  }

  relayFx(ev) {
    if (!this.netHost) return;
    this.guestFx.push(ev);
    if (this.guestFx.length > 80) this.guestFx.splice(0, this.guestFx.length - 80);
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
      scene.relayFx({ k: 'ring', x, y, c: color, a: alpha == null ? 0.9 : alpha, s: from, e: to, d: duration });
      const img = scene.add.image(x, y, 'ring')
        .setTint(color).setScale(from).setAlpha(alpha == null ? 0.9 : alpha)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth == null ? 750 : depth);
      scene.tweens.add({
        targets: img, scale: to, alpha: 0, duration, ease: 'Sine.Out',
        onComplete: () => img.destroy(),
      });
      return img;
    };

    fx.muzzle = (x, y, angle, color, power) => {
      scene.relayFx({ k: 'muzzle', x, y, r: angle, c: color, p: power || 0 });
      const img = scene.add.image(x, y, 'muzzle')
        .setRotation(rand(-0.4, 0.4))
        .setScale(rand(0.55, 0.85))
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(705);
      if (color != null) img.setTint(color);
      scene.tweens.add({
        targets: img, alpha: 0, scaleX: 1.15, scaleY: 1.15, duration: 90,
        onComplete: () => img.destroy(),
      });
      sparks.explode(2, x, y);
      if (color != null) fx.shotBurst(x, y, color, power || 0);
    };

    fx.shotBurst = (x, y, color, power) => {
      const p = Math.min(6, power || 0);
      const ring = scene.add.image(x, y, 'ring')
        .setTint(color).setScale(0.12 + p * 0.02).setAlpha(0.7)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(719);
      scene.tweens.add({
        targets: ring, scale: 0.45 + p * 0.09, alpha: 0,
        duration: 160, onComplete: () => ring.destroy(),
      });
      const glow = scene.add.image(x, y, 'glow')
        .setTint(color).setScale(0.25 + p * 0.04).setAlpha(0.55)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(720);
      scene.tweens.add({
        targets: glow, alpha: 0, scale: 0.5 + p * 0.07,
        duration: 140, onComplete: () => glow.destroy(),
      });
      if (p >= 3) sparks.explode(2 + p, x, y);
    };

    fx.weaponHit = (x, y, color, power) => {
      const p = Math.min(6, power || 0);
      sparks.explode(4 + p, x, y);
      const c = color == null ? 0xffe066 : color;
      const ring = scene.add.image(x, y, 'ring')
        .setTint(c).setScale(0.14 + p * 0.02).setAlpha(0.8)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(745);
      scene.tweens.add({
        targets: ring, scale: 0.45 + p * 0.09, alpha: 0,
        duration: 220, onComplete: () => ring.destroy(),
      });
      const glow = scene.add.image(x, y, 'glow')
        .setTint(c).setScale(0.3 + p * 0.05).setAlpha(0.5)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(744);
      scene.tweens.add({
        targets: glow, alpha: 0, scale: 0.7 + p * 0.08,
        duration: 180, onComplete: () => glow.destroy(),
      });
    };

    fx.shell = (x, y) => { scene.relayFx({ k: 'shell', x, y }); shells.explode(1, x, y); };
    fx.hitSpark = (x, y) => { sparks.explode(4, x, y); };
    fx.hopDust = (x, y) => { dust.explode(2, x, y); };

    fx.dash = (x, y) => {
      scene.relayFx({ k: 'ring', x, y: y + 8, c: 0x9ff0e0, a: 0.55, s: 0.2, e: 0.8, d: 300 });
      dust.explode(9, x, y);
      fx.ring(x, y + 8, 0x9ff0e0, 0.2, 0.8, 300, 0.55, 720);
    };

    fx.enemyDeath = (x, y, type) => {
      scene.relayFx({ k: 'death', x, y, t: type });
      goo.explode(type === 'bat' ? 10 : 15, x, y);
      smoke.explode(type === 'bat' ? 2 : 4, x, y);
      fx.ring(x, y, 0x9ff0a8, 0.12, 0.6, 300, 0.5, 740);
    };

    fx.coinPop = (x, y) => { sparks.explode(3, x, y); };

    fx.floatingText = (x, y, text, color) => {
      scene.relayFx({ k: 'text', x, y, t: text, c: color });
      const t = scene.add.text(x, y, text, UI.textStyle(17, {
        color: color || '#ffe9a8', strokeThickness: 4,
      })).setOrigin(0.5).setDepth(780);
      scene.tweens.add({
        targets: t, y: y - 36, alpha: 0, duration: 700, ease: 'Sine.Out',
        onComplete: () => t.destroy(),
      });
    };

    fx.healBurst = (x, y, amount) => {
      scene.relayFx({ k: 'heal', x, y, n: amount || 0 });
      goo.explode(10, x, y);
      const img = scene.add.image(x, y - 18, 'heal').setDepth(760).setScale(1.1);
      scene.tweens.add({
        targets: img, y: y - 54, alpha: 0, duration: 650, ease: 'Sine.Out',
        onComplete: () => img.destroy(),
      });
      scene.tweens.add({ targets: img, scale: 1.4, duration: 650 });
      if (amount) fx.floatingText(x, y - 30, '+' + amount, '#9ff0a8');
    };

    fx.spawnWarning = (x, y, delay, color) => {
      const img = scene.add.image(x, y, 'spawnring')
        .setTint(color || 0xff6a5a).setScale(0.15).setAlpha(0).setDepth(3);
      scene.tweens.add({
        targets: img, alpha: 0.85, scale: 0.62, duration: Math.max(130, delay * 0.7),
        ease: 'Sine.Out',
        onComplete: () => {
          scene.tweens.add({ targets: img, alpha: 0, duration: 110, onComplete: () => img.destroy() });
        },
      });
    };

    fx.telegraph = (x, y, r, color, duration) => {
      scene.relayFx({ k: 'telegraph', x, y, rad: r, c: color, d: duration || 500 });
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
      scene.relayFx({ k: 'bossSlam', x, y });
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
      scene.relayFx({ k: 'bossDeath', x, y });
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

  mapInfoForRound(round) {
    if (round >= 10) return { key: 'heaven', name: '天堂', ground: 'ground_heaven' };
    if (round >= 7) return { key: 'dragon_nest', name: '龙巢', ground: 'ground_dragon_nest' };
    if (round >= 6) return { key: 'graveyard', name: '墓地', ground: 'ground_graveyard' };
    if (round >= 3) return { key: 'mountain', name: '山地', ground: 'ground_mountain' };
    return { key: 'grass', name: '草原', ground: 'ground' };
  }

  startRoom(round, stage) {
    this.clearVision();
    this.demonRealm = false;
    this.demonReturn = null;
    this.satanDefeated = false;
    this.destroyDemonPortal();
    this.destroySatanReturnPortal();
    this.round = round;
    this.stage = stage;
    if (this.noScratchTrackRound !== round) {
      this.noScratchTrackRound = round;
      this.roundNoDamage = true;
    }
    if (this.spawnRound !== round) {
      this.spawnRound = round;
      this.mercSpawnsThisRound = 0;
      this.merchantSpawnsThisRound = 0;
    }
    this.enemyLevel = levelIndex(round, stage);
    this.transitioning = false;
    this.locked = true;
    this.roomState = 'intro';
    this.boss = null;
    this.pendingSpawns = 0;
    this.spawnQueue = [];

    const mapInfo = this.mapInfoForRound(round);
    const mapKey = mapInfo.key;
    this.mapName = mapInfo.name;
    if (this.currentMap !== mapKey) {
      this.currentMap = mapKey;
      if (this.groundImage) this.groundImage.setTexture(mapInfo.ground);
      this.setupDecor(mapKey);
    }

    this.cancelSkill();
    this.stopSulfurBeam();
    if (this.player && this.player.cancelTridentChannel) this.player.cancelTridentChannel();
    this.destroyPortal();
    this.clearRoomObjects();

    this.tweens.killTweensOf(this.player);
    if (this.player.cancelCharge) this.player.cancelCharge();
    this.player.setPosition(480, 405);
    this.player.setAlpha(1).setAngle(0).clearTint();
    this.player.gun.setVisible(true).setAlpha(1);
    this.player.body.enable = true;
    this.player.body.setVelocity(0, 0);
    this.player.invulnUntil = this.time.now + 700;
    this.player.nextShotAt = this.time.now + 350;
    if (this.player2) {
      if (!this.player2.isDead) {
        this.player2.setPosition(430, 425);
        this.player2.body.setVelocity(0, 0);
      }
      if (this.guestTag) this.guestTag.setPosition(this.player2.x, this.player2.y - 52);
    }

    if (this.mercPrompt) this.mercPrompt.setVisible(false);
    if (this.merchantPrompt) this.merchantPrompt.setVisible(false);
    this.clearMerchant();
    if (this.mercenary) {
      if (!this.mercenary.active) {
        this.mercenary = null;
      } else if (!this.mercenary.recruited) {
        this.mercenary.destroy();
        this.mercenary = null;
      } else {
        this.mercenary.setPosition(430, 425);
        this.mercenary.setVelocity(0, 0);
        this.mercenary.clearTint();
      }
    }

    this.hud.hpDirty = true;
    this.hud.bannerQueue.push({
      title: `${round}-${stage}`,
      sub: stage === ROUND_LEN ? `BOSS 房间 · ${this.mapName}` : this.mapName,
      color: stage === ROUND_LEN ? '#ff9a6a' : '#ffe9a8',
    });

    this.cameras.main.fadeIn(380, 6, 12, 6);
    this.saveCheckpoint();

    this.time.delayedCall(960, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.locked = false;
      this.roomState = 'fighting';
      if (stage === ROUND_LEN) this.startBossRoom();
      else this.startNormalRoom();
    });
  }

  // ------------------------------------------------------------ 无尽挑战

  startEndlessWave() {
    if (!this.player || this.player.isDead) return;
    this.endlessAwaitUpgrade = false;
    this.round = 1 + (this.endlessWave - 1) * 0.55;
    this.stage = 1;
    this.enemyLevel = 1 + (this.endlessWave - 1) * 0.9;
    this.endlessAtkMul = 1 + Math.min(0.6, (this.endlessWave - 1) * 0.02);
    this.transitioning = false;
    this.locked = true;
    this.roomState = 'intro';
    this.boss = null;
    this.pendingSpawns = 0;
    this.spawnQueue = [];
    this.destroyPortal();
    this.clearRoomObjects();
    this.player.body.setVelocity(0, 0);
    this.player.invulnUntil = Math.max(this.player.invulnUntil, this.time.now + 500);
    if (this.guestTag && this.player2) this.guestTag.setPosition(this.player2.x, this.player2.y - 52);
    this.hud.hpDirty = true;
    this.hud.bannerQueue.push({
      title: `无尽 · 第 ${this.endlessWave} 波`,
      sub: '怪物更多、更强，精英和 Boss 出现概率提高',
      color: '#ffd76a',
    });
    this.cameras.main.flash(180, 255, 230, 160);
    this.time.delayedCall(760, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.locked = false;
      this.roomState = 'fighting';
      const count = Math.min(60, 10 + Math.floor(this.endlessWave * 3));
      const pool = this.endlessEnemyPool(this.endlessWave);
      for (let i = 0; i < count; i++) this.spawnQueue.push(choice(pool));
      this.pendingSpawns = this.spawnQueue.length;
      this.spawnNextBatch();
      this.maybeSpawnEndlessBosses();
    });
  }

  endlessEnemyPool(wave) {
    const base = ['slime', 'goblin', 'bat', 'slime', 'boar'];
    if (wave < 3) return base;
    const pool = base.concat(['mushroom', 'boar', 'goat', 'bat', 'goblin']);
    if (wave >= 6) pool.push('ghost', 'dragonling');
    if (wave >= 10) pool.push('angel_guard', 'cloud_wisp', 'temple_knight', 'angel_guard');
    if (wave >= 16) pool.push('temple_knight', 'ghost', 'dragonling');
    return pool;
  }

  maybeSpawnEndlessBosses() {
    const wave = this.endlessWave;
    if (wave < 4) return;
    const chance = Math.min(0.88, (wave - 3) * 0.055);
    if (Math.random() > chance) return;
    const maxCount = wave >= 25 ? 5 : (wave >= 18 ? 4 : (wave >= 12 ? 3 : (wave >= 8 ? 2 : 1)));
    let count = 1;
    while (count < maxCount && Math.random() < 0.46) count++;
    const pool = ['slime', 'boar'];
    if (wave >= 8) pool.push('mushroom', 'bat');
    if (wave >= 12) pool.push('goat');
    if (wave >= 15) pool.push('dragon');
    if (wave >= 20) pool.push('satan');
    if (wave >= 25) pool.push('angel');
    const names = [];
    for (let i = 0; i < count; i++) {
      const kind = choice(pool);
      const elite = Math.random() < Math.min(0.55, wave * 0.018);
      const ang = (i / count) * Math.PI * 2 + rand(-0.25, 0.25);
      const dist = 220 + rand(0, 90);
      const x = clamp(this.player.x + Math.cos(ang) * dist, ARENA.left + 70, ARENA.right - 70);
      const y = clamp(this.player.y + Math.sin(ang) * dist, ARENA.top + 70, ARENA.bottom - 70);
      let boss;
      if (kind === 'boar') boss = new BoarKingBoss(this, x, y, this.enemyLevel, elite);
      else if (kind === 'mushroom') boss = new MushroomFiendBoss(this, x, y, this.enemyLevel, elite);
      else if (kind === 'bat') boss = new BatKingBoss(this, x, y, this.enemyLevel, elite);
      else if (kind === 'goat') boss = new GoatKingBoss(this, x, y, this.enemyLevel, elite);
      else if (kind === 'dragon') boss = new DragonBabyBoss(this, x, y, this.enemyLevel);
      else if (kind === 'satan') boss = new SatanBoss(this, x, y, this.enemyLevel);
      else if (kind === 'angel') boss = new AngelBoss(this, x, y, this.enemyLevel);
      else boss = new Boss(this, x, y, this.enemyLevel, elite);
      this.enemies.add(boss);
      boss.setAlpha(1);
      this.boss = boss;
      names.push(boss.bossName);
      this.fx.ring(x, y, elite ? 0xffd76a : 0xff9a6a, 0.3, 2.2, 600, 0.9, 745);
    }
    this.cameras.main.shake(300, 0.008);
    Sfx.bossRoar();
    this.hud.toastQueue.push(`第 ${wave} 波 Boss：${names.join('、')} 出现了！`);
  }

  finishEndlessWave(clearedWave) {
    this.roomState = 'cleared';
    this.locked = true;
    const wave = clearedWave || this.endlessWave;
    const heal = BALANCE.clearHeal + this.buffs.healBonus + Math.floor(wave * 0.8);
    if (!this.player.isDead) {
      this.player.heal(heal);
      this.fx.healBurst(this.player.x, this.player.y, heal);
    }
    const bonus = 25 + wave * 14;
    this.runCoins += bonus;
    Store.addCoins(bonus);
    this.hud.coinDirty = true;
    const w = this.pickFragmentWeapon();
    if (w) {
      const amount = 1 + Math.floor(wave / 5);
      Store.addFragment(w.id, amount);
      this.hud.toastQueue.push(`波次奖励：${w.name}碎片 ×${amount}`);
    }
    const ringIds = Object.keys(RINGS);
    if (ringIds.length && Math.random() < Math.min(0.8, 0.25 + wave * 0.02)) {
      const rid = choice(ringIds);
      const amount = 1 + Math.floor(wave / 8);
      Store.addRingFragment(rid, amount);
      this.hud.toastQueue.push(`波次奖励：${RINGS[rid].name}碎片 ×${amount}`);
    }
    Store.flush();
    this.endlessWave = wave + 1;
    this.endlessAwaitUpgrade = true;
    this.hud.bannerQueue.push({
      title: `第 ${wave} 波完成`,
      sub: '选择强化，准备下一波',
      color: '#9ff0a8',
    });
    Sfx.levelClear();
    this.time.delayedCall(650, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.openUpgrade(false);
    });
  }

  // 房间开局检查点：回到主菜单后可以继续到这一回合，但当前房间会重打
  saveCheckpoint() {
    if (this.endless) return;
    if (!this.player || this.player.isDead || this.gameOverStarted) return;
    Store.data.runCheckpoint = {
      characterId: this.characterId,
      round: this.round,
      stage: this.stage,
      weaponId: this.weaponId,
      dualWield: !!this.dualWield,
      secondaryId: this.secondaryId || null,
      buffs: Object.assign({}, this.buffs),
      upgrades: this.acquiredUpgrades.slice(),
      maxHp: Math.round(this.player.maxHp),
      maxEnergy: Math.round(this.player.maxEnergy),
      runCoins: this.runCoins,
      kills: this.kills,
      ghost: this.ghost ? { level: this.ghost.level, ready: !!this.ghost.ready } : null,
      mercenary: this.mercenary && this.mercenary.active && this.mercenary.recruited
        ? {
          type: this.mercenary.mercType,
          hp: this.mercenary.hp,
          weaponId: this.mercenary.givenWeapon ? this.mercenary.givenWeapon.id : null,
        }
        : null,
      savedAt: Date.now(),
    };
    Store.save();
  }

  startVisionShrink(duration, radius, target) {
    this.visionUntil = Math.max(this.visionUntil || 0, this.time.now + duration);
    this.visionRadius = radius || 120;
    this.visionTarget = target || this.player;
    if (!this.visionOverlay) {
      this.visionMaskG = this.make.graphics({ x: 0, y: 0, add: false });
      this.visionMask = this.visionMaskG.createGeometryMask();
      this.visionMask.invertAlpha = true;
      this.visionOverlay = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.94)
        .setOrigin(0)
        .setDepth(880)
        .setScrollFactor(0)
        .setMask(this.visionMask);
    }
  }

  updateVision() {
    if (!this.visionUntil) return;
    if (this.time.now >= this.visionUntil) {
      this.clearVision();
      return;
    }
    if (this.visionMaskG && this.player) {
      const p = this.visionTarget && !this.visionTarget.isDead ? this.visionTarget : this.player;
      this.visionMaskG.clear();
      this.visionMaskG.fillStyle(0xffffff, 1);
      this.visionMaskG.fillCircle(p.x, p.y - 4, this.visionRadius);
    }
  }

  clearVision() {
    this.visionUntil = 0;
    if (this.visionOverlay) {
      this.visionOverlay.clearMask();
      this.visionOverlay.destroy();
      this.visionOverlay = null;
    }
    if (this.visionMask) {
      this.visionMask.destroy();
      this.visionMask = null;
    }
    if (this.visionMaskG) {
      this.visionMaskG.destroy();
      this.visionMaskG = null;
    }
  }

  clearRoomObjects() {
    this.clearPoisonPools();
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
    this.energyPacks.getChildren().slice().forEach((e) => {
      if (e.active) e.destroy();
    });
    this.energyPacks.clear(false, false);
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
    const round = this.round;
    const total = Math.min(4 + Math.floor((n - 1) * 1.15) + (round - 1), 18);
    const types = [];
    if (round >= 10) {
      const pool = ['angel_guard', 'angel_guard', 'cloud_wisp', 'temple_knight', 'cloud_wisp', 'angel_guard'];
      for (let i = 0; i < total; i++) types.push(choice(pool));
      return types;
    }
    for (let i = 0; i < total; i++) {
      const r = Math.random();
      let type = 'slime';
      // 第二轮蘑菇/野猪，第三轮山羊精，第六轮亡灵，第七轮小飞龙
      if (round >= 7 && r < 0.12) type = 'dragonling';
      else if (round >= 6 && r < 0.22) type = 'ghost';
      else if (round >= 3 && r < 0.34) type = 'goat';
      else if (round >= 2 && r < 0.46) type = 'mushroom';
      else if (round >= 2 && r < 0.58) type = 'boar';
      else if (n >= 4 && r < 0.71) type = 'bat';
      else if (n >= 2 && r < 0.86) type = 'goblin';
      else type = 'slime';
      types.push(type);
    }
    return types;
  }

  startNormalRoom() {
    const types = this.buildEnemyList();
    this.spawnQueue = types;
    this.pendingSpawns = types.length;
    this.spawnNextBatch();
    this.maybeSpawnMercenary();
    this.maybeSpawnMerchant();
  }

  maybeSpawnMercenary() {
    if (this.mercenary || this.mercSpawnsThisRound >= 2 || Math.random() > 0.07) return;
    this.mercSpawnsThisRound++;
    this.spawnMercenary(Math.random() < 0.5 ? 'xuan' : 'liang');
  }

  spawnMercenary(type) {
    if (this.mercenary) return this.mercenary;
    const spot = this.pickSpawnPoint();
    const merc = new Mercenary(this, spot.x, spot.y, type);
    this.mercenary = merc;
    this.mercenaries.add(merc);
    this.hud.toastQueue.push(`附近出现了佣兵「${merc.mercName}」，靠近可以收买`);
    this.fx.ring(merc.x, merc.y, 0xffd76a, 0.2, 1.5, 500, 0.8, 740);
    return merc;
  }

  spawnNextBatch() {
    if (this.roomState !== 'fighting' || this.spawnQueue.length === 0) return;
    const batch = this.endless
      ? Math.min(5 + Math.floor(this.endlessWave / 4), this.spawnQueue.length)
      : Math.min(2 + (this.enemyLevel >= 5 ? 1 : 0), this.spawnQueue.length);
    const eliteChance = this.endless
      ? Math.min(0.45, 0.06 + this.endlessWave * 0.015)
      : Math.min(0.06 + (this.round - 1) * 0.05 + (this.enemyLevel - 1) * 0.006, 0.30);
    for (let i = 0; i < batch; i++) {
      const type = this.spawnQueue.shift();
      const pt = this.pickSpawnPoint();
      const elite = Math.random() < eliteChance;
      this.scheduleSpawn(type, pt.x, pt.y, this.endless ? 340 + i * 110 : 480 + i * 170, elite);
    }
    if (this.spawnQueue.length > 0) {
      this.time.delayedCall(this.endless ? 600 : 1350, () => {
        if (this.scene.isActive()) this.spawnNextBatch();
      });
    }
  }

  scheduleSpawn(type, x, y, delay, elite) {
    this.fx.spawnWarning(x, y, delay, elite ? 0xffd76a : 0xff6a5a);
    this.time.delayedCall(delay, () => {
      if (!this.scene.isActive()) return;
      this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
      if (this.roomState !== 'fighting' || this.transitioning) return;
      this.spawnEnemyAt(type, x, y, false, elite);
    });
  }

  pickSpawnPoint() {
    if (this.endless) {
      for (let i = 0; i < 40; i++) {
        const a = rand(0, Math.PI * 2);
        const d = rand(210, 500);
        const x = clamp(this.player.x + Math.cos(a) * d, ARENA.left + 48, ARENA.right - 48);
        const y = clamp(this.player.y + Math.sin(a) * d, ARENA.top + 48, ARENA.bottom - 48);
        if (dist2(x, y, this.player.x, this.player.y) > 185 * 185) return { x, y };
      }
      return {
        x: clamp(this.player.x + 260, ARENA.left + 48, ARENA.right - 48),
        y: clamp(this.player.y, ARENA.top + 48, ARENA.bottom - 48),
      };
    }
    for (let i = 0; i < 40; i++) {
      const x = rand(ARENA.left + 48, ARENA.right - 48);
      const y = rand(ARENA.top + 48, ARENA.bottom - 48);
      if (dist2(x, y, this.player.x, this.player.y) > 185 * 185) return { x, y };
    }
    return { x: 480, y: ARENA.top + 80 };
  }

  startBossRoom() {
    this.pendingSpawns = 1;
    const spec = this.bossSpecForRound(this.round);
    this.time.delayedCall(750, () => {
      if (!this.scene.isActive() || this.roomState !== 'fighting') return;
      this.pendingSpawns = 0;
      if (spec.kind === 'bat_combo') {
        this.spawnBossCombo();
        return;
      }
      if (spec.kind === 'goat_combo') {
        this.spawnBossCombo6();
        return;
      }
      this.spawnBoss(spec);
      this.spawnEnemyAt('slime', 300, 250, true);
      this.spawnEnemyAt('slime', 660, 250, true);
    });
  }

  bossSpecForRound(round) {
    if (round >= 10) return { kind: 'angel', elite: false };
    if (round === 5) return { kind: 'bat_combo', elite: true };
    if (round === 6) return { kind: 'goat_combo', elite: true };
    if (round === 7) return { kind: 'dragon', elite: false };
    const r = ((round - 1) % 4) + 1;
    if (r === 1) return { kind: 'slime', elite: false };
    if (r === 2) return { kind: 'boar', elite: false };
    if (r === 3) return { kind: Math.random() < 0.5 ? 'slime' : 'boar', elite: true };
    return { kind: 'mushroom', elite: false };
  }

  spawnBossCombo() {
    const mushroom = new MushroomFiendBoss(this, 350, 225, this.enemyLevel, true);
    const bat = new BatKingBoss(this, 610, 205, this.enemyLevel, false);
    [mushroom, bat].forEach((boss) => {
      this.enemies.add(boss);
      boss.setAlpha(1);
    });
    this.boss = bat;
    this.cameras.main.shake(360, 0.009);
    Sfx.bossRoar();
    this.hud.toastQueue.push('精英蘑菇怪客 与 蝙蝠王 出现了！');
    this.fx.ring(mushroom.x, mushroom.y, 0xb07bff, 0.3, 2.2, 700, 0.9, 745);
    this.fx.ring(bat.x, bat.y, 0xff8a6a, 0.3, 2.2, 700, 0.9, 745);
  }

  spawnBossCombo6() {
    const goat = new GoatKingBoss(this, 350, 220, this.enemyLevel, false);
    let king;
    const roll = Math.random();
    if (roll < 1 / 3) {
      king = new Boss(this, 610, 205, this.enemyLevel, true);
    } else if (roll < 2 / 3) {
      king = new BoarKingBoss(this, 610, 205, this.enemyLevel, true);
    } else {
      king = new MushroomFiendBoss(this, 610, 215, this.enemyLevel, true);
    }
    [goat, king].forEach((boss) => {
      this.enemies.add(boss);
      boss.setAlpha(1);
    });
    this.boss = king;
    this.cameras.main.shake(380, 0.009);
    Sfx.bossRoar();
    this.hud.toastQueue.push(`山羊王 与 ${king.bossName} 出现了！`);
    this.fx.ring(goat.x, goat.y, 0xd9b45a, 0.3, 2.2, 700, 0.9, 745);
    this.fx.ring(king.x, king.y, 0xff8a6a, 0.3, 2.2, 700, 0.9, 745);
  }

  spawnBoss(spec) {
    let boss;
    if (spec.kind === 'boar') {
      boss = new BoarKingBoss(this, 480, 230, this.enemyLevel, spec.elite);
    } else if (spec.kind === 'mushroom') {
      boss = new MushroomFiendBoss(this, 480, 220, this.enemyLevel);
    } else if (spec.kind === 'dragon') {
      boss = new DragonBabyBoss(this, 480, 220, this.enemyLevel);
    } else if (spec.kind === 'angel') {
      boss = new AngelBoss(this, 480, 205, this.enemyLevel);
    } else {
      boss = new Boss(this, 480, 205, this.enemyLevel, spec.elite);
    }
    this.boss = boss;
    this.enemies.add(boss);
    boss.setAlpha(1);
    this.cameras.main.shake(320, 0.008);
    Sfx.bossRoar();
    this.hud.toastQueue.push(`${boss.bossName} 出现了！`);
    this.fx.ring(boss.x, boss.y, spec.elite ? 0xffd76a : 0xff9a6a, 0.3, 2.0, 700, 0.9, 745);
    return boss;
  }

  spawnEnemyAt(type, x, y, instant, elite) {
    let enemy;
    if (type === 'boss') {
      enemy = new Boss(this, x, y, this.enemyLevel);
      this.boss = enemy;
      this.cameras.main.shake(320, 0.008);
      Sfx.bossRoar();
      this.hud.toastQueue.push('史莱姆王 出现了！');
    } else {
      enemy = new Enemy(this, x, y, type, this.enemyLevel, elite);
    }
    this.enemies.add(enemy);
    this.fx.spawnBurst(x, y);
    if (elite) {
      this.fx.ring(x, y, 0xffd76a, 0.2, 1.5, 520, 0.9, 745);
      this.fx.floatingText(x, y - 42, '精英', '#ffd76a');
    }
    if (instant) enemy.setAlpha(enemy.enemyType === 'ghost' ? 0.06 : 1);
    return enemy;
  }

  finishRoom() {
    if (this.roomState !== 'fighting') return;
    if (this.endless) {
      this.finishEndlessWave(this.endlessWave);
      return;
    }
    this.roomState = 'cleared';
    const isBoss = this.stage === ROUND_LEN;
    const heal = (isBoss ? BALANCE.bossClearHeal : BALANCE.clearHeal) + this.buffs.healBonus;
    if (!this.player.isDead) {
      this.player.heal(heal);
      this.fx.healBurst(this.player.x, this.player.y, heal);
      Sfx.heal();
    }
    if (isBoss && this.treasureEnabled) {
      this.treasurePot += 200;
      this.hud.toastQueue.push(`无限财宝：本轮存下 200 金币（累计 ${this.treasurePot}）`);
    }
    if (isBoss && this.noScratchEnabled && this.roundNoDamage && this.noScratchRound !== this.round) {
      this.noScratchRound = this.round;
      this.grantNoScratchReward();
    }
    if (isBoss && this.round >= 10) {
      this.finishVictory();
      return;
    }
    Store.flush();
    this.saveCheckpoint();
    this.time.delayedCall(340, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      this.spawnPortal();
      if (isBoss && !this.demonPortalShown && !this.demonRealm && Math.random() < 0.3) {
        this.demonPortalShown = true;
        this.spawnDemonPortal();
      }
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

  finishVictory() {
    this.roomState = 'victory';
    this.locked = true;
    this.gameOverStarted = true;
    this.transitioning = true;
    this.destroyPortal();
    this.enemyBullets.clear(true, true);
    this.player.body.setVelocity(0, 0);
    Store.data.runCheckpoint = null;
    Store.markRunFinished(10, ROUND_LEN, this.kills);
    Store.flush();
    this.hud.bannerQueue.push({
      title: '通 关',
      sub: '天使陨落，天堂重归宁静',
      color: '#ffe9a8',
    });
    this.cameras.main.flash(500, 255, 245, 200);
    this.fx.bossDeath(this.player.x, this.player.y - 30);
    Sfx.levelClear();
    this.time.delayedCall(1500, () => {
      if (!this.scene.isActive()) return;
      this.scene.start('Over', {
        victory: true,
        runCoins: this.runCoins,
        kills: this.kills,
        round: 10,
        stage: ROUND_LEN,
        timeMs: this.time.now - this.runStartTime,
        character: this.characterId,
      });
    });
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

  spawnDemonPortal() {
    this.destroyDemonPortal();
    const x = 680, y = 252;
    const c = this.add.container(x, y).setDepth(4);
    const groundGlow = this.add.image(0, 22, 'glow').setScale(1.7, 0.65)
      .setTint(0xff3a2a).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    const ring1 = this.add.image(0, 0, 'ring').setTint(0xff3a2a).setAlpha(0.9).setScale(0.85);
    const ring2 = this.add.image(0, 0, 'ring').setTint(0xb02a6a).setAlpha(0.7).setScale(0.58);
    const glow = this.add.image(0, 0, 'glow').setScale(1.35).setTint(0xff5a3a)
      .setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.image(0, 0, 'glow').setScale(0.5).setTint(0xffd0a0)
      .setAlpha(0.95).setBlendMode(Phaser.BlendModes.ADD);
    c.add([groundGlow, ring1, ring2, glow, core]);
    this.tweens.add({ targets: ring1, rotation: Math.PI * 2, duration: 1800, repeat: -1 });
    this.tweens.add({ targets: ring2, rotation: -Math.PI * 2, duration: 1100, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.2, scale: 1.6, duration: 550, yoyo: true, repeat: -1 });
    const particles = this.add.particles(x, y, 'spark', {
      speed: { min: 15, max: 80 }, lifespan: 800,
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.9, end: 0 },
      frequency: 75, blendMode: 'ADD', tint: [0xff3a2a, 0xff9a3a, 0xffffff],
    }).setDepth(5);
    const label = this.add.text(x, 188, '恶魔传送门', UI.textStyle(15, {
      color: '#ffb09a', strokeThickness: 4,
    })).setOrigin(0.5).setDepth(890).setAlpha(0.95);
    this.tweens.add({ targets: label, y: 181, duration: 700, yoyo: true, repeat: -1 });
    this.demonPortal = { container: c, label, particles, armed: false, x, y };
    this.time.delayedCall(700, () => { if (this.demonPortal) this.demonPortal.armed = true; });
    this.hud.toastQueue.push('出现了恶魔传送门！进入后挑战撒旦');
    Sfx.portal();
  }

  destroyDemonPortal() {
    if (!this.demonPortal) return;
    const p = this.demonPortal;
    if (p.container) p.container.destroy();
    if (p.label) p.label.destroy();
    if (p.particles) p.particles.destroy();
    this.demonPortal = null;
  }

  spawnSatanReturnPortal() {
    this.destroySatanReturnPortal();
    const x = 480, y = 252;
    const c = this.add.container(x, y).setDepth(4);
    const ring1 = this.add.image(0, 0, 'ring').setTint(0xffd76a).setAlpha(0.9).setScale(0.9);
    const ring2 = this.add.image(0, 0, 'ring').setTint(0xff5a3a).setAlpha(0.65).setScale(0.6);
    const glow = this.add.image(0, 0, 'glow').setScale(1.4).setTint(0xffe0a0)
      .setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    c.add([ring1, ring2, glow]);
    this.tweens.add({ targets: ring1, rotation: Math.PI * 2, duration: 2200, repeat: -1 });
    this.tweens.add({ targets: ring2, rotation: -Math.PI * 2, duration: 1500, repeat: -1 });
    const label = this.add.text(x, 190, '返回原路', UI.textStyle(15, {
      color: '#ffe9a8', strokeThickness: 4,
    })).setOrigin(0.5).setDepth(890);
    const ret = this.demonReturn || { round: this.round, stage: this.stage };
    const sub = this.add.text(x, 212, `回到 ${ret.round}-${ret.stage}`, UI.textStyle(9, {
      color: '#c8b48a', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(890);
    this.demonReturnPortal = { container: c, label, sub, armed: false, x, y };
    this.time.delayedCall(600, () => { if (this.demonReturnPortal) this.demonReturnPortal.armed = true; });
    Sfx.portal();
  }

  destroySatanReturnPortal() {
    if (!this.demonReturnPortal) return;
    const p = this.demonReturnPortal;
    if (p.container) p.container.destroy();
    if (p.label) p.label.destroy();
    if (p.sub) p.sub.destroy();
    this.demonReturnPortal = null;
  }

  enterDemonRealm() {
    if (this.demonRealm) return;
    this.demonReturn = { round: this.round, stage: this.stage };
    this.demonRealm = true;
    this.demonPortalShown = true;
    this.satanDefeated = false;
    this.transitioning = true;
    this.locked = true;
    this.roomState = 'intro';
    this.destroyPortal();
    this.destroyDemonPortal();
    this.destroySatanReturnPortal();
    this.cancelSkill();
    this.stopSulfurBeam();
    this.clearRoomObjects();
    this.clearMerchant();
    if (this.mercPrompt) this.mercPrompt.setVisible(false);
    if (this.merchantPrompt) this.merchantPrompt.setVisible(false);
    if (this.mercenary && !this.mercenary.recruited) {
      this.mercenary.destroy();
      this.mercenary = null;
    }
    this.currentMap = 'demon_realm';
    this.mapName = '恶魔之地';
    if (this.groundImage) this.groundImage.setTexture('ground_demon_realm');
    this.setupDecor('demon_realm');
    this.player.setPosition(480, 405);
    this.player.body.enable = true;
    this.player.body.setVelocity(0, 0);
    this.player.invulnUntil = this.time.now + 900;
    this.player.gun.setVisible(true);
    if (this.mercenary && this.mercenary.active) {
      this.mercenary.setPosition(420, 425);
      this.mercenary.setVelocity(0, 0);
    }
    this.hud.hpDirty = true;
    this.hud.levelDirty = true;
    this.hud.bannerQueue.push({
      title: '恶魔之地', sub: '撒旦的领域 · 击败他才能回去', color: '#ff7a5a',
    });
    this.cameras.main.fadeIn(420, 25, 4, 8);
    this.time.delayedCall(1000, () => {
      if (!this.scene.isActive() || !this.demonRealm) return;
      this.transitioning = false;
      this.locked = false;
      this.roomState = 'fighting';
      this.spawnSatan();
    });
  }

  spawnSatan() {
    const satan = new SatanBoss(this, 480, 220, this.enemyLevel);
    this.enemies.add(satan);
    satan.setAlpha(1);
    this.boss = satan;
    this.cameras.main.shake(380, 0.009);
    Sfx.bossRoar();
    this.hud.toastQueue.push('撒旦 出现了！');
    this.fx.ring(satan.x, satan.y, 0xff3a2a, 0.3, 2.5, 800, 0.9, 745);
  }

  spawnDemonGuards(count) {
    const cx = this.boss ? this.boss.x : 480;
    const cy = this.boss ? this.boss.y : 220;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = clamp(cx + Math.cos(a) * rand(80, 180), ARENA.left + 40, ARENA.right - 40);
      const y = clamp(cy + Math.sin(a) * rand(50, 130), ARENA.top + 40, ARENA.bottom - 40);
      this.spawnEnemyAt('demon_guard', x, y, true);
    }
    this.cameras.main.shake(220, 0.005);
    this.fx.ring(cx, cy, 0xff3a2a, 0.25, 2.2, 600, 0.8, 745);
  }

  spawnSatanHand(x, y) {
    const disc = this.add.circle(x, y, 86, 0xff1a1a, 0.18)
      .setDepth(704).setStrokeStyle(3, 0xff5a3a, 0.95);
    const warn = this.add.image(x, y, 'spawnring')
      .setTint(0xff3a2a).setScale(1.8).setAlpha(0.95).setDepth(705);
    this.tweens.add({ targets: warn, scale: 0.5, duration: 560, ease: 'Quad.In' });
    this.tweens.add({ targets: [warn, disc], alpha: 0, delay: 460, duration: 100 });
    this.time.delayedCall(560, () => {
      if (!this.scene.isActive() || this.player.isDead) return;
      warn.destroy();
      disc.destroy();
      const hand = this.add.image(x, y - 190, 'demon_hand')
        .setScale(1.5).setDepth(750);
      this.tweens.add({
        targets: hand, y, duration: 120, ease: 'Quad.In',
        onComplete: () => {
          hand.destroy();
          this.fx.dust.explode(15, x, y);
          this.fx.smoke.explode(6, x, y);
          this.fx.ring(x, y, 0xff5a3a, 0.25, 2.0, 420, 0.9, 745);
          this.cameras.main.shake(140, 0.007);
          if (dist2(x, y, this.player.x, this.player.y) < 92 * 92) {
            this.player.takeDamage(28 + this.round * 2, x, y, this.time.now);
          }
        },
      });
    });
  }

  onSatanDefeated(satan) {
    this.satanDefeated = true;
    this.roomState = 'cleared';
    this.locked = false;
    this.enemies.getChildren().slice().forEach((e) => {
      if (e !== satan && e.active) e.destroy();
    });
    Store.data.demonHearts = (Store.data.demonHearts || 0) + 1;
    Store.save();
    this.hud.toastQueue.push('撒旦被击败！获得 1 颗撒旦之心');
    this.fx.ring(480, 260, 0xffd76a, 0.3, 2.6, 800, 0.9, 746);
    this.spawnSatanReturnPortal();
    this.openUpgrade(false);
  }

  exitDemonRealm() {
    const ret = this.demonReturn || { round: this.round, stage: this.stage };
    this.demonRealm = false;
    this.demonReturn = null;
    this.destroySatanReturnPortal();
    this.destroyDemonPortal();
    this.destroyPortal();
    this.clearRoomObjects();
    this.round = ret.round;
    this.stage = ret.stage;
    this.enemyLevel = levelIndex(this.round, this.stage);
    const mapInfo = this.mapInfoForRound(this.round);
    const mapKey = mapInfo.key;
    this.currentMap = mapKey;
    this.mapName = mapInfo.name;
    if (this.groundImage) this.groundImage.setTexture(mapInfo.ground);
    this.setupDecor(mapKey);
    this.player.setPosition(480, 405);
    this.player.body.enable = true;
    this.player.body.setVelocity(0, 0);
    this.player.invulnUntil = this.time.now + 900;
    this.player.gun.setVisible(true);
    if (this.mercenary && this.mercenary.active) {
      this.mercenary.setPosition(420, 425);
      this.mercenary.setVelocity(0, 0);
    }
    this.roomState = 'cleared';
    this.locked = false;
    this.hud.hpDirty = true;
    this.hud.levelDirty = true;
    this.hud.bannerQueue.push({
      title: `回到 ${ret.round}-${ret.stage}`,
      sub: '恶魔之地已关闭 · 踏入传送门继续',
      color: '#ffe9a8',
    });
    this.spawnPortal();
    this.cameras.main.fadeIn(380, 6, 12, 6);
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
    this.energyPacks.getChildren().slice().forEach((e) => {
      if (e.active) this.collectEnergyPack(e);
    });
    this.healthPacks.getChildren().slice().forEach((h) => {
      if (h.active) this.collectHealthPack(h);
    });
    Sfx.portal();
    this.cameras.main.flash(220, 170, 235, 255);
    this.cameras.main.fadeOut(340, 6, 12, 6);

    let nr = this.round;
    let ns = this.stage + 1;
    if (ns > ROUND_LEN) { ns = 1; nr += 1; }
    if (this.hasRing('teleport') && !this.ringTeleportUsed) {
      this.ringTeleportUsed = true;
      nr = randInt(1, Math.max(1, this.round + 1));
      ns = randInt(1, ROUND_LEN);
      this.hud.bannerQueue.push({
        title: '传送戒指',
        sub: `随机传送到 ${nr}-${ns}`,
        color: '#b07bff',
      });
    }
    Store.updateBest(this.round, this.stage, this.kills);
    Store.flush();

    this.time.delayedCall(360, () => {
      if (!this.scene.isActive()) return;
      this.destroyPortal();
      this.startRoom(nr, ns);
    });
  }

  // ------------------------------------------------------------ 战斗

  throwBoomerang(w, angle, ratio, dmg, q, power) {
    const px = this.player.x + Math.cos(angle) * 22;
    const py = this.player.y - 5 + Math.sin(angle) * 22;
    const b = this.spawnPlayerBullet(px, py, angle, dmg, {
      speed: w.bulletSpeed || 660,
      tint: w.tint,
      pierce: 99,
      color: q.color,
      power,
      texture: 'weapon_boomerang',
      scale: 1.05,
    });
    b.boomerang = true;
    b.boomerangPhase = 'out';
    b.returnAt = this.time.now + 650 + ratio * 450;
    b.spin = true;
    b.bornAt = this.time.now;
    b.hitEnemies = new Set();
    this.fx.ring(px, py, q.color, 0.1, 0.5, 180, 0.6, 720);
    return b;
  }

  throwDemonTrident(player, aim, w) {
    if (!player || !player.active) return;
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const dmg = Math.round(w.damage * (this.buffs.damage || 1) * 1.1);
    const px = player.x + Math.cos(aim) * 26;
    const py = player.y - 5 + Math.sin(aim) * 26;
    const b = this.spawnPlayerBullet(px, py, aim, dmg, {
      speed: 1000,
      tint: 0xff8ae8,
      pierce: 4,
      color: q.color,
      power: 6,
      texture: 'weapon_trident',
      scale: 1.35,
    });
    b.spin = true;
    b.bornAt = this.time.now;
    this.fx.muzzle(px, py, aim, q.color, 6);
    this.fx.shotBurst(px, py, q.color, 6);
    this.cameras.main.shake(90, 0.003);
    Sfx.bowRelease();
  }

  updateSulfurBeam(time, aim, firing, w) {
    if (!this.player || this.player.isDead) {
      this.stopSulfurBeam();
      return;
    }
    if (!firing) {
      this.stopSulfurBeam();
      return;
    }
    if (this.player.energy <= 0) {
      this.stopSulfurBeam();
      this.onEnergyDenied();
      return;
    }
    const beamWidth = w.beamWidth || 360;
    const beamHeight = w.beamThickness || 28;
    const coreHeight = w.beamCoreThickness || 9;
    const kind = w.beamKind || 'sulfur';
    const len = w.beamLength || 370;
    if (!this.sulfurBeam) {
      const glowColor = w.beamColor || (kind === 'sulfur' ? 0xff260a : 0xffb02a);
      const midColor = w.beamMid || (kind === 'sulfur' ? 0xff5a1a : 0xffe066);
      const coreColor = w.beamCore || (kind === 'sulfur' ? 0xffd08a : 0xffffff);
      const dark = this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, beamHeight * 1.15,
        kind === 'sulfur' ? 0x8a0a00 : glowColor, kind === 'sulfur' ? 0.55 : 0.18)
        .setOrigin(0, 0.5).setDepth(734)
        .setBlendMode(kind === 'sulfur' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
      const glow = this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, beamHeight, glowColor, 0.42)
        .setOrigin(0, 0.5).setDepth(735).setBlendMode(Phaser.BlendModes.ADD);
      const mid = this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, (beamHeight + coreHeight) * 0.5, midColor, 0.6)
        .setOrigin(0, 0.5).setDepth(736).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, coreHeight, coreColor, 0.98)
        .setOrigin(0, 0.5).setDepth(737).setBlendMode(Phaser.BlendModes.ADD);
      const edgeA = kind === 'sulfur'
        ? this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, 5, 0xff6a1a, 0.7)
          .setOrigin(0, 0.5).setDepth(739).setBlendMode(Phaser.BlendModes.ADD)
        : null;
      const edgeB = kind === 'sulfur'
        ? this.add.rectangle(this.player.x, this.player.y - 5, beamWidth, 4, 0xffb04a, 0.55)
          .setOrigin(0, 0.5).setDepth(739).setBlendMode(Phaser.BlendModes.ADD)
        : null;
      const startGlow = this.add.image(this.player.x, this.player.y - 5, 'glow')
        .setTint(glowColor).setScale(1.3).setAlpha(0.8).setDepth(738).setBlendMode(Phaser.BlendModes.ADD);
      const endGlow = this.add.image(this.player.x, this.player.y - 5, 'glow')
        .setTint(coreColor).setScale(0.85).setAlpha(0.85).setDepth(738).setBlendMode(Phaser.BlendModes.ADD);
      this.sulfurBeam = { dark, glow, mid, core, edgeA, edgeB, startGlow, endGlow };
    }
    const ox = this.player.x;
    const oy = this.player.y - 5;
    const pulse = 1 + Math.sin(time * 0.045) * 0.12;
    const beam = this.sulfurBeam;
    const perpX = -Math.sin(aim);
    const perpY = Math.cos(aim);
    beam.dark.setPosition(ox, oy).setRotation(aim)
      .setDisplaySize(beamWidth, beamHeight * 1.15 * pulse);
    beam.glow.setPosition(ox, oy).setRotation(aim)
      .setAlpha(0.32 + Math.sin(time * 0.03) * 0.1)
      .setDisplaySize(beamWidth, beamHeight * pulse);
    beam.mid.setPosition(ox, oy).setRotation(aim)
      .setAlpha(0.5 + Math.sin(time * 0.05 + 1) * 0.14)
      .setDisplaySize(beamWidth, (beamHeight + coreHeight) * 0.5 * pulse);
    beam.core.setPosition(ox, oy).setRotation(aim)
      .setDisplaySize(beamWidth, coreHeight * (1 + Math.sin(time * 0.08) * 0.1));
    if (beam.edgeA) {
      const offA = Math.sin(time * 0.05) * beamHeight * 0.28;
      beam.edgeA.setPosition(ox + perpX * offA, oy + perpY * offA)
        .setRotation(aim + Math.sin(time * 0.04) * 0.012)
        .setAlpha(0.5 + Math.sin(time * 0.06) * 0.2);
    }
    if (beam.edgeB) {
      const offB = Math.sin(time * 0.043 + 1.5) * beamHeight * 0.34;
      beam.edgeB.setPosition(ox + perpX * offB, oy + perpY * offB)
        .setRotation(aim - Math.sin(time * 0.037) * 0.012)
        .setAlpha(0.4 + Math.sin(time * 0.055 + 1) * 0.2);
    }
    beam.startGlow.setPosition(ox, oy).setScale(1.0 + Math.sin(time * 0.04) * 0.18);
    beam.endGlow.setPosition(ox + Math.cos(aim) * len, oy + Math.sin(aim) * len)
      .setScale(0.65 + Math.sin(time * 0.06) * 0.14);
    if (time >= this.sulfurNextTick) {
      this.sulfurNextTick = time + (w.beamTick || 120);
      if (!this.player.spendEnergy(w.beamEnergy || 1)) {
        this.stopSulfurBeam();
        this.onEnergyDenied();
        return;
      }
      const dmg = Math.round(w.damage * (this.buffs.damage || 1));
      const radius = w.beamRadius || 26;
      const cos = Math.cos(aim);
      const sin = Math.sin(aim);
      this.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dying) return;
        const dx = e.x - ox;
        const dy = e.y - oy;
        const along = dx * cos + dy * sin;
        const perp = Math.abs(-dx * sin + dy * cos);
        if (along > 0 && along < len && perp < radius) {
          e.takeDamage(dmg, aim);
          if (w.id === 'demon_sulfur' && e.applyBurn) e.applyBurn(2000, 6);
          this.fx.hitSpark(e.x, e.y);
          if (kind === 'sulfur') {
            const f = this.add.image(e.x, e.y, 'spark').setTint(0xff4a1a)
              .setScale(rand(0.5, 0.9)).setAlpha(0.8).setDepth(739).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({ targets: f, alpha: 0, scale: 1.4, y: f.y - 14, duration: 220, onComplete: () => f.destroy() });
          } else {
            this.fx.ring(e.x, e.y, 0xffe066, 0.08, 0.45, 180, 0.7, 739);
          }
        }
      });
      // 沿光束喷出的火焰/金色粒子
      for (let i = 0; i < 1; i++) {
        const t = rand(0.15, 0.95) * len;
        const px = ox + cos * t;
        const py = oy + sin * t + rand(-8, 8);
        const img = this.add.image(px, py, 'spark')
          .setTint(kind === 'sulfur' ? 0xff5a1a : 0xffe066)
          .setScale(rand(0.35, 0.75)).setAlpha(0.75).setDepth(739)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: img, alpha: 0, scale: 0.1, x: px + rand(-8, 8), y: py - rand(8, 22),
          duration: rand(180, 320), onComplete: () => img.destroy(),
        });
      }
      this.cameras.main.shake(kind === 'sulfur' ? 55 : 26, kind === 'sulfur' ? 0.0015 : 0.0007);
      if (time - this.sulfurLastAt > (kind === 'sulfur' ? 180 : 260)) {
        Sfx.shoot();
        this.sulfurLastAt = time;
      }
    }
  }

  stopSulfurBeam() {
    if (!this.sulfurBeam) return;
    const beam = this.sulfurBeam;
    this.sulfurBeam = null;
    this.sulfurNextTick = 0;
    ['dark', 'glow', 'mid', 'core', 'edgeA', 'edgeB', 'startGlow', 'endGlow'].forEach((key) => {
      const obj = beam[key];
      if (!obj) return;
      this.tweens.killTweensOf(obj);
      if (obj.active) obj.destroy();
    });
  }

  spawnPlayerBullet(x, y, angle, damage, opts) {
    const o = opts || {};
    const b = this.physics.add.image(x, y, o.texture || 'bullet');
    this.playerBullets.add(b);
    b.setDepth(700).setBlendMode(Phaser.BlendModes.ADD);
    b.setRotation(angle);
    if (o.scale) b.setScale(o.scale);
    b.body.setSize(6, 6);
    b.body.setAllowGravity(false);
    const speed = o.speed || BALANCE.bulletSpeed;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (o.tint != null) b.setTint(o.tint);
    let dmg = damage || BALANCE.bulletDamage;
    if (this.buffs.berserk > 0 && this.player && !this.player.isDead
      && this.player.hp < this.player.maxHp * 0.4) {
      dmg *= 1 + this.buffs.berserk;
    }
    const crit = (this.buffs.critChance || 0) > 0 && Math.random() < this.buffs.critChance;
    if (crit) {
      dmg *= 2;
      b.setTint(0xffe066);
      this.fx.ring(x, y, 0xffe066, 0.12, 0.55, 180, 0.8, 721);
    }
    b.crit = crit;
    b.damage = Math.round(dmg);
    b.pierce = (o.pierce || 0) + (this.buffs.pierceBonus || 0);
    b.hitEnemies = new Set();
    b.qualityColor = o.color == null ? 0xffe066 : o.color;
    b.qualityPower = o.power || 0;
    b.burn = o.burn || null;
    b.water = !!o.water;
    b.life = BALANCE.bulletLife * 1000 * (this.buffs.bulletLife || 1);
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

  spawnEnemyOrb(x, y, angle, damage, opts) {
    const o = opts || {};
    const b = this.physics.add.image(x, y, o.texture || 'orb');
    this.enemyBullets.add(b);
    b.setDepth(705).setBlendMode(Phaser.BlendModes.ADD);
    if (o.scale) b.setScale(o.scale);
    b.body.setCircle(6, 2, 2);
    b.body.setAllowGravity(false);
    const speed = o.speed || 255;
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (o.tint != null) b.setTint(o.tint);
    b.damage = damage || 12;
    b.decelAfter = o.decelAfter || 0;
    b.startX = x;
    b.startY = y;
    b.bornAt = this.time.now;
    return b;
  }

  meleeAttack(player, aim, w) {
    const px = player.x;
    const py = player.y - 5;
    const range = w.range || 70;
    const arc = w.arc || 1.1;
    const dmg = Math.round(w.damage * (this.buffs.damage || 1) * (w.skillFactor || 1));
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const sl = this.add.image(px, py, 'slash')
      .setTint(q.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(720)
      .setScale(range / 39)
      .setAlpha(0.95)
      .setRotation(aim);
    this.tweens.add({
      targets: sl, alpha: 0, scale: range / 39 + 0.12, duration: 140,
      onComplete: () => sl.destroy(),
    });

    const power = Math.max(0, QUALITY_ORDER.indexOf(w.quality));
    let hits = 0;
    let cut = 0;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (dist2(px, py, e.x, e.y) > range * range) return;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(e.y - py, e.x - px) - aim));
      if (diff > arc / 2) return;
      if (player === this.player && this.tryRingExecute(e, aim)) {
        this.fx.weaponHit(e.x, e.y, q.color, power);
        hits++;
        return;
      }
      e.takeDamage(dmg, aim);
      this.fx.weaponHit(e.x, e.y, q.color, power);
      hits++;
    });

    // 近战可以砍掉范围内的敌方子弹
    this.enemyBullets.getChildren().slice().forEach((b) => {
      if (!b.active) return;
      if (dist2(px, py, b.x, b.y) > (range + 12) * (range + 12)) return;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(b.y - py, b.x - px) - aim));
      if (diff > arc / 2 + 0.16) return;
      b.destroy();
      this.fx.hitSpark(b.x, b.y);
      cut++;
    });

    this.cameras.main.shake(55, (hits > 0 || cut > 0) ? 0.002 : 0.0008);
    if (hits > 0 || cut > 0) {
      this.fx.weaponHit(
        px + Math.cos(aim) * range * 0.52,
        py + Math.sin(aim) * range * 0.52,
        q.color, power
      );
      Sfx.hit();
    }
  }

  summonGhost() {
    if (this.ghost) {
      this.ghost.level++;
      this.ghost.ready = true;
      this.hud.toastQueue.push('幽灵宝宝变强了，并且恢复了守护能力');
      return;
    }
    const p = this.player;
    const sprite = this.add.image(p.x - 34, p.y - 34, 'ghost_baby').setScale(1.05);
    const glow = this.add.image(sprite.x, sprite.y, 'glow')
      .setTint(0xbfe8ff).setScale(0.45).setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.ghost = { sprite, glow, level: 1, ready: true, nextShotAt: 0 };
    this.fx.ring(p.x, p.y, 0x9fd8ff, 0.2, 1.5, 600, 0.9, 740);
    Sfx.ghostSummon();
    this.hud.toastQueue.push('幽灵宝宝加入了战斗');
  }

  guestSkillTexture() {
    const map = {
      swordsman: 'sword', frankenstein: 'fist_icon', mage: 'mage_icon',
      guitarist: 'guitar_icon', demon: 'demon_icon', vampire: 'vampire_icon',
      knight: 'ring_icon', ranger: 'bow', rogue: 'sword', alchemist: 'orb',
    };
    return map[this.guestCharacter] || 'flame_icon';
  }

  keepEnemyInArena(e) {
    if (!e.body) return;
    const padX = Math.min(44, Math.max(18, Math.round((e.displayWidth || 32) * 0.3)));
    const padTop = Math.min(52, Math.max(20, Math.round((e.displayHeight || 44) * 0.42)));
    const left = ARENA.left + padX;
    const right = ARENA.right - padX;
    const top = ARENA.top + padTop;
    const bottom = ARENA.bottom - 18;
    let clamped = false;
    if (e.x < left) { e.x = left; clamped = true; }
    else if (e.x > right) { e.x = right; clamped = true; }
    if (e.y < top) { e.y = top; clamped = true; }
    else if (e.y > bottom) { e.y = bottom; clamped = true; }
    if (!clamped) return;
    const vx = e.body.velocity.x;
    const vy = e.body.velocity.y;
    if (e.x <= left + 0.5 && vx < 0) e.body.velocity.x = 0;
    if (e.x >= right - 0.5 && vx > 0) e.body.velocity.x = 0;
    if (e.y <= top + 0.5 && vy < 0) e.body.velocity.y = 0;
    if (e.y >= bottom - 0.5 && vy > 0) e.body.velocity.y = 0;
    // 贴边后如果还在往边界外走，改为沿边界朝玩家方向移动
    const target = this.targetPlayer(e);
    if (!target) return;
    if ((e.x <= left + 0.5 || e.x >= right - 0.5) && Math.abs(target.x - e.x) > 8) {
      const dir = target.y >= e.y ? 1 : -1;
      if (Math.abs(e.body.velocity.y) < 18) e.body.velocity.y = dir * 42;
    }
    if ((e.y <= top + 0.5 || e.y >= bottom - 0.5) && Math.abs(target.y - e.y) > 8) {
      const dir = target.x >= e.x ? 1 : -1;
      if (Math.abs(e.body.velocity.x) < 18) e.body.velocity.x = dir * 42;
    }
  }

  targetPlayer(enemy) {
    const p1 = this.player;
    const p2 = this.player2;
    const a1 = p1 && !p1.isDead;
    const a2 = p2 && !p2.isDead;
    if (a1 && a2 && enemy) {
      return dist2(enemy.x, enemy.y, p1.x, p1.y) <= dist2(enemy.x, enemy.y, p2.x, p2.y)
        ? p1 : p2;
    }
    if (a1) return p1;
    if (a2) return p2;
    return p1;
  }

  updateGuestPlayer(time, delta) {
    if (!this.netHost || !this.player2) return;
    const g = this.player2;
    if (g.isDead) {
      if (this.guestTag) this.guestTag.setPosition(g.x, g.y - 52);
      return;
    }
    const input = this.guestInput || {};
    let mx = Number(input.moveX) || 0;
    let my = Number(input.moveY) || 0;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (time < g.dashUntil) {
      // 冲刺速度由 startDash 设置，不覆写
    } else {
      const guitarBoost = this.guestSkill && this.guestSkill.type === 'guitar' ? GUITAR.speed : 1;
      const speed = BALANCE.playerSpeed * ((this.buffs.speed) || 1) * guitarBoost;
      g.body.setVelocity(mx * speed, my * speed);
    }
    const moving = len > 0.12;
    if (moving) {
      if (!g.anims.isPlaying) g.play(g.walkAnim, true);
    } else {
      if (g.anims.isPlaying) g.anims.stop();
      if (g.texture.key !== g.idleTexture) g.setTexture(g.idleTexture);
    }
    let aim = g.aimAngle || 0;
    if (input.aimX != null && input.aimY != null) {
      aim = Math.atan2(input.aimY - g.y, input.aimX - g.x);
    } else if (moving) {
      aim = Math.atan2(my, mx);
    }
    g.aimAngle = aim;
    const cos = Math.cos(aim);
    if (cos < -0.08) g.setFlipX(true);
    else if (cos > 0.08) g.setFlipX(false);
    const weapon = (this.guestWeaponId && WEAPONS[this.guestWeaponId])
      ? WEAPONS[this.guestWeaponId]
      : (this.weapon || WEAPONS.pistol);
    if (g.networkWeapon !== weapon) g.networkWeapon = weapon;
    if (g.giant) {
      if (g.gun) g.gun.setVisible(false);
      if (g.shadow) g.shadow.setPosition(g.x, g.y + 30).setDepth(g.y + 18);
      if (input.fire && time >= g.nextShotAt) g.giantPunch(aim, time);
    } else if (g.gun) {
      if (g.gun.texture.key !== weapon.texture) g.gun.setTexture(weapon.texture);
      const gx = g.x + cos * 10;
      const gy = g.y + 5 + Math.sin(aim) * 8;
      g.gun.setPosition(gx, gy).setRotation(aim).setFlipY(cos < 0)
        .setDepth(g.y + 21).setVisible(true);
    }
    if (g.shadow) g.shadow.setPosition(g.x, g.y + 19).setDepth(g.y + 18);
    g.setDepth(g.y + 20);
    if (this.guestTag) this.guestTag.setPosition(g.x, g.y - 52).setDepth(880);
    const ringRegen = (this.hasRing('azure') ? 3 : 1) * (this.guestRing === 'azure' ? 3 : 1);
    g.updateShield(time);
    g.energy = Math.min(g.maxEnergy, g.energy + BALANCE.energyRegen * ringRegen * delta / 1000);
    if (!g.giant && g.chargeFx) g.updateChargeFx(g.chargeRatio || 0);
    if (!g.giant) {
      if (weapon.charge) {
        g.updateChargeWeapon(time, aim, !!input.fire, weapon);
      } else if (input.fire && time >= g.nextShotAt && !weapon.sulfur) {
        g.fire(time, aim);
      }
    }
  }

  damageGuest(amount) {
    const g = this.player2;
    if (!g || g.isDead) return;
    const now = this.time.now;
    if (now < g.invulnUntil) return;
    if (this.guestRing === 'phantom') {
      const sp = Math.hypot(g.body.velocity.x, g.body.velocity.y);
      const chance = Math.min(0.30, 0.01 + sp / Math.max(1, BALANCE.playerSpeed) * 0.04);
      if (Math.random() < chance) {
        g.invulnUntil = now + 300;
        this.fx.floatingText(g.x, g.y - 34, '闪避', '#9fe8ff');
        return;
      }
    }
    const armor = Math.min(0.45, this.buffs.armor || 0);
    let incoming = amount * (1 - armor);
    if (g.shieldHp > 0 && now < g.shieldUntil) {
      const absorbed = Math.min(g.shieldHp, incoming);
      g.shieldHp -= absorbed;
      incoming -= absorbed;
      this.fx.ring(g.x, g.y, 0x7dffb0, 0.2, 1.4, 240, 0.8, 736);
      if (g.shieldHp <= 0) g.clearShield();
      if (incoming <= 0.01) {
        g.invulnUntil = Math.max(g.invulnUntil, now + 300);
        return;
      }
    }
    g.hp -= incoming;
    g.invulnUntil = now + 450;
    g.setTintFill(0xff5a4a);
    this.time.delayedCall(80, () => { if (g.active && !g.isDead) g.clearTint(); });
    this.cameras.main.shake(80, 0.002);
    if (g.hp <= 0) {
      if (this.guestRing === 'undying' && !this.guestRingUndyingUsed) {
        this.guestRingUndyingUsed = true;
        g.hp = 1;
        g.invulnUntil = now + 2500;
        this.hud.toastQueue.push('玩家2 的不死戒指抵挡了致命伤害');
        this.fx.ring(g.x, g.y, 0xffd76a, 0.2, 2.2, 600, 0.9, 740);
        return;
      }
      this.guestDown();
    }
  }

  guestDown() {
    const g = this.player2;
    if (!g || g.isDead) return;
    g.isDead = true;
    g.hp = 0;
    this.guestDowned = true;
    this.guestReviveTimer = 0;
    g.body.enable = false;
    g.setVisible(true).setAlpha(0.35).setTint(0x8a8a8a);
    if (g.gun) g.gun.setVisible(false);
    if (g.shadow) g.shadow.setVisible(true).setAlpha(0.15);
    if (this.guestTag) this.guestTag.setText('玩家2 · 倒地').setPosition(g.x, g.y - 52);
    this.guestInput.fire = false;
    this.hud.toastQueue.push('玩家2 倒下了，靠近并站立 4 秒可以救援');
    if (this.hostDowned || (this.player && this.player.isDead)) this.endCoopDefeat();
  }

  respawnGuest() {
    const g = this.player2;
    if (!g) return;
    this.guestDowned = false;
    this.guestReviveTimer = 0;
    this.reviveProgress = 0;
    this.reviveWho = null;
    g.isDead = false;
    g.hp = Math.max(1, Math.round(g.maxHp * 0.5));
    g.energy = g.maxEnergy;
    g.body.enable = true;
    g.setVisible(true).setAlpha(1).clearTint();
    if (g.gun) g.gun.setVisible(true);
    if (g.shadow) g.shadow.setVisible(true).setAlpha(0.28);
    const px = this.player && !this.player.isDead ? this.player.x - 52 : g.x;
    const py = this.player && !this.player.isDead ? this.player.y + 18 : g.y;
    g.setPosition(px, py);
    g.body.reset(g.x, g.y);
    g.invulnUntil = this.time.now + 2000;
    if (this.guestTag) this.guestTag.setText('玩家2').setPosition(g.x, g.y - 52);
    this.hud.toastQueue.push('玩家2 已被救起');
  }

  reviveHost() {
    const p = this.player;
    if (!p) return;
    this.hostDowned = false;
    this.hostReviveTimer = 0;
    this.reviveProgress = 0;
    this.reviveWho = null;
    p.isDead = false;
    p.hp = Math.max(1, Math.round(p.maxHp * 0.5));
    p.energy = Math.max(p.energy, p.maxEnergy * 0.5);
    this.tweens.killTweensOf(p);
    p.body.enable = true;
    p.setAlpha(1).setAngle(0).clearTint();
    p.anims.stop();
    if (p.texture.key !== p.idleTexture) p.setTexture(p.idleTexture);
    p.gun.setVisible(true);
    if (p.secondaryGun) p.secondaryGun.setVisible(false);
    if (p.shadow) p.shadow.setVisible(true).setAlpha(0.3);
    p.invulnUntil = this.time.now + 2000;
    p.body.reset(p.x, p.y);
    if (this.hostDownTag) { this.hostDownTag.destroy(); this.hostDownTag = null; }
    this.hud.bannerQueue.push({ title: '房主已被救起', sub: '生命恢复 50% · 2 秒无敌', color: '#9ff0a8' });
  }

  updateRevive(delta) {
    if (this.coopEnding || !this.netHost) return;
    const p = this.player;
    const g = this.player2;
    if (!p || !g) return;
    let active = null;
    if (this.hostDowned && !g.isDead) {
      const near = dist2(p.x, p.y, g.x, g.y) < 74 * 74;
      const still = Math.hypot(g.body.velocity.x, g.body.velocity.y) < 28;
      if (near && still) {
        this.hostReviveTimer += delta;
        active = { who: 'p', timer: this.hostReviveTimer };
      } else {
        this.hostReviveTimer = 0;
      }
      if (this.hostReviveTimer >= 4000) {
        this.reviveHost();
        return;
      }
    } else {
      this.hostReviveTimer = 0;
    }
    if (this.guestDowned && !p.isDead) {
      const near = dist2(p.x, p.y, g.x, g.y) < 74 * 74;
      const still = Math.hypot(p.body.velocity.x, p.body.velocity.y) < 28;
      if (near && still) {
        this.guestReviveTimer += delta;
        active = { who: 'g', timer: this.guestReviveTimer };
      } else {
        this.guestReviveTimer = 0;
      }
      if (this.guestReviveTimer >= 4000) {
        this.respawnGuest();
        return;
      }
    } else {
      this.guestReviveTimer = 0;
    }
    this.reviveWho = active ? active.who : null;
    this.reviveProgress = active ? Math.min(1, active.timer / 4000) : 0;
    if (this.reviveText) {
      if (active) {
        const target = active.who === 'p' ? p : g;
        this.reviveText.setVisible(true)
          .setPosition(target.x, target.y - 66)
          .setText(`救援 ${(active.timer / 1000).toFixed(1)} / 4.0 秒`);
      } else {
        this.reviveText.setVisible(false);
      }
    }
  }

  netIdFor(e) {
    if (!this.netIds.has(e)) this.netIds.set(e, ++this.netIdSeq);
    return this.netIds.get(e);
  }

  collectSyncBeams() {
    const out = [];
    const addRect = (r) => {
      if (!r || !r.active) return;
      const len = r.width || 100;
      const ang = r.rotation || 0;
      out.push({
        x1: Math.round(r.x), y1: Math.round(r.y),
        x2: Math.round(r.x + Math.cos(ang) * len),
        y2: Math.round(r.y + Math.sin(ang) * len),
        w: Math.max(2, Math.round(r.height || 6)),
        c: r.fillColor == null ? 0xff6a2a : r.fillColor,
        a: r.alpha == null ? 0.6 : r.alpha,
      });
    };
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (e.goatAim) addRect(e.goatAim);
      if (e.goatBeam) { addRect(e.goatBeam.glow); addRect(e.goatBeam.core); }
      if (e.kingAims) e.kingAims.forEach(addRect);
      if (e.kingBeams) e.kingBeams.forEach(addRect);
      if (e.breathFlag) addRect(e.breathFlag);
      if (e.breathBeam) { addRect(e.breathBeam.glow); addRect(e.breathBeam.core); }
      if (e.phase2Beams) e.phase2Beams.forEach((b) => { addRect(b.glow); addRect(b.core); });
    });
    return out.slice(0, 40);
  }

  sendGuestState(time, force) {
    if (!this.netHost || !this.player2) return;
    const real = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!force && real < this.nextGuestStateReal) return;
    this.nextGuestStateReal = real + 33;
    const p = this.player;
    const g = this.player2;
    const round = (n) => Math.round(n * 10) / 10;
    const bulletData = (b) => ({
      x: round(b.x), y: round(b.y), r: round(b.rotation || 0),
      vx: round((b.body && b.body.velocity.x) || 0), vy: round((b.body && b.body.velocity.y) || 0),
      s: round(b.scaleX || 1), tex: b.texture.key,
      tint: b.tintTopLeft && b.tintTopLeft !== 0xffffff ? b.tintTopLeft : null,
      a: round(b.alpha == null ? 1 : b.alpha),
    });
    const enemies = [];
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (enemies.length >= 28) return;
      enemies.push({
        id: this.netIdFor(e),
        type: e.enemyType,
        tex: e.texture.key,
        anim: e.anims && e.anims.currentAnim ? e.anims.currentAnim.key : null,
        x: round(e.x), y: round(e.y),
        hp: Math.max(0, Math.ceil(e.hp)), maxHp: Math.ceil(e.maxHp),
        scale: round(e.scaleX || 1),
        flip: !!e.flipX,
        alpha: round(e.alpha == null ? 1 : e.alpha),
        elite: !!e.isElite,
        boss: !!e.isBoss,
        poison: (e.poisonUntil || 0) > time,
        reflect: (e.reflectUntil || 0) > time,
        name: e.bossName || (e.def && e.def.name) || '', 
      });
    });
    const playerData = (pl) => ({
      x: round(pl.x), y: round(pl.y),
      tex: pl.texture.key,
      anim: pl.anims && pl.anims.currentAnim && pl.anims.isPlaying ? pl.anims.currentAnim.key : null,
      flip: !!pl.flipX,
      aim: round(pl.aimAngle || 0),
      hp: Math.max(0, Math.ceil(pl.hp)), maxHp: Math.ceil(pl.maxHp),
      energy: Math.max(0, Math.floor(pl.energy)), maxEnergy: Math.ceil(pl.maxEnergy),
      dead: !!pl.isDead,
      shield: Math.ceil(pl.shieldHp || 0),
      weaponTex: pl === this.player ? (this.weapon.texture || 'gun') : ((pl.networkWeapon || this.weapon || WEAPONS.pistol).texture || 'gun'),
      character: pl.characterId,
    });
    const vel = (o) => ({ vx: round((o.body && o.body.velocity.x) || 0), vy: round((o.body && o.body.velocity.y) || 0) });
    const coins = this.coins.getChildren().filter((c) => c.active).slice(0, 40)
      .map((c) => Object.assign({ x: round(c.x), y: round(c.y), v: c.value || 1 }, vel(c)));
    const hpacks = this.healthPacks.getChildren().filter((h) => h.active).slice(0, 15)
      .map((h) => Object.assign({ x: round(h.x), y: round(h.y) }, vel(h)));
    const epacks = this.energyPacks.getChildren().filter((e) => e.active).slice(0, 15)
      .map((e) => Object.assign({ x: round(e.x), y: round(e.y) }, vel(e)));
    const frags = this.fragments.getChildren().filter((f) => f.active).slice(0, 20)
      .map((f) => Object.assign({
        x: round(f.x), y: round(f.y), ring: !!f.isRing,
        color: f.isRing && RINGS[f.ringId] ? RINGS[f.ringId].color : 0xffd76a,
      }, vel(f)));
    Net.send({
      t: 'state',
      map: this.currentMap,
      mapName: this.mapName,
      room: this.roomState,
      paused: !!(this.scene.isPaused && this.scene.isPaused()) || !!this.upgradeOpen,
      round: this.round, stage: this.stage,
      endless: !!this.endless, endlessWave: this.endlessWave,
      hostDowned: !!this.hostDowned,
      reviveWho: this.reviveWho,
      reviveProgress: Math.round((this.reviveProgress || 0) * 100),
      p: playerData(p),
      g: Object.assign(playerData(g), {
        respawn: 0,
        revive: this.reviveWho === 'g' ? Math.round(this.reviveProgress * 100) : 0,
      }),
      gs: {
        cd: Math.max(0, Math.ceil((this.guestSkill.cooldownUntil - time) / 1000)),
        total: this.guestSkill.total || GUEST_SKILL.cooldown,
        weapon: (g.networkWeapon || this.weapon || WEAPONS.pistol).name,
        weaponId: (g.networkWeapon || this.weapon || WEAPONS.pistol).id,
        weaponTex: (g.networkWeapon || this.weapon || WEAPONS.pistol).texture,
        skillTex: this.guestSkillTexture(),
        level: this.guestLevel,
        speed: Math.round(BALANCE.playerSpeed * (this.buffs.speed || 1)
          * (this.guestSkill.type === 'guitar' ? GUITAR.speed : 1)),
      },
      upgrades: this.acquiredUpgrades,
      dualWield: !!this.dualWield,
      secondaryId: this.secondaryId || null,
      treasurePot: this.treasurePot || 0,
      fx: this.guestFx.splice(0, 30),
      beams: this.collectSyncBeams(),
      hostSkill: this.skill && this.skill.active
        ? { type: this.skill.type, left: Math.max(0, Math.ceil((this.skill.endsAt - time) / 1000)) }
        : null,
      hostShield: Math.ceil(this.player.shieldHp || 0),
      vision: this.visionUntil > time
        ? { who: this.visionTarget === this.player2 ? 'guest' : 'host', r: this.visionRadius }
        : null,
      swords: this.skill.type === 'sword' && this.skill.swords
        ? this.skill.swords.map((sw) => ({
          x: round(sw.x), y: round(sw.y),
          r: round(sw.img && sw.img.rotation != null ? sw.img.rotation : 0),
        }))
        : [],
      hostBeam: this.sulfurBeam && this.weapon
        ? {
          kind: this.weapon.beamKind || 'sulfur',
          x: round(this.player.x), y: round(this.player.y - 5),
          angle: round(this.player.aimAngle || 0),
          len: this.weapon.beamLength || 370,
          width: this.weapon.beamWidth || 360,
          height: this.weapon.beamThickness || 28,
          core: this.weapon.beamCoreThickness || 9,
          color: this.weapon.beamColor, mid: this.weapon.beamMid, coreColor: this.weapon.beamCore,
        } : null,
      enemies,
      eb: this.enemyBullets.getChildren().filter((b) => b.active).slice(0, 70).map(bulletData),
      pb: this.playerBullets.getChildren().filter((b) => b.active).slice(0, 70).map(bulletData),
      guestDrops: this.guestDrops.slice(0, 90),
      portal: this.portal ? { x: round(this.portal.x), y: round(this.portal.y), armed: !!this.portal.armed } : null,
      pools: this.poisonPools.map((p) => ({ x: round(p.x), y: round(p.y), r: Math.round(p.r) })),
      ghostBaby: this.ghost && this.ghost.sprite && this.ghost.sprite.active
        ? { x: round(this.ghost.sprite.x), y: round(this.ghost.sprite.y), level: this.ghost.level }
        : null,
      merchant: this.merchant && this.merchant.sprite && this.merchant.sprite.active
        ? {
          x: round(this.merchant.x), y: round(this.merchant.y),
          tex: this.merchant.sprite.texture.key,
          anim: this.merchant.sprite.anims && this.merchant.sprite.anims.currentAnim
            ? this.merchant.sprite.anims.currentAnim.key : null,
          trades: this.merchant.trades.map((t) => ({
            kind: t.kind, weaponId: t.weaponId, amount: t.amount,
            coins: t.coins || 0, hearts: t.hearts || 0, sold: !!t.sold,
          })),
        } : null,
      wallet: { coins: Store.data.coins, hearts: Store.data.demonHearts },
      merc: this.mercenary && this.mercenary.active && this.mercenary.recruited
        ? {
          x: round(this.mercenary.x), y: round(this.mercenary.y),
          tex: this.mercenary.texture.key,
          anim: this.mercenary.anims && this.mercenary.anims.currentAnim ? this.mercenary.anims.currentAnim.key : null,
          flip: !!this.mercenary.flipX,
          hp: Math.max(0, Math.ceil(this.mercenary.hp)),
          maxHp: Math.ceil(this.mercenary.maxHp),
          name: this.mercenary.mercName,
          weapon: this.mercenary.weaponName,
        } : null,
    });
  }

  handleGuestAction(data) {
    if (!data || !this.player2) return;
    if (data.key === 'switch') {
      const owned = (Store.data.ownedWeapons || []).filter((id) => WEAPONS[id]);
      if (owned.length === 0) return;
      const cur = this.guestWeaponId || this.weaponId;
      const idx = Math.max(0, owned.indexOf(cur));
      this.guestWeaponId = owned[(idx + 1) % owned.length];
      this.player2.networkWeapon = WEAPONS[this.guestWeaponId];
      return;
    }
    if (data.key === 'upgrade') {
      if (!this.upgradeOpen) return;
      const id = String(data.id || '');
      if (!UPGRADES.some((u) => u.id === id)) return;
      this.applyUpgrade(id);
      this.upgradeOpen = false;
      const up = this.scene.get('Upgrade');
      if (up && up.close) up.close(true);
      else this.scene.stop('Upgrade');
      if (this.scene.isPaused()) this.scene.resume();
      return;
    }
    if (data.key === 'upgrade_refresh') {
      if (!this.upgradeOpen) return;
      this.refreshUpgradeChoices(true);
      return;
    }
    if (this.player2.isDead) return;
    if (data.key === 'dash') {
      const g = this.player2;
      if (this.time.now < g.dashReadyAt) return;
      g.startDash(this.time.now, this.guestInput.moveX, this.guestInput.moveY);
      return;
    }
    if (data.key === 'merchant_trade') {
      this.guestMerchantTrade(Number(data.index));
      return;
    }
    if (data.key === 'skill') {
      if (this.time.now < this.guestSkill.cooldownUntil) return;
      const cdMap = {
        gunner: 12000, swordsman: 10000, frankenstein: 22000, mage: 20000,
        guitarist: 18000, demon: 20000, vampire: 18000, knight: 18000,
        ranger: 14000, rogue: 10000, alchemist: 16000,
      };
      this.guestSkill.total = cdMap[this.guestCharacter] || 12000;
      this.guestSkill.cooldownUntil = this.time.now + this.guestSkill.total;
      this.activateGuestSkill(this.guestCharacter);
      return;
    }
  }

  guestSkillDamage(base) {
    return Math.round(base * (1 + this.guestSkillLevel * SKILL_UPGRADE.damagePerLevel));
  }

  guestSkillTargets(count) {
    return this.enemies.getChildren()
      .filter((e) => e.active && !e.dying)
      .sort((a, b) => dist2(this.player2.x, this.player2.y, a.x, a.y) - dist2(this.player2.x, this.player2.y, b.x, b.y))
      .slice(0, count);
  }

  markGuestHit(x, y, color) {
    if (!this.netHost) return;
    this.guestFx.push({ k: 'hit', x: Math.round(x), y: Math.round(y), c: color || 0x9fe8ff, p: 3 });
    if (this.guestFx.length > 60) this.guestFx.splice(0, this.guestFx.length - 60);
  }

  guestBurst(angle, damage, opts) {
    const g = this.player2;
    const o = opts || {};
    this.spawnPlayerBullet(g.x, g.y - 2, angle, damage, {
      speed: o.speed || 820, tint: o.tint || 0x9fe8ff, pierce: o.pierce || 0,
      color: o.color || 0x9fe8ff, power: o.power || 3,
      texture: o.texture, scale: o.scale,
    });
  }

  activateGuestSkill(type) {
    const g = this.player2;
    const now = this.time.now;
    const skill = this.guestSkill;
    this.clearGuestSkillVisuals();
    skill.type = type;
    skill.activeUntil = now + 400;
    skill.nextTick = now;
    skill.targets = [];
    const aim = g.aimAngle || 0;
    const tintMap = {
      gunner: 0xff9a3a, swordsman: 0x9fe8ff, frankenstein: 0x7dff5a,
      mage: 0xb07bff, guitarist: 0xd96a9a, demon: 0xff5a3a,
      vampire: 0xd92a3a, knight: 0xfff2c8, ranger: 0x8ff0b0,
      rogue: 0xff4a6a, alchemist: 0x7ad9a0,
    };
    const color = tintMap[type] || 0x9fe8ff;

    if (type === 'gunner') {
      skill.activeUntil = now + SKILL.duration;
      skill.nextTick = now + 80;
      skill.targets = this.guestSkillTargets(SKILL.maxTargets);
      this.hud.toastQueue.push('玩家2：枪手技能 · 自动索敌');
    } else if (type === 'swordsman') {
      skill.activeUntil = now + 1800;
      this.time.delayedCall(1000, () => {
        if (!this.player2 || this.player2.isDead) return;
        const dmg = this.guestSkillDamage(34);
        const targets = this.guestSkillTargets(8);
        for (let i = 0; i < 8; i++) {
          const target = targets[i % Math.max(1, targets.length)];
          const a = target ? Math.atan2(target.y - this.player2.y, target.x - this.player2.x) : (i / 8) * Math.PI * 2;
          this.guestBurst(a, dmg, { speed: 760, tint: 0xbfe8ff, pierce: 1, texture: 'sword', scale: 1.1 });
          this.fx.hitSpark(this.player2.x, this.player2.y);
        }
      });
      this.hud.toastQueue.push('玩家2：万剑归宗');
    } else if (type === 'frankenstein') {
      const duration = GIANT.duration * (1 + this.guestSkillLevel * SKILL_UPGRADE.durationPerLevel);
      g.setGiantForm(true);
      g.addShield(150, duration);
      g.invulnUntil = Math.max(g.invulnUntil, now + 700);
      skill.activeUntil = now + duration;
      this.fx.ring(g.x, g.y, 0x7dff5a, 0.2, 2.4, 520, 0.9, 744);
      this.cameras.main.shake(180, 0.005);
      this.hud.toastQueue.push(`玩家2：巨型化 ${Math.round(duration / 1000)} 秒 + 护盾`);
    } else if (type === 'mage') {
      skill.activeUntil = now + MAGE_LASER.duration;
      skill.nextTick = now;
      skill.beam = this.createGuestBeam(g, color);
      this.hud.toastQueue.push('玩家2：法师激光');
    } else if (type === 'guitarist') {
      skill.activeUntil = now + GUITAR.duration;
      skill.nextTick = now;
      skill.aura = this.add.image(g.x, g.y, 'ring').setTint(color).setScale(1.8)
        .setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(g.y - 2);
      this.hud.toastQueue.push('玩家2：吉他音浪');
    } else if (type === 'demon') {
      g.guestDemonUntil = now + DEMON.duration;
      skill.activeUntil = now + DEMON.duration;
      skill.aura = this.add.image(g.x, g.y, 'glow').setTint(color).setScale(1.7)
        .setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(g.y - 2);
      this.hud.toastQueue.push('玩家2：恶魔契约 · 攻速伤害提升');
    } else if (type === 'vampire') {
      skill.activeUntil = now + VAMPIRE.duration;
      skill.nextTick = now;
      skill.aura = this.add.image(g.x, g.y, 'ring').setTint(color).setScale(1.5)
        .setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(g.y - 2);
      this.hud.toastQueue.push('玩家2：生命汲取');
    } else if (type === 'knight') {
      g.invulnUntil = Math.max(g.invulnUntil, now + 4000 * (1 + this.guestSkillLevel * SKILL_UPGRADE.durationPerLevel));
      skill.activeUntil = now + 4000 * (1 + this.guestSkillLevel * SKILL_UPGRADE.durationPerLevel);
      skill.aura = this.add.image(g.x, g.y, 'ring').setTint(color).setScale(1.5)
        .setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(g.y - 2);
      this.hud.toastQueue.push('玩家2：圣盾 · 4 秒无敌');
    } else if (type === 'ranger') {
      const dmg = this.guestSkillDamage(18);
      const targets = this.guestSkillTargets(3);
      if (targets.length) {
        targets.forEach((e) => {
          const base = Math.atan2(e.y - g.y, e.x - g.x);
          for (let i = 0; i < 4; i++) {
            this.guestBurst(base + (i - 1.5) * 0.14, dmg, {
              speed: 1050, tint: 0x8ff0b0, pierce: 1, texture: 'charged_arrow', scale: 1.05,
            });
          }
        });
      } else {
        for (let i = 0; i < 12; i++) {
          this.guestBurst((i / 12) * Math.PI * 2, dmg, { speed: 1050, tint: 0x8ff0b0, texture: 'charged_arrow', scale: 1.05 });
        }
      }
      skill.activeUntil = now + 700;
      this.hud.toastQueue.push('玩家2：箭雨');
    } else if (type === 'rogue') {
      const target = this.guestSkillTargets(1)[0];
      const dmg = this.guestSkillDamage(85);
      if (target) {
        const a = Math.atan2(target.y - g.y, target.x - g.x);
        const bx = clamp(target.x + Math.cos(a) * 58, ARENA.left + 24, ARENA.right - 24);
        const by = clamp(target.y + Math.sin(a) * 58, ARENA.top + 24, ARENA.bottom - 24);
        g.body.reset(bx, by);
        g.aimAngle = a + Math.PI;
        let executed = false;
        let killed = false;
        this.enemies.getChildren().forEach((e) => {
          if (e.active && !e.dying && dist2(e.x, e.y, target.x, target.y) < 82 * 82) {
            if (e.hp <= e.maxHp * 0.2) {
              e.takeDamage(e.hp + 999999, a);
              executed = true;
            } else {
              e.takeDamage(dmg, a);
            }
            if (e.dying || !e.active) killed = true;
            this.markGuestHit(e.x, e.y, 0xff4a6a);
          }
        });
        if (killed) {
          this.guestSkill.cooldownUntil = now;
          this.hud.toastQueue.push(executed ? '玩家2：斩杀成功，技能冷却重置' : '玩家2：技能击杀，冷却重置');
        }
        this.fx.ring(target.x, target.y, 0xff4a6a, 0.2, 2.0, 420, 0.9, 744);
      }
      g.invulnUntil = Math.max(g.invulnUntil, now + 1200);
      skill.activeUntil = now + 700;
      this.hud.toastQueue.push('玩家2：影袭');
    } else if (type === 'alchemist') {
      const dps = this.guestSkillDamage(5);
      const hitDmg = this.guestSkillDamage(6);
      const targets = this.guestSkillTargets(5);
      if (targets.length) {
        targets.forEach((e) => this.throwPoisonFlask(g.x, g.y - 2, e.x, e.y, dps, hitDmg));
      } else {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          this.throwPoisonFlask(g.x, g.y - 2,
            clamp(g.x + Math.cos(a) * 130, ARENA.left + 30, ARENA.right - 30),
            clamp(g.y + Math.sin(a) * 110, ARENA.top + 30, ARENA.bottom - 30), dps, hitDmg);
        }
      }
      skill.activeUntil = now + 700;
      this.hud.toastQueue.push('玩家2：毒瓶毒圈');
    }
    this.fx.ring(g.x, g.y, color, 0.18, 1.8, 420, 0.85, 743);
    this.cameras.main.shake(80, 0.002);
    Sfx.skillStart();
  }

  createGuestBeam(g, color) {
    const glow = this.add.rectangle(g.x, g.y - 8, 700, 30, color, 0.25)
      .setOrigin(0, 0.5).setDepth(740).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(g.x, g.y - 8, 700, 10, 0xffffff, 0.9)
      .setOrigin(0, 0.5).setDepth(741).setBlendMode(Phaser.BlendModes.ADD);
    return { glow, core };
  }

  updateGuestSkill(time) {
    const skill = this.guestSkill;
    if (!skill.type) return;
    const g = this.player2;
    if (!g || g.isDead) {
      this.clearGuestSkillVisuals();
      return;
    }
    if (time >= skill.activeUntil && skill.type !== 'gunner' && skill.type !== 'demon'
      && skill.type !== 'knight' && skill.type !== 'frankenstein') {
      this.clearGuestSkillVisuals();
      return;
    }
    if (skill.type === 'gunner') {
      if (time >= skill.nextTick && time < skill.activeUntil) {
        const weapon = g.networkWeapon || this.weapon || WEAPONS.pistol;
        const interval = weapon.charge ? weapon.chargeTime * 1000 : weapon.fireRate * 1000;
        skill.nextTick = time + Math.max(70, interval * (this.buffs.fireRate || 1));
        skill.targets = this.guestSkillTargets(SKILL.maxTargets);
        const dmg = this.guestSkillDamage(weapon.damage || 15);
        skill.targets.forEach((e) => {
          this.guestBurst(Math.atan2(e.y - g.y, e.x - g.x), dmg, {
            speed: weapon.bulletSpeed || 900, tint: weapon.tint, pierce: weapon.pierce,
            texture: weapon.projectileTexture, scale: weapon.projectileScale,
          });
        });
      }
      if (time >= skill.activeUntil) { skill.type = null; }
    } else if (skill.type === 'mage') {
      if (skill.beam) {
        const a = g.aimAngle || 0;
        skill.beam.glow.setPosition(g.x, g.y - 8).setRotation(a);
        skill.beam.core.setPosition(g.x, g.y - 8).setRotation(a);
        if (time >= skill.nextTick) {
          skill.nextTick = time + MAGE_LASER.tick;
          const dmg = this.guestSkillDamage(MAGE_LASER.damage);
          const cos = Math.cos(a), sin = Math.sin(a);
          this.enemies.getChildren().forEach((e) => {
            if (!e.active || e.dying) return;
            const dx = e.x - g.x, dy = e.y - (g.y - 8);
            const along = dx * cos + dy * sin;
            const perp = Math.abs(-dx * sin + dy * cos);
            if (along > 0 && along < MAGE_LASER.length && perp < MAGE_LASER.width) {
              e.takeDamage(dmg, a);
              this.markGuestHit(e.x, e.y, 0xb07bff);
            }
          });
        }
      }
      if (time >= skill.activeUntil) this.clearGuestSkillVisuals();
    } else if (skill.type === 'guitarist') {
      if (skill.aura) skill.aura.setPosition(g.x, g.y).setScale(1.65 + Math.sin(time * 0.012) * 0.2);
      if (time >= skill.nextTick) {
        skill.nextTick = time + GUITAR.tick;
        const dmg = this.guestSkillDamage(GUITAR.damage);
        this.enemies.getChildren().forEach((e) => {
          if (e.active && !e.dying && dist2(e.x, e.y, g.x, g.y) < GUITAR.radius * GUITAR.radius) {
            e.takeDamage(dmg, Math.atan2(e.y - g.y, e.x - g.x));
            this.markGuestHit(e.x, e.y, 0xd96a9a);
          }
        });
      }
      if (time >= skill.activeUntil) this.clearGuestSkillVisuals();
    } else if (skill.type === 'vampire') {
      if (skill.aura) skill.aura.setPosition(g.x, g.y);
      if (time >= skill.nextTick) {
        skill.nextTick = time + VAMPIRE.tick;
        const targets = this.guestSkillTargets(VAMPIRE.maxTargets);
        let total = 0;
        targets.forEach((e) => {
          if (dist2(e.x, e.y, g.x, g.y) > VAMPIRE.radius * VAMPIRE.radius) return;
          const dmg = this.guestSkillDamage(VAMPIRE.damage);
          e.takeDamage(dmg, Math.atan2(e.y - g.y, e.x - g.x));
          total += dmg;
          this.markGuestHit(e.x, e.y, 0xd92a3a);
        });
        if (total > 0) g.hp = Math.min(g.maxHp, g.hp + Math.max(1, Math.round(total * VAMPIRE.healRatio)));
      }
      if (time >= skill.activeUntil) this.clearGuestSkillVisuals();
    } else if (skill.type === 'frankenstein') {
      if (time >= skill.activeUntil) {
        g.setGiantForm(false);
        g.clearShield();
        this.clearGuestSkillVisuals();
      }
    } else if (skill.type === 'demon' || skill.type === 'knight') {
      if (skill.aura) {
        skill.aura.setPosition(g.x, g.y)
          .setScale(1.4 + Math.sin(time * 0.012) * 0.18)
          .setAlpha(0.35 + Math.sin(time * 0.02) * 0.15);
      }
      if (time >= skill.activeUntil) this.clearGuestSkillVisuals();
    }
  }

  clearGuestSkillVisuals() {
    const skill = this.guestSkill;
    if (!skill) return;
    if (skill.beam) {
      if (skill.beam.glow && skill.beam.glow.active) skill.beam.glow.destroy();
      if (skill.beam.core && skill.beam.core.active) skill.beam.core.destroy();
      skill.beam = null;
    }
    if (skill.aura) {
      if (skill.aura.active) skill.aura.destroy();
      skill.aura = null;
    }
    skill.type = null;
    skill.targets = [];
  }

  guestMerchantTrade(index) {
    const m = this.merchant;
    const g = this.player2;
    if (!m || !g || !m.trades || !Number.isInteger(index)) return;
    if (dist2(g.x, g.y, m.x, m.y) > 145 * 145) return;
    const trade = m.trades[index];
    if (!trade || trade.sold) return;
    if (trade.kind === 'buy') {
      if (Store.data.coins < trade.coins) return;
      Store.data.coins -= trade.coins;
      Store.addFragment(trade.weaponId, trade.amount);
      this.hud.toastQueue.push(`玩家2 买入 ${WEAPONS[trade.weaponId].name}碎片 ×${trade.amount}`);
    } else if (trade.kind === 'heart') {
      if (Store.data.demonHearts < trade.hearts) return;
      Store.data.demonHearts -= trade.hearts;
      Store.addFragment(trade.weaponId, trade.amount);
      this.hud.toastQueue.push(`玩家2 用撒旦之心换到 ${WEAPONS[trade.weaponId].name}碎片 ×${trade.amount}`);
    } else {
      if ((Store.data.fragments[trade.weaponId] || 0) < trade.amount) return;
      Store.addFragment(trade.weaponId, -trade.amount);
      Store.addCoins(trade.coins);
      this.hud.toastQueue.push(`玩家2 卖出碎片，获得 ${trade.coins} 金币`);
    }
    trade.sold = true;
    Store.save();
    Sfx.coin();
    this.sendGuestState(this.time.now, true);
  }

  removeGuest() {
    if (this.player2) {
      this.player2.destroy();
      this.player2 = null;
    }
    if (this.guestTag) {
      this.guestTag.destroy();
      this.guestTag = null;
    }
    this.hud.toastQueue.push('玩家2 已离开房间');
    if (this.hostDowned) this.endCoopDefeat();
  }

  onEnemyBulletHitGuest(guest, bullet) {
    if (!this.player2 || this.player2.isDead || !bullet || !bullet.active) return;
    const bx = bullet.x, by = bullet.y;
    bullet.destroy();
    this.damageGuest(bullet.damage || 8);
    this.fx.hitSpark(bx, by);
  }

  onEnemyTouchGuest(guest, enemy) {
    if (!this.player2 || this.player2.isDead || !enemy || !enemy.active || enemy.dying) return;
    const now = this.time.now;
    if (now - this.guestTouchAt < 600) return;
    this.guestTouchAt = now;
    this.damageGuest(enemy.damage);
  }

  getCollector(x, y) {
    let best = this.player;
    let bd = this.player ? dist2(x, y, this.player.x, this.player.y) : Infinity;
    if (this.player2 && this.player2.active && !this.player2.isDead) {
      const d = dist2(x, y, this.player2.x, this.player2.y);
      if (d < bd) { bd = d; best = this.player2; }
    }
    return best;
  }

  updateGhost(time) {
    const g = this.ghost;
    if (!g || !g.sprite || this.player.isDead) return;
    const p = this.player;
    const tx = p.x + (p.flipX ? 36 : -36);
    const ty = p.y - 30 + Math.sin(time * 0.004) * 4;
    g.sprite.x = lerp(g.sprite.x, tx, 0.09);
    g.sprite.y = lerp(g.sprite.y, ty, 0.09);
    g.sprite.setDepth(g.sprite.y + 40);
    g.glow.setPosition(g.sprite.x, g.sprite.y).setDepth(g.sprite.y + 39);

    const target = this.findNearestEnemy(g.sprite.x, g.sprite.y, 560);
    if (target && time >= g.nextShotAt) {
      g.nextShotAt = time + Math.max(520, 950 - g.level * 120);
      const ang = Math.atan2(target.y - g.sprite.y, target.x - g.sprite.x);
      this.spawnPlayerBullet(g.sprite.x, g.sprite.y, ang, 10 + g.level * 4, {
        speed: 560, tint: 0xdff6ff,
      });
      this.fx.ring(g.sprite.x, g.sprite.y, 0x9fd8ff, 0.1, 0.4, 160, 0.5, 741);
      Sfx.ghostShot();
    }
  }

  updateMercenary(time, delta) {
    if (this.mercPrompt && this.mercPrompt.visible) this.mercPrompt.setVisible(false);
    if (!this.mercenary) return;
    const merc = this.mercenary;
    if (!merc.active || merc.dead) {
      this.mercenary = null;
      return;
    }
    merc.update(time, delta, this.player);
    if (this.player.isDead || this.locked) return;
    if (this.roomState !== 'fighting' && this.roomState !== 'cleared') return;
    const d = dist2(this.player.x, this.player.y, merc.x, merc.y);
    if (d > 110 * 110) return;
    const label = merc.recruited ? '给武器' : `收买 ${merc.mercName}（${merc.cost}金币）`;
    const text = this.mercPrompt && this.mercPrompt.list[1];
    if (text) text.setText(label);
    this.mercPrompt.setPosition(
      Phaser.Math.Clamp(merc.x, 120, GAME_W - 120),
      Phaser.Math.Clamp(merc.y - 92, 110, GAME_H - 90)
    );
    this.mercPrompt.setVisible(true);
  }

  mercAction() {
    const merc = this.mercenary;
    if (!merc || !merc.active || merc.dead) return;
    if (!merc.recruited) {
      if (Store.data.coins < merc.cost) {
        Sfx.uiDeny();
        this.hud.toastQueue.push(`还差 ${merc.cost - Store.data.coins} 金币才能收买${merc.mercName}`);
        return;
      }
      Store.data.coins -= merc.cost;
      Store.save();
      merc.recruit();
      this.hud.coinDirty = true;
      Sfx.unlock();
      this.hud.toastQueue.push(`已收买佣兵「${merc.mercName}」！靠近后可以给他当前武器`);
    } else {
      merc.giveWeapon(this.weaponId, this.weapon);
      this.hud.toastQueue.push(`已把「${this.weapon.name}」交给${merc.mercName}`);
      Sfx.uiClick();
    }
    if (this.mercPrompt) this.mercPrompt.setVisible(false);
  }

  onMercenaryDead(merc) {
    if (this.mercenary === merc) this.mercenary = null;
    if (this.mercPrompt) this.mercPrompt.setVisible(false);
  }

  onEnemyBulletHitMerc(bullet, merc) {
    if (!merc || !merc.active || merc.dead || !merc.recruited) return;
    if (!bullet || !bullet.active) return;
    const bx = bullet.x, by = bullet.y;
    bullet.destroy();
    merc.takeDamage(bullet.damage || 8, bx, by);
    this.fx.hitSpark(bx, by);
  }

  onEnemyTouchMerc(enemy, merc) {
    if (!enemy || !enemy.active || enemy.dying || !merc || !merc.active || merc.dead || !merc.recruited) return;
    const now = this.time.now;
    if (now - merc.lastTouchAt < 600) return;
    merc.lastTouchAt = now;
    merc.takeDamage(enemy.damage, enemy.x, enemy.y);
  }

  maybeSpawnMerchant() {
    if (this.merchant || this.merchantSpawnsThisRound >= 2 || Math.random() > 0.06) return;
    this.merchantSpawnsThisRound++;
    this.spawnMerchant();
  }

  spawnMerchant() {
    if (this.merchant) return this.merchant;
    const spot = this.pickSpawnPoint();
    const sprite = this.add.image(spot.x, spot.y, 'merchant_0')
      .setOrigin(0.5, 1).setDepth(spot.y + 20).setScale(1.15);
    const shadow = this.add.image(spot.x, spot.y + 2, 'shadow')
      .setAlpha(0.24).setScale(0.9).setDepth(spot.y + 18);
    const label = this.add.text(spot.x, spot.y - 56, '奇旅商人', UI.textStyle(10, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(900);
    this.tweens.add({
      targets: sprite, y: spot.y - 3, duration: 1400, yoyo: true,
      repeat: -1, ease: 'Sine.InOut',
    });
    this.merchant = {
      sprite, shadow, label,
      x: spot.x, y: spot.y,
      trades: this.makeMerchantTrades(),
    };
    this.hud.toastQueue.push('地图上出现了奇旅商人，靠近可以交易');
    this.fx.ring(spot.x, spot.y - 8, 0xffd76a, 0.2, 1.4, 500, 0.8, 740);
    return this.merchant;
  }

  makeMerchantTrades() {
    const normal = Object.values(WEAPONS).filter((w) => w.fragReq > 0 && w.quality !== 'rainbow');
    const demon = ['demon_trident', 'demon_sulfur'];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const trades = [];
    const buyW = pick(normal);
    const buyAmount = randInt(3, 10);
    trades.push({
      kind: 'buy', weaponId: buyW.id, amount: buyAmount,
      coins: 30 + buyAmount * 8, sold: false,
    });
    const heartW = pick(demon);
    trades.push({
      kind: 'heart', weaponId: heartW, amount: randInt(1, 3),
      hearts: 1, sold: false,
    });
    const sellables = normal.filter((w) => (Store.data.fragments[w.id] || 0) >= 10);
    if (sellables.length > 0) {
      const sellW = pick(sellables);
      trades.push({
        kind: 'sell', weaponId: sellW.id, amount: 10,
        coins: randInt(35, 85), sold: false,
      });
    } else {
      const extraW = pick(normal);
      const amount = randInt(3, 8);
      trades.push({
        kind: 'buy', weaponId: extraW.id, amount,
        coins: 30 + amount * 8, sold: false,
      });
    }
    for (let i = trades.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trades[i], trades[j]] = [trades[j], trades[i]];
    }
    return trades;
  }

  updateMerchant(time) {
    if (this.merchantPrompt && this.merchantPrompt.visible) this.merchantPrompt.setVisible(false);
    if (!this.merchant) return;
    const m = this.merchant;
    if (!m.sprite || !m.sprite.active) {
      this.merchant = null;
      return;
    }
    m.label.setPosition(m.sprite.x, m.sprite.y - 58).setDepth(900);
    m.shadow.setPosition(m.sprite.x, m.sprite.y + 2).setDepth(m.sprite.y + 18);
    if (this.player.isDead || this.locked) return;
    if (this.roomState !== 'fighting' && this.roomState !== 'cleared') return;
    if (dist2(this.player.x, this.player.y, m.sprite.x, m.sprite.y) > 115 * 115) return;
    this.merchantPrompt.setPosition(
      Phaser.Math.Clamp(m.sprite.x, 120, GAME_W - 120),
      Phaser.Math.Clamp(m.sprite.y - 92, 110, GAME_H - 90)
    );
    this.merchantPrompt.setVisible(true);
  }

  openMerchant() {
    if (!this.merchant) return;
    this.scene.launch('Merchant', { from: 'game' });
  }

  clearMerchant() {
    if (!this.merchant) return;
    const m = this.merchant;
    if (m.sprite) this.tweens.killTweensOf(m.sprite);
    if (m.sprite && m.sprite.active) m.sprite.destroy();
    if (m.shadow && m.shadow.active) m.shadow.destroy();
    if (m.label && m.label.active) m.label.destroy();
    this.merchant = null;
    if (this.merchantPrompt) this.merchantPrompt.setVisible(false);
  }

  collectTreasure() {
    if (this.treasurePot <= 0) return;
    const amount = this.treasurePot;
    this.treasurePot = 0;
    Store.addCoins(amount);
    Store.save();
    this.hud.coinDirty = true;
    this.hud.toastQueue.push(`取出了 ${amount} 金币！`);
    Sfx.coin();
  }

  grantNoScratchReward() {
    const weaponPool = Object.values(WEAPONS).filter((w) => ['purple', 'red', 'gold'].includes(w.quality));
    const rings = Object.keys(RINGS);
    const picks = [];
    for (let i = 0; i < 2 && weaponPool.length > 0; i++) {
      const w = weaponPool[randInt(0, weaponPool.length - 1)];
      const amount = randInt(6, 12);
      Store.addFragment(w.id, amount);
      picks.push(`${w.name}碎片×${amount}`);
    }
    for (let i = 0; i < 2 && rings.length > 0; i++) {
      const id = rings[randInt(0, rings.length - 1)];
      const amount = randInt(3, 6);
      Store.addRingFragment(id, amount);
      picks.push(`${RINGS[id].name}碎片×${amount}`);
    }
    Store.save();
    this.hud.bannerQueue.push({
      title: '不掉一根毛',
      sub: picks.join('  '),
      color: '#9fe8ff',
    });
    Sfx.unlock();
  }

  hasRing(id) {
    return Store.data.equippedRing === id;
  }

  tryRingUndying() {
    if (!this.hasRing('undying') || this.ringUndyingUsed) return false;
    this.ringUndyingUsed = true;
    this.player.hp = 1;
    this.player.invulnUntil = this.time.now + 2500;
    this.hud.hpDirty = true;
    this.hud.bannerQueue.push({ title: '不死戒指', sub: '抵挡了这次致命伤害', color: '#ffd76a' });
    this.fx.ring(this.player.x, this.player.y, 0xffd76a, 0.2, 2.2, 600, 0.9, 740);
    this.cameras.main.flash(260, 255, 220, 120);
    Sfx.energy();
    return true;
  }

  ringDodgeChance() {
    if (!this.hasRing('phantom') || !this.player) return 0;
    const sp = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y);
    const ratio = sp / Math.max(1, BALANCE.playerSpeed);
    return Math.min(0.30, 0.01 + Math.max(0, ratio) * 0.04);
  }

  onRingDodge() {
    this.player.invulnUntil = Math.max(this.player.invulnUntil, this.time.now + 300);
    this.fx.floatingText(this.player.x, this.player.y - 34, '闪避', '#9fe8ff');
    this.fx.ring(this.player.x, this.player.y, 0x9fe8ff, 0.12, 0.9, 260, 0.7, 735);
  }

  tryRingExecute(enemy, angle) {
    if (!this.hasRing('execute') || this.ringExecuteUsed || !enemy || enemy.dying) return false;
    this.ringExecuteUsed = true;
    this.hud.bannerQueue.push({ title: '秒杀戒指', sub: `${enemy.def ? enemy.def.name : '目标'} 被秒杀`, color: '#ff6a5a' });
    this.fx.ring(enemy.x, enemy.y, 0xff3a2a, 0.2, 2.2, 500, 0.9, 746);
    Sfx.explosion();
    enemy.takeDamage(enemy.hp + 999999, angle);
    return true;
  }

  maybeRingWealth() {
    if (!this.hasRing('wealth') || this.player.isDead) return;
    if (Math.random() < 0.2) this.dropCoins(this.player.x, this.player.y, 1);
  }

  ringBloodOnKill() {
    if (this.hasRing('blood') && this.player && !this.player.isDead && this.ringBloodBonus < 100) {
      this.ringBloodBonus += 2;
      this.player.addMaxHp(2);
      this.hud.hpDirty = true;
    }
    if (this.guestRing === 'blood' && this.player2 && !this.player2.isDead && this.guestRingBloodBonus < 100) {
      this.guestRingBloodBonus += 2;
      this.player2.maxHp += 2;
      this.player2.hp = Math.min(this.player2.maxHp, this.player2.hp + 2);
    }
  }

  trySecondWind() {
    if (!this.secondWindReady || !this.player) return false;
    this.secondWindReady = false;
    this.player.hp = Math.max(1, Math.round(this.player.maxHp * 0.3));
    this.player.invulnUntil = this.time.now + 2000;
    this.hud.hpDirty = true;
    this.hud.bannerQueue.push({ title: '第二次呼吸', sub: '以 30% 生命复活 · 2 秒无敌', color: '#ffd76a' });
    this.fx.ring(this.player.x, this.player.y, 0xffd76a, 0.2, 2.2, 650, 0.9, 760);
    this.cameras.main.flash(260, 255, 220, 140);
    Sfx.energy();
    return true;
  }

  tryGhostSave() {
    if (!this.ghost || !this.ghost.ready || this.player.isDead) return false;
    this.ghost.ready = false;
    const spots = [[480, 410], [480, 150], [170, 420], [790, 420], [170, 170], [790, 170]];
    let best = spots[0];
    let bestScore = -1;
    for (const spot of spots) {
      let minD = Infinity;
      this.enemies.getChildren().forEach((e) => {
        if (e.active && !e.dying) minD = Math.min(minD, dist2(spot[0], spot[1], e.x, e.y));
      });
      if (minD > bestScore) {
        bestScore = minD;
        best = spot;
      }
    }
    const p = this.player;
    if (p.body) p.body.reset(best[0], best[1]);
    p.hp = Math.max(25, Math.round(p.maxHp * 0.35));
    p.invulnUntil = this.time.now + 3000;
    p.setAlpha(1);
    p.clearTint();
    this.enemyBullets.getChildren().slice().forEach((b) => {
      if (dist2(b.x, b.y, p.x, p.y) < 150 * 150) b.destroy();
    });
    this.hud.hpDirty = true;
    this.cameras.main.flash(320, 170, 230, 255);
    this.fx.ring(p.x, p.y, 0x9fd8ff, 0.3, 2.2, 700, 0.9, 760);
    this.hud.bannerQueue.push({ title: '幽灵宝宝', sub: '把主人传送到安全位置 · 3 秒无敌', color: '#bfe8ff' });
    Sfx.ghostSave();
    return true;
  }

  summonBoarAxeRain(player) {
    if (!player || player.isDead) return;
    const count = BOAR_AXE.rockCount;
    // 覆盖整张地图，而不是只覆盖玩家周围半屏
    for (let i = 0; i < count; i++) {
      const x = rand(ARENA.left + 36, ARENA.right - 36);
      const y = rand(ARENA.top + 42, ARENA.bottom - 32);
      this.time.delayedCall(i * 55, () => {
        if (!this.scene.isActive() || !this.player || this.player.isDead) return;
        this.spawnFallingRock(x, y, true);
      });
    }
    this.cameras.main.shake(520, 0.004);
    this.cameras.main.flash(120, 255, 180, 80);
    this.hud.toastQueue.push('野猪王之斧：石头雨！');
    Sfx.rockRain();
  }

  spawnFallingRock(x, y, friendly) {
    // 落点红圈：先亮起、收缩，再落石；玩家召唤用橙色，Boss 用红色
    const baseColor = friendly ? 0xffb15a : 0xff3a2a;
    const edgeColor = friendly ? 0xffd76a : 0xff5a4a;
    const disc = this.add.circle(x, y, 30, baseColor, 0.18)
      .setDepth(704)
      .setStrokeStyle(2, edgeColor, 0.95);
    const warn = this.add.image(x, y, 'spawnring')
      .setTint(friendly ? 0xffb15a : 0xff4a3a).setScale(0.95).setAlpha(0.95).setDepth(705);
    this.tweens.add({
      targets: warn, scale: 0.38, duration: 520, ease: 'Quad.In',
    });
    this.tweens.add({
      targets: [warn, disc], alpha: 0, delay: 400, duration: 120,
      onComplete: () => {
        warn.destroy();
        disc.destroy();
        this.dropRock(x, y, friendly);
      },
    });
  }

  dropRock(x, y, friendly) {
    const rock = this.add.image(x, y - 170, 'rock').setDepth(750).setScale(0.8);
    this.tweens.add({
      targets: rock, y, duration: 250, ease: 'Quad.In',
      onComplete: () => {
        rock.destroy();
        this.fx.dust.explode(10, x, y);
        this.fx.smoke.explode(3, x, y);
        this.fx.ring(x, y, friendly ? 0xffd76a : 0xffb15a, 0.2, 1.2, 300, 0.7, 745);
        this.cameras.main.shake(100, 0.004);
        if (friendly) {
          const dmg = 30 + this.round * 3;
          this.enemies.getChildren().forEach((e) => {
            if (!e.active || e.dying) return;
            if (dist2(x, y, e.x, e.y) < 66 * 66) {
              e.takeDamage(dmg, Math.atan2(e.y - y, e.x - x));
              this.fx.weaponHit(e.x, e.y, 0xffd76a, 4);
            }
          });
        } else if (!this.player.isDead && dist2(x, y, this.player.x, this.player.y) < 52 * 52) {
          this.player.takeDamage(14 + (this.round - 1) * 2, x, y, this.time.now);
        }
      },
    });
  }

  deathBlast(x, y) {
    const dmg = Math.round(35 * this.buffs.deathBlast);
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (dist2(x, y, e.x, e.y) <= 95 * 95) {
        e.takeDamage(dmg, Math.atan2(e.y - y, e.x - x));
      }
    });
    this.fx.ring(x, y, 0xff8a4a, 0.2, 1.8, 400, 0.9, 745);
    this.fx.sparks.explode(12, x, y);
    this.fx.smoke.explode(4, x, y);
    this.cameras.main.shake(90, 0.003);
    Sfx.hit();
  }

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.dying) return;
    if (enemy.reflectUntil && this.time.now < enemy.reflectUntil) {
      const bx = bullet.x, by = bullet.y;
      bullet.destroy();
      const ang = Math.atan2(this.player.y - by, this.player.x - bx);
      this.spawnEnemyOrb(bx, by, ang, 8, { speed: 340, tint: 0x9fd8ff });
      this.fx.hitSpark(bx, by);
      Sfx.hit();
      return;
    }
    if (bullet.hitEnemies && bullet.hitEnemies.has(enemy)) return;
    if (bullet.hitEnemies) bullet.hitEnemies.add(enemy);
    const bx = bullet.x, by = bullet.y;
    let dmg = bullet.damage || BALANCE.bulletDamage;
    if (this.buffs.executioner > 0 && enemy.maxHp > 0 && enemy.hp < enemy.maxHp * 0.3) {
      dmg = Math.round(dmg * (1 + this.buffs.executioner));
    }
    const ang = bullet.rotation;
    if (bullet.pierce > 0) {
      bullet.pierce--;
    } else {
      bullet.destroy();
    }
    const wasBoss = enemy.isBoss;
    if (this.tryRingExecute(enemy, ang)) {
      this.fx.weaponHit(bx, by, bullet.qualityColor, bullet.qualityPower);
      if (enemy.dying) this.cameras.main.shake(wasBoss ? 140 : 80, wasBoss ? 0.006 : 0.0028);
      return;
    }
    enemy.takeDamage(dmg, ang);
    if (this.netHost) {
      this.guestFx.push({ k: 'hit', x: bx, y: by, c: bullet.qualityColor, p: bullet.qualityPower });
      if (this.guestFx.length > 60) this.guestFx.splice(0, this.guestFx.length - 60);
    }
    if (bullet.water && this.player && !this.player.isDead) this.player.restoreEnergy(1);
    if (!enemy.dying && bullet.burn && enemy.applyBurn) {
      enemy.applyBurn(bullet.burn.duration, bullet.burn.dps);
    }
    if (enemy.active && !enemy.dying) {
      if (this.buffs.freezeChance > 0 && Math.random() < this.buffs.freezeChance) {
        enemy.frozenUntil = Math.max(enemy.frozenUntil || 0, this.time.now + 900);
        this.fx.ring(enemy.x, enemy.y, 0x9fe8ff, 0.12, 0.7, 240, 0.7, 738);
      }
      if (this.buffs.chainChance > 0 && Math.random() < this.buffs.chainChance) {
        let nearest = null;
        let best = 240 * 240;
        this.enemies.getChildren().forEach((e) => {
          if (!e.active || e.dying || e === enemy) return;
          const d = dist2(e.x, e.y, enemy.x, enemy.y);
          if (d < best) { best = d; nearest = e; }
        });
        if (nearest) {
          nearest.takeDamage(Math.round(dmg * 0.5), ang);
          const line = this.add.line(0, 0, enemy.x, enemy.y, nearest.x, nearest.y, 0x9fe8ff, 0.85)
            .setOrigin(0).setDepth(740).setLineWidth(2);
          this.tweens.add({ targets: line, alpha: 0, duration: 160, onComplete: () => line.destroy() });
        }
      }
      if (this.buffs.explosiveChance > 0 && Math.random() < this.buffs.explosiveChance) {
        const radius = 72;
        this.enemies.getChildren().forEach((e) => {
          if (!e.active || e.dying || e === enemy) return;
          if (dist2(e.x, e.y, enemy.x, enemy.y) > radius * radius) return;
          e.takeDamage(Math.round(dmg * 0.5), Math.atan2(e.y - enemy.y, e.x - enemy.x));
        });
        this.fx.ring(enemy.x, enemy.y, 0xff8a4a, 0.15, 1.4, 280, 0.8, 740);
        this.cameras.main.shake(45, 0.0015);
      }
    }
    this.fx.weaponHit(bx, by, bullet.qualityColor, bullet.qualityPower);
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
    if (this.player && this.player.cancelCharge) this.player.cancelCharge();
    if (this.player && this.player.cancelAxeChannel) this.player.cancelAxeChannel();
    if (this.player && this.player.cancelTridentChannel) this.player.cancelTridentChannel();
    this.stopSulfurBeam();
    if (this.weaponId !== id) this.previousWeaponId = this.weaponId;
    this.weaponId = id;
    this.weapon = w;
    this.slimeStaffShots = 0;
    this.ringUndyingUsed = false;
    this.ringTeleportUsed = false;
    this.ringExecuteUsed = false;
    this.ringBloodBonus = 0;
    this.treasurePot = 0;
    this.treasureEnabled = false;
    this.noScratchEnabled = false;
    this.roundNoDamage = true;
    this.noScratchTrackRound = -1;
    this.noScratchRound = -1;
    if (this.dualWield) this.pickSecondaryWeapon();
    this.hud.toastQueue.push(`已装备：${w.name}`);
    this.saveCheckpoint();
  }

  switchWeapon() {
    if (!this.player || this.player.isDead || this.transitioning) return;
    if (this.player.energy <= 0) {
      if (this.weaponId !== 'pistol') this.equipWeapon('pistol');
      else this.hud.toastQueue.push('能量为 0：已经是手枪');
      return;
    }
    const prev = this.previousWeaponId;
    if (prev && WEAPONS[prev] && prev !== this.weaponId) {
      this.equipWeapon(prev);
    } else if (this.weaponId !== 'pistol') {
      this.equipWeapon('pistol');
    } else {
      this.hud.toastQueue.push('没有可切换的武器');
    }
  }

  applyCharLevelUp() {
    this.charLevel = (this.charLevel || 0) + 1;
    this.buffs.damage *= 1 + CHAR_UPGRADE.damagePerLevel;
    this.buffs.fireRate = Math.max(1 - CHAR_UPGRADE.maxSpeedBonus, this.buffs.fireRate * (1 - CHAR_UPGRADE.speedPerLevel));
    if (this.player) {
      this.player.maxHp += CHAR_UPGRADE.hpPerLevel;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + CHAR_UPGRADE.hpPerLevel);
      this.player.maxEnergy += CHAR_UPGRADE.energyPerLevel;
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + CHAR_UPGRADE.energyPerLevel);
    }
    this.hud.hpDirty = true;
    this.hud.toastQueue.push('角色升级成功！');
    this.saveCheckpoint();
  }

  charDamageMul() {
    return 1 + (this.charLevel || 0) * CHAR_UPGRADE.damagePerLevel;
  }

  skillUpgradeMul() {
    return 1 + Store.getSkillLevel(this.characterId) * SKILL_UPGRADE.damagePerLevel;
  }

  skillDurationMul() {
    return 1 + Store.getSkillLevel(this.characterId) * SKILL_UPGRADE.durationPerLevel;
  }

  // 技能伤害不吃角色等级，只吃「技能升级」和局内强化
  skillDamageMul() {
    return ((this.buffs.damage || 1) / this.charDamageMul()) * this.skillUpgradeMul();
  }

  skillFactor() {
    return this.skillUpgradeMul() / this.charDamageMul();
  }

  enableDualWield() {
    this.dualWield = true;
    this.pickSecondaryWeapon();
    if (this.secondaryWeapon) {
      this.hud.toastQueue.push(`双持：${this.weapon.name} + ${this.secondaryWeapon.name}`);
    } else {
      this.hud.toastQueue.push('双持：暂时没有其他已解锁武器');
    }
  }

  pickSecondaryWeapon() {
    const owned = Store.data.ownedWeapons.filter((id) => id !== this.weaponId);
    owned.sort((a, b) => QUALITY_ORDER.indexOf(WEAPONS[b].quality) - QUALITY_ORDER.indexOf(WEAPONS[a].quality));
    this.secondaryId = owned[0] || null;
    this.secondaryWeapon = this.secondaryId ? WEAPONS[this.secondaryId] : null;
    if (this.player) this.player.secondaryNextShotAt = 0;
  }

  setSecondaryWeapon(id) {
    const w = WEAPONS[id];
    if (!w || !this.dualWield || id === this.weaponId) return false;
    this.secondaryId = id;
    this.secondaryWeapon = w;
    if (this.player) this.player.secondaryNextShotAt = 0;
    this.hud.toastQueue.push(`副手武器：${w.name}`);
    this.saveCheckpoint();
    return true;
  }

  openUpgrade(isStart) {
    if (this.upgradeOpen || this.player.isDead || !this.scene.isActive()) return;
    this.upgradeOpen = true;
    this.lastUpgradeRefresh = 0;
    this.pendingUpgradeChoices = this.rollUpgradeChoices();
    if (this.netHost) {
      Net.send({
        t: 'upgrade_offer',
        choices: this.pendingUpgradeChoices,
        isStart: !!isStart,
      });
    }
    if (isStart) this.startUpgradeShown = true;
    this.scene.launch('Upgrade', {
      from: 'game',
      isStart: !!isStart,
      choices: this.pendingUpgradeChoices,
    });
    this.scene.pause();
  }

  rollUpgradeChoices() {
    const picks = [];
    const owned = this.acquiredUpgrades || [];
    const available = UPGRADES.filter((u) => !(u.rarity === 'epic' && owned.includes(u.id)));
    for (let i = 0; i < 3; i++) {
      const wantsEpic = Math.random() < 0.08;
      let pool = available.filter((u) => !picks.includes(u) && ((u.rarity === 'epic') === wantsEpic));
      if (pool.length === 0) pool = available.filter((u) => !picks.includes(u));
      if (pool.length === 0) break;
      picks.push(Phaser.Utils.Array.GetRandom(pool));
    }
    return picks.map((u) => u.id);
  }

  refreshUpgradeChoices(fromGuest) {
    if (!this.upgradeOpen) return false;
    const now = this.time.now;
    if (now - (this.lastUpgradeRefresh || 0) < 400) {
      if (fromGuest) Net.send({ t: 'upgrade_msg', text: '刷新太快，稍后再试' });
      return false;
    }
    if (Store.data.coins < UPGRADE_REFRESH_COST) {
      if (fromGuest) Net.send({ t: 'upgrade_msg', text: '金币不足，无法刷新' });
      return false;
    }
    this.lastUpgradeRefresh = now;
    Store.data.coins -= UPGRADE_REFRESH_COST;
    Store.save();
    this.pendingUpgradeChoices = this.rollUpgradeChoices();
    const up = this.scene.get('Upgrade');
    if (up && up.scene && up.scene.isActive() && up.setChoices) {
      up.setChoices(this.pendingUpgradeChoices);
    }
    if (this.netHost) {
      Net.send({ t: 'upgrade_offer', choices: this.pendingUpgradeChoices, refresh: true });
    }
    return true;
  }

  applyUpgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    if (u.rarity === 'epic' && this.acquiredUpgrades.includes(id)) return;
    this.acquiredUpgrades.push(id);
    switch (id) {
      case 'big':
        this.buffs.size *= 1.10;
        this.player.refreshScale();
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
      case 'ghost_baby':
        this.summonGhost();
        break;
      case 'death_blast':
        this.buffs.deathBlast += 1;
        break;
      case 'twin_barrage':
        this.buffs.twinChance = Math.min(0.7, (this.buffs.twinChance || 0) + 0.35);
        break;
      case 'dual_wield':
        this.enableDualWield();
        break;
      case 'treasure':
        this.treasureEnabled = true;
        this.treasurePot = 0;
        break;
      case 'no_scratch':
        this.noScratchEnabled = true;
        this.roundNoDamage = true;
        this.noScratchTrackRound = this.round;
        break;
      case 'armor':
        this.buffs.armor = Math.min(0.45, (this.buffs.armor || 0) + 0.15);
        break;
      case 'regen':
        this.buffs.regen = Math.min(0.10, (this.buffs.regen || 0) + 0.02);
        break;
      case 'energy_core':
        this.player.maxEnergy += 30;
        this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 30);
        this.buffs.energyRegen *= 1.25;
        break;
      case 'lucky':
        this.buffs.luck = Math.min(1.8, (this.buffs.luck || 0) + 0.6);
        break;
      case 'magnet':
        this.buffs.pickup *= 1.55;
        break;
      case 'rich':
        this.buffs.coinMul += 0.5;
        break;
      case 'glass':
        this.buffs.damage *= 1.3;
        this.player.maxHp = Math.max(20, Math.round(this.player.maxHp * 0.8));
        this.player.hp = Math.min(this.player.hp, this.player.maxHp);
        break;
      case 'dash_master':
        this.buffs.dashCd *= 0.75;
        this.buffs.dashInvuln += 80;
        break;
      case 'pierce':
        this.buffs.pierceBonus += 1;
        break;
      case 'crit':
        this.buffs.critChance = Math.min(0.6, (this.buffs.critChance || 0) + 0.18);
        break;
      case 'thorns':
        this.buffs.thorns += 12;
        break;
      case 'second_wind':
        this.secondWindReady = true;
        break;
      case 'bullet_life':
        this.buffs.bulletLife *= 1.3;
        this.buffs.bulletSpeed *= 1.08;
        break;
      case 'overcharge':
        this.player.maxEnergy += 20;
        this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 20);
        this.buffs.energyRegen *= 1.35;
        break;
      case 'fortress':
        this.player.addMaxHp(45);
        this.buffs.size *= 1.04;
        this.player.refreshScale();
        break;
      case 'executioner':
        this.buffs.executioner = Math.min(1, (this.buffs.executioner || 0) + 0.25);
        break;
      case 'first_aid':
        this.buffs.healMul *= 1.5;
        break;
      case 'scavenger':
        this.buffs.dropRate = Math.min(1.2, (this.buffs.dropRate || 0) + 0.3);
        break;
      case 'quick_hands':
        this.buffs.fireRate *= 0.9;
        break;
      case 'freeze':
        this.buffs.freezeChance = Math.min(0.6, (this.buffs.freezeChance || 0) + 0.18);
        break;
      case 'chain':
        this.buffs.chainChance = Math.min(0.6, (this.buffs.chainChance || 0) + 0.18);
        break;
      case 'explosive':
        this.buffs.explosiveChance = Math.min(0.5, (this.buffs.explosiveChance || 0) + 0.15);
        break;
      case 'berserk':
        this.buffs.berserk += 0.25;
        break;
      case 'last_stand':
        this.buffs.lastStand = Math.min(0.5, (this.buffs.lastStand || 0) + 0.2);
        break;
      case 'bloodlust':
        this.buffs.bloodlust = Math.min(0.05, (this.buffs.bloodlust || 0) + 0.01);
        break;
      case 'veteran':
        this.player.addMaxHp(30);
        this.buffs.armor = Math.min(0.45, (this.buffs.armor || 0) + 0.05);
        break;
      case 'adrenaline':
        this.buffs.speed *= 1.08;
        this.buffs.dashCd *= 0.85;
        break;
      case 'sniper_focus':
        this.buffs.damage *= 1.08;
        this.buffs.bulletSpeed *= 1.1;
        break;
      case 'gold_armor':
        this.buffs.armor = Math.min(0.45, (this.buffs.armor || 0) + 0.10);
        this.buffs.coinMul += 0.2;
        break;
      default:
        break;
    }
    this.hud.hpDirty = true;
    this.hud.toastQueue.push(`获得强化：${u.name}`);
    Sfx.unlock();
    this.saveCheckpoint();
    if (this.netHost) Net.send({ t: 'upgrade_close' });
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
    if (this.buffs.thorns > 0 && enemy.active && !enemy.dying && enemy.takeDamage) {
      enemy.takeDamage(this.buffs.thorns, Math.atan2(enemy.y - player.y, enemy.x - player.x));
      this.fx.hitSpark(enemy.x, enemy.y);
    }
  }

  onEnemyKilled(enemy) {
    this.kills++;
    if (this.netHost) {
      this.guestFx.push({ k: 'kill', x: enemy.x, y: enemy.y, boss: !!enemy.isBoss });
      if (this.guestFx.length > 60) this.guestFx.splice(0, this.guestFx.length - 60);
    }
    const def = enemy.def;
    let count = enemy.isBoss
      ? randInt(24, 34)
      : randInt(def.coins[0], def.coins[1]);
    if (enemy.isElite) count *= 2;
    this.dropCoins(enemy.x, enemy.y, count + this.buffs.coinBonus);

    const dropBonus = 1 + (this.buffs.dropRate || 0);
    const hpChance = enemy.isBoss
      ? 0.65
      : Math.min(0.50, (this.player.hp < this.player.maxHp * 0.4 ? 0.13 : 0.07) * dropBonus);
    if (Math.random() < hpChance) this.dropHealthPack(enemy.x, enemy.y);
    const energyChance = enemy.isBoss
      ? 1
      : Math.min(0.55, (this.player.energy < this.player.maxEnergy * 0.4 ? 0.16 : 0.10) * dropBonus);
    if (Math.random() < energyChance) this.dropEnergyPack(enemy.x, enemy.y);
    if (this.buffs.lifesteal > 0 && !this.player.isDead) this.player.heal(this.buffs.lifesteal);
    if (this.buffs.bloodlust > 0 && !this.player.isDead) {
      this.player.heal(Math.max(1, Math.round(this.player.maxHp * this.buffs.bloodlust)));
    }
    this.maybeDropFragment(enemy);
    this.maybeDropRingFragment(enemy);
    this.ringBloodOnKill();
    if (this.buffs.deathBlast > 0 && !enemy.isBoss && Math.random() < 0.3) {
      this.deathBlast(enemy.x, enemy.y);
    }

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
    this.hud.toastQueue.push(`${boss.bossName || 'BOSS'} 被击败了！`);
  }

  onPlayerHurt() {
    this.hud.hurtAt = this.time.now;
    this.roundNoDamage = false;
  }

  onEnergyDenied() {
    const now = this.time.now;
    if (now - (this.lastEnergyWarn || 0) < 1200) return;
    this.lastEnergyWarn = now;
    this.hud.toastQueue.push('能量不足');
    this.cameras.main.shake(50, 0.001);
  }

  onPlayerDeath() {
    if (this.gameOverStarted || this.coopEnding) return;
    if (this.netHost && this.player2) {
      if (this.player2.isDead) {
        this.endCoopDefeat();
        return;
      }
      this.hostDowned = true;
      this.hostReviveTimer = 0;
      this.locked = false;
      this.cancelSkill();
      this.stopSulfurBeam();
      this.player.body.enable = false;
      this.tweens.killTweensOf(this.player);
      this.player.setAlpha(0.35).setAngle(0);
      this.player.gun.setVisible(false);
      if (this.player.shadow) this.player.shadow.setAlpha(0.15);
      if (this.hostDownTag) this.hostDownTag.destroy();
      this.hostDownTag = this.add.text(this.player.x, this.player.y - 58, '房主 · 倒地', UI.textStyle(10, {
        color: '#ffb09a', strokeThickness: 3, bold: true, shadow: false,
      })).setOrigin(0.5).setDepth(890);
      this.hud.bannerQueue.push({ title: '你倒下了', sub: '队友靠近并站立 4 秒可以救你', color: '#ffb09a' });
      this.hud.hurtAt = this.time.now;
      Sfx.explosion();
      this.fx.playerDeath(this.player.x, this.player.y);
      this.cameras.main.shake(420, 0.012);
      Net.send({ t: 'wait', text: '房主倒下了，等待队友救援' });
      return;
    }
    this.beginGameOver();
  }

  beginGameOver() {
    if (this.gameOverStarted) return;
    this.gameOverStarted = true;
    this.clearVision();
    Store.loseRingOnDeath();
    this.treasurePot = 0;
    this.stopSulfurBeam();
    Store.data.runCheckpoint = null;
    Store.save();
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
        endless: this.endless,
        wave: this.endlessWave,
        coop: !!this.netHost,
      };
      this.scene.stop('UI');
      this.scene.start('Over', data);
    });
  }

  endCoopDefeat() {
    if (this.coopEnding || this.gameOverStarted) return;
    this.coopEnding = true;
    const data = {
      coop: true,
      defeat: true,
      runCoins: this.runCoins,
      kills: this.kills,
      round: this.round,
      stage: this.stage,
      timeMs: this.time.now - this.runStartTime,
      character: this.characterId,
      endless: this.endless,
      wave: this.endlessWave,
    };
    Net.send({ t: 'gameover', data });
    this.hud.bannerQueue.push({ title: '全队阵亡', sub: '联机对局结束', color: '#ff6a5a' });
    this.time.delayedCall(250, () => this.beginGameOver());
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
    const bloodSkill = this.characterId === 'demon';
    if (!bloodSkill && !this.player.spendEnergy(BALANCE.skillEnergyCost)) {
      Sfx.uiDeny();
      this.hud.toastQueue.push('能量不足，无法释放技能');
      return;
    }
    if (this.player.cancelCharge) this.player.cancelCharge();
    if (this.player.cancelAxeChannel) this.player.cancelAxeChannel();
    if (this.player.cancelTridentChannel) this.player.cancelTridentChannel();
    this.stopSulfurBeam();
    if (this.characterId === 'swordsman') this.activateSwordSkill();
    else if (this.characterId === 'frankenstein') this.activateGiantSkill();
    else if (this.characterId === 'mage') this.activateMageSkill();
    else if (this.characterId === 'guitarist') this.activateGuitarSkill();
    else if (this.characterId === 'demon') this.activateDemonSkill();
    else if (this.characterId === 'vampire') this.activateVampireSkill();
    else if (this.characterId === 'knight') this.activateKnightSkill();
    else if (this.characterId === 'ranger') this.activateRangerSkill();
    else if (this.characterId === 'rogue') this.activateRogueSkill();
    else if (this.characterId === 'alchemist') this.activateAlchemistSkill();
    else this.activateGunnerSkill();
  }

  activateGiantSkill() {
    const s = this.skill;
    const now = this.time.now;
    const giantDuration = GIANT.duration * this.skillDurationMul();
    s.type = 'giant';
    s.active = true;
    s.endsAt = now + giantDuration;
    s.cooldown = GIANT.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = giantDuration;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    s.lastSound = 0;
    this.player.setGiantForm(true);
    this.player.addShield(150, giantDuration);
    this.giantAura = this.add.image(this.player.x, this.player.y + 8, 'glow')
      .setTint(0x7dff5a).setScale(2.1).setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.player.y - 2);
    this.fx.ring(this.player.x, this.player.y + 6, 0x8fff5a, 0.25, 2.2, 520, 0.9, 732);
    this.fx.sparks.explode(16, this.player.x, this.player.y);
    this.cameras.main.shake(240, 0.007);
    Sfx.skillStart();
    Sfx.giantPunch();
    this.hud.toastQueue.push(`科学怪人：巨型化！${Math.round(giantDuration / 1000)} 秒内用绿色铁拳锤击敌人`);
  }

  activateMageSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'mage';
    s.active = true;
    s.endsAt = now + MAGE_LASER.duration;
    s.cooldown = MAGE_LASER.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = MAGE_LASER.duration;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    this.mageNextTick = now;
    this.createMageBeam();
    this.fx.ring(this.player.x, this.player.y - 4, 0xb07bff, 0.18, 1.4, 380, 0.8, 735);
    this.cameras.main.shake(140, 0.004);
    Sfx.laserCharge();
    this.hud.toastQueue.push('法师：持续激光 8 秒！移动鼠标/摇杆改变激光朝向');
  }

  createMageBeam() {
    const glow = this.add.rectangle(this.player.x, this.player.y - 6, MAGE_LASER.length, 16, 0xb07bff, 0.24)
      .setOrigin(0, 0.5).setDepth(734).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(this.player.x, this.player.y - 6, MAGE_LASER.length, 5, 0xf0e0ff, 0.95)
      .setOrigin(0, 0.5).setDepth(735).setBlendMode(Phaser.BlendModes.ADD);
    this.mageBeam = { glow, core };
  }

  activateGuitarSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'guitar';
    s.active = true;
    s.endsAt = now + GUITAR.duration;
    s.cooldown = GUITAR.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = GUITAR.duration;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    this.guitarNextTick = now;
    this.guitarAura = this.add.image(this.player.x, this.player.y, 'ring')
      .setTint(0xff6aa8).setScale(1.5).setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(733);
    this.fx.ring(this.player.x, this.player.y, 0xff6aa8, 0.2, 1.8, 420, 0.9, 732);
    this.fx.sparks.explode(12, this.player.x, this.player.y);
    this.cameras.main.shake(160, 0.004);
    Sfx.skillStart();
    if (Sfx.guitar) Sfx.guitar();
    this.hud.toastQueue.push('吉他手：音浪 6 秒！范围内持续伤害，移速大幅提升');
  }

  activateDemonSkill() {
    const s = this.skill;
    const p = this.player;
    const now = this.time.now;
    const lossPct = 0.3 + Math.random() * 0.4;
    p.hp = Math.max(1, Math.floor(p.hp * (1 - lossPct)));
    this.hud.hpDirty = true;
    s.type = 'demon';
    s.active = true;
    s.endsAt = now + DEMON.duration;
    s.cooldown = DEMON.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = DEMON.duration;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    p.energy = p.maxEnergy;
    this.demonAura = this.add.image(p.x, p.y, 'glow')
      .setTint(0xff3a2a).setScale(1.7).setAlpha(0.28)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y - 2);
    p.setTint(0xff7a6a);
    this.fx.ring(p.x, p.y, 0xff3a2a, 0.22, 2.0, 480, 0.9, 732);
    this.fx.sparks.explode(18, p.x, p.y);
    this.cameras.main.shake(220, 0.006);
    Sfx.skillStart();
    Sfx.explosion();
    this.hud.toastQueue.push('恶魔契约：失去生命，5 秒内伤害提升、攻速翻倍、无限能量！');
  }

  activateVampireSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'vampire';
    s.active = true;
    s.endsAt = now + VAMPIRE.duration;
    s.cooldown = VAMPIRE.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = VAMPIRE.duration;
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    this.vampireNextTick = now;
    this.vampireAura = this.add.image(this.player.x, this.player.y, 'glow')
      .setTint(0xd92a3a).setScale(1.5).setAlpha(0.25)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.player.y - 2);
    this.fx.ring(this.player.x, this.player.y, 0xd92a3a, 0.18, 1.8, 420, 0.85, 732);
    this.cameras.main.shake(140, 0.004);
    Sfx.skillStart();
    this.hud.toastQueue.push('吸血鬼：5 秒内持续吸取周围最多 5 个敌人的生命');
  }

  nearestEnemies(count) {
    return this.enemies.getChildren()
      .filter((e) => e.active && !e.dying)
      .sort((a, b) => dist2(this.player.x, this.player.y, a.x, a.y) - dist2(this.player.x, this.player.y, b.x, b.y))
      .slice(0, count);
  }

  activateKnightSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'knight';
    s.active = true;
    s.endsAt = now + KNIGHT_SHIELD.duration * this.skillDurationMul();
    s.cooldown = KNIGHT_SHIELD.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = KNIGHT_SHIELD.duration * this.skillDurationMul();
    s.targets = [];
    s.locks = [];
    s.swords = [];
    s.aimTarget = null;
    this.knightAura = this.add.image(this.player.x, this.player.y, 'ring')
      .setTint(0xffe9a8).setScale(1.4).setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.player.y - 2);
    this.fx.ring(this.player.x, this.player.y, 0xfff2c8, 0.2, 2.0, 500, 0.9, 738);
    this.cameras.main.flash(180, 255, 245, 210);
    Sfx.skillStart();
    this.hud.toastQueue.push('骑士：圣盾展开，4 秒内免疫伤害');
  }

  isKnightShieldActive() {
    return !!(this.skill && this.skill.active && this.skill.type === 'knight');
  }

  updateKnightSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    if (this.knightAura && this.knightAura.active) {
      this.knightAura.setPosition(this.player.x, this.player.y)
        .setScale(1.35 + Math.sin(time * 0.012) * 0.18)
        .setAlpha(0.55 + Math.sin(time * 0.02) * 0.2)
        .setDepth(this.player.y - 2);
    }
  }

  clearKnightSkill() {
    if (!this.knightAura) return;
    const aura = this.knightAura;
    this.knightAura = null;
    this.tweens.killTweensOf(aura);
    this.tweens.add({
      targets: aura, alpha: 0, scale: 2.0, duration: 220,
      onComplete: () => aura.destroy(),
    });
  }

  activateRangerSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'ranger';
    s.active = true;
    s.endsAt = now + 400;
    s.cooldown = RANGER_VOLLEY.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = 400;
    s.targets = this.nearestEnemies(RANGER_VOLLEY.maxTargets);
    s.locks = [];
    s.swords = [];
    const dmg = Math.round(RANGER_VOLLEY.damage * this.skillDamageMul());
    const shoot = (angle) => {
      this.spawnPlayerBullet(this.player.x, this.player.y - 2, angle, dmg, {
        speed: 1050, tint: 0x8ff0b0, pierce: 1, color: 0x5ad98a, power: 4,
        texture: 'charged_arrow', scale: 1.05,
      });
    };
    if (s.targets.length > 0) {
      s.targets.forEach((e) => {
        const base = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        for (let i = 0; i < RANGER_VOLLEY.arrowsPerTarget; i++) {
          shoot(base + (i - (RANGER_VOLLEY.arrowsPerTarget - 1) / 2) * 0.14);
        }
      });
    } else {
      for (let i = 0; i < 12; i++) shoot((i / 12) * Math.PI * 2);
    }
    this.fx.ring(this.player.x, this.player.y, 0x8ff0b0, 0.18, 1.7, 380, 0.85, 738);
    this.cameras.main.shake(80, 0.002);
    Sfx.bowRelease();
    this.hud.toastQueue.push('游侠：箭雨齐射！');
  }

  activateRogueSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'rogue';
    s.active = true;
    s.endsAt = now + 350;
    s.cooldown = ROGUE_STRIKE.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = 350;
    s.targets = this.nearestEnemies(1);
    s.locks = [];
    s.swords = [];
    const target = s.targets[0];
    const dmg = Math.round(ROGUE_STRIKE.damage * this.skillDamageMul());
    if (target) {
      const ang = Math.atan2(target.y - this.player.y, target.x - this.player.x);
      const bx = clamp(target.x + Math.cos(ang) * 58, ARENA.left + 24, ARENA.right - 24);
      const by = clamp(target.y + Math.sin(ang) * 58, ARENA.top + 24, ARENA.bottom - 24);
      this.player.body.reset(bx, by);
      this.player.aimAngle = ang + Math.PI;
      this.player.invulnUntil = Math.max(this.player.invulnUntil, now + 1200);
      let executed = false;
      let killed = false;
      this.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dying) return;
        if (dist2(e.x, e.y, target.x, target.y) <= ROGUE_STRIKE.radius * ROGUE_STRIKE.radius) {
          if (e.hp <= e.maxHp * 0.2) {
            e.takeDamage(e.hp + 999999, ang);
            executed = true;
          } else {
            e.takeDamage(dmg, ang);
          }
          if (e.dying || !e.active) killed = true;
          this.fx.hitSpark(e.x, e.y);
        }
      });
      this.fx.ring(target.x, target.y, 0xff4a6a, 0.2, 2.0, 420, 0.9, 742);
      if (killed) {
        s.cooldownUntil = now;
        s.cooldown = 0;
        this.hud.toastQueue.push(executed ? '刺客斩杀成功！技能冷却立即重置' : '刺客技能击杀！冷却立即重置');
      }
    } else {
      const ang = this.player.aimAngle || 0;
      const bx = clamp(this.player.x + Math.cos(ang) * 150, ARENA.left + 24, ARENA.right - 24);
      const by = clamp(this.player.y + Math.sin(ang) * 150, ARENA.top + 24, ARENA.bottom - 24);
      this.player.body.reset(bx, by);
      this.player.invulnUntil = Math.max(this.player.invulnUntil, now + 900);
    }
    this.fx.ring(this.player.x, this.player.y, 0xb07bff, 0.15, 1.4, 300, 0.8, 739);
    this.cameras.main.shake(100, 0.003);
    Sfx.slash();
    this.hud.toastQueue.push('刺客：影袭！');
  }

  activateAlchemistSkill() {
    const s = this.skill;
    const now = this.time.now;
    s.type = 'alchemist';
    s.active = true;
    s.endsAt = now + 450;
    s.cooldown = ALCHEMIST_FLASK.cooldown * (this.buffs.skillCd || 1);
    s.cooldownUntil = now + s.cooldown;
    s.duration = 450;
    s.targets = this.nearestEnemies(ALCHEMIST_FLASK.maxTargets);
    s.locks = [];
    s.swords = [];
    const dps = Math.round(ALCHEMIST_FLASK.dps * this.skillDamageMul());
    const hitDmg = Math.round(ALCHEMIST_FLASK.damage * this.skillDamageMul());
    const throwAt = (tx, ty) => {
      this.throwPoisonFlask(this.player.x, this.player.y - 2, tx, ty, dps, hitDmg);
    };
    if (s.targets.length > 0) {
      s.targets.forEach((e) => throwAt(e.x, e.y));
    } else {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        throwAt(
          clamp(this.player.x + Math.cos(a) * 130, ARENA.left + 30, ARENA.right - 30),
          clamp(this.player.y + Math.sin(a) * 110, ARENA.top + 30, ARENA.bottom - 30)
        );
      }
    }
    this.fx.ring(this.player.x, this.player.y, 0x7ad9a0, 0.18, 1.5, 360, 0.85, 738);
    Sfx.spore();
    this.hud.toastQueue.push('炼金术士：毒瓶落地形成毒圈，友军站进去回血');
  }

  throwPoisonFlask(fromX, fromY, tx, ty, dps, hitDamage) {
    const flask = this.add.image(fromX, fromY, 'orb').setTint(0x7ad9a0)
      .setScale(1.05).setDepth(818).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flask,
      x: tx, y: ty - 4,
      scale: 0.85, duration: 300, ease: 'Quad.Out',
      onComplete: () => {
        const lx = flask.x;
        const ly = flask.y;
        flask.destroy();
        const direct = Math.max(0, Math.round(hitDamage || 0));
        if (direct > 0) {
          this.enemies.getChildren().forEach((e) => {
            if (!e.active || e.dying) return;
            if (dist2(e.x, e.y, lx, ly) < 52 * 52) {
              e.takeDamage(direct, Math.atan2(e.y - ly, e.x - lx));
              if (e.applyPoison) e.applyPoison(1200, dps);
              this.markGuestHit(e.x, e.y, 0x7ad9a0);
            }
          });
          this.fx.ring(lx, ly, 0x7ad9a0, 0.12, 1.0, 240, 0.8, 739);
        }
        this.createPoisonPool(lx, ly, dps);
      },
    });
  }

  createPoisonPool(x, y, dps) {
    const now = this.time.now;
    if (this.poisonPools.length >= 10) {
      const old = this.poisonPools.shift();
      this.destroyPoisonPool(old);
    }
    const r = ALCHEMIST_FLASK.poolRadius;
    const disc = this.add.circle(x, y, r, 0x3a9a5a, 0.16)
      .setDepth(3).setStrokeStyle(2, 0x7ad9a0, 0.55);
    const ring = this.add.image(x, y, 'ring').setTint(0x7ad9a0)
      .setScale(r / 48).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    const emitter = this.add.particles(x, y, 'spark', {
      lifespan: { min: 500, max: 900 },
      speed: { min: 5, max: 26 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.45, end: 0 },
      tint: [0x7ad9a0, 0x3a9a5a, 0xb8ffd0],
      frequency: 150,
      quantity: 1,
      blendMode: 'ADD',
    }).setDepth(5);
    const pool = {
      x, y, r, dps, disc, ring, emitter,
      expiresAt: now + ALCHEMIST_FLASK.poolDuration,
      nextTick: now + 250,
    };
    this.poisonPools.push(pool);
    this.fx.ring(x, y, 0x7ad9a0, 0.12, 1.1, 300, 0.7, 738);
  }

  updatePoisonPools(time) {
    if (!this.poisonPools.length) return;
    for (let i = this.poisonPools.length - 1; i >= 0; i--) {
      const pool = this.poisonPools[i];
      if (time >= pool.expiresAt) {
        this.destroyPoisonPool(pool);
        this.poisonPools.splice(i, 1);
        continue;
      }
      if (pool.ring.active) {
        pool.ring.setAlpha(0.35 + Math.sin(time * 0.01) * 0.15)
          .setRotation(pool.ring.rotation + 0.01);
      }
      if (time >= pool.nextTick) {
        pool.nextTick = time + ALCHEMIST_FLASK.poolTick;
        this.enemies.getChildren().forEach((e) => {
          if (e.active && !e.dying && dist2(e.x, e.y, pool.x, pool.y) <= pool.r * pool.r) {
            if (e.applyPoison) e.applyPoison(1300, pool.dps);
          }
        });
        if (this.player && !this.player.isDead && dist2(this.player.x, this.player.y, pool.x, pool.y) <= pool.r * pool.r) {
          this.player.heal(ALCHEMIST_FLASK.poolHeal);
        }
        if (this.player2 && !this.player2.isDead && dist2(this.player2.x, this.player2.y, pool.x, pool.y) <= pool.r * pool.r) {
          this.player2.hp = Math.min(this.player2.maxHp, this.player2.hp + ALCHEMIST_FLASK.poolHeal);
        }
      }
    }
  }

  destroyPoisonPool(pool) {
    if (!pool) return;
    ['disc', 'ring', 'emitter'].forEach((key) => {
      const obj = pool[key];
      if (obj && obj.active) obj.destroy();
    });
  }

  clearPoisonPools() {
    this.guestDrops = [];
    this.poisonPools.forEach((p) => this.destroyPoisonPool(p));
    this.poisonPools = [];
    this.guestDrops = [];
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
    this.hud.toastQueue.push('技能发动：用当前武器自动射击最近的 3 名敌人');
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
    else if (s.type === 'giant') this.updateGiantSkill(time);
    else if (s.type === 'mage') this.updateMageSkill(time);
    else if (s.type === 'guitar') this.updateGuitarSkill(time);
    else if (s.type === 'demon') this.updateDemonSkill(time);
    else if (s.type === 'vampire') this.updateVampireSkill(time);
    else if (s.type === 'knight') this.updateKnightSkill(time);
    else if (s.type === 'ranger' || s.type === 'rogue' || s.type === 'alchemist') {
      if (time >= s.endsAt) this.endSkill();
    } else this.updateGunnerSkill(time);
  }

  updateMageSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    if (!this.mageBeam) return;
    const angle = this.player.aimAngle || 0;
    const ox = this.player.x;
    const oy = this.player.y - 6;
    this.mageBeam.glow.setPosition(ox, oy).setRotation(angle);
    this.mageBeam.core.setPosition(ox, oy).setRotation(angle);
    if (time >= this.mageNextTick) {
      this.mageNextTick = time + MAGE_LASER.tick;
      const dmg = Math.round(MAGE_LASER.damage * this.skillDamageMul());
      const len = MAGE_LASER.length;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      this.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dying) return;
        const dx = e.x - ox;
        const dy = e.y - oy;
        const along = dx * cos + dy * sin;
        const perp = Math.abs(-dx * sin + dy * cos);
        if (along > 0 && along < len && perp < MAGE_LASER.width) {
          e.takeDamage(dmg, angle);
          this.fx.hitSpark(e.x, e.y);
        }
      });
    }
  }

  updateGuitarSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    if (this.guitarAura && this.guitarAura.active) {
      this.guitarAura.setPosition(this.player.x, this.player.y)
        .setDepth(this.player.y - 2)
        .setScale(1.35 + Math.sin(time * 0.012) * 0.18)
        .setAlpha(0.38 + Math.sin(time * 0.014) * 0.12)
        .setRotation(this.guitarAura.rotation + 0.04);
    }
    if (time >= this.guitarNextTick) {
      this.guitarNextTick = time + GUITAR.tick;
      const dmg = Math.round(GUITAR.damage * this.skillDamageMul());
      const r2 = GUITAR.radius * GUITAR.radius;
      let hits = 0;
      this.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dying) return;
        if (dist2(this.player.x, this.player.y, e.x, e.y) > r2) return;
        e.takeDamage(dmg, Math.atan2(e.y - this.player.y, e.x - this.player.x));
        this.fx.hitSpark(e.x, e.y);
        hits++;
      });
      this.fx.ring(this.player.x, this.player.y, 0xff6aa8, 0.16, 1.15, 300, 0.7, 732);
      if (hits > 0) {
        this.cameras.main.shake(36, 0.0012);
        Sfx.hit();
      }
    }
  }

  updateVampireSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    const targets = this.enemies.getChildren()
      .filter((e) => e.active && !e.dying
        && dist2(this.player.x, this.player.y, e.x, e.y) <= VAMPIRE.radius * VAMPIRE.radius)
      .sort((a, b) => dist2(this.player.x, this.player.y, a.x, a.y)
        - dist2(this.player.x, this.player.y, b.x, b.y))
      .slice(0, VAMPIRE.maxTargets);
    s.targets = targets;
    // 移除失效/超出的血线
    this.vampireBeams = this.vampireBeams.filter((entry) => {
      if (entry.enemy && entry.enemy.active && !entry.enemy.dying && targets.includes(entry.enemy)) {
        return true;
      }
      if (entry.beam && entry.beam.active) entry.beam.destroy();
      if (entry.glow && entry.glow.active) entry.glow.destroy();
      return false;
    });
    targets.forEach((e) => {
      let entry = this.vampireBeams.find((b) => b.enemy === e);
      if (!entry) {
        const beam = this.add.rectangle(this.player.x, this.player.y - 6, 10, 5, 0xd92a3a, 0.62)
          .setOrigin(0, 0.5).setDepth(733).setBlendMode(Phaser.BlendModes.ADD);
        const glow = this.add.rectangle(this.player.x, this.player.y - 6, 10, 12, 0xff5a6a, 0.16)
          .setOrigin(0, 0.5).setDepth(732).setBlendMode(Phaser.BlendModes.ADD);
        entry = { enemy: e, beam, glow };
        this.vampireBeams.push(entry);
      }
      const angle = Math.atan2(e.y - (this.player.y - 6), e.x - this.player.x);
      const len = Math.hypot(e.x - this.player.x, e.y - (this.player.y - 6));
      entry.glow.setPosition(this.player.x, this.player.y - 6)
        .setRotation(angle).setSize(Math.max(8, len), 14);
      entry.beam.setPosition(this.player.x, this.player.y - 6)
        .setRotation(angle).setSize(Math.max(8, len), 4);
      entry.beam.setAlpha(0.48 + Math.sin(time * 0.02) * 0.16);
    });
    if (this.vampireAura && this.vampireAura.active) {
      this.vampireAura.setPosition(this.player.x, this.player.y)
        .setDepth(this.player.y - 2)
        .setAlpha(0.18 + Math.sin(time * 0.018) * 0.07);
    }
    if (time >= this.vampireNextTick) {
      this.vampireNextTick = time + VAMPIRE.tick;
      let total = 0;
      targets.forEach((e) => {
        const dmg = Math.round(VAMPIRE.damage * this.skillDamageMul());
        e.takeDamage(dmg, Math.atan2(e.y - this.player.y, e.x - this.player.x));
        total += dmg;
        this.fx.hitSpark(e.x, e.y);
      });
      if (total > 0) {
        const heal = Math.max(1, Math.round(total * VAMPIRE.healRatio));
        this.player.heal(heal);
        this.fx.healBurst(this.player.x, this.player.y, heal);
      }
    }
  }

  updateDemonSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    this.player.energy = this.player.maxEnergy;
    if (this.demonAura && this.demonAura.active) {
      this.demonAura.setPosition(this.player.x, this.player.y)
        .setDepth(this.player.y - 2)
        .setScale(1.6 + Math.sin(time * 0.02) * 0.2)
        .setAlpha(0.22 + Math.sin(time * 0.018) * 0.08);
    }
  }

  updateGiantSkill(time) {
    const s = this.skill;
    if (this.player.isDead || time >= s.endsAt) {
      this.endSkill();
      return;
    }
    if (this.giantAura && this.giantAura.active) {
      this.giantAura.setPosition(this.player.x, this.player.y + 8)
        .setDepth(this.player.y - 2);
      this.giantAura.setAlpha(0.18 + Math.sin(time * 0.012) * 0.06);
      this.giantAura.rotation += 0.012;
    }
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

    // 用当前手持武器自动攻击最近的敌人
    if (s.targets.length > 0 && time >= s.nextShotAt) {
      const weapon = this.weapon || WEAPONS[this.weaponId] || WEAPONS.pistol;
      s.nextShotAt = time + this.gunnerSkillInterval(weapon);
      s.shotIndex++;
      s.aimTarget = s.targets[0];
      // 同时向锁定的最多 3 个敌人开火，而不是轮流一个个打
      s.targets.forEach((target) => {
        const angle = Math.atan2(
          target.y - this.player.y,
          target.x - this.player.x
        );
        this.gunnerSkillFire(angle, weapon, time);
      });
    }

    // 身上冒火
    this.fx.flames.setPosition(this.player.x, this.player.y + 2);
    this.fx.skillGlow.setPosition(this.player.x, this.player.y - 6);
    this.fx.skillGlow.setAlpha(0.24 + Math.sin(time * 0.022) * 0.08);
  }

  gunnerSkillInterval(weapon) {
    const buffs = this.buffs || {};
    const base = weapon.charge
      ? weapon.chargeTime * 1000
      : weapon.fireRate * 1000 * (buffs.fireRate || 1);
    return Math.max(70, base);
  }

  // 枪手技能：完全复用当前武器的弹道/近战手感，只是自动锁定最近的目标
  gunnerSkillFire(angle, weapon, time) {
    const s = this.skill;
    const buffs = this.buffs || {};
    const q = QUALITIES[weapon.quality] || QUALITIES.white;
    const power = Math.max(0, QUALITY_ORDER.indexOf(weapon.quality));
    const p = this.player;

    if (weapon.melee) {
      this.meleeAttack(p, angle, Object.assign({}, weapon, { skillFactor: this.skillFactor() }));
      Sfx.slash();
      return;
    }

    if (weapon.charge) {
      const dmg = Math.round((weapon.baseDamage + weapon.maxBonus) * this.skillDamageMul());
      const px = p.x + Math.cos(angle) * 24;
      const py = p.y + 2 + Math.sin(angle) * 24;
      this.spawnPlayerBullet(px, py, angle, dmg, {
        speed: weapon.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: null,
        pierce: 2,
        color: q.color,
        power: 6,
        texture: 'charged_arrow',
        scale: 1.45,
      });
      this.fx.muzzle(px, py, angle, q.color, 6);
      this.fx.shotBurst(px, py, q.color, 6);
      this.cameras.main.shake(70, 0.003);
      Sfx.bowRelease();
      return;
    }

    if (weapon.ringCount) {
      for (let i = 0; i < weapon.ringCount; i++) {
        const a = (i / weapon.ringCount) * Math.PI * 2 + rand(-0.03, 0.03);
        this.spawnPlayerBullet(p.x, p.y - 2, a, Math.round(weapon.damage * this.skillDamageMul()), {
          speed: weapon.bulletSpeed * (buffs.bulletSpeed || 1),
          tint: weapon.tint,
          pierce: weapon.pierce,
          color: q.color,
          power,
          texture: weapon.projectileTexture,
          scale: weapon.projectileScale,
        });
      }
      this.fx.ring(p.x, p.y - 2, q.color, 0.2, 1.3, 320, 0.8, 720);
      this.fx.shotBurst(p.x, p.y - 2, q.color, power);
      this.cameras.main.shake(45, 0.0018);
      if (time - s.lastSound > 70) {
        Sfx.shoot();
        s.lastSound = time;
      }
      return;
    }

    const px = p.x + Math.cos(angle) * 2;
    const py = p.y - 2 + Math.sin(angle) * 2;
    const spread = (weapon.spread || 0) * (buffs.spreadMul || 1);
    const extra = buffs.twinChance && Math.random() < buffs.twinChance ? 1 : 0;
    const pellets = (weapon.pellets || 1) + extra;
    for (let i = 0; i < pellets; i++) {
      const a = angle + rand(-spread, spread);
      this.spawnPlayerBullet(px, py, a, Math.round(weapon.damage * this.skillDamageMul()), {
        speed: (weapon.bulletSpeed || 900) * (buffs.bulletSpeed || 1),
        tint: weapon.tint,
        pierce: weapon.pierce,
        color: q.color,
        power,
        texture: weapon.projectileTexture,
        scale: weapon.projectileScale,
        water: !!weapon.water,
        burn: weapon.burn || (weapon.id === 'flamer' ? FLAMER_BURN : null),
      });
    }
    this.maybeSlimeStaffRing(weapon, q, power);
    const tip = p.gun.displayWidth * (1 - p.gun.originX);
    const fxX = p.x + Math.cos(angle) * (8 + tip);
    const fxY = p.y + 4 + Math.sin(angle) * (8 + tip);
    this.fx.muzzle(fxX, fxY, angle, q.color, power);
    if (s.shotIndex % 2 === 0) {
      this.fx.shell(p.x + Math.cos(angle) * 8, p.y + 4 + Math.sin(angle) * 8, angle);
    }
    this.cameras.main.shake(
      weapon.pellets > 1 ? 50 : 28,
      weapon.pellets > 1 ? 0.0022 : 0.0008
    );
    if (time - s.lastSound > 70) {
      Sfx.shoot();
      s.lastSound = time;
    }
  }

  maybeSlimeStaffRing(weapon, q, power) {
    if (!weapon || weapon.id !== 'slime_staff') return;
    this.slimeStaffShots = (this.slimeStaffShots || 0) + 1;
    if (this.slimeStaffShots % 3 !== 0) return;
    this.fireSlimeStaffRing(weapon, q, power);
  }

  fireSlimeStaffRing(weapon, q, power) {
    if (!this.player || this.player.isDead) return;
    const buffs = this.buffs || {};
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.025, 0.025);
      this.spawnPlayerBullet(this.player.x, this.player.y - 2, a, Math.round(weapon.damage * (buffs.damage || 1) * (this.player.isDemonActive() ? 1.4 : 1)), {
        speed: weapon.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: weapon.tint,
        pierce: weapon.pierce,
        color: q.color,
        power,
      });
    }
    this.fx.ring(this.player.x, this.player.y - 2, 0xff8ae8, 0.22, 1.6, 360, 0.85, 720);
    this.fx.shotBurst(this.player.x, this.player.y - 2, q.color, power);
    this.cameras.main.shake(80, 0.003);
    Sfx.shoot();
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
            e.takeDamage(Math.round(34 * this.skillDamageMul()), sw.travelAngle);
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
    if (s.type === 'giant' && this.player && this.player.setGiantForm) {
      this.player.setGiantForm(false);
      this.player.clearShield();
      this.clearGiantAura();
    }
    if (s.type === 'guitar') this.clearGuitarSkill();
    if (s.type === 'demon') this.clearDemonSkill();
    if (s.type === 'mage') this.clearMageSkill();
    if (s.type === 'vampire') this.clearVampireSkill();
    if (s.type === 'knight') this.clearKnightSkill();
    Sfx.skillEnd();
  }

  clearGuitarSkill() {
    if (!this.guitarAura) return;
    const aura = this.guitarAura;
    this.guitarAura = null;
    this.tweens.killTweensOf(aura);
    this.tweens.add({
      targets: aura, alpha: 0, scale: 2.2, duration: 220,
      onComplete: () => aura.destroy(),
    });
  }

  clearDemonSkill() {
    if (this.demonAura) {
      const aura = this.demonAura;
      this.demonAura = null;
      this.tweens.killTweensOf(aura);
      this.tweens.add({
        targets: aura, alpha: 0, scale: 2.4, duration: 220,
        onComplete: () => aura.destroy(),
      });
    }
    if (this.player) this.player.clearTint();
  }

  clearVampireSkill() {
    if (this.vampireAura) {
      const aura = this.vampireAura;
      this.vampireAura = null;
      this.tweens.killTweensOf(aura);
      this.tweens.add({
        targets: aura, alpha: 0, scale: 2.2, duration: 220,
        onComplete: () => aura.destroy(),
      });
    }
    this.vampireBeams.forEach((entry) => {
      if (entry.beam && entry.beam.active) entry.beam.destroy();
      if (entry.glow && entry.glow.active) entry.glow.destroy();
    });
    this.vampireBeams = [];
  }

  clearMageSkill() {
    if (!this.mageBeam) return;
    const beam = this.mageBeam;
    this.mageBeam = null;
    this.tweens.killTweensOf(beam.glow);
    this.tweens.killTweensOf(beam.core);
    this.tweens.add({
      targets: [beam.glow, beam.core], alpha: 0, duration: 180,
      onComplete: () => {
        if (beam.glow.active) beam.glow.destroy();
        if (beam.core.active) beam.core.destroy();
      },
    });
  }

  clearGiantAura() {
    if (!this.giantAura) return;
    const aura = this.giantAura;
    this.giantAura = null;
    this.tweens.killTweensOf(aura);
    this.tweens.add({
      targets: aura,
      alpha: 0,
      scale: 2.6,
      duration: 240,
      onComplete: () => aura.destroy(),
    });
  }

  cancelSkill() {
    const s = this.skill;
    if (!s) return;
    const wasType = s.type;
    s.active = false;
    s.aimTarget = null;
    if (wasType === 'giant' && this.player && this.player.setGiantForm) {
      this.player.setGiantForm(false);
      this.player.clearShield();
      this.clearGiantAura();
    }
    if (wasType === 'guitar') this.clearGuitarSkill();
    if (wasType === 'demon') this.clearDemonSkill();
    if (wasType === 'mage') this.clearMageSkill();
    if (wasType === 'vampire') this.clearVampireSkill();
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
    return dist2(x, y, 784, 404) <= 54 * 54;
  }

  isFireButton(x, y) {
    return dist2(x, y, 892, 420) <= 52 * 52;
  }

  isSwitchButton(x, y) {
    return x >= 665 && x <= 735 && y >= 416 && y <= 456;
  }

  setTouchFire(active) {
    if (!this.touchMode && active) this.touchMode = true;
    this.touch.fireHeld = !!active;
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
      if (this.netHost) this.guestDrops.push({ k: 'coin', x: c.x, y: c.y, v: 1 });
    }
    this.trimGuestDrops();
  }

  trimGuestDrops() {
    if (this.guestDrops.length > 90) this.guestDrops.splice(0, this.guestDrops.length - 90);
  }

  updateGuestDrops(time) {
    if (!this.netHost || !this.player2 || this.player2.isDead) return;
    const g = this.player2;
    const pickup = 42;
    for (let i = this.guestDrops.length - 1; i >= 0; i--) {
      const d = this.guestDrops[i];
      if (dist2(g.x, g.y, d.x, d.y) > pickup * pickup) continue;
      this.guestDrops.splice(i, 1);
      if (d.k === 'coin') {
        const v = d.v || 1;
        this.runCoins += v;
        Store.addCoins(v);
        this.hud.coinDirty = true;
        this.fx.coinPop(d.x, d.y);
        Sfx.coin();
      } else if (d.k === 'hp') {
        const amount = 18 + this.buffs.healBonus;
        g.hp = Math.min(g.maxHp, g.hp + amount);
        this.fx.healBurst(g.x, g.y, amount);
        Sfx.heal();
      } else if (d.k === 'ep') {
        g.energy = Math.min(g.maxEnergy, g.energy + 35);
        this.fx.ring(g.x, g.y, 0x5ad8ff, 0.15, 0.8, 300, 0.7, 740);
        Sfx.energy();
      } else if (d.k === 'frag') {
        if (d.ring) Store.addRingFragment(d.id, d.amount || 1);
        else Store.addFragment(d.id, d.amount || 1);
        this.hud.toastQueue.push(`玩家2 拾取 ${d.ring ? RINGS[d.id].name : WEAPONS[d.id].name}碎片 ×${d.amount || 1}`);
        this.fx.ring(d.x, d.y, d.color || 0xffd76a, 0.12, 0.8, 260, 0.7, 740);
        Sfx.coin();
      }
    }
  }

  autoCollectCoins() {
    if (!this.player || this.player.isDead) return;
    this.coins.getChildren().slice().forEach((c) => {
      if (!c.active) return;
      if (this.time.now > c.collectReadyAt) {
        const d2 = dist2(c.x, c.y, this.player.x, this.player.y);
        const pr = 36 * (this.buffs.pickup || 1);
        if (d2 < pr * pr) this.collectCoin(c, true);
      }
    });
  }

  collectCoin(c, silent) {
    if (!c.active) return;
    const x = c.x, y = c.y;
    const base = c.value || 1;
    const v = Math.max(base, Math.round(base * (1 + (this.buffs.coinMul || 0))));
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
    if (this.netHost) this.guestDrops.push({ k: 'hp', x: h.x, y: h.y });
    this.trimGuestDrops();
  }

  collectHealthPack(h, target) {
    if (!h.active) return;
    const p = target || this.player;
    const amount = Math.round(((h.healAmount || 18) + this.buffs.healBonus) * (this.buffs.healMul || 1));
    h.destroy();
    p.heal(amount);
    this.hud.hpDirty = true;
    this.fx.healBurst(p.x, p.y, amount);
    Sfx.heal();
  }

  dropEnergyPack(x, y) {
    const e = this.physics.add.sprite(x + rand(-8, 8), y + rand(-6, 6), 'energy_pack');
    this.energyPacks.add(e);
    e.setDepth(9);
    e.body.setCircle(11, 3, 3);
    e.body.setAllowGravity(true);
    e.body.setGravityY(700);
    e.setCollideWorldBounds(true);
    e.setBounce(0.4);
    e.setDrag(140);
    const a = rand(0, Math.PI * 2);
    const sp = rand(40, 130);
    e.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp - 90);
    e.energyAmount = 35;
    e.collectReadyAt = this.time.now + 350;
    e.setScale(0);
    this.tweens.add({ targets: e, scale: 1, duration: 180, ease: 'Back.Out' });
    if (this.netHost) this.guestDrops.push({ k: 'ep', x: e.x, y: e.y });
    this.trimGuestDrops();
  }

  collectEnergyPack(e, target) {
    if (!e.active) return;
    const p = target || this.player;
    const amount = e.energyAmount || 35;
    const x = e.x, y = e.y;
    e.destroy();
    p.restoreEnergy(amount);
    this.fx.ring(x, y, 0x5ad8ff, 0.15, 0.8, 300, 0.7, 740);
    this.fx.floatingText(p.x, p.y - 26, `+${amount} 能量`, '#9fe8ff');
    Sfx.energy();
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
    if (enemy.isBoss) {
      if (enemy.bossWeapon) {
        this.dropFragment(enemy.bossWeapon, enemy.x, enemy.y, 1, true);
      } else {
        const w = this.pickFragmentWeapon();
        if (w) this.dropFragment(w.id, enemy.x, enemy.y, 3, false);
      }
      return;
    }
    if (enemy.isElite) {
      const w = this.pickFragmentWeapon();
      if (w) this.dropFragment(w.id, enemy.x, enemy.y, 2, false);
      this.fragmentPity = 0;
      return;
    }
    this.fragmentPity++;
    const dropChance = Math.min(0.9, FRAGMENT_RULES.dropChance * (1 + (this.buffs.luck || 0)));
    if (Math.random() >= dropChance && this.fragmentPity < FRAGMENT_RULES.pityKills) return;
    const w = this.pickFragmentWeapon();
    if (!w) return;
    const amount = Math.random() < FRAGMENT_RULES.bundleChance ? 2 : 1;
    this.dropFragment(w.id, enemy.x, enemy.y, amount, false);
    this.fragmentPity = 0;
  }

  maybeDropRingFragment(enemy) {
    const luck = (this.buffs && this.buffs.luck) || 0;
    const chance = enemy.isBoss ? 1 : Math.min(0.75, (enemy.isElite ? 0.4 : 0.18) * (1 + luck * 0.6));
    if (Math.random() > chance) return;
    const ids = Object.keys(RINGS);
    if (ids.length === 0) return;
    const id = choice(ids);
    const amount = enemy.isBoss ? randInt(2, 4) : 1;
    this.dropRingFragment(id, enemy.x, enemy.y, amount);
  }

  dropRingFragment(id, x, y, amount) {
    const ring = RINGS[id];
    if (!ring) return;
    const f = this.physics.add.sprite(x + rand(-8, 8), y + rand(-6, 6), 'fragment');
    this.fragments.add(f);
    f.setTint(ring.color).setDepth(11);
    f.body.setCircle(10, 1, 2);
    f.body.setAllowGravity(true);
    f.body.setGravityY(650);
    f.setCollideWorldBounds(true);
    f.setBounce(0.4);
    f.setDrag(140);
    const a = rand(0, Math.PI * 2);
    const sp = rand(50, 160);
    f.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp - 70);
    f.isRing = true;
    f.ringId = id;
    f.amount = amount;
    f.collectReadyAt = this.time.now + 300;
    f.glow = this.add.image(f.x, f.y, 'glow')
      .setTint(ring.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.4).setScale(0.35).setDepth(10);
    f.setScale(0);
    this.tweens.add({ targets: f, scale: 0.9, duration: 200, ease: 'Back.Out' });
    if (this.netHost) {
      this.guestDrops.push({ k: 'frag', x: f.x, y: f.y, color: ring.color, id: ring.id, amount, ring: true });
      this.trimGuestDrops();
    }
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
    if (this.netHost) {
      this.guestDrops.push({ k: 'frag', x: f.x, y: f.y, color: q.color, id, amount, ring: false });
      this.trimGuestDrops();
    }
    if (special) {
      this.cameras.main.flash(220, 240, 150, 255);
      this.hud.bannerQueue.push({ title: '彩色碎片', sub: `${w.name} ×${amount}`, color: '#ff8ae8' });
      Sfx.unlock();
    }
  }

  collectFragment(f, silent) {
    if (!f.active) return;
    if (f.isRing) {
      const ring = RINGS[f.ringId];
      const x = f.x, y = f.y;
      const amount = f.amount || 1;
      if (f.glow && f.glow.active) f.glow.destroy();
      f.destroy();
      if (!ring) return;
      Store.addRingFragment(ring.id, amount);
      this.fx.floatingText(x, y - 10, `${ring.name}碎片 +${amount}`, '#ffd76a');
      if (!silent) Sfx.shard();
      return;
    }
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
      this.hud.hintText = '左半屏移动 · 右半屏瞄准 · 右下「射击/技能/切枪/闪」';
      this.hud.hintUntil = this.time.now + 6500;
    }
    const x = pointer.x, y = pointer.y;
    if (this.isDashButton(x, y)) {
      this.touchDashQueued = true;
      return;
    }
    if (this.isSkillButton(x, y) || this.isFireButton(x, y) || this.isSwitchButton(x, y)) return;
    if (this.mercPrompt && this.mercPrompt.visible) {
      const b = this.mercPrompt.getBounds();
      if (Phaser.Geom.Rectangle.Contains(b, x, y)) return;
    }
    if (this.merchantPrompt && this.merchantPrompt.visible) {
      const b = this.merchantPrompt.getBounds();
      if (Phaser.Geom.Rectangle.Contains(b, x, y)) return;
    }
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
    this.touch.fireHeld = false;
    this.touchDashQueued = false;
  }

  isDashButton(x, y) {
    return dist2(x, y, 700, 370) <= 42 * 42;
  }

  consumeDash() {
    if (this.touchDashQueued) {
      this.touchDashQueued = false;
      return true;
    }
    return false;
  }

  wantsToFire() {
    if (this.touchMode) {
      if (Store.data.autoFire) return true;
      return !!this.touch.fireHeld;
    }
    const p = this.input.activePointer;
    return !!(p && p.isDown && p.leftButtonDown());
  }

  computeAimAngle(player) {
    if (this.skill && this.skill.active && this.skill.type === 'gunner') {
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

    const dx = 700, dy = 370;
    const cd = BALANCE.dashCooldown * 1000;
    const readyAt = this.player ? this.player.dashReadyAt : 0;
    const pct = clamp(1 - Math.max(0, readyAt - this.time.now) / cd, 0, 1);

    g.fillStyle(0x111b0e, 0.55);
    g.fillCircle(dx, dy, 38);
    g.lineStyle(2, 0xd9b45a, 0.75);
    g.strokeCircle(dx, dy, 38);
    if (pct < 1) {
      g.lineStyle(3, 0x6f8a5a, 0.9);
      g.beginPath();
      g.arc(dx, dy, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
      g.strokePath();
    } else {
      g.lineStyle(3, 0xffd76a, 0.9);
      g.strokeCircle(dx, dy, 33);
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
    if (!this.player.isDead && this.buffs.regen > 0) {
      this.regenAccum = (this.regenAccum || 0) + delta;
      if (this.regenAccum >= 4000) {
        this.regenAccum -= 4000;
        this.player.heal(Math.max(1, Math.round(this.player.maxHp * this.buffs.regen)));
      }
    }
    this.updateGuestPlayer(time, delta);
    if (this.netHost) this.updateGuestSkill(time);
    if (this.netHost) this.updateRevive(delta);
    if (this.hostDownTag && this.player) {
      this.hostDownTag.setPosition(this.player.x, this.player.y - 58);
    }
    if (this.netHost && this.player2) this.sendGuestState(time);
    this.updateVision();
    this.updateGhost(time);
    this.updateMercenary(time, delta);
    this.updateMerchant(time);
    this.updatePoisonPools(time);
    this.updateGuestDrops(time);
    this.updateTouchUI();

    const aiDelta = this.endless ? delta * (this.endlessAtkMul || 1) : delta;
    this.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (e.updateBurn) e.updateBurn(time);
      if (e.updatePoison) e.updatePoison(time);
      if (e.active && !e.dying && e.updateAI) e.updateAI(time, aiDelta);
      if (e.active && !e.dying) this.keepEnemyInArena(e);
    });

    // 清理越界子弹
    const out = (o) => o.x < ARENA.left - 60 || o.x > ARENA.right + 60 || o.y < ARENA.top - 60 || o.y > ARENA.bottom + 60;
    this.playerBullets.getChildren().slice().forEach((b) => {
      if (!b.active) return;
      if (b.spin) b.rotation += 0.34;
      if (b.boomerang) {
        if (b.boomerangPhase === 'out' && time >= b.returnAt) {
          b.boomerangPhase = 'back';
          if (b.hitEnemies) b.hitEnemies.clear();
        }
        if (b.boomerangPhase === 'back') {
          if (!this.player || this.player.isDead) { b.destroy(); return; }
          const a = Math.atan2(this.player.y - b.y, this.player.x - b.x);
          b.setVelocity(Math.cos(a) * 900, Math.sin(a) * 900);
          if (dist2(b.x, b.y, this.player.x, this.player.y) < 32 * 32) {
            b.destroy();
            return;
          }
        } else if (time - b.bornAt > 2600 || out(b)) {
          b.destroy();
          return;
        }
        if (time - b.bornAt > 4200) b.destroy();
        return;
      }
      if (time - b.bornAt > (b.life || BALANCE.bulletLife * 1000) || out(b)) b.destroy();
    });
    this.enemyBullets.getChildren().slice().forEach((b) => {
      if (!b.active) return;
      if (b.decelAfter && dist2(b.x, b.y, b.startX, b.startY) > b.decelAfter * b.decelAfter) {
        b.body.velocity.scale(0.985);
        if (b.body.velocity.length() < 14) b.body.setVelocity(0, 0);
      }
      if (time - b.bornAt > 3400 || out(b)) b.destroy();
    });

    // 金币吸附
    if (!this.player.isDead) {
      this.coins.getChildren().slice().forEach((c) => {
        if (!c.active) return;
        if (time < c.collectReadyAt) return;
        const collector = this.getCollector(c.x, c.y);
        const d2 = dist2(c.x, c.y, collector.x, collector.y);
        const pr = 185 * (this.buffs.pickup || 1);
        if (d2 < pr * pr) {
          const ang = Math.atan2(collector.y - c.y, collector.x - c.x);
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
        const collector = this.getCollector(h.x, h.y);
        const d2 = dist2(h.x, h.y, collector.x, collector.y);
        const pr = 130 * (this.buffs.pickup || 1);
        if (d2 < pr * pr) {
          const ang = Math.atan2(collector.y - h.y, collector.x - h.x);
          h.body.setGravityY(0);
          h.body.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
        }
        if (d2 < 30 * 30) this.collectHealthPack(h, collector);
      });
    }

    // 能量包吸附
    if (!this.player.isDead) {
      this.energyPacks.getChildren().slice().forEach((e) => {
        if (!e.active || time < e.collectReadyAt) return;
        const collector = this.getCollector(e.x, e.y);
        const d2 = dist2(e.x, e.y, collector.x, collector.y);
        const pr = 130 * (this.buffs.pickup || 1);
        if (d2 < pr * pr) {
          const ang = Math.atan2(collector.y - e.y, collector.x - e.x);
          e.body.setGravityY(0);
          e.body.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
        }
        if (d2 < 30 * 30) this.collectEnergyPack(e, collector);
      });
    }

    // 碎片吸附
    if (!this.player.isDead) {
      this.fragments.getChildren().slice().forEach((f) => {
        if (!f.active) return;
        if (f.glow && f.glow.active) f.glow.setPosition(f.x, f.y);
        if (time < f.collectReadyAt) return;
        const collector = this.getCollector(f.x, f.y);
        const d2 = dist2(f.x, f.y, collector.x, collector.y);
        const pr = 160 * (this.buffs.pickup || 1);
        if (d2 < pr * pr) {
          const ang = Math.atan2(collector.y - f.y, collector.x - f.x);
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
    if (this.demonPortal && this.demonPortal.armed && this.roomState === 'cleared' && !this.player.isDead && !this.demonRealm) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.demonPortal.x, this.demonPortal.y);
      if (d < 50) this.enterDemonRealm();
    }
    if (this.demonReturnPortal && this.demonReturnPortal.armed && this.roomState === 'cleared' && !this.player.isDead) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.demonReturnPortal.x, this.demonReturnPortal.y);
      if (d < 50) this.exitDemonRealm();
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
