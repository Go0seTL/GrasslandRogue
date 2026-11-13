class MerchantScene extends Phaser.Scene {
  constructor() {
    super('Merchant');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.modalState = UI.beginModalScene(this);
    this.closing = false;
    this.merchant = this.gameScene ? this.gameScene.merchant : null;
    this.trades = this.merchant ? this.merchant.trades : [];
    this.msg = null;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 110, 40, 740, 460, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 74, '奇 旅 商 人', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 100, '每次遇见只有 3 个随机交易项 · 用金币/撒旦之心换碎片，或卖出溢出碎片', UI.textStyle(9, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    this.walletText = this.add.text(480, 124, '', UI.textStyle(11, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    this.rows = [];
    this.trades.forEach((trade, i) => {
      this.createTradeRow(trade, i);
    });

    this.toastText = this.add.text(480, 438, '', UI.textStyle(10, {
      color: '#ffb09a', strokeThickness: 2, bold: false,
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

  createTradeRow(trade, i) {
    const w = WEAPONS[trade.weaponId];
    if (!w) return;
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const y = 190 + i * 82;
    const c = this.add.container(480, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);
    const icon = this.add.image(-270, 0, w.texture).setScale(w.iconScale || 1.0);
    c.add(icon);
    const title = this.add.text(-230, -22, '', UI.textStyle(13, {
      color: '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(title);
    const sub = this.add.text(-230, 0, '', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(sub);
    const btn = UI.button(this, 250, 0, 110, 30, '交 易', () => this.doTrade(trade), {
      fontSize: 13,
    });
    c.add(btn);
    const row = { trade, w, q, c, g, icon, title, sub, btn, y };
    this.rows.push(row);
    this.drawRow(row);
  }

  drawRow(row) {
    const { trade, w, q, g, title, sub, btn } = row;
    const sold = trade.sold;
    const cw = 650, ch = 74;
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-cw / 2 + 3, -ch / 2 + 4, cw, ch);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-cw / 2, -ch / 2, cw, ch);
    g.lineStyle(2, q.color, sold ? 0.3 : 0.8);
    g.strokeRect(-cw / 2, -ch / 2, cw, ch);
    g.fillStyle(q.color, sold ? 0.25 : 0.85);
    g.fillRect(-cw / 2, -ch / 2, 3, ch);
    row.icon.setAlpha(sold ? 0.35 : 1);
    let t = '';
    let s = '';
    if (trade.kind === 'buy') {
      t = `${w.name}碎片 ×${trade.amount}`;
      s = `花费 ${trade.coins} 金币`;
    } else if (trade.kind === 'heart') {
      t = `${w.name}碎片 ×${trade.amount}`;
      s = `花费 ${trade.hearts} 颗撒旦之心`;
    } else {
      t = `出售 ${w.name}碎片 ×${trade.amount}`;
      s = `获得 ${trade.coins} 金币`;
    }
    title.setText(t).setColor(sold ? '#7f8f70' : '#fff1c4');
    sub.setText(s).setColor(sold ? '#6f7f62' : (trade.kind === 'sell' ? '#9ff0a8' : '#a9bd8f'));
    const label = btn.list[1];
    if (label) label.setText(sold ? '已交易' : '交 易');
    if (btn.list[2]) btn.list[2].input.enabled = !sold;
  }

  refresh() {
    if (this.walletText) {
      this.walletText.setText(
        `金币 ${Store.data.coins}    撒旦之心 ${Store.data.demonHearts}`
      );
    }
    this.rows.forEach((row) => this.drawRow(row));
  }

  doTrade(trade) {
    if (trade.sold) return;
    if (trade.kind === 'buy') {
      if (Store.data.coins < trade.coins) {
        this.showMsg('金币不足');
        return;
      }
      Store.data.coins -= trade.coins;
      Store.addFragment(trade.weaponId, trade.amount);
      Store.save();
      Sfx.coin();
      this.showMsg(`获得 ${WEAPONS[trade.weaponId].name}碎片 ×${trade.amount}`, '#9ff0a8');
    } else if (trade.kind === 'heart') {
      if (Store.data.demonHearts < trade.hearts) {
        this.showMsg('没有足够的撒旦之心');
        return;
      }
      Store.data.demonHearts -= trade.hearts;
      Store.addFragment(trade.weaponId, trade.amount);
      Store.save();
      Sfx.unlock();
      this.showMsg(`获得 ${WEAPONS[trade.weaponId].name}碎片 ×${trade.amount}`, '#ff9ae8');
    } else {
      if ((Store.data.fragments[trade.weaponId] || 0) < trade.amount) {
        this.showMsg('碎片不足');
        return;
      }
      Store.addFragment(trade.weaponId, -trade.amount);
      Store.addCoins(trade.coins);
      Store.save();
      Sfx.coin();
      this.showMsg(`卖出碎片，获得 ${trade.coins} 金币`, '#9ff0a8');
    }
    trade.sold = true;
    this.refresh();
  }

  showMsg(text, color) {
    if (!this.toastText) return;
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
