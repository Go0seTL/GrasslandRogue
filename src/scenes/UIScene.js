class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.input.addPointer(3);
    this.lastHp = -1;
    this.lastEnergy = -1;
    this.lastCoins = -1;
    this.lastRound = -1;
    this.lastStage = -1;
    this.lastHurtAt = -1;

    this.staticG = this.add.graphics().setDepth(100);
    // 生命 / 能量面板
    UI.drawPanel(this.staticG, 16, 12, 300, 78, { border: 0xb9a35c, bg: 0x141e0f, alpha: 0.85 });
    this.staticG.fillStyle(0x0b1208, 1);
    this.staticG.fillRect(24, 18, 44, 48);
    this.staticG.lineStyle(2, 0x7e9a5e, 1);
    this.staticG.strokeRect(24, 18, 44, 48);
    // 关卡面板
    UI.drawPanel(this.staticG, 396, 8, 168, 52, { border: 0x6f8a5a, bg: 0x121a0d, alpha: 0.78 });
    // 金币面板
    UI.drawPanel(this.staticG, 704, 12, 240, 46, { border: 0xb9a35c, bg: 0x141e0f, alpha: 0.85 });
    // 武器面板
    UI.drawPanel(this.staticG, 16, 484, 210, 44, { border: 0x6f8a5a, bg: 0x141e0f, alpha: 0.8 });

    const gameScene = this.scene.get('Game');
    const remoteScene = this.scene.get('RemoteGame');
    const guestScene = this.scene.get('Guest');
    const source = (remoteScene && remoteScene.isRemoteHud) ? remoteScene : guestScene;
    this.isGuestHud = !!(source && source.isRemoteHud);
    this.hudSource = this.isGuestHud ? source : gameScene;
    this.characterId = this.hudSource ? this.hudSource.characterId : 'gunner';
    const portraitKey = {
      swordsman: 'swordsman_idle', frankenstein: 'frankenstein_idle',
      mage: 'mage_0', guitarist: 'guitarist_0', demon: 'demon_0',
      vampire: 'vampire_0', knight: 'knight_0', ranger: 'ranger_0',
      rogue: 'rogue_0', alchemist: 'alchemist_0',
    }[this.characterId] || 'player_idle';
    this.add.image(46, 42, portraitKey).setDepth(102).setScale(0.95);
    this.charLevelText = this.add.text(46, 72, 'Lv.0', UI.textStyle(9, {
      color: '#ffe9a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(103);
    this.lastCharLevel = -1;
    this.add.text(82, 20, '生命', UI.textStyle(11, {
      color: '#cfd9b6', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102);
    this.hpG = this.add.graphics().setDepth(101);
    this.hpText = this.add.text(186, 35, '', UI.textStyle(11, {
      color: '#ffffff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(103);

    this.add.text(82, 50, '能量', UI.textStyle(10, {
      color: '#9fe8ff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102);
    this.energyG = this.add.graphics().setDepth(101);
    this.energyText = this.add.text(186, 63, '', UI.textStyle(9, {
      color: '#eaffff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(103);

    this.guestPanelG = this.add.graphics().setDepth(101);
    this.guestText = this.add.text(24, 103, '', UI.textStyle(10, {
      color: '#9fe8ff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102).setVisible(false);
    this.guestHpText = this.add.text(220, 116, '', UI.textStyle(9, {
      color: '#eaffff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(1, 0.5).setDepth(103).setVisible(false);

    this.levelBig = this.add.text(480, 26, '1-1', UI.textStyle(27, {
      color: '#ffe9a8', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(102);
    this.levelSub = this.add.text(480, 50, '第 1 轮 · 草原', UI.textStyle(11, {
      color: '#b9cba0', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5).setDepth(102);

    this.add.image(726, 35, 'coin_icon').setDepth(102);
    this.coinText = this.add.text(746, 35, '0', UI.textStyle(20, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0, 0.5).setDepth(102);

    this.weaponIcon = this.add.image(40, 506, 'gun').setDepth(102).setScale(1.35).setRotation(-0.08);
    this.weaponName = this.add.text(68, 498, '手枪', UI.textStyle(14, {
      color: '#fff1c4', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102);
    this.weaponSub = this.add.text(68, 514, '无限弹药', UI.textStyle(10, {
      color: '#9ff0a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102);
    this.lastSecondaryId = null;
    this.secondaryIcon = this.add.image(198, 506, 'gun')
      .setDepth(102).setScale(0.65).setVisible(false);
    this.secondaryTag = this.add.text(176, 494, '副', UI.textStyle(8, {
      color: '#9fe8ff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(103).setVisible(false);

    this.bossG = this.add.graphics().setDepth(120);
    this.bossName = this.add.text(480, 92, '', UI.textStyle(14, {
      color: '#ffb09a', strokeThickness: 3,
    })).setOrigin(0.5).setDepth(121).setVisible(false);
    this.bossName2 = this.add.text(480, 126, '', UI.textStyle(13, {
      color: '#ffb09a', strokeThickness: 3,
    })).setOrigin(0.5).setDepth(121).setVisible(false);

    this.hintText = this.add.text(480, 516, '', UI.textStyle(13, {
      color: '#dfe8c8', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(130).setAlpha(0);
    this.reviveHint = this.add.text(480, 462, '', UI.textStyle(12, {
      color: '#9fe8ff', strokeThickness: 3, bold: true,
    })).setOrigin(0.5).setDepth(131).setVisible(false);

    this.redVignette = this.add.image(0, 0, 'vignette_red').setOrigin(0).setDepth(2000).setAlpha(0);

    this.toast = UI.toastContainer(this);

    // 技能按钮
    this.skillCharacter = this.characterId;
    const isSword = this.characterId === 'swordsman';
    const isFrankenstein = this.characterId === 'frankenstein';
    const isMage = this.characterId === 'mage';
    const isGuitarist = this.characterId === 'guitarist';
    const isDemon = this.characterId === 'demon';
    const isVampire = this.characterId === 'vampire';
    const skillIconKey = {
      swordsman: 'sword', frankenstein: 'fist_icon', mage: 'mage_icon',
      guitarist: 'guitar_icon', demon: 'demon_icon', vampire: 'vampire_icon',
      knight: 'ring_icon', ranger: 'bow', rogue: 'sword', alchemist: 'orb',
    }[this.characterId] || 'flame_icon';
    this.skillG = this.add.graphics().setDepth(3000);
    this.skillIcon = this.add.image(806, 410, skillIconKey).setDepth(3001);
    if (isSword || this.characterId === 'rogue') {
      this.skillIcon.setScale(0.6).setRotation(-0.7);
    } else if (this.characterId === 'ranger') {
      this.skillIcon.setScale(1.05);
    } else if (isFrankenstein || isMage || isGuitarist || isDemon || isVampire
      || this.characterId === 'knight' || this.characterId === 'alchemist') {
      this.skillIcon.setScale(0.95);
    } else {
      this.skillIcon.setScale(0.82);
    }
    this.skillState = this.add.text(806, 372, 'E · 技能', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(3001);
    this.skillCostText = this.add.text(806, 441, isDemon ? '随机失血' : `${BALANCE.skillEnergyCost} 能量`, UI.textStyle(8, {
      color: '#9fe8ff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(3001);
    this.skillHit = this.add.rectangle(806, 410, 78, 78, 0x000000, 0)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true });
    this.skillHit.on('pointerup', () => {
      const game = this.hudSource;
      if (game) game.activateSkill();
    });

    // 手机手动射击按钮：技能按钮右侧，电脑端默认隐藏
    this.fireG = this.add.graphics().setDepth(3000).setVisible(false);
    this.fireG.fillStyle(0x1a0e0a, 0.72);
    this.fireG.fillCircle(884, 410, 30);
    this.fireG.lineStyle(3, 0xff7a3a, 0.95);
    this.fireG.strokeCircle(884, 410, 30);
    this.fireG.lineStyle(1, 0xffd76a, 0.8);
    this.fireG.strokeCircle(884, 410, 35);
    this.fireIcon = this.add.image(884, 410, 'gun')
      .setScale(1.0).setRotation(-0.18).setDepth(3001).setVisible(false);
    this.fireLabel = this.add.text(884, 372, '射击', UI.textStyle(11, {
      color: '#ffd0a0', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(3001).setVisible(false);
    this.fireHit = this.add.rectangle(884, 410, 78, 78, 0x000000, 0)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    const fireGame = this.hudSource;
    const releaseFire = () => {
      if (fireGame) fireGame.setTouchFire(false);
    };
    this.fireHit.on('pointerdown', () => {
      if (fireGame) fireGame.setTouchFire(true);
    });
    this.fireHit.on('pointerup', releaseFire);
    this.fireHit.on('pointerout', releaseFire);
    this.input.on('pointerup', releaseFire);
    this.input.on('pointerupoutside', releaseFire);

    // 切枪按钮
    this.switchBtn = UI.button(this, 728, 410, 58, 34, '切枪', () => {
      const game = this.hudSource;
      if (game) game.switchWeapon();
    }, { variant: 'ghost', fontSize: 12 }).setDepth(3001);

    this.createPauseButton();
    this.bestiaryBtn = this.createHudButton(922, 140, 54, 32, '图鉴', () => {
      if (this.isGuestHud) this.hudSource.openGuestModal('Bestiary');
      else this.scene.launch('Bestiary', { from: 'game' });
    });
    this.weaponBtn = this.createHudButton(922, 188, 54, 32, '武器', () => {
      if (this.isGuestHud) this.hudSource.openGuestModal('Forge');
      else this.scene.launch('Forge', { from: 'game' });
    });
    this.upgradeBtn = this.createHudButton(922, 236, 54, 32, '升级', () => {
      if (this.isGuestHud && this.hudSource.showToast) this.hudSource.showToast('联机中角色升级请回主菜单', '#ffd0a0');
      else this.scene.launch('CharUpgrade', { characterId: this.characterId });
    });
    this.bagBtn = this.createHudButton(922, 284, 54, 32, '背包', () => {
      if (this.isGuestHud) this.hudSource.openGuestModal('Inventory');
      else this.scene.launch('Inventory', { from: 'game' });
    });
    this.treasureBtn = this.createHudButton(872, 70, 120, 28, '取财', () => {
      const game = this.hudSource;
      if (game) game.collectTreasure();
    });
    this.treasureBtn.setVisible(false);

    this.lastWeaponId = null;

    this.drawHp(BALANCE.playerHP, BALANCE.playerHP);
    this.drawEnergy(BALANCE.playerEnergy, BALANCE.playerEnergy);
    this.coinText.setText(String(Store.data.coins));
  }

  createPauseButton() {
    const x = 922, y = 92, w = 42, h = 34;
    const c = this.add.container(x, y).setDepth(3000);
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
      g.fillStyle(hover ? 0x314329 : 0x1b2817, 0.92);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(2, 0xd9b45a, 0.85);
      g.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      g.fillStyle(0xffe9a8, 1);
      g.fillRect(-7, -8, 5, 16);
      g.fillRect(2, -8, 5, 16);
    };
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    c.add([g, hit]);
    c.setSize(w, h);
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => {
      const game = this.hudSource;
      if (game) game.openPause();
    });
    draw(false);
  }

  createHudButton(x, y, w, h, label, onClick) {
    const c = this.add.container(x, y).setDepth(3000);
    const g = this.add.graphics();
    const text = this.add.text(0, 0, label, UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    c.add([g, text, hit]);
    const draw = (hover) => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
      g.fillStyle(hover ? 0x314329 : 0x1b2817, 0.92);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(2, 0xd9b45a, 0.85);
      g.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
    };
    c.setSize(w, h);
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => {
      Sfx.uiClick();
      onClick();
    });
    draw(false);
    return c;
  }

  drawHp(hp, maxHp) {
    const g = this.hpG;
    g.clear();
    const x = 82, y = 28, w = 214, h = 14;
    g.fillStyle(0x0b1208, 0.95);
    g.fillRect(x, y, w, h);
    const pct = clamp(hp / maxHp, 0, 1);
    const color = pct > 0.6 ? 0x6fdd68 : (pct > 0.3 ? 0xf0c94a : 0xe8564a);
    g.fillStyle(color, 1);
    g.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(x + 2, y + 2, (w - 4) * pct, 3);
    g.lineStyle(1, 0x071006, 0.35);
    for (let i = 1; i < 10; i++) {
      g.lineBetween(x + (w / 10) * i, y + 2, x + (w / 10) * i, y + h - 2);
    }
    g.lineStyle(2, 0x6f8a5a, 1);
    g.strokeRect(x, y, w, h);
    this.hpText.setText(`${hp} / ${maxHp}`);
    this.hpText.setPosition(x + w / 2, y + h / 2);
  }

  drawEnergy(energy, maxEnergy) {
    const g = this.energyG;
    if (!g) return;
    g.clear();
    const x = 82, y = 58, w = 214, h = 10;
    g.fillStyle(0x0b1208, 0.95);
    g.fillRect(x, y, w, h);
    const pct = clamp(energy / maxEnergy, 0, 1);
    g.fillStyle(0x2f9fd9, 1);
    g.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);
    g.fillStyle(0x9fe8ff, 0.75);
    g.fillRect(x + 2, y + 2, (w - 4) * pct, 2);
    g.lineStyle(1, 0x0b1208, 0.3);
    for (let i = 1; i < 10; i++) {
      g.lineBetween(x + (w / 10) * i, y + 2, x + (w / 10) * i, y + h - 2);
    }
    g.lineStyle(2, 0x4d7a8a, 1);
    g.strokeRect(x, y, w, h);
    this.energyText.setText(`${Math.ceil(energy)} / ${maxEnergy}`);
    this.energyText.setPosition(x + w / 2, y + h / 2);
  }

  update() {
    const game = this.hudSource;
    if (!game || !game.scene.isActive() || !game.player) return;
    const hudState = game.hudState || game.hud;
    if (this.reviveHint && this.isGuestHud) {
      let text = '';
      if (game.player && game.player.isDead) {
        text = game.reviveWho === 'g' && game.reviveProgress > 0
          ? `救援中 ${game.reviveProgress}% · 房主正在救你`
          : '你倒下了 · 等待房主靠近救援';
      } else if (game.hostDowned) {
        text = game.reviveWho === 'p' && game.reviveProgress > 0
          ? `救援房主 ${game.reviveProgress}% · 继续站在房主身边`
          : '房主倒地 · 靠近房主并站立 4 秒救援';
      }
      this.reviveHint.setText(text).setVisible(!!text);
    }

    const hp = Math.max(0, Math.ceil(game.player.hp));
    if (hp !== this.lastHp) {
      if (this.lastHp != null && hp < this.lastHp) hudState.hurtAt = game.time.now;
      this.lastHp = hp;
      this.drawHp(hp, game.player.maxHp);
    }

    const energy = Math.max(0, Math.ceil(game.player.energy));
    if (energy !== this.lastEnergy) {
      this.lastEnergy = energy;
      this.drawEnergy(energy, game.player.maxEnergy);
    }

    const coins = Store.data.coins;
    if (coins !== this.lastCoins) {
      this.lastCoins = coins;
      this.coinText.setText(String(coins));
      this.tweens.killTweensOf(this.coinText);
      this.coinText.setScale(1.28);
      this.tweens.add({ targets: this.coinText, scale: 1, duration: 160, ease: 'Back.Out' });
    }

    const realmState = game.demonRealm ? 1 : 0;
    if (game.round !== this.lastRound || game.stage !== this.lastStage
      || realmState !== this.lastRealm || game.endlessWave !== this.lastEndlessWave) {
      this.lastRound = game.round;
      this.lastStage = game.stage;
      this.lastRealm = realmState;
      this.lastEndlessWave = game.endlessWave;
      if (game.endless) {
        this.levelBig.setText(`第 ${game.endlessWave} 波`);
        this.levelSub.setText(`无尽挑战 · ${game.mapName || '无尽草原'}`);
      } else if (game.demonRealm) {
        this.levelBig.setText('恶魔之地');
        this.levelSub.setText('撒旦的领域');
      } else {
        this.levelBig.setText(`${game.round}-${game.stage}`);
        this.levelSub.setText(game.stage === ROUND_LEN
          ? `第 ${game.round} 轮 · BOSS · ${game.mapName || '草原'}`
          : `第 ${game.round} 轮 · ${game.mapName || '草原'}`);
      }
    }

    if (this.guestText) {
      const g2 = game.player2;
      if (g2 && game.netHost) {
        this.guestText.setVisible(true);
        this.guestHpText.setVisible(true);
        this.guestText.setText(g2.isDead ? '玩家2 · 复活中' : '玩家2');
        const g = this.guestPanelG;
        g.clear();
        g.fillStyle(0x0b1208, 0.86);
        g.fillRect(16, 94, 220, 36);
        g.lineStyle(1, 0x5f8fa8, 0.9);
        g.strokeRect(16, 94, 220, 36);
        const pct = g2.isDead ? 0 : clamp(g2.hp / g2.maxHp, 0, 1);
        g.fillStyle(0x0b1208, 1);
        g.fillRect(24, 112, 186, 10);
        g.fillStyle(0x4aa8d8, 1);
        g.fillRect(25, 113, 184 * pct, 8);
        this.guestHpText.setText(g2.isDead ? '0' : `${Math.max(0, Math.ceil(g2.hp))} / ${g2.maxHp}`);
      } else {
        this.guestText.setVisible(false);
        this.guestHpText.setVisible(false);
        this.guestPanelG.clear();
      }
    }

    const bosses = game.enemies
      ? game.enemies.getChildren().filter((e) => e.isBoss && e.active && !e.dying).slice(0, 2)
      : [];
    this.bossG.clear();
    this.bossName.setVisible(false);
    this.bossName2.setVisible(false);
    bosses.forEach((boss, i) => {
      const x = 250, y = 104 + i * 34, w = 460, h = 16;
      const nameText = i === 0 ? this.bossName : this.bossName2;
      nameText.setVisible(true).setPosition(480, y - 12)
        .setText(`${boss.bossName || 'BOSS'}   ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
      const g = this.bossG;
      g.fillStyle(0x0b1208, 0.92);
      g.fillRect(x, y, w, h);
      const pct = clamp(boss.hp / boss.maxHp, 0, 1);
      g.fillStyle(0x7d2723, 1);
      g.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);
      g.fillStyle(0xe8564a, 1);
      g.fillRect(x + 2, y + 2, (w - 4) * pct, 4);
      g.fillStyle(0xffb09a, 0.5);
      g.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * pct - 2), 1);
      g.lineStyle(2, 0xd9b45a, 1);
      g.strokeRect(x, y, w, h);
      g.lineStyle(1, 0x0b1208, 0.4);
      for (let j = 1; j < 12; j++) g.lineBetween(x + (w / 12) * j, y + 2, x + (w / 12) * j, y + h - 2);
    });

    while (hudState.bannerQueue.length > 0) {
      this.showBanner(hudState.bannerQueue.shift());
    }
    while (hudState.toastQueue.length > 0) {
      this.toast.show(hudState.toastQueue.shift());
    }

    if (hudState.hintText && game.time.now < hudState.hintUntil) {
      const remain = hudState.hintUntil - game.time.now;
      this.hintText.setText(hudState.hintText).setAlpha(Math.min(1, remain / 900));
    } else {
      this.hintText.setAlpha(0);
    }

    if (hudState.hurtAt > this.lastHurtAt) {
      this.lastHurtAt = hudState.hurtAt;
      this.tweens.killTweensOf(this.redVignette);
      this.redVignette.setAlpha(0.9);
      this.tweens.add({ targets: this.redVignette, alpha: 0, duration: 480, ease: 'Sine.Out' });
    }

    const giantActive = !!(game.characterId === 'frankenstein'
      && game.skill && game.skill.active && game.skill.type === 'giant');
    const weaponViewKey = giantActive ? '__giant__' : game.weaponId;
    const weapon = game.weapon;
    if (weapon && weaponViewKey !== this.lastWeaponId) {
      this.lastWeaponId = weaponViewKey;
      if (giantActive) {
        this.weaponIcon.setTexture('giant_fist').setScale(1.15);
        this.weaponName.setText('巨人铁拳');
        if (this.weaponSub) this.weaponSub.setText('近战 · 高伤害');
      } else {
        this.weaponIcon.setTexture(weapon.texture).setScale(weapon.iconScale || 1.35);
        this.weaponName.setText(weapon.name);
        if (this.weaponSub) {
          if (weapon.melee) this.weaponSub.setText(`近战 · ${weapon.energyCost} 能量/次`);
          else if (weapon.charge) this.weaponSub.setText(`蓄力 · ${weapon.energyCost} 能量/发`);
          else if (!weapon.energyCost) this.weaponSub.setText('无限弹药 · 不耗能量');
          else this.weaponSub.setText(`无限弹药 · ${weapon.energyCost} 能量/发`);
        }
      }
    }

    const secondary = game.dualWield && !giantActive ? game.secondaryWeapon : null;
    if (secondary) {
      if (game.secondaryId !== this.lastSecondaryId) {
        this.lastSecondaryId = game.secondaryId;
        this.secondaryIcon.setTexture(secondary.texture).setScale((secondary.iconScale || 1) * 0.65);
      }
      this.secondaryIcon.setVisible(true);
      this.secondaryTag.setVisible(true);
    } else {
      this.lastSecondaryId = null;
      this.secondaryIcon.setVisible(false);
      this.secondaryTag.setVisible(false);
    }

    const charLevel = Store.getCharLevel(game.characterId);
    if (charLevel !== this.lastCharLevel) {
      this.lastCharLevel = charLevel;
      this.charLevelText.setText(`Lv.${charLevel}`);
    }
    if (this.treasureBtn) {
      const pot = game.treasurePot || 0;
      this.treasureBtn.setVisible(pot > 0 && game.player && !game.player.isDead);
      const label = this.treasureBtn.list[1];
      if (label && pot > 0) label.setText(`取财 ${pot}`);
    }
    this.drawSkillButton(game);
    const showFire = !!game.touchMode;
    if (this.fireG) this.fireG.setVisible(showFire);
    if (this.fireIcon) this.fireIcon.setVisible(showFire);
    if (this.fireLabel) this.fireLabel.setVisible(showFire);
    if (this.fireHit) {
      this.fireHit.setVisible(showFire);
      if (this.fireHit.input) this.fireHit.input.enabled = showFire;
    }
  }

  drawSkillButton(game) {
    const s = game.skill;
    if (!s) return;
    const now = game.time.now;
    const x = 806, y = 410, r = 30;
    let state = 'ready';
    let pct = 1;
    if (s.active) {
      state = 'active';
    } else if (now < s.cooldownUntil) {
      state = 'cool';
      pct = clamp(1 - (s.cooldownUntil - now) / s.cooldown, 0, 1);
    }

    const g = this.skillG;
    g.clear();
    if (state === 'ready') {
      g.fillStyle(0xff9a3a, 0.10 + Math.sin(now * 0.005) * 0.045);
      g.fillCircle(x, y, r + 14);
    } else if (state === 'active') {
      g.fillStyle(0xff6a2a, 0.18 + Math.sin(now * 0.02) * 0.06);
      g.fillCircle(x, y, r + 16);
    }
    g.fillStyle(0x111b0e, 0.64);
    g.fillCircle(x, y, r);
    g.lineStyle(2, state === 'ready' ? 0xffb04a : (state === 'active' ? 0xff6a2a : 0x596b4a), 0.95);
    g.strokeCircle(x, y, r);
    g.lineStyle(4, state === 'ready' ? 0xffd76a : (state === 'active' ? 0xff7a3a : 0x8a9a72), 0.95);
    g.beginPath();
    g.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
    g.strokePath();
    if (state === 'active') {
      g.lineStyle(1, 0xffe066, 0.75);
      g.strokeCircle(x, y, r - 5);
    }

    const baseScale = this.skillCharacter === 'swordsman' ? 0.6
      : ((this.skillCharacter === 'frankenstein' || this.skillCharacter === 'mage'
        || this.skillCharacter === 'guitarist' || this.skillCharacter === 'demon'
        || this.skillCharacter === 'vampire') ? 0.95 : 0.82);
    this.skillIcon.setAlpha(state === 'cool' ? 0.42 : 1);
    this.skillIcon.setTint(state === 'ready' ? 0xffffff : (state === 'active' ? 0xffe08a : 0x8f9a84));
    this.skillIcon.setScale(state === 'active'
      ? baseScale * (1.1 + Math.sin(now * 0.02) * 0.1)
      : baseScale);
    const activeLabel = this.skillCharacter === 'swordsman' ? '剑阵中'
      : (this.skillCharacter === 'frankenstein' ? '巨人中'
        : (this.skillCharacter === 'mage' ? '激光中'
          : (this.skillCharacter === 'guitarist' ? '音浪中'
            : (this.skillCharacter === 'demon' ? '恶魔中'
              : (this.skillCharacter === 'vampire' ? '汲取中' : '射击中')))));
    this.skillState.setText(state === 'active'
      ? activeLabel
      : (state === 'cool'
        ? `${Math.ceil((s.cooldownUntil - now) / 1000)}s`
        : (game.touchMode ? '技能' : 'E · 技能')));
    this.skillState.setColor(state === 'cool' ? '#93a97d' : (state === 'active' ? '#ffb06a' : '#ffe9a8'));
  }

  showBanner(data) {
    const title = this.add.text(480, 206, data.title, UI.textStyle(54, {
      color: data.color || '#ffe9a8', strokeThickness: 10,
    })).setOrigin(0.5).setDepth(2100).setAlpha(0).setScale(1.35);
    const sub = this.add.text(480, 254, data.sub || '', UI.textStyle(16, {
      color: '#e8f0d8', strokeThickness: 4, bold: true,
    })).setOrigin(0.5).setDepth(2100).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 280, ease: 'Back.Out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 280, delay: 90 });
    this.tweens.add({
      targets: [title, sub], alpha: 0, delay: 1150, duration: 380,
      onComplete: () => { title.destroy(); sub.destroy(); },
    });
  }
}
