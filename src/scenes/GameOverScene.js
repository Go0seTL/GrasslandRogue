class GameOverScene extends Phaser.Scene {
  constructor() {
    super('Over');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    const d = this.data_;
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040804, 0.72).setOrigin(0).setDepth(1);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(2);

    const g = this.add.graphics().setDepth(3);
    UI.drawPanel(g, 220, 34, 520, 472, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.97 });

    this.add.image(480, 92, 'skull').setScale(1.6).setDepth(4).setAlpha(0.9);
    this.add.text(480, 148, '你倒下了', UI.textStyle(40, {
      color: '#ff9a8a', strokeThickness: 9,
    })).setOrigin(0.5).setDepth(4);
    this.add.text(480, 180, '草原的史莱姆们暂时守住了地盘', UI.textStyle(13, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(4);

    const lineG = this.add.graphics().setDepth(4);
    lineG.lineStyle(1, 0x5d7048, 0.9);
    lineG.lineBetween(290, 202, 670, 202);

    const rows = [
      ['到达关卡', `${d.round || 1}-${d.stage || 1}`],
      ['击杀数量', `${d.kills || 0}`],
      ['本局金币', `+${d.runCoins || 0}`],
      ['存活时间', fmtTime(d.timeMs || 0)],
    ];
    rows.forEach((row, i) => {
      const y = 230 + i * 30;
      this.add.text(312, y, row[0], UI.textStyle(16, {
        color: '#a9bd8f', strokeThickness: 3, bold: false,
      })).setOrigin(0, 0.5).setDepth(4);
      this.add.text(648, y, row[1], UI.textStyle(18, {
        color: '#ffe9a8', strokeThickness: 3,
      })).setOrigin(1, 0.5).setDepth(4);
    });

    const best = Store.data.best;
    const walletY = 356;
    const wg = this.add.graphics().setDepth(4);
    wg.fillStyle(0x0d150a, 0.9);
    wg.fillRect(288, walletY - 22, 384, 44);
    wg.lineStyle(1, 0x6f8a5a, 0.9);
    wg.strokeRect(288, walletY - 22, 384, 44);
    this.add.image(314, walletY, 'coin_icon').setDepth(5);
    this.add.text(332, walletY, `金币已保存 · 总计 ${Store.data.coins}`, UI.textStyle(15, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0, 0.5).setDepth(5);
    if (best) {
      this.add.text(648, walletY, `最佳 ${best.round}-${best.stage}`, UI.textStyle(12, {
        color: '#a9bd8f', strokeThickness: 2, bold: false,
      })).setOrigin(1, 0.5).setDepth(5);
    }

    UI.button(this, 480, 408, 250, 50, '再 来 一 局', () => this.retry(), {
      fontSize: 21, once: true,
    }).setDepth(5);
    UI.button(this, 352, 466, 178, 40, '选择角色', () => this.toSelect(), {
      variant: 'ghost', fontSize: 15, once: true,
    }).setDepth(5);
    UI.button(this, 608, 466, 178, 40, '返回主菜单', () => this.toMenu(), {
      variant: 'ghost', fontSize: 15, once: true,
    }).setDepth(5);

    this.cameras.main.fadeIn(380, 6, 10, 6);
    this.input.keyboard.on('keydown-ENTER', () => this.retry());
    this.input.keyboard.on('keydown-ESC', () => this.toMenu());
  }

  retry() {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(240, 6, 10, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { character: this.data_.character || 'gunner' });
    });
  }

  toSelect() {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(220, 6, 10, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Select'));
  }

  toMenu() {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.uiClick();
    this.cameras.main.fadeOut(220, 6, 10, 6);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }
}
