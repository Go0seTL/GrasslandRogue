class ForgeScene extends Phaser.Scene {
  constructor() {
    super('Forge');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.fromGame = !!(this.gameScene && this.gameScene.scene.isActive());
    this.rows = [];
    this.toast = null;
    this.modalState = UI.beginModalScene(this);

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 110, 40, 740, 460, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 74, '武器锻造', UI.textStyle(30, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 100, '小怪掉落碎片 · 彩色碎片只由对应 Boss 掉落 · 品质越高越稀有', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    this.toast = UI.toastContainer(this);

    const ids = ['pistol', 'knife', 'shotgun', 'smg', 'rifle', 'katana', 'bow', 'flamer', 'railgun', 'slime_staff', 'boar_axe', 'mushroom_orb'];
    ids.forEach((id, i) => {
      const col = i < 6 ? 0 : 1;
      const row = i < 6 ? i : i - 6;
      const x = col === 0 ? 310 : 650;
      const y = 134 + row * 54;
      this.createRow(WEAPONS[id], x, y);
    });

    this.add.text(480, 444, '碎片与已解锁武器永久保存 · 本局初始武器固定为手枪', UI.textStyle(10, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    UI.button(this, 480, 482, 180, 28, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);

    // 右上角始终可用的关闭按钮（放在场景顶层，避免被提示条/行按钮遮挡）
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
    this.refreshRows();
  }

  handlePointer(pointer) {
    if (this.closing) return;
    const inside = (r) => pointer.x >= r.x - r.w / 2 && pointer.x <= r.x + r.w / 2
      && pointer.y >= r.y - r.h / 2 && pointer.y <= r.y + r.h / 2;
    if (inside(this.closeRect) || inside(this.cornerRect)) this.close();
  }

  createRow(w, x, y) {
    const rw = 320, rh = 50;
    const q = QUALITIES[w.quality];
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    c.add(g);

    const icon = this.add.image(-134, 0, w.texture).setScale(w.id === 'slime_staff' ? 0.9 : 1.0);
    c.add(icon);

    const name = this.add.text(-104, -13, w.name, UI.textStyle(14, {
      color: '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(name);

    const quality = this.add.text(-104, 2, `${q.name}品质`, UI.textStyle(8, {
      color: q.hex, strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(quality);

    const progress = this.add.text(-104, 12, '', UI.textStyle(8, {
      color: '#a9bd8f', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0.5);
    c.add(progress);

    const bar = this.add.graphics();
    c.add(bar);

    const btn = UI.button(this, 122, 2, 80, 22, '合成', () => this.action(w), {
      fontSize: 10, variant: 'ghost',
    });
    c.add(btn);

    const row = { w, q, c, g, bar, progress, btn };
    this.rows.push(row);
  }

  action(w) {
    const have = Store.data.fragments[w.id] || 0;
    const owned = Store.hasWeapon(w.id);
    if (owned) {
      if (this.fromGame) {
        this.gameScene.equipWeapon(w.id);
        Sfx.uiClick();
        this.toast.show(`已装备「${w.name}」`, '#9ff0a8');
      } else {
        Sfx.uiDeny();
        this.toast.show('进入游戏后才能装备武器', '#ffd0a0');
      }
      this.refreshRows();
      return;
    }
    if (have < w.fragReq) {
      Sfx.uiDeny();
      this.toast.show(`还差 ${w.fragReq - have} 个${w.name}碎片`, '#ffd0a0');
      return;
    }
    Store.data.fragments[w.id] = have - w.fragReq;
    Store.data.ownedWeapons.push(w.id);
    Store.save();
    Sfx.unlock();
    if (this.fromGame) {
      this.gameScene.equipWeapon(w.id);
      this.toast.show(`合成成功！已装备「${w.name}」`, '#9ff0a8');
    } else {
      this.toast.show(`合成成功！进入游戏后可装备「${w.name}」`, '#9ff0a8');
    }
    this.refreshRows();
  }

  refreshRows() {
    const gameActive = this.fromGame;
    const current = gameActive ? this.gameScene.weaponId : null;
    this.rows.forEach((row) => {
      const { w, q, g, bar, progress, btn } = row;
      const have = Store.data.fragments[w.id] || 0;
      const owned = Store.hasWeapon(w.id);
      const rw = 320, rh = 50;

      g.clear();
      g.fillStyle(0x000000, 0.28);
      g.fillRect(-rw / 2 + 3, -rh / 2 + 4, rw, rh);
      g.fillStyle(0x111a0d, 0.96);
      g.fillRect(-rw / 2, -rh / 2, rw, rh);
      g.lineStyle(1, q.color, owned ? 0.9 : 0.5);
      g.strokeRect(-rw / 2, -rh / 2, rw, rh);
      g.fillStyle(q.color, owned ? 0.9 : 0.45);
      g.fillRect(-rw / 2, -rh / 2, 3, rh);

      bar.clear();
      const bx = -104, by = 20, bw = 150, bh = 5;
      bar.fillStyle(0x0b1208, 1);
      bar.fillRect(bx, by, bw, bh);
      const pct = w.fragReq <= 0 ? 1 : clamp(have / w.fragReq, 0, 1);
      bar.fillStyle(owned ? 0x6fdd68 : q.color, 0.9);
      bar.fillRect(bx, by, bw * pct, bh);
      bar.lineStyle(1, 0x4a5a3e, 0.8);
      bar.strokeRect(bx, by, bw, bh);

      if (owned) {
        progress.setText('已解锁').setColor('#9ff0a8');
      } else {
        progress.setText(`碎片 ${have} / ${w.fragReq}`).setColor('#a9bd8f');
      }

      let label;
      if (current === w.id) label = '已装备';
      else if (owned) label = '装 备';
      else if (have >= w.fragReq) label = '合 成';
      else label = '碎片不足';
      const text = btn.list[1];
      if (text) text.setText(label);
    });
  }

  close() {
    if (!this.closing) {
      this.closing = true;
      Sfx.uiClick();
    }
    UI.endModalScene(this.modalState);
    this.scene.stop();
  }
}
