class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.closing = false;
    this.gameScene = this.scene.get('Game');
    if (this.gameScene && !this.gameScene.scene.isPaused()) {
      this.gameScene.scene.pause();
    }
    // 暂停时屏蔽 HUD 按钮，避免点穿到图鉴/背包/升级/开火，造成返回菜单后输入失效
    this.uiScene = this.scene.get('UI');
    if (this.uiScene && this.uiScene.input) this.uiScene.input.enabled = false;
    this.scene.bringToTop();
    this.events.once('shutdown', () => {
      if (this.uiScene && this.uiScene.scene && this.uiScene.scene.isActive()
        && this.uiScene.input) {
        this.uiScene.input.enabled = true;
      }
    });

    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.72)
      .setOrigin(0).setDepth(0);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 310, 96, 340, 372, { border: 0xe0bd63, bg: 0x182413, alpha: 0.98 });

    this.add.text(480, 140, '暂停', UI.textStyle(40, {
      color: '#ffe9a8', strokeThickness: 8,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 178, '喘口气，史莱姆王还在等你', UI.textStyle(13, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(2);

    UI.button(this, 480, 238, 228, 46, '继续游戏', () => this.resumeGame(), {
      fontSize: 20,
    }).setDepth(2);
    UI.button(this, 480, 292, 228, 40, '重新开始', () => this.restart(), {
      variant: 'ghost', fontSize: 17,
    }).setDepth(2);
    this.autoBtn = UI.button(this, 480, 342, 252, 38,
      `手机自动射击：${Store.data.autoFire ? '开' : '关'}`, () => {
        const on = Store.toggleAutoFire();
        this.autoBtn.list[1].setText(`手机自动射击：${on ? '开' : '关'}`);
        Sfx.uiClick();
      }, { variant: 'ghost', fontSize: 14 }).setDepth(2);
    UI.button(this, 480, 396, 228, 40, '返回主菜单', () => this.toMenu(), {
      variant: 'ghost', fontSize: 17,
    }).setDepth(2);

    this.add.text(480, 442, '按 Esc 继续 · 手机默认手动射击', UI.textStyle(11, {
      color: '#7f9a6d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(2);

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    if (this.uiScene && this.uiScene.input) this.uiScene.input.enabled = true;
    if (this.gameScene) {
      this.gameScene.resetTouch();
      this.gameScene.scene.resume();
    }
    this.scene.stop();
  }

  stopOverlays() {
    ['Forge', 'Inventory', 'CharUpgrade', 'Bestiary', 'Upgrade', 'Merchant', 'Ring'].forEach((key) => {
      const s = this.scene.get(key);
      if (s && s.scene && s.scene.isActive()) s.scene.stop();
    });
  }

  restart() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    const character = this.gameScene ? this.gameScene.characterId : 'gunner';
    this.stopOverlays();
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.start('Game', { character });
  }

  toMenu() {
    if (this.closing) return;
    this.closing = true;
    Sfx.uiClick();
    this.stopOverlays();
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
