class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    this.starting = false;
    this.started = false;
    this.mode = null;
    this.guestReady = false;
    this.codeInput = null;

    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x071008, 0.7).setOrigin(0).setDepth(1);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(2);

    const g = this.add.graphics().setDepth(3);
    UI.drawPanel(g, 150, 78, 660, 388, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.97 });

    this.add.text(480, 112, '房 间 码 联 机', UI.textStyle(34, {
      color: '#ffe9a8', strokeThickness: 8,
    })).setOrigin(0.5).setDepth(4);
    this.add.text(480, 144, '双人合作通关 · 房主创建房间，客人输入房间码加入', UI.textStyle(11, {
      color: '#a9bd8f', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(4);

    this.add.text(480, 174, `房主角色：${(CHAR_DEFS.find((d) => d.id === (Store.data.lastChar || 'gunner')) || CHAR_DEFS[0]).name}`, UI.textStyle(11, {
      color: '#dfe8c8', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(4);

    this.codeText = this.add.text(480, 216, '', UI.textStyle(24, {
      color: '#9fe8ff', strokeThickness: 5,
    })).setOrigin(0.5).setDepth(4);

    this.statusText = this.add.text(480, 278, '创建房间，或输入房主的房间码加入', UI.textStyle(13, {
      color: '#dfe8c8', strokeThickness: 3, bold: false,
    })).setOrigin(0.5).setDepth(4);
    this.statusText.setWordWrapWidth(520);

    this.hostBtn = UI.button(this, 330, 230, 200, 48, '创建房间', () => this.createHost(), {
      fontSize: 19,
    }).setDepth(5);
    this.joinBtn = UI.button(this, 630, 230, 200, 48, '加入房间', () => this.showJoinInput(), {
      variant: 'ghost', fontSize: 19,
    }).setDepth(5);

    this.startBtn = UI.button(this, 480, 350, 230, 48, '开始游戏', () => this.startHostGame(), {
      fontSize: 19,
    }).setDepth(5).setVisible(false);

    UI.button(this, 480, 430, 180, 36, '返 回', () => this.back(), {
      variant: 'ghost', fontSize: 15,
    }).setDepth(5);

    this.add.text(480, 500, 'PeerJS 公共信令 · 需要双方都能访问互联网 · 房主画面会共享给客人', UI.textStyle(9, {
      color: '#7f9a6d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(4);

    this.events.once('shutdown', () => {
      this.removeCodeInput();
      if (!this.started && Net.role) Net.close();
    });

    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.cameras.main.fadeIn(260, 6, 12, 6);
  }

  createHost() {
    if (this.mode || this.starting) return;
    this.mode = 'host';
    this.guestReady = false;
    Sfx.uiClick();
    this.hostBtn.setVisible(false);
    this.joinBtn.setVisible(false);
    this.startBtn.setVisible(false);
    Net.onStatus = (text) => {
      if (this.statusText) this.statusText.setText(text);
    };
    Net.onGuestReady = (ready) => {
      this.guestReady = ready;
      if (this.statusText) {
        this.statusText.setText(ready ? '玩家已加入，可以开始游戏' : '等待玩家加入…');
      }
      this.startBtn.setVisible(ready);
    };
    Net.onGuestLeft = () => {
      this.guestReady = false;
      if (this.statusText) this.statusText.setText('玩家已离开，继续等待…');
      this.startBtn.setVisible(false);
    };
    this.codeText.setText('房间码：正在生成…');
    Net.initHost();
    this.time.delayedCall(100, () => {
      if (Net.code && this.codeText) this.codeText.setText(`房间码：${Net.code}`);
    });
  }

  showJoinInput() {
    if (this.mode || this.starting) return;
    this.mode = 'guest';
    Sfx.uiClick();
    this.hostBtn.setVisible(false);
    this.joinBtn.setVisible(false);
    this.statusText.setText('输入房主显示的 6 位房间码');
    const holder = document.getElementById('game') || document.body;
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 6;
    input.placeholder = '房间码';
    input.autocomplete = 'off';
    input.style.cssText = [
      'position:fixed', 'left:50%', 'top:54%', 'transform:translate(-50%,-50%)',
      'width:220px', 'height:44px', 'font-size:24px', 'text-align:center',
      'letter-spacing:8px', 'background:#0f180c', 'color:#ffe9a8',
      'border:2px solid #d9b45a', 'border-radius:4px', 'outline:none',
      'z-index:1000', 'font-family:monospace',
    ].join(';');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.joinWithCode(input.value);
    });
    holder.appendChild(input);
    this.codeInput = input;
    input.focus();
    this.time.delayedCall(120, () => {
      this.confirmJoinBtn = UI.button(this, 480, 330, 180, 38, '确认加入', () => {
        this.joinWithCode(input.value);
      }, { fontSize: 15 }).setDepth(5);
    });
  }

  joinWithCode(value) {
    const code = String(value || '').trim();
    if (!/^\d{6}$/.test(code)) {
      this.statusText.setText('请输入 6 位数字房间码');
      Sfx.uiDeny();
      return;
    }
    this.removeCodeInput();
    if (this.confirmJoinBtn) { this.confirmJoinBtn.destroy(); this.confirmJoinBtn = null; }
    this.statusText.setText('正在连接房主…');
    Net.onStatus = (text) => {
      if (this.statusText) this.statusText.setText(text);
    };
    Net.onStarted = () => {
      if (this.started) return;
      this.started = true;
      this.starting = true;
      this.scene.start('Guest');
    };
    Net.onEnded = (reason) => {
      if (this.statusText) this.statusText.setText(reason || '房主结束了游戏');
    };
    Net.onStream = (stream) => {
      this.remoteStream = stream;
    };
    Net.initGuest(code);
  }

  startHostGame() {
    if (this.starting || !this.guestReady) return;
    this.starting = true;
    this.started = true;
    Sfx.uiClick();
    Net.send({ t: 'started' });
    this.scene.start('Game', {
      character: Store.data.lastChar || 'gunner',
      netHost: true,
    });
  }

  removeCodeInput() {
    if (this.codeInput) {
      this.codeInput.remove();
      this.codeInput = null;
    }
  }

  back() {
    if (this.starting) return;
    Net.close();
    this.scene.start('Menu');
  }
}
