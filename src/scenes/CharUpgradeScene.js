class CharUpgradeScene extends Phaser.Scene {
  constructor() {
    super('CharUpgrade');
  }

  init(data) {
    this.data_ = data || {};
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.characterId = this.data_.characterId
      || (this.gameScene && this.gameScene.characterId)
      || 'gunner';
    this.modalState = UI.beginModalScene(this);

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040a04, 0.78)
      .setOrigin(0).setDepth(0)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const g = this.add.graphics().setDepth(1);
    UI.drawPanel(g, 270, 96, 420, 360, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });

    const def = CHAR_DEFS.find((d) => d.id === this.characterId) || CHAR_DEFS[0];
    this.add.text(480, 130, '角色升级', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 6,
    })).setOrigin(0.5).setDepth(2);
    this.add.text(480, 158, def.name, UI.textStyle(15, {
      color: '#b9cba0', strokeThickness: 3,
    })).setOrigin(0.5).setDepth(2);

    this.stats = this.add.text(318, 184, '', UI.textStyle(13, {
      color: '#dfe8c8', strokeThickness: 3, bold: false, align: 'left', shadow: false,
    })).setOrigin(0, 0).setDepth(2);
    this.stats.setLineSpacing(8);

    this.cost = this.add.text(480, 338, '', UI.textStyle(14, {
      color: '#ffe9a8', strokeThickness: 3,
    })).setOrigin(0.5).setDepth(2);
    this.wallet = this.add.text(480, 360, '', UI.textStyle(12, {
      color: '#b9cba0', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5).setDepth(2);
    this.msg = this.add.text(480, 382, '', UI.textStyle(10, {
      color: '#ffb09a', strokeThickness: 2, bold: false, shadow: false,
    })).setOrigin(0.5).setDepth(2);

    UI.button(this, 480, 410, 200, 38, '升 级', () => this.upgrade(), {
      fontSize: 16,
    }).setDepth(3);
    UI.button(this, 480, 436, 150, 24, '关 闭', () => this.close(), {
      variant: 'ghost', fontSize: 11,
    }).setDepth(3);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.refresh();
    this.cameras.main.fadeIn(150, 6, 10, 6);
  }

  refresh() {
    const lvl = Store.getCharLevel(this.characterId);
    const upgradeCost = Store.charUpgradeCost(this.characterId);
    const hp = BALANCE.playerHP + lvl * 10;
    const energy = BALANCE.playerEnergy + lvl * 10;
    const dmg = lvl * 4;
    const aspd = Math.min(55, lvl * 2);
    this.stats.setText(
      `等级        Lv.${lvl}\n` +
      `生命上限    ${hp}\n` +
      `能量上限    ${energy}\n` +
      `攻击/技能   +${dmg}%\n` +
      `攻击速度    +${aspd}%`
    );
    this.cost.setText(`升级消耗：${upgradeCost} 金币`);
    this.cost.setColor(Store.data.coins >= upgradeCost ? '#ffe9a8' : '#ff9a8a');
    this.wallet.setText(`当前金币：${Store.data.coins}`);
  }

  upgrade() {
    if (!Store.upgradeChar(this.characterId)) {
      Sfx.uiDeny();
      this.msg.setText('金币不足').setColor('#ffb09a');
      this.refresh();
      return;
    }
    Sfx.unlock();
    if (this.gameScene && this.gameScene.applyCharLevelUp) {
      this.gameScene.applyCharLevelUp();
    }
    this.msg.setText('升级成功！生命/能量上限与攻击、技能伤害、攻速已提升').setColor('#9ff0a8');
    this.refresh();
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
