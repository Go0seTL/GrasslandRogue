class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('Select');
  }

  init(data) {
    this.endless = !!(data && data.endless);
  }

  create() {
    this.starting = false;
    this.selectedId = 'gunner';
    this.cards = [];
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x071008, 0.62).setOrigin(0).setDepth(1);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(2);

    this.add.text(480, 40, this.endless ? '选择角色 · 无尽挑战' : '选择角色', UI.textStyle(36, {
      color: '#ffe9a8', strokeThickness: 8,
    })).setOrigin(0.5).setDepth(10);
    this.add.text(480, 72, '枪手免费 · 剑客800 · 科学怪人3000 · 法师1800 · 吉他手2200 · 恶魔3200 · 吸血鬼2600', UI.textStyle(11, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(10);

    const wallet = UI.panel(this, 742, 8, 202, 40, { border: 0x9aa86a, bg: 0x15200f, alpha: 0.85 });
    wallet.setDepth(10);
    this.add.image(766, 28, 'coin_icon').setDepth(11);
    this.walletText = this.add.text(784, 28, String(Store.data.coins), UI.textStyle(19, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0, 0.5).setDepth(11);

    const xs = [78, 239, 400, 561, 722, 883];
    const ys = [186, 350];
    CHAR_DEFS.forEach((def, i) => {
      const x = xs[i % 6];
      const y = ys[Math.floor(i / 6)];
      this.createCard(def, x, y);
    });

    this.toast = UI.toastContainer(this);

    UI.button(this, 132, 502, 164, 44, '返 回', () => this.back(), {
      variant: 'ghost', fontSize: 17,
    }).setDepth(20);
    UI.button(this, 828, 502, 194, 48, '开始冒险', () => this.startGame(), {
      fontSize: 21, once: true,
    }).setDepth(20);
    UI.button(this, 480, 454, 220, 36, '角色升级', () => this.openCharUpgrade(), {
      variant: 'ghost', fontSize: 15,
    }).setDepth(20);
    this.add.text(480, 502, '金币在死亡后也会保留，放心攒', UI.textStyle(12, {
      color: '#93a97d', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(20);

    this.refreshCards();
    this.cameras.main.fadeIn(350, 6, 12, 6);
    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
  }

  createCard(def, x, y) {
    const w = 150, h = 148;
    const c = this.add.container(x, y).setDepth(10);
    const g = this.add.graphics();
    c.add(g);

    const portraitKey = def.portrait || 'player_idle';
    const frameX = -w / 2 + 8;
    const frameY = -h / 2 + 16;
    const frameW = 56, frameH = 88;

    const portrait = this.add.image(frameX + 28, frameY + 44, portraitKey);
    portrait.setScale(1.3);
    if (!def.playable) {
      portrait.setTint(0x39402e).setAlpha(0.85);
    }
    c.add(portrait);

    const unlocked = Store.isUnlocked(def.id);
    const name = this.add.text(-w / 2 + 70, -h / 2 + 30, def.name, UI.textStyle(15, {
      color: def.playable ? '#fff1c4' : '#b9c3a8', strokeThickness: 3,
      shadow: false,
    })).setOrigin(0, 0.5);
    c.add(name);

    const desc = this.add.text(-w / 2 + 70, -h / 2 + 52, def.desc, UI.textStyle(8, {
      color: '#9fb58a', strokeThickness: 2, bold: false,
    })).setOrigin(0, 0);
    desc.setWordWrapWidth(74);
    desc.setLineSpacing(2);
    c.add(desc);

    const status = this.add.text(-w / 2 + 70, h / 2 - 22, '', UI.textStyle(8, {
      color: '#e0b96a', strokeThickness: 2,
    })).setOrigin(0, 0.5);
    c.add(status);

    const updateStatus = () => {
      const isUnlocked = Store.isUnlocked(def.id);
      let label;
      let color;
      if (!def.playable) {
        label = isUnlocked ? '已解锁 · 制作中' : `未开放 · ${def.price} 金币`;
        color = isUnlocked ? '#ffd76a' : '#8b927d';
      } else if (isUnlocked) {
        const lvl = Store.getCharLevel(def.id);
        label = (def.price === 0 ? '免费' : '已解锁') + ` · Lv.${lvl}`;
        color = '#9ff0a8';
      } else {
        label = `${def.price} 金币`;
        color = '#e0b96a';
      }
      status.setText(label).setColor(color);
    };
    updateStatus();

    const card = {
      def, container: c, g, portrait, status, updateStatus, w, h,
      hovered: false,
      selected: false,
      draw: () => {
        const selected = this.selectedId === def.id;
        const hovered = card.hovered;
        g.clear();
        g.fillStyle(0x000000, 0.32);
        g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
        g.fillStyle(selected ? 0x1c2b17 : 0x151f11, selected ? 0.98 : 0.92);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.lineStyle(selected ? 3 : 2, selected ? 0xffd76a : (hovered ? 0xc7d898 : 0x566a42), 1);
        g.strokeRect(-w / 2, -h / 2, w, h);
        // 头像框
        g.fillStyle(0x0f180c, 0.95);
        g.fillRect(frameX, frameY, frameW, frameH);
        g.lineStyle(2, def.playable ? 0x7e9a5e : 0x46523a, 1);
        g.strokeRect(frameX, frameY, frameW, frameH);
        g.fillStyle(def.color, selected ? 0.3 : 0.16);
        g.fillRect(frameX + 2, frameY + 2, frameW - 4, frameH - 4);
        if (selected) {
          g.lineStyle(1, 0xffedb0, 0.8);
          g.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
          g.fillStyle(0xffd76a, 1);
          g.fillRect(-w / 2 + 1, -h / 2 + 1, 10, 2);
          g.fillRect(-w / 2 + 1, -h / 2 + 1, 2, 10);
          g.fillRect(w / 2 - 11, -h / 2 + 1, 10, 2);
          g.fillRect(w / 2 - 3, -h / 2 + 1, 2, 10);
        }
        g.fillStyle(def.color, 0.85);
        g.fillRect(-w / 2 + 14, -h / 2 - 2, w - 28, 3);
        if (!def.playable) {
          g.fillStyle(0x0b1208, 0.45);
          g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
        }
      },
    };

    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    c.add(hit);
    c.setSize(w, h);
    hit.on('pointerover', () => {
      card.hovered = true;
      card.draw();
      this.tweens.add({ targets: c, scale: 1.03, duration: 90 });
    });
    hit.on('pointerout', () => {
      card.hovered = false;
      c.setScale(1);
      card.draw();
    });
    hit.on('pointerup', () => this.choose(def));
    this.cards.push(card);
  }

  openCharUpgrade() {
    if (this.upgradeOverlay) return;
    const def = CHAR_DEFS.find((d) => d.id === this.selectedId);
    if (!def || !def.playable) {
      Sfx.uiDeny();
      this.toast.show('这个角色还没有完成', '#ffd0a0');
      return;
    }
    if (!Store.isUnlocked(def.id)) {
      Sfx.uiDeny();
      this.toast.show(`先花 ${def.price} 金币解锁「${def.name}」`, '#ffd0a0');
      return;
    }

    const root = this.add.container(0, 0).setDepth(5000);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.66).setOrigin(0);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);
    const g = this.add.graphics();
    UI.drawPanel(g, 270, 96, 420, 360, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });
    const title = this.add.text(480, 130, '角色升级', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 6,
    })).setOrigin(0.5);
    const sub = this.add.text(480, 158, def.name, UI.textStyle(15, {
      color: '#b9cba0', strokeThickness: 3,
    })).setOrigin(0.5);
    const stats = this.add.text(318, 184, '', UI.textStyle(13, {
      color: '#dfe8c8', strokeThickness: 3, bold: false, align: 'left', shadow: false,
    })).setOrigin(0, 0);
    stats.setLineSpacing(8);
    const cost = this.add.text(480, 338, '', UI.textStyle(14, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0.5);
    const wallet = this.add.text(480, 360, '', UI.textStyle(12, {
      color: '#b9cba0', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5);
    const msg = this.add.text(480, 382, '', UI.textStyle(10, {
      color: '#ffb09a', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5);

    const refresh = () => {
      const lvl = Store.getCharLevel(def.id);
      const upgradeCost = Store.charUpgradeCost(def.id);
      const hp = BALANCE.playerHP + lvl * CHAR_UPGRADE.hpPerLevel;
      const energy = BALANCE.playerEnergy + lvl * CHAR_UPGRADE.energyPerLevel;
      const dmg = Math.round(lvl * CHAR_UPGRADE.damagePerLevel * 100);
      const aspd = Math.min(Math.round(CHAR_UPGRADE.maxSpeedBonus * 100), Math.round(lvl * CHAR_UPGRADE.speedPerLevel * 100));
      stats.setText(
        `等级        Lv.${lvl}\n` +
        `生命上限    ${hp}\n` +
        `能量上限    ${energy}\n` +
        `攻击/技能   +${dmg}%\n` +
        `攻击速度    +${aspd}%`
      );
      cost.setText(`升级消耗：${upgradeCost} 金币`);
      cost.setColor(Store.data.coins >= upgradeCost ? '#ffe9a8' : '#ff9a8a');
      wallet.setText(`当前金币：${Store.data.coins}`);
    };

    const upBtn = UI.button(this, 480, 410, 200, 38, '升 级', () => {
      if (Store.upgradeChar(def.id)) {
        Sfx.unlock();
        msg.setText('升级成功！').setColor('#9ff0a8');
        refresh();
        this.refreshCards();
        this.walletText.setText(String(Store.data.coins));
      } else {
        Sfx.uiDeny();
        msg.setText('金币不足').setColor('#ffb09a');
        refresh();
      }
    }, { fontSize: 16 });
    const closeBtn = UI.button(this, 480, 436, 150, 24, '关 闭', () => {
      root.destroy();
      this.upgradeOverlay = null;
    }, { variant: 'ghost', fontSize: 11 });

    root.add([dim, g, title, sub, stats, cost, wallet, msg, upBtn, closeBtn]);
    root.setDepth(5000);
    this.upgradeOverlay = root;
    refresh();
  }

  choose(def) {
    if (!def.playable) {
      Sfx.uiDeny();
      this.toast.show(`「${def.name}」还在制作中，金币会一直保留`, '#ffd0a0');
      return;
    }
    if (!Store.isUnlocked(def.id)) {
      if (Store.data.coins < def.price) {
        Sfx.uiDeny();
        this.toast.show(`还差 ${def.price - Store.data.coins} 金币`, '#ffd0a0');
        return;
      }
      Store.data.coins -= def.price;
      Store.data.unlocked.push(def.id);
      if (def.id === 'swordsman') Store.data.swordsmanPurchased = true;
      Store.save();
      Sfx.unlock();
      this.toast.show(`已解锁「${def.name}」！`, '#9ff0a8');
    } else {
      Sfx.uiClick();
    }
    this.selectedId = def.id;
    this.refreshCards();
  }

  refreshCards() {
    this.cards.forEach((c) => {
      c.selected = c.def.id === this.selectedId;
      c.updateStatus();
      c.draw();
    });
    if (this.walletText) this.walletText.setText(String(Store.data.coins));
  }

  startGame() {
    if (this.starting) return;
    const def = CHAR_DEFS.find((d) => d.id === this.selectedId);
    if (!def || !def.playable) {
      Sfx.uiDeny();
      this.toast.show('这个角色还没有完成，先选枪手或剑客吧', '#ffd0a0');
      return;
    }
    this.starting = true;
    Store.data.lastChar = this.selectedId;
    Store.save();
    Sfx.uiClick();
    this.cameras.main.fadeOut(300, 6, 12, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Ring', { preRun: true, character: this.selectedId, endless: this.endless });
    });
  }

  back() {
    if (this.starting) return;
    this.starting = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(220, 6, 12, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }
}
