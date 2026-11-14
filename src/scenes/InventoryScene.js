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
    UI.drawPanel(g, 110, 36, 740, 464, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 66, '背 包', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 90, '这里只看物品数量 · 武器解锁进度在「锻造」，戒指在「戒指」面板', UI.textStyle(9, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const fragments = Store.data.fragments || {};
    const ringFragments = Store.data.ringFragments || {};
    const weaponItems = Object.values(WEAPONS)
      .filter((w) => (fragments[w.id] || 0) > 0)
      .sort((a, b) => {
        const qa = QUALITY_ORDER.indexOf(a.quality);
        const qb = QUALITY_ORDER.indexOf(b.quality);
        if (qa !== qb) return qb - qa;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
      });
    const ringItems = Object.values(RINGS).filter((r) => (ringFragments[r.id] || 0) > 0);
    const wTotal = weaponItems.reduce((s, w) => s + (fragments[w.id] || 0), 0);
    const rTotal = ringItems.reduce((s, r) => s + (ringFragments[r.id] || 0), 0);
    const hearts = Math.max(0, Math.floor(Store.data.demonHearts || 0));

    this.add.text(480, 116, `撒旦之心 ×${hearts}     武器碎片共 ×${wTotal}     戒指碎片共 ×${rTotal}`, UI.textStyle(12, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    this.add.text(132, 142, '武器碎片', UI.textStyle(12, {
      color: '#dfe8c8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(2);

    if (weaponItems.length === 0) {
      this.add.text(480, 180, '暂无武器碎片', UI.textStyle(11, {
        color: '#7f9a6d', strokeThickness: 2, bold: false, shadow: false,
      })).setOrigin(0.5).setDepth(2);
    } else {
      weaponItems.forEach((w, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        this.createWeaponItem(w, 196 + col * 176, 168 + row * 32, fragments[w.id] || 0);
      });
    }

    this.add.text(132, 354, '戒指碎片', UI.textStyle(12, {
      color: '#dfe8c8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5).setDepth(2);

    if (ringItems.length === 0) {
      this.add.text(480, 392, '暂无戒指碎片', UI.textStyle(11, {
        color: '#7f9a6d', strokeThickness: 2, bold: false, shadow: false,
      })).setOrigin(0.5).setDepth(2);
    } else {
      ringItems.forEach((r, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        this.createRingItem(r, 196 + col * 176, 378 + row * 30, ringFragments[r.id] || 0);
      });
    }

    this.add.text(480, 444, '碎片来自小怪 / 精英 / Boss · 恶魔武器碎片来自奇旅商人', UI.textStyle(9, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    UI.button(this, 480, 482, 180, 28, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);

    const xg = this.add.rectangle(820, 62, 64, 28, 0x1b2817, 0.94)
      .setStrokeStyle(2, 0xd9b45a, 0.9).setDepth(30)
      .setInteractive({ useHandCursor: true });
    this.add.text(820, 62, '关 闭', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(31);
    xg.on('pointerup', () => this.close());

    this.closeRect = { x: 480, y: 482, w: 190, h: 36 };
    this.cornerRect = { x: 820, y: 62, w: 70, h: 34 };
    this.input.on('pointerup', (pointer) => this.handlePointer(pointer));
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.cameras.main.fadeIn(150, 6, 10, 6);
  }

  createWeaponItem(w, x, y, count) {
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const cw = 166, ch = 27;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(0x111a0d, 0.92);
    g.fillRect(0, -ch / 2, cw, ch);
    g.lineStyle(1, q.color, 0.55);
    g.strokeRect(0, -ch / 2, cw, ch);
    g.fillStyle(q.color, 0.7);
    g.fillRect(0, -ch / 2, 2, ch);

    const icon = this.add.image(12, 0, w.texture).setScale(0.48);
    c.add(icon);
    const name = this.add.text(24, 0, w.name, UI.textStyle(8, {
      color: q.hex, strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(name);
    const num = this.add.text(cw - 7, 0, `×${count}`, UI.textStyle(10, {
      color: '#ffe9a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(1, 0.5);
    c.add(num);
  }

  createRingItem(r, x, y, count) {
    const cw = 166, ch = 26;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(0x111a0d, 0.92);
    g.fillRect(0, -ch / 2, cw, ch);
    g.lineStyle(1, r.color, 0.5);
    g.strokeRect(0, -ch / 2, cw, ch);
    g.fillStyle(r.color, 0.7);
    g.fillRect(0, -ch / 2, 2, ch);

    const icon = this.add.image(12, 0, 'ring_icon').setTint(r.color).setScale(0.72);
    c.add(icon);
    const name = this.add.text(24, 0, r.name, UI.textStyle(8, {
      color: '#e8ddb8', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(name);
    const num = this.add.text(cw - 7, 0, `×${count}`, UI.textStyle(10, {
      color: '#ffe9a8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(1, 0.5);
    c.add(num);
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
