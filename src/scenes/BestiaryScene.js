class BestiaryScene extends Phaser.Scene {
  constructor() {
    super('Bestiary');
  }

  create() {
    UI.beginModalScene(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 60, 44, 840, 456, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 82, '怪物图鉴', UI.textStyle(32, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 110, '草原上会遇到的所有敌人 · 名字与行为介绍', UI.textStyle(12, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const entries = [
      { id: 'slime', portrait: 'slime_0', scale: 1.15, color: 0x67b84a, name: '史莱姆' },
      { id: 'slime_mini', portrait: 'slime_mini_0', scale: 1.35, color: 0x7cc95a, name: '小史莱姆' },
      { id: 'goblin', portrait: 'goblin_idle', scale: 1.35, color: 0x6aa84f, name: '哥布林弓手' },
      { id: 'bat', portrait: 'bat_0', scale: 1.6, color: 0x8c66b0, name: '蝙蝠' },
      { id: 'boss', portrait: 'boss_0', scale: 0.55, color: 0xd9a84a, name: '史莱姆王' },
    ];

    const xs = [215, 480, 745];
    const ys = [205, 375];
    entries.forEach((entry, i) => {
      const x = xs[i % 3];
      const y = ys[Math.floor(i / 3)];
      this.createCard(entry, x, y);
    });

    UI.button(this, 480, 480, 170, 32, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 14,
    }).setDepth(3);
    this.add.text(480, 510, '按 Esc 关闭', UI.textStyle(10, {
      color: '#7f9a6d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(3);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.cameras.main.fadeIn(180, 6, 10, 6);
  }

  createCard(entry, x, y) {
    const w = 246, h = 154;
    const def = ENEMY_DEFS[entry.id];
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(2, entry.color, 0.9);
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle(entry.color, 0.85);
    g.fillRect(-w / 2, -h / 2, w, 3);
    // 肖像底
    g.fillStyle(0x0b1208, 0.95);
    g.fillRect(-w / 2 + 14, -h / 2 + 18, 76, 104);
    g.lineStyle(1, entry.color, 0.75);
    g.strokeRect(-w / 2 + 14, -h / 2 + 18, 76, 104);
    c.add(g);

    const portrait = this.add.image(-w / 2 + 52, -h / 2 + 70, entry.portrait)
      .setScale(entry.scale);
    c.add(portrait);

    const name = this.add.text(-w / 2 + 104, -h / 2 + 28, entry.name, UI.textStyle(19, {
      color: '#fff1c4', strokeThickness: 4,
    })).setOrigin(0, 0.5);
    c.add(name);

    const lore = this.add.text(-w / 2 + 104, -h / 2 + 44, UI.wrapCJK(ENEMY_LORE[entry.id] || '', 12), UI.textStyle(10, {
      color: '#b9cba0', strokeThickness: 2, bold: false,
    })).setOrigin(0, 0);
    lore.setLineSpacing(3);
    c.add(lore);

    const stats1 = this.add.text(
      -w / 2 + 104, h / 2 - 34,
      `生命 ${def.hp}  ·  伤害 ${def.damage}`,
      UI.textStyle(10, { color: '#8fa77a', strokeThickness: 2, bold: false })
    ).setOrigin(0, 0.5);
    const stats2 = this.add.text(
      -w / 2 + 104, h / 2 - 18,
      `击杀掉落 ${def.coins[0]}-${def.coins[1]} 金币`,
      UI.textStyle(10, { color: '#8fa77a', strokeThickness: 2, bold: false })
    ).setOrigin(0, 0.5);
    c.add([stats1, stats2]);

    // 肖像下面的小阴影
    const shadow = this.add.image(-w / 2 + 52, h / 2 - 14, 'shadow').setAlpha(0.25).setScale(0.9);
    c.addAt(shadow, 1);
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    this.scene.stop();
  }
}
