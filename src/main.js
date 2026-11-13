/* 启动入口 */

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0b120a',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scene: [
    BootScene,
    MenuScene,
    CharacterSelectScene,
    GameScene,
    UIScene,
    PauseScene,
    GameOverScene,
    BestiaryScene,
    ForgeScene,
    UpgradeScene,
  ],
};

const game = new Phaser.Game(gameConfig);
window.__GAME__ = game;

function unlockAudio() {
  Sfx.init();
  Sfx.setMuted(!!Store.data.muted);
  Sfx.startMusic();
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// 切后台 / 关闭页面时把金币、碎片等脏数据立即落盘
window.addEventListener('pagehide', () => Store.flush());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Store.flush();
});
