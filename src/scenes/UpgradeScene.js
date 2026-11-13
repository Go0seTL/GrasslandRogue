class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.chosen = false;
    this.closing = false;
    this.cardRects = [];
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
    this.add.text(480, 112, '海克斯三选一 · 本局有效 · 右上角可跳过', UI.textStyle(12, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const pool = Phaser.Utils.Array.Shuffle(UPGRADES.slice());
    const choices = pool.slice(0, 3);
    const xs = [250, 480, 710];
    choices.forEach((u, i) => this.createCard(u, xs[i], 300));

    UI.button(this, 480, 478, 170, 30, '跳过本次强化', () => this.close(false), {
      variant: 'ghost', fontSize: 12,
    }).setDepth(3);

    // 右上角跳过：场景顶层矩形，避免卡片命中异常时无法退出
    const xg = this.add.rectangle(830, 64, 64, 28, 0x1b2817, 0.94)
      .setStrokeStyle(2, 0xd9b45a, 0.9).setDepth(30)
      .setInteractive({ useHandCursor: true });
    this.add.text(830, 64, '跳过', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(31);
    xg.on('pointerup', () => this.close(false));

    this.skipRect = { x: 480, y: 478, w: 180, h: 36 };
    this.cornerRect = { x: 830, y: 64, w: 72, h: 34 };
    this.input.on('pointerup', (pointer) => this.handlePointer(pointer));
    this.input.keyboard.on('keydown-ESC', () => this.close(false));

    this.cameras.main.fadeIn(160, 6, 10, 6);
  }

  handlePointer(pointer) {
    if (this.closing || this.chosen) return;
    const inside = (r) => pointer.x >= r.x - r.w / 2 && pointer.x <= r.x + r.w / 2
      && pointer.y >= r.y - r.h / 2 && pointer.y <= r.y + r.h / 2;
    if (inside(this.cornerRect) || inside(this.skipRect)) {
      this.close(false);
      return;
    }
    for (const r of this.cardRects) {
      if (inside(r)) {
        this.choose(r.u);
        return;
      }
    }
  }

  createCard(u, x, y) {
    const w = 210, h = 290;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    const draw = (hover) => {
      g.clear();
      g.fillStyle(0x000000, 0.32);
      g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      g.fillStyle(0x111a0d, 0.97);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(hover ? 3 : 2, u.color, 1);
      g.strokeRect(-w / 2, -h / 2, w, h);
      g.fillStyle(u.color, 0.12);
      g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 118);
      g.fillStyle(u.color, 0.9);
      g.fillRect(-w / 2, -h / 2, w, 3);
      g.fillStyle(u.color, 0.16);
      g.fillCircle(0, -88, 36);
      g.lineStyle(2, u.color, 0.9);
      g.strokeCircle(0, -88, 36);
    };
    draw(false);
    c.add(g);

    const icon = this.add.text(0, -89, u.icon, UI.textStyle(32, {
      color: '#ffffff', stroke: '#2a1a12', strokeThickness: 5,
    })).setOrigin(0.5);
    c.add(icon);

    const name = this.add.text(0, -38, u.name, UI.textStyle(21, {
      color: '#fff1c4', strokeThickness: 4,
    })).setOrigin(0.5);
    c.add(name);

    const line = this.add.rectangle(0, -12, 150, 1, u.color, 0.5);
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
    if (this.closing) {
      UI.endModalScene(this.modalState);
      if (this.gameScene) this.gameScene.upgradeOpen = false;
      this.scene.stop();
      return;
    }
    this.closing = true;
    if (!applied) Sfx.uiClick();
    if (this.gameScene) this.gameScene.upgradeOpen = false;
    UI.endModalScene(this.modalState);
    this.scene.stop();
  }
}
