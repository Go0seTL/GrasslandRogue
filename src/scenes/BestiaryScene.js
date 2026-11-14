class BestiaryScene extends Phaser.Scene {
  constructor() {
    super('Bestiary');
  }

  create() {
    this.modalState = UI.beginModalScene(this);
    this.page = 0;
    this.mode = 'enemy';
    this.cardObjects = [];
    this.tabs = [];

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.82)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 24, 44, 912, 456, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    this.titleText = this.add.text(480, 80, '怪物图鉴', UI.textStyle(32, {
      color: '#ffe9a8', strokeThickness: 7,
    })).setOrigin(0.5).setDepth(2);
    this.subText = this.add.text(480, 108, '草原上会遇到的所有敌人 · 名字、行为与数值', UI.textStyle(12, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    [
      ['enemy', '怪物', 710],
      ['weapon', '武器', 790],
      ['ring', '戒指', 870],
    ].forEach(([mode, label, x]) => {
      const b = UI.button(this, x, 86, 68, 24, label, () => this.setMode(mode), {
        variant: 'ghost', fontSize: 11,
      }).setDepth(4);
      this.tabs.push({ mode, b });
    });

    this.pageText = this.add.text(480, 452, '', UI.textStyle(10, {
      color: '#93a97d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(3);

    this.pageEntries = [
      [
        { id: 'slime', portrait: 'slime_0', scale: 1.0, color: 0x67b84a, name: '史莱姆' },
        { id: 'slime_mini', portrait: 'slime_mini_0', scale: 1.15, color: 0x7cc95a, name: '小史莱姆' },
        { id: 'goblin', portrait: 'goblin_idle', scale: 1.15, color: 0x6aa84f, name: '哥布林弓手' },
        { id: 'bat', portrait: 'bat_0', scale: 1.4, color: 0x8c66b0, name: '蝙蝠' },
        { id: 'mushroom', portrait: 'mushroom_0', scale: 0.95, color: 0xd96a4a, name: '蘑菇射手' },
        { id: 'boar', portrait: 'boar_0', scale: 1.05, color: 0xb07a4a, name: '冲锋野猪' },
        { id: 'boss', portrait: 'boss_0', scale: 0.5, color: 0xd9a84a, name: '史莱姆王' },
        { id: 'elite', elite: true, portrait: 'slime_0', scale: 1.0, color: 0xffd76a, name: '精英怪' },
      ],
      [
        { id: 'boar_boss', portrait: 'boar_king_0', scale: 1.05, color: 0xd9a84a, name: '野猪王' },
        {
          id: 'elite_slime', elite: true, portrait: 'boss_0', scale: 0.5, color: 0xffd76a, name: '精英史莱姆王',
          lore: '第三轮的精英 Boss 之一。生命和伤害大幅提高，拥有精英金色光环；召唤史莱姆数量翻倍。',
          stats: ['第三轮 Boss', '生命 ×1.6 · 伤害 ×1.3'],
        },
        {
          id: 'elite_boar', elite: true, portrait: 'boar_king_0', scale: 1.05, color: 0xffd76a, name: '精英野猪王',
          lore: '第三轮的精英 Boss 之一。狂暴冲撞更致命，石头雨数量翻倍。',
          stats: ['第三轮 Boss', '生命 ×1.6 · 伤害 ×1.3'],
        },
        { id: 'mushroom_boss', portrait: 'mushroom_fiend_0', scale: 0.95, color: 0xb07bff, name: '蘑菇怪客' },
        { id: 'goat', portrait: 'goat_0', scale: 1.0, color: 0xd8d0c0, name: '山羊精' },
        { id: 'bat_king', portrait: 'bat_king_0', scale: 0.9, color: 0xb07bff, name: '蝙蝠王' },
        { id: 'goat_king', portrait: 'goat_king_0', scale: 0.9, color: 0xd9b45a, name: '山羊王' },
        { id: 'ghost', portrait: 'ghost_0', scale: 1.0, color: 0xbfe8e0, name: '亡灵' },
      ],
      [
        { id: 'demon_guard', portrait: 'demon_guard_0', scale: 0.85, color: 0xff5a3a, name: '恶魔卫兵' },
        {
          id: 'satan', portrait: 'satan_0', scale: 0.62, color: 0xff3a2a, name: '撒旦',
          lore: '恶魔之地 Boss，7 倍血量；二阶段只剩 1/3 生命并喷硫磺火。',
          stats: ['必定掉落撒旦之心'],
        },
        { id: 'dragonling', portrait: 'dragonling_0', scale: 1.1, color: 0x7fd06a, name: '小飞龙' },
        { id: 'dragon_baby', portrait: 'dragon_baby_0', scale: 0.75, color: 0xd9b45a, name: '飞龙宝宝' },
        { id: 'angel_guard', portrait: 'angel_guard_0', scale: 1.1, color: 0xfff2c8, name: '天使侍从' },
        { id: 'cloud_wisp', portrait: 'cloud_wisp_0', scale: 1.2, color: 0xe8f0ff, name: '云端精灵' },
        { id: 'temple_knight', portrait: 'temple_knight_0', scale: 1.0, color: 0xffd76a, name: '圣殿骑士' },
        { id: 'angel', portrait: 'angel_0', scale: 0.55, color: 0xffe9a8, name: '天使' },
      ],
    ];

    this.weaponList = Object.values(WEAPONS);
    this.weaponPages = [];
    for (let i = 0; i < this.weaponList.length; i += 8) {
      this.weaponPages.push(this.weaponList.slice(i, i + 8));
    }
    this.ringList = Object.values(RINGS);

    UI.button(this, 400, 482, 150, 30, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);
    this.pageBtn = UI.button(this, 570, 482, 150, 30, '下一页', () => this.togglePage(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(3);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.tabs.forEach((t) => {
      if (t.b && t.b.list[1]) t.b.list[1].setColor(t.mode === 'enemy' ? '#ffd76a' : '#dfe8c8');
    });
    this.renderPage();
    this.cameras.main.fadeIn(180, 6, 10, 6);
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.page = 0;
    Sfx.uiClick();
    if (mode === 'enemy') {
      this.titleText.setText('怪物图鉴');
      this.subText.setText('草原上会遇到的所有敌人 · 名字、行为与数值');
    } else if (mode === 'weapon') {
      this.titleText.setText('武器图鉴');
      this.subText.setText(`共 ${this.weaponList.length} 把武器 · 品质、碎片需求与武器特性`);
    } else {
      this.titleText.setText('戒指图鉴');
      this.subText.setText('七种戒指 · 碎片需求与效果 · 一局只能装备 1 枚');
    }
    this.tabs.forEach((t) => {
      if (t.b && t.b.list[1]) t.b.list[1].setColor(t.mode === mode ? '#ffd76a' : '#dfe8c8');
    });
    this.renderPage();
  }

  pageCount() {
    if (this.mode === 'weapon') return this.weaponPages.length;
    if (this.mode === 'ring') return 1;
    return this.pageEntries.length;
  }

  togglePage() {
    this.page = (this.page + 1) % this.pageCount();
    this.renderPage();
    Sfx.uiClick();
  }

  renderPage() {
    this.cardObjects.forEach((c) => c.destroy());
    this.cardObjects = [];
    const xs = [133, 364, 595, 826];
    const ys = [196, 362];
    if (this.mode === 'weapon') {
      const entries = this.weaponPages[this.page] || [];
      entries.forEach((w, i) => {
        this.cardObjects.push(this.createWeaponCard(w, xs[i % 4], ys[Math.floor(i / 4)]));
      });
    } else if (this.mode === 'ring') {
      this.ringList.forEach((r, i) => {
        this.cardObjects.push(this.createRingCard(r, xs[i % 4], ys[Math.floor(i / 4)]));
      });
    } else {
      const entries = this.pageEntries[this.page];
      entries.forEach((entry, i) => {
        this.cardObjects.push(this.createCard(entry, xs[i % 4], ys[Math.floor(i / 4)]));
      });
    }
    this.pageText.setText(`第 ${this.page + 1} / ${this.pageCount()} 页`);
    if (this.pageBtn) {
      if (this.pageBtn.list[1]) {
        this.pageBtn.list[1].setText(
          this.page === this.pageCount() - 1 ? '下一页（回到首页）' : '下一页'
        );
      }
      this.pageBtn.setVisible(this.pageCount() > 1);
    }
  }

  createWeaponCard(w, x, y) {
    const wd = 206, ht = 144;
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-wd / 2 + 4, -ht / 2 + 4, wd, ht);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-wd / 2, -ht / 2, wd, ht);
    g.lineStyle(2, q.color, 0.9);
    g.strokeRect(-wd / 2, -ht / 2, wd, ht);
    g.fillStyle(q.color, 0.85);
    g.fillRect(-wd / 2, -ht / 2, wd, 3);
    g.fillStyle(0x0b1208, 0.95);
    g.fillRect(-wd / 2 + 12, -ht / 2 + 14, 58, 88);
    g.lineStyle(1, q.color, 0.75);
    g.strokeRect(-wd / 2 + 12, -ht / 2 + 14, 58, 88);
    c.add(g);
    const icon = this.add.image(-wd / 2 + 41, -ht / 2 + 58, w.texture)
      .setScale(Math.min(1.05, (w.iconScale || 1) * 0.9));
    c.add(icon);
    const name = this.add.text(-wd / 2 + 80, -ht / 2 + 20, w.name, UI.textStyle(13, {
      color: q.hex, strokeThickness: 2,
    })).setOrigin(0, 0.5);
    c.add(name);
    const qText = this.add.text(-wd / 2 + 80, -ht / 2 + 36, `品质：${q.name}`, UI.textStyle(8, {
      color: q.hex, strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0);
    c.add(qText);
    const desc = this.add.text(-wd / 2 + 80, -ht / 2 + 50, UI.wrapCJK(w.desc || '', 12), UI.textStyle(8, {
      color: '#b9cba0', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0);
    desc.setLineSpacing(2);
    c.add(desc);
    const owned = Store.hasWeapon(w.id);
    const stat1 = this.add.text(-wd / 2 + 80, ht / 2 - 32,
      w.melee ? `近战 · 伤害 ${w.damage}` : `伤害 ${w.damage || '-'} · 能量 ${w.energyCost || 0}`,
      UI.textStyle(8, { color: '#8fa77a', strokeThickness: 2, bold: false, shadow: false })).setOrigin(0, 0.5);
    const stat2 = this.add.text(-wd / 2 + 80, ht / 2 - 17,
      owned ? '已解锁' : `碎片需求 ${w.fragReq || 0}`,
      UI.textStyle(8, { color: owned ? '#9ff0a8' : '#e0b96a', strokeThickness: 2, bold: false, shadow: false })).setOrigin(0, 0.5);
    c.add([stat1, stat2]);
    return c;
  }

  createRingCard(r, x, y) {
    const wd = 206, ht = 144;
    const q = QUALITIES[r.quality] || QUALITIES.gold;
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-wd / 2 + 4, -ht / 2 + 4, wd, ht);
    g.fillStyle(0x111a0d, 0.96);
    g.fillRect(-wd / 2, -ht / 2, wd, ht);
    g.lineStyle(2, r.color, 0.9);
    g.strokeRect(-wd / 2, -ht / 2, wd, ht);
    g.fillStyle(r.color, 0.85);
    g.fillRect(-wd / 2, -ht / 2, wd, 3);
    g.fillStyle(0x0b1208, 0.95);
    g.fillRect(-wd / 2 + 12, -ht / 2 + 14, 58, 88);
    g.lineStyle(1, r.color, 0.75);
    g.strokeRect(-wd / 2 + 12, -ht / 2 + 14, 58, 88);
    c.add(g);
    const icon = this.add.image(-wd / 2 + 41, -ht / 2 + 58, 'ring_icon').setTint(r.color).setScale(1.5);
    c.add(icon);
    const name = this.add.text(-wd / 2 + 80, -ht / 2 + 20, r.name, UI.textStyle(13, {
      color: '#fff1c4', strokeThickness: 2,
    })).setOrigin(0, 0.5);
    c.add(name);
    const qText = this.add.text(-wd / 2 + 80, -ht / 2 + 36, `品质：${q.name}`, UI.textStyle(8, {
      color: q.hex, strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0);
    c.add(qText);
    const desc = this.add.text(-wd / 2 + 80, -ht / 2 + 50, UI.wrapCJK(r.desc || '', 12), UI.textStyle(8, {
      color: '#b9cba0', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0, 0);
    desc.setLineSpacing(2);
    c.add(desc);
    const owned = Store.hasRing(r.id);
    const equipped = Store.data.equippedRing === r.id;
    const stat1 = this.add.text(-wd / 2 + 80, ht / 2 - 32, `碎片需求 ${r.fragReq}`,
      UI.textStyle(8, { color: '#e0b96a', strokeThickness: 2, bold: false, shadow: false })).setOrigin(0, 0.5);
    const stat2 = this.add.text(-wd / 2 + 80, ht / 2 - 17,
      equipped ? '装备中' : (owned ? '已拥有' : '未合成'),
      UI.textStyle(8, { color: equipped ? '#ffd76a' : (owned ? '#9ff0a8' : '#8fa77a'), strokeThickness: 2, bold: false, shadow: false })).setOrigin(0, 0.5);
    c.add([stat1, stat2]);
    return c;
  }

  createCard(entry, x, y) {
    const w = 206, h = 144;
    const def = entry.def || (entry.elite ? null : ENEMY_DEFS[entry.id]);
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
    const portrait = this.add.image(px, py, entry.portrait)
      .setScale(entry.scale);
    if (entry.elite) portrait.setTint(0xffe0a0);
    c.add(portrait);

    const name = this.add.text(-w / 2 + 80, -h / 2 + 22, entry.name, UI.textStyle(15, {
      color: '#fff1c4', strokeThickness: 3,
    })).setOrigin(0, 0.5);
    c.add(name);

    let loreText;
    if (entry.lore != null) loreText = entry.lore;
    else if (entry.elite) loreText = '第二轮开始出现的强化怪物。体型更大，周围有金色粒子，生命和伤害更高，金币与碎片掉落翻倍。';
    else loreText = ENEMY_LORE[entry.id] || '';
    const lore = this.add.text(-w / 2 + 80, -h / 2 + 36, UI.wrapCJK(loreText, 11), UI.textStyle(9, {
      color: '#b9cba0', strokeThickness: 2, bold: false,
    })).setOrigin(0, 0);
    lore.setLineSpacing(2);
    c.add(lore);

    let stats1Text;
    let stats2Text;
    if (entry.stats) {
      stats1Text = entry.stats[0];
      stats2Text = entry.stats[1];
    } else if (entry.elite) {
      stats1Text = '第二轮起出现';
      stats2Text = '体型 / 属性 / 掉落翻倍';
    } else {
      stats1Text = `生命 ${def.hp}  ·  伤害 ${def.damage}`;
      stats2Text = `击杀掉落 ${def.coins[0]}-${def.coins[1]} 金币`;
    }
    const stats1 = this.add.text(-w / 2 + 80, h / 2 - 32,
      stats1Text, UI.textStyle(9, {
        color: entry.elite ? '#ffd76a' : '#8fa77a', strokeThickness: 2, bold: false,
      })).setOrigin(0, 0.5);
    const stats2 = this.add.text(-w / 2 + 80, h / 2 - 17,
      stats2Text, UI.textStyle(9, {
        color: entry.elite ? '#ffd76a' : '#8fa77a', strokeThickness: 2, bold: false,
      })).setOrigin(0, 0.5);
    c.add([stats1, stats2]);
    return c;
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
