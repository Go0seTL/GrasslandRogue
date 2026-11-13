class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.lastHp = -1;
    this.lastCoins = -1;
    this.lastRound = -1;
    this.lastStage = -1;
    this.lastHurtAt = -1;

    this.staticG = this.add.graphics().setDepth(100);
    // 生命面板
    UI.drawPanel(this.staticG, 16, 12, 300, 60, { border: 0xb9a35c, bg: 0x141e0f, alpha: 0.85 });
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
    this.characterId = gameScene ? gameScene.characterId : 'gunner';
    const portraitKey = this.characterId === 'swordsman' ? 'swordsman_idle' : 'player_idle';
    this.add.image(46, 42, portraitKey).setDepth(102).setScale(0.95);
    this.add.text(82, 22, '生命', UI.textStyle(11, {
      color: '#cfd9b6', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(102);
    this.hpG = this.add.graphics().setDepth(101);
    this.hpText = this.add.text(186, 39, '', UI.textStyle(11, {
      color: '#ffffff', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(103);

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

    this.bossG = this.add.graphics().setDepth(120);
    this.bossName = this.add.text(480, 76, '', UI.textStyle(14, {
      color: '#ffb09a', strokeThickness: 3,
    })).setOrigin(0.5).setDepth(121).setVisible(false);

    this.hintText = this.add.text(480, 516, '', UI.textStyle(13, {
      color: '#dfe8c8', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(130).setAlpha(0);

    this.redVignette = this.add.image(0, 0, 'vignette_red').setOrigin(0).setDepth(2000).setAlpha(0);

    this.toast = UI.toastContainer(this);

    // 技能按钮
    this.skillCharacter = this.characterId;
    const isSword = this.characterId === 'swordsman';
    this.skillG = this.add.graphics().setDepth(3000);
    this.skillIcon = this.add.image(884, 418, isSword ? 'sword' : 'flame_icon')
      .setDepth(3001);
    if (isSword) {
      this.skillIcon.setScale(0.6).setRotation(-0.7);
    } else {
      this.skillIcon.setScale(0.82);
    }
    this.skillState = this.add.text(884, 380, 'E · 技能', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(3001);
    this.skillHit = this.add.rectangle(884, 418, 78, 78, 0x000000, 0)
      .setDepth(3002)
      .setInteractive({ useHandCursor: true });
    this.skillHit.on('pointerup', () => {
      const game = this.scene.get('Game');
      if (game) game.activateSkill();
    });

    this.createPauseButton();
    this.bestiaryBtn = this.createHudButton(922, 140, 54, 32, '图鉴', () => {
      this.scene.launch('Bestiary', { from: 'game' });
    });
    this.weaponBtn = this.createHudButton(922, 188, 54, 32, '武器', () => {
      this.scene.launch('Forge', { from: 'game' });
    });

    this.lastWeaponId = null;

    this.drawHp(BALANCE.playerHP, BALANCE.playerHP);
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
      const game = this.scene.get('Game');
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
    const x = 82, y = 30, w = 214, h = 16;
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

  update() {
    const game = this.scene.get('Game');
    if (!game || !game.scene.isActive() || !game.player) return;

    const hp = Math.max(0, Math.ceil(game.player.hp));
    if (hp !== this.lastHp) {
      this.lastHp = hp;
      this.drawHp(hp, game.player.maxHp);
    }

    const coins = Store.data.coins;
    if (coins !== this.lastCoins) {
      this.lastCoins = coins;
      this.coinText.setText(String(coins));
      this.tweens.killTweensOf(this.coinText);
      this.coinText.setScale(1.28);
      this.tweens.add({ targets: this.coinText, scale: 1, duration: 160, ease: 'Back.Out' });
    }

    if (game.round !== this.lastRound || game.stage !== this.lastStage) {
      this.lastRound = game.round;
      this.lastStage = game.stage;
      this.levelBig.setText(`${game.round}-${game.stage}`);
      this.levelSub.setText(game.stage === ROUND_LEN
        ? `第 ${game.round} 轮 · BOSS · 草原`
        : `第 ${game.round} 轮 · 草原`);
    }

    const boss = game.boss;
    if (boss && boss.active && !boss.dying) {
      this.bossName.setVisible(true).setText(`史莱姆王   ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
      const x = 250, y = 88, w = 460, h = 16;
      const g = this.bossG;
      g.clear();
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
      for (let i = 1; i < 12; i++) g.lineBetween(x + (w / 12) * i, y + 2, x + (w / 12) * i, y + h - 2);
    } else {
      this.bossG.clear();
      this.bossName.setVisible(false);
    }

    while (game.hud.bannerQueue.length > 0) {
      this.showBanner(game.hud.bannerQueue.shift());
    }
    while (game.hud.toastQueue.length > 0) {
      this.toast.show(game.hud.toastQueue.shift());
    }

    if (game.hud.hintText && game.time.now < game.hud.hintUntil) {
      const remain = game.hud.hintUntil - game.time.now;
      this.hintText.setText(game.hud.hintText).setAlpha(Math.min(1, remain / 900));
    } else {
      this.hintText.setAlpha(0);
    }

    if (game.hud.hurtAt > this.lastHurtAt) {
      this.lastHurtAt = game.hud.hurtAt;
      this.tweens.killTweensOf(this.redVignette);
      this.redVignette.setAlpha(0.9);
      this.tweens.add({ targets: this.redVignette, alpha: 0, duration: 480, ease: 'Sine.Out' });
    }

    const weapon = game.weapon;
    if (weapon && game.weaponId !== this.lastWeaponId) {
      this.lastWeaponId = game.weaponId;
      this.weaponIcon.setTexture(weapon.texture).setScale(weapon.iconScale || 1.35);
      this.weaponName.setText(weapon.name);
      if (this.weaponSub) this.weaponSub.setText(weapon.melee ? '近战 · 无消耗' : '无限弹药');
    }

    this.drawSkillButton(game);
  }

  drawSkillButton(game) {
    const s = game.skill;
    if (!s) return;
    const now = game.time.now;
    const x = 884, y = 418, r = 30;
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

    const baseScale = this.skillCharacter === 'swordsman' ? 0.6 : 0.82;
    this.skillIcon.setAlpha(state === 'cool' ? 0.42 : 1);
    this.skillIcon.setTint(state === 'ready' ? 0xffffff : (state === 'active' ? 0xffe08a : 0x8f9a84));
    this.skillIcon.setScale(state === 'active'
      ? baseScale * (1.1 + Math.sin(now * 0.02) * 0.1)
      : baseScale);
    this.skillState.setText(state === 'active'
      ? (this.skillCharacter === 'swordsman' ? '剑阵中' : '扫射中')
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
