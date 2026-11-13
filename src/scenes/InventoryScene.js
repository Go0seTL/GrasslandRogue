class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.modalState = UI.beginModalScene(this);
    this.closing = false;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 110, 40, 740, 460, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 74, '背 包', UI.textStyle(30, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 100, '物品：武器碎片 · 永久保存', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const weapons = Object.values(WEAPONS).filter((w) => (w.fragReq || 0) > 0);
    const total = weapons.reduce((s, w) => s + (Store.data.fragments[w.id] || 0), 0);
    const owned = Store.data.ownedWeapons.filter((id) => WEAPONS[id]).length;
    this.add.text(480, 120, `碎片总数 ${total}    已解锁武器 ${owned} / ${Object.keys(WEAPONS).length}`, UI.textStyle(10, {
      color: '#e0d6a8', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    const xs = [210, 318, 426, 534, 642, 750];
    const ys = [172, 268, 364];
    weapons.forEach((w, i) => {
      const x = xs[i % 6];
      const y = ys[Math.floor(i / 6)] || 364;
      this.createSlot(w, x, y);
    });

    this.add.text(480, 448, '小怪/Boss 掉碎片 · 恶魔武器碎片来自奇旅商人', UI.textStyle(10, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    UI.button(this, 480, 482, 180, 28, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);

    const xg = this.add.rectangle(820, 66, 64, 30, 0x1b2817, 0.94)
      .setStrokeStyle(2, 0xd9b45a, 0.9).setDepth(30)
      .setInteractive({ useHandCursor: true });
    this.add.text(820, 66, '关 闭', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(31);
    xg.on('pointerup', () => this.close());

    this.closeRect = { x: 480, y: 482, w: 190, h: 36 };
    this.cornerRect = { x: 820, y: 66, w: 70, h: 36 };
    this.input.on('pointerup', (pointer) => this.handlePointer(pointer));
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.cameras.main.fadeIn(150, 6, 10, 6);
  }

  createSlot(w, x, y) {
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const have = Store.data.fragments[w.id] || 0;
    const owned = Store.hasWeapon(w.id);
    const cw = 96, ch = 82;

    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(0x000000, 0.28);
    g.fillRect(-cw / 2 + 3, -ch / 2 + 4, cw, ch);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-cw / 2, -ch / 2, cw, ch);
    g.lineStyle(2, q.color, have > 0 ? 0.9 : 0.35);
    g.strokeRect(-cw / 2, -ch / 2, cw, ch);
    g.fillStyle(q.color, have > 0 ? 0.7 : 0.28);
    g.fillRect(-cw / 2, -ch / 2, 3, ch);

    const icon = this.add.image(0, -18, w.texture)
      .setScale(Math.min(1.25, w.iconScale || 1.0));
    c.add(icon);

    const name = this.add.text(0, 17, w.name, UI.textStyle(8, {
      color: owned ? '#9ff0a8' : '#e8ddb8', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5);
    c.add(name);

    const count = this.add.text(0, 31, have > 0 ? `×${have}` : '—', UI.textStyle(10, {
      color: have > 0 ? '#ffe9a8' : '#6f7f62', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0.5);
    c.add(count);

    if (owned) {
      const tag = this.add.text(0, -41, '已拥有', UI.textStyle(7, {
        color: '#9ff0a8', strokeThickness: 2, bold: false, shadow: false,
      })).setOrigin(0.5);
      c.add(tag);
    }
  }

  handlePointer(pointer) {
    if (this.closing) return;
    const inside = (r) => pointer.x >= r.x - r.w / 2 && pointer.x <= r.x + r.w / 2
      && pointer.y >= r.y - r.h / 2 && pointer.y <= r.y + r.h / 2;
    if (inside(this.closeRect) || inside(this.cornerRect)) this.close();
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    UI.endModalScene(this.modalState);
    this.scene.stop();
  }
}
