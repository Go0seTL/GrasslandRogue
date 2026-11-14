class RingScene extends Phaser.Scene {
  constructor() {
    super('Ring');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.fromGame = !!(this.gameScene && this.gameScene.scene.isActive());
    this.modalState = UI.beginModalScene(this);
    this.closing = false;
    this.rows = [];

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 110, 40, 740, 460, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 72, '戒 指', UI.textStyle(29, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 98, '击败怪物掉戒指碎片 · 可合成多枚，但一局只能装备 1 枚 · 阵亡后装备戒指遗失', UI.textStyle(9, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    this.walletText = this.add.text(480, 122, '', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    const ids = Object.keys(RINGS);
    ids.forEach((id, i) => {
      const col = i < 4 ? 0 : 1;
      const row = i < 4 ? i : i - 4;
      this.createRow(RINGS[id], col === 0 ? 310 : 650, 168 + row * 68);
    });

    this.add.text(480, 444, '戒指碎片来自小怪/精英/Boss · 装备效果只在本局生效', UI.textStyle(9, {
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
    this.refresh();
    this.cameras.main.fadeIn(150, 6, 10, 6);
  }

  createRow(ring, x, y) {
    const cw = 320, ch = 60;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    const icon = this.add.image(-132, -2, 'ring_icon').setTint(ring.color).setScale(1.15);
    c.add(icon);
    const name = this.add.text(-106, -18, ring.name, UI.textStyle(13, {
      color: '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(name);
    const desc = this.add.text(-106, -4, ring.desc, UI.textStyle(8, {
      color: '#9fb58a', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    desc.setWordWrapWidth(190);
    c.add(desc);
    const progress = this.add.text(-106, 22, '', UI.textStyle(8, {
      color: '#a9bd8f', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(progress);
    const btn = UI.button(this, 120, 0, 78, 26, '合 成', () => this.action(ring), {
      fontSize: 10, variant: 'ghost',
    });
    c.add(btn);
    const row = { ring, c, g, icon, name, desc, progress, btn, cw, ch };
    this.rows.push(row);
    return row;
  }

  action(ring) {
    if (!Store.hasRing(ring.id)) {
      if (!Store.craftRing(ring.id)) {
        Sfx.uiDeny();
        this.showMsg(`还差 ${ring.fragReq - (Store.data.ringFragments[ring.id] || 0)} 个${ring.name}碎片`);
        return;
      }
      Sfx.unlock();
      if (!Store.data.equippedRing) Store.equipRing(ring.id);
      this.showMsg(`合成成功：${ring.name}`, '#9ff0a8');
    } else if (Store.data.equippedRing === ring.id) {
      Store.unequipRing();
      Sfx.uiClick();
      this.showMsg('已卸下戒指');
    } else {
      Store.equipRing(ring.id);
      Sfx.unlock();
      this.showMsg(`已装备：${ring.name}`, '#ffd76a');
    }
    this.refresh();
  }

  refresh() {
    if (!this.walletText) return;
    const total = Object.values(Store.data.ringFragments || {}).reduce((s, n) => s + n, 0);
    this.walletText.setText(`金币 ${Store.data.coins}    戒指碎片 ${total}    当前装备：${Store.data.equippedRing ? RINGS[Store.data.equippedRing].name : '无'}`);
    this.rows.forEach((row) => {
      const { ring, g, btn, progress, cw, ch } = row;
      const owned = Store.hasRing(ring.id);
      const equipped = Store.data.equippedRing === ring.id;
      const have = Store.data.ringFragments[ring.id] || 0;
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRect(-cw / 2 + 3, -ch / 2 + 4, cw, ch);
      g.fillStyle(equipped ? 0x1c2b17 : 0x111a0d, 0.96);
      g.fillRect(-cw / 2, -ch / 2, cw, ch);
      g.lineStyle(2, ring.color, equipped ? 0.95 : (owned ? 0.7 : 0.4));
      g.strokeRect(-cw / 2, -ch / 2, cw, ch);
      g.fillStyle(ring.color, equipped ? 0.9 : 0.45);
      g.fillRect(-cw / 2, -ch / 2, 3, ch);
      if (equipped) {
        g.fillStyle(0xffd76a, 1);
        g.fillRect(-cw / 2 + 4, -ch / 2 + 2, 3, 3);
      }
      let label;
      if (equipped) label = '卸 下';
      else if (owned) label = '装 备';
      else if (have >= ring.fragReq) label = '合 成';
      else label = '碎片不足';
      if (btn.list[1]) btn.list[1].setText(label);
      progress.setText(owned ? (equipped ? '装备中' : '已拥有') : `碎片 ${have} / ${ring.fragReq}`);
      progress.setColor(equipped ? '#ffd76a' : (owned ? '#9ff0a8' : '#a9bd8f'));
    });
  }

  showMsg(text, color) {
    if (!this.toastText) {
      this.toastText = this.add.text(480, 414, '', UI.textStyle(10, {
        color: '#ffb09a', strokeThickness: 2, bold: false,
      })).setOrigin(0.5).setDepth(3);
    }
    this.toastText.setText(text).setColor(color || '#ffb09a');
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
