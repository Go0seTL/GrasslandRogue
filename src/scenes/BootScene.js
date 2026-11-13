class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    Store.load();
    Sfx.muted = !!Store.data.muted;
    Art.build(this);
    this.scene.start('Menu');
  }
}
