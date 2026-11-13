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
    this.add.text(480, 100, '当前物品：武器碎片 · 永久保存', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const ids = ['shotgun', 'smg', 'rifle', 'katana', 'bow', 'flamer', 'railgun', 'slime_staff', 'boar_axe', 'mushroom_orb'];
    let totalFrags = 0;
    ids.forEach((id) => {
      totalFrags += Store.data.fragments[id] || 0;
    });
    const owned = Store.data.ownedWeapons.filter((id) => WEAPONS[id]).length;
    this.add.text(480, 122, `碎片总数 ${totalFrags}    已解锁武器 ${owned} / ${Object.keys(WEAPONS).length}`, UI.textStyle(10, {
      color: '#e0d6a8', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    ids.forEach((id, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i < 5 ? i : i - 5;
      const x = col === 0 ? 310 : 650;
      const y = 154 + row * 60;
      this.createRow(WEAPONS[id], x, y);
    });

    this.add.text(480, 444, '小怪有概率掉落碎片 · 彩色碎片只由对应 Boss 掉落', UI.textStyle(10, {
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

  createRow(w, x, y) {
    const rw = 320, rh = 52;
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const have = Store.data.fragments[w.id] || 0;
    const isOwned = Store.hasWeapon(w.id);
    const pct = w.fragReq <= 0 ? 1 : clamp(have / w.fragReq, 0, 1);

    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);

    g.fillStyle(0x000000, 0.28);
    g.fillRect(-rw / 2 + 3, -rh / 2 + 4, rw, rh);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-rw / 2, -rh / 2, rw, rh);
    g.lineStyle(1, q.color, isOwned ? 0.9 : 0.45);
    g.strokeRect(-rw / 2, -rh / 2, rw, rh);
    g.fillStyle(q.color, isOwned ? 0.9 : 0.4);
    g.fillRect(-rw / 2, -rh / 2, 3, rh);

    const icon = this.add.image(-136, 0, w.texture).setScale(w.iconScale || 1.0);
    if (w.id === 'slime_staff') icon.setScale(0.9);
    c.add(icon);

    const name = this.add.text(-104, -15, w.name, UI.textStyle(13, {
      color: isOwned ? '#9ff0a8' : '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(name);

    const quality = this.add.text(-104, -1, `${q.name}品质`, UI.textStyle(8, {
      color: q.hex, strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(quality);

    const count = this.add.text(-104, 12, `碎片 ${have} / ${w.fragReq}`, UI.textStyle(8, {
      color: have > 0 ? '#d8e8c0' : '#7f8f70', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(count);

    const bar = this.add.graphics();
    c.add(bar);
    const bx = -104, by = 20, bw = 150, bh = 5;
    bar.fillStyle(0x0b1208, 1);
    bar.fillRect(bx, by, bw, bh);
    bar.fillStyle(isOwned ? 0x6fdd68 : q.color, 0.9);
    bar.fillRect(bx, by, bw * pct, bh);
    bar.lineStyle(1, 0x4a5a3e, 0.8);
    bar.strokeRect(bx, by, bw, bh);

    let statusText = '';
    let statusColor = '#a9bd8f';
    if (isOwned) {
      statusText = '已拥有';
      statusColor = '#9ff0a8';
    } else if (have >= w.fragReq) {
      statusText = '可合成';
      statusColor = '#ffe08a';
    } else if (have > 0) {
      statusText = '收集中';
      statusColor = '#c8d8a8';
    } else {
      statusText = '未获得';
      statusColor = '#6f7f62';
    }
    const status = this.add.text(146, 6, statusText, UI.textStyle(9, {
      color: statusColor, strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(1, 0.5);
    c.add(status);
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
