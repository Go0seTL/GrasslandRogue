class BestiaryScene extends Phaser.Scene {
  constructor() {
    super('Bestiary');
  }

  create() {
    this.modalState = UI.beginModalScene(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 24, 44, 912, 456, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.add.text(480, 80, '怪物图鉴', UI.textStyle(32, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 108, '草原上会遇到的所有敌人 · 名字、行为与数值', UI.textStyle(12, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    const entries = [
      { id: 'slime', portrait: 'slime_0', scale: 1.0, color: 0x67b84a, name: '史莱姆' },
      { id: 'slime_mini', portrait: 'slime_mini_0', scale: 1.15, color: 0x7cc95a, name: '小史莱姆' },
      { id: 'goblin', portrait: 'goblin_idle', scale: 1.15, color: 0x6aa84f, name: '哥布林弓手' },
      { id: 'bat', portrait: 'bat_0', scale: 1.4, color: 0x8c66b0, name: '蝙蝠' },
      { id: 'mushroom', portrait: 'mushroom_0', scale: 0.95, color: 0xd96a4a, name: '蘑菇射手' },
      { id: 'boar', portrait: 'boar_0', scale: 1.05, color: 0xb07a4a, name: '冲锋野猪' },
      { id: 'boss', portrait: 'boss_0', scale: 0.5, color: 0xd9a84a, name: '史莱姆王' },
      { id: 'elite', elite: true, portrait: 'slime_0', scale: 1.0, color: 0xffd76a, name: '精英怪' },
    ];

    const xs = [133, 364, 595, 826];
    const ys = [196, 362];
    entries.forEach((entry, i) => {
      const x = xs[i % 4];
      const y = ys[Math.floor(i / 4)];
      this.createCard(entry, x, y);
    });

    UI.button(this, 480, 482, 170, 30, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.cameras.main.fadeIn(180, 6, 10, 6);
  }

  createCard(entry, x, y) {
    const w = 206, h = 144;
    const def = entry.elite ? null : ENEMY_DEFS[entry.id];
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
    g.fillRect(-w / 2 + 12, -h / 2 + 14, 58, 88);
    g.lineStyle(1, entry.color, 0.75);
    g.strokeRect(-w / 2 + 12, -h / 2 + 14, 58, 88);
    c.add(g);

    const px = -w / 2 + 12 + 29;
    const py = -h / 2 + 14 + 44;
    if (entry.elite) {
      const glow = this.add.image(px, py, 'glow').setTint(0xffd76a)
        .setScale(0.7).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
      c.add(glow);
    }
    const portrait = this.add.image(px, py, entry.portrait).setScale(entry.scale);
    if (entry.elite) portrait.setTint(0xffe0a0);
    c.add(portrait);

    const name = this.add.text(-w / 2 + 80, -h / 2 + 22, entry.name, UI.textStyle(15, {
      color: '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(name);

    const loreText = entry.elite
      ? '第二轮开始出现的强化怪物。体型更大，周围有金色粒子，生命和伤害更高，金币与碎片掉落翻倍。'
      : (ENEMY_LORE[entry.id] || '');
    const lore = this.add.text(-w / 2 + 80, -h / 2 + 36, UI.wrapCJK(loreText, 11), UI.textStyle(9, {
      color: '#b9cba0', strokeThickness: 2, bold: false,
    })).setOrigin(0, 0);
    lore.setLineSpacing(2);
    c.add(lore);

    const stats1 = this.add.text(
      -w / 2 + 80, h / 2 - 32,
      entry.elite ? '第二轮起出现' : `生命 ${def.hp}  ·  伤害 ${def.damage}`,
      UI.textStyle(9, { color: entry.elite ? '#ffd76a' : '#8fa77a', strokeThickness: 2, bold: false })
    ).setOrigin(0, 0.5);
    const stats2 = this.add.text(
      -w / 2 + 80, h / 2 - 17,
      entry.elite ? '体型 / 属性 / 掉落翻倍' : `击杀掉落 ${def.coins[0]}-${def.coins[1]} 金币`,
      UI.textStyle(9, { color: entry.elite ? '#ffd76a' : '#8fa77a', strokeThickness: 2, bold: false })
    ).setOrigin(0, 0.5);
    c.add([stats1, stats2]);
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
