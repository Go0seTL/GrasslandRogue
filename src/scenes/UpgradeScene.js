class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.chosen = false;
    this.closing = false;
    this.cardRects = [];
    this.cardObjects = [];
    this.lastRefresh = 0;
    this.modalState = UI.beginModalScene(this);
    this.events.once('shutdown', () => {
      if (this.gameScene) this.gameScene.upgradeOpen = false;
    });

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.84)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 90, 40, 780, 460, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 82, '选择强化', UI.textStyle(34, {
      color: '#ffe9a8', strokeThickness: 8,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 112, '海克斯三选一 · 本局有效 · 史诗海克斯概率较低', UI.textStyle(12, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    // 金币显示
    this.add.image(752, 64, 'coin_icon').setDepth(3);
    this.coinText = this.add.text(770, 64, String(Store.data.coins), UI.textStyle(16, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0, 0.5).setDepth(3);

    this.msgText = this.add.text(480, 452, '', UI.textStyle(11, {
      color: '#bfe8ff', strokeThickness: 3, bold: true,
    })).setOrigin(0.5).setDepth(3).setAlpha(0);

    UI.button(this, 480, 484, 270, 30, `刷新海克斯 · ${UPGRADE_REFRESH_COST} 金币`, () => this.refreshChoices(), {
      variant: 'ghost', fontSize: 12,
    }).setDepth(3);
    this.refreshRect = { x: 480, y: 484, w: 280, h: 38 };

    this.renderChoices();
    this.input.on('pointerup', (pointer) => this.handlePointer(pointer));
    this.cameras.main.fadeIn(160, 6, 10, 6);
  }

  pickChoices() {
    const picks = [];
    for (let i = 0; i < 3; i++) {
      const wantsEpic = Math.random() < 0.08;
      let pool = UPGRADES.filter((u) => !picks.includes(u) && ((u.rarity === 'epic') === wantsEpic));
      if (pool.length === 0) pool = UPGRADES.filter((u) => !picks.includes(u));
      if (pool.length === 0) break;
      picks.push(Phaser.Utils.Array.GetRandom(pool));
    }
    return picks;
  }

  renderChoices() {
    this.cardObjects.forEach((c) => c.destroy());
    this.cardObjects = [];
    this.cardRects = [];
    const choices = this.pickChoices();
    const xs = [250, 480, 710];
    choices.forEach((u, i) => {
      const c = this.createCard(u, xs[i], 300);
      this.cardObjects.push(c);
    });
  }

  createCard(u, x, y) {
    const w = 210, h = 290;
    const isEpic = u.rarity === 'epic';
    const border = isEpic ? 0xffd76a : u.color;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(0x000000, 0.32);
      g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      g.fillStyle(isEpic ? 0x1a160c : 0x111a0d, 0.97);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(hover ? 3 : 2, border, 1);
      g.strokeRect(-w / 2, -h / 2, w, h);
      g.fillStyle(border, isEpic ? 0.18 : 0.12);
      g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 118);
      g.fillStyle(border, 0.9);
      g.fillRect(-w / 2, -h / 2, w, 3);
      g.fillStyle(border, isEpic ? 0.24 : 0.16);
      g.fillCircle(0, -88, isEpic ? 40 : 36);
      g.lineStyle(isEpic ? 3 : 2, border, 0.9);
      g.strokeCircle(0, -88, isEpic ? 40 : 36);
      if (isEpic) {
        g.fillStyle(0xffd76a, 0.08);
        g.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
      }
    };
    draw(false);
    c.add(g);

    const icon = this.add.text(0, -89, u.icon, UI.textStyle(isEpic ? 36 : 32, {
      color: '#ffffff', stroke: '#2a1a12', strokeThickness: 5,
    })).setOrigin(0.5);
    c.add(icon);

    if (isEpic) {
      const tag = this.add.text(0, -h / 2 + 16, '史诗', UI.textStyle(10, {
        color: '#1b2414', stroke: '#ffd76a', strokeThickness: 0, bold: true, shadow: false,
      })).setOrigin(0.5);
      const tagBg = this.add.rectangle(0, -h / 2 + 16, 52, 18, 0xffd76a, 0.95);
      c.addAt(tagBg, 1);
      c.add(tag);
    }

    const name = this.add.text(0, -38, u.name, UI.textStyle(21, {
      color: isEpic ? '#ffe9a8' : '#fff1c4', strokeThickness: 4,
    })).setOrigin(0.5);
    c.add(name);

    const line = this.add.rectangle(0, -12, 150, 1, border, 0.5);
    c.add(line);

    const desc = this.add.text(0, 8, UI.wrapCJK(u.desc, 13), UI.textStyle(12, {
      color: '#c8d6b4', strokeThickness: 2, bold: false,
    })).setOrigin(0.5, 0).setAlign('center');
    desc.setLineSpacing(5);
    c.add(desc);

    const tag = this.add.text(0, h / 2 - 24, '点击选择', UI.textStyle(11, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5);
    c.add(tag);

    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    c.add(hit);
    c.setSize(w, h);
    hit.on('pointerover', () => {
      draw(true);
      this.tweens.add({ targets: c, scale: 1.035, duration: 90 });
    });
    hit.on('pointerout', () => {
      draw(false);
      this.tweens.add({ targets: c, scale: 1, duration: 90 });
    });
    hit.on('pointerup', () => this.choose(u));
    this.cardRects.push({ x, y, w, h, u });
    return c;
  }

  handlePointer(pointer) {
    if (this.closing || this.chosen) return;
    const inside = (r) => pointer.x >= r.x - r.w / 2 && pointer.x <= r.x + r.w / 2
      && pointer.y >= r.y - r.h / 2 && pointer.y <= r.y + r.h / 2;
    if (inside(this.refreshRect)) {
      this.refreshChoices();
      return;
    }
    for (const r of this.cardRects) {
      if (inside(r)) {
        this.choose(r.u);
        return;
      }
    }
  }

  refreshChoices() {
    if (this.chosen || this.closing) return;
    if (this.time.now - this.lastRefresh < 400) return;
    if (Store.data.coins < UPGRADE_REFRESH_COST) {
      Sfx.uiDeny();
      this.showMsg('金币不足，无法刷新');
      return;
    }
    this.lastRefresh = this.time.now;
    Store.data.coins -= UPGRADE_REFRESH_COST;
    Store.save();
    this.updateCoins();
    Sfx.unlock();
    this.renderChoices();
    this.showMsg('海克斯已刷新');
  }

  updateCoins() {
    if (this.coinText) this.coinText.setText(String(Store.data.coins));
  }

  showMsg(text) {
    if (!this.msgText) return;
    this.msgText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.msgText);
    this.tweens.add({ targets: this.msgText, alpha: 0, delay: 900, duration: 350 });
  }

  choose(u) {
    if (this.chosen || this.closing) return;
    this.chosen = true;
    Sfx.unlock();
    try {
      if (this.gameScene) this.gameScene.applyUpgrade(u.id);
    } catch (e) {
      console.warn('applyUpgrade failed', e);
    }
    this.cameras.main.flash(180, 220, 200, 140);
    this.time.delayedCall(150, () => this.close(true));
  }

  close(applied) {
    if (!this.closing) {
      this.closing = true;
      if (!applied) Sfx.uiClick();
    }
    if (this.gameScene) this.gameScene.upgradeOpen = false;
    const nextWave = !!(applied && this.gameScene && this.gameScene.endless
      && this.gameScene.endlessAwaitUpgrade);
    UI.endModalScene(this.modalState);
    if (nextWave) this.gameScene.startEndlessWave();
    this.scene.stop();
  }
}
