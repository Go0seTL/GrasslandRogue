class UpgradeListScene extends Phaser.Scene {
  constructor() {
    super('UpgradeList');
  }

  init(data) {
    this.data_ = data || {};
    this.ids = (this.data_.upgrades || []).filter((id) => UPGRADES.some((u) => u.id === id));
    this.page = 0;
  }

  create() {
    this.modalState = UI.beginModalScene(this);
    this.closing = false;
    this.cardObjects = [];
    this.pageSize = 14;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 90, 34, 780, 472, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });
    this.add.text(480, 64, '已获得强化', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 92, '当前局内已选择的海克斯 · 同一强化可叠加', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    this.pageText = this.add.text(480, 454, '', UI.textStyle(10, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(3);

    UI.button(this, 370, 484, 150, 30, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);
    this.prevBtn = UI.button(this, 540, 484, 100, 30, '上一页', () => this.turn(-1), {
      variant: 'ghost', fontSize: 12,
    }).setDepth(3);
    this.nextBtn = UI.button(this, 650, 484, 100, 30, '下一页', () => this.turn(1), {
      variant: 'ghost', fontSize: 12,
    }).setDepth(3);

    this.emptyText = this.add.text(480, 250, '本局还没有选择强化', UI.textStyle(15, {
      color: '#7f9a6d', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2).setVisible(false);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.render();
    this.cameras.main.fadeIn(150, 6, 10, 6);
  }

  pageCount() {
    return Math.max(1, Math.ceil(this.ids.length / this.pageSize));
  }

  turn(delta) {
    if (this.ids.length <= this.pageSize) return;
    this.page = (this.page + delta + this.pageCount()) % this.pageCount();
    Sfx.uiClick();
    this.render();
  }

  render() {
    this.cardObjects.forEach((c) => c.destroy());
    this.cardObjects = [];
    if (this.ids.length === 0) {
      this.emptyText.setVisible(true);
      this.pageText.setText('');
      this.prevBtn.setVisible(false);
      this.nextBtn.setVisible(false);
      return;
    }
    this.emptyText.setVisible(false);
    const counts = new Map();
    this.ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    const entries = Array.from(counts.entries());
    const start = this.page * this.pageSize;
    const visible = entries.slice(start, start + this.pageSize);
    const xs = [280, 680];
    const ys = [136, 180, 224, 268, 312, 356, 400];
    visible.forEach(([id, count], i) => {
      const u = UPGRADES.find((x) => x.id === id);
      const x = xs[i % 2];
      const y = ys[Math.floor(i / 2)];
      this.cardObjects.push(this.createRow(u, count, x, y));
    });
    this.pageText.setText(`第 ${this.page + 1} / ${this.pageCount()} 页`);
    this.prevBtn.setVisible(this.pageCount() > 1);
    this.nextBtn.setVisible(this.pageCount() > 1);
  }

  createRow(u, count, x, y) {
    const w = 360, h = 38;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, u.rarity === 'epic' ? 0xffd76a : u.color, 0.75);
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle(u.color, 0.8);
    g.fillRect(-w / 2, -h / 2, 3, h);
    g.fillStyle(u.color, 0.18);
    g.fillCircle(-w / 2 + 21, 0, 14);
    g.lineStyle(2, u.color, 0.8);
    g.strokeCircle(-w / 2 + 21, 0, 14);
    c.add(g);
    const icon = this.add.text(-w / 2 + 21, 0, u.icon, UI.textStyle(14, {
      color: '#ffffff', strokeThickness: 3, bold: true,
    })).setOrigin(0.5);
    c.add(icon);
    const name = this.add.text(-w / 2 + 42, -9, u.name, UI.textStyle(11, {
      color: u.rarity === 'epic' ? '#ffe9a8' : '#fff1c4', strokeThickness: 2,
    })).setOrigin(0, 0.5);
    c.add(name);
    const desc = this.add.text(-w / 2 + 42, 8, UI.wrapCJK(u.desc, 28), UI.textStyle(8, {
      color: '#a9bd8f', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    desc.setWordWrapWidth(270);
    c.add(desc);
    const cnt = this.add.text(w / 2 - 10, 0, count > 1 ? `×${count}` : '', UI.textStyle(12, {
      color: '#ffd76a', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(1, 0.5);
    c.add(cnt);
    return c;
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    UI.endModalScene(this.modalState);
    this.scene.stop();
  }
}
