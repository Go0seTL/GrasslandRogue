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
    this.localChar = Store.data.lastChar || 'gunner';
    this.localRing = Store.data.equippedRing || null;
    this.guestChar = 'gunner';
    this.guestRing = null;
    this.guestLevel = 0;
    this.guestSkillLevel = 0;

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

    this.myLoadoutText = this.add.text(480, 172, '', UI.textStyle(11, {
      color: '#dfe8c8', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(4);
    this.guestLoadoutText = this.add.text(480, 194, '', UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
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

    this.loadoutBtn = UI.button(this, 480, 316, 230, 30, '选择角色 / 戒指', () => this.openLoadout(), {
      variant: 'ghost', fontSize: 13,
    }).setDepth(5).setVisible(false);

    this.startBtn = UI.button(this, 480, 370, 230, 46, '开始游戏', () => this.startHostGame(), {
      fontSize: 19,
    }).setDepth(5).setVisible(false);

    UI.button(this, 480, 438, 180, 34, '返 回', () => this.back(), {
      variant: 'ghost', fontSize: 15,
    }).setDepth(5);

    this.add.text(480, 500, '各自选择角色和戒指 · 状态同步 · 不需要自建游戏服务器', UI.textStyle(9, {
      color: '#7f9a6d', strokeThickness: 2, bold: false,
    })).setOrigin(0.5).setDepth(4);

    this.events.once('shutdown', () => {
      this.removeCodeInput();
      if (!this.started && Net.role) Net.close();
    });

    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.refreshLoadout();
    this.cameras.main.fadeIn(260, 6, 12, 6);
  }

  charName(id) {
    const d = CHAR_DEFS.find((x) => x.id === id);
    return d ? d.name : '枪手';
  }

  ringName(id) {
    return id && RINGS[id] ? RINGS[id].name : '无';
  }

  refreshLoadout() {
    if (this.myLoadoutText) {
      this.myLoadoutText.setText(`我的装备：${this.charName(this.localChar)} · ${this.ringName(this.localRing)}`);
    }
    if (this.guestLoadoutText) {
      if (this.mode === 'host') {
        this.guestLoadoutText.setText(this.guestReady
          ? `队友：${this.charName(this.guestChar)} · ${this.ringName(this.guestRing)}`
          : '队友：等待加入');
      } else {
        this.guestLoadoutText.setText('队友：房主（角色由房主选择）');
      }
    }
    if (this.loadoutBtn) this.loadoutBtn.setVisible(!!this.mode);
  }

  sendLoadout() {
    if (this.mode !== 'guest') return;
    Net.send({
      t: 'loadout',
      char: this.localChar,
      ring: this.localRing || null,
      level: Store.getCharLevel(this.localChar),
      skillLevel: Store.getSkillLevel(this.localChar),
    });
  }

  createHost() {
    if (this.mode || this.starting) return;
    this.mode = 'host';
    this.guestReady = false;
    Sfx.uiClick();
    this.hostBtn.setVisible(false);
    this.joinBtn.setVisible(false);
    this.startBtn.setVisible(false);
    this.loadoutBtn.setVisible(true);
    this.refreshLoadout();
    Net.onStatus = (text) => {
      if (this.statusText) this.statusText.setText(text);
    };
    Net.onGuestReady = (ready) => {
      this.guestReady = ready;
      if (this.statusText) {
        this.statusText.setText(ready ? '玩家已加入，可以开始游戏' : '等待玩家加入…');
      }
      this.startBtn.setVisible(ready);
      this.loadoutBtn.setVisible(true);
      this.refreshLoadout();
    };
    Net.onGuestLeft = () => {
      this.guestReady = false;
      if (this.statusText) this.statusText.setText('玩家已离开，继续等待…');
      this.startBtn.setVisible(false);
      this.refreshLoadout();
    };
    Net.onGuestLoadout = (d) => {
      if (!d) return;
      if (d.char && CHAR_DEFS.some((x) => x.id === d.char && x.playable)) this.guestChar = d.char;
      this.guestRing = d.ring && RINGS[d.ring] ? d.ring : null;
      this.guestLevel = Math.max(0, Math.floor(Number(d.level) || 0));
      this.guestSkillLevel = Math.max(0, Math.floor(Number(d.skillLevel) || 0));
      this.refreshLoadout();
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
    this.loadoutBtn.setVisible(true);
    this.refreshLoadout();
    this.statusText.setText('输入房主显示的 6 位房间码');
    const holder = document.getElementById('game') || document.body;
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 6;
    input.placeholder = '房间码';
    input.autocomplete = 'off';
    input.style.cssText = [
      'position:fixed', 'box-sizing:border-box', 'text-align:center',
      'letter-spacing:8px', 'background:#0f180c', 'color:#ffe9a8',
      'border:2px solid #d9b45a', 'border-radius:4px', 'outline:none',
      'z-index:1000', 'font-family:monospace',
    ].join(';');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.joinWithCode(input.value);
    });
    holder.appendChild(input);
    this.codeInput = input;
    this.positionCodeInput();
    this.codeResize = () => this.positionCodeInput();
    window.addEventListener('resize', this.codeResize);
    window.addEventListener('orientationchange', this.codeResize);
    input.focus();
    this.time.delayedCall(120, () => {
      this.confirmJoinBtn = UI.button(this, 480, 330, 180, 38, '确认加入', () => {
        this.joinWithCode(input.value);
      }, { fontSize: 15 }).setDepth(5);
    });
  }

  positionCodeInput() {
    if (!this.codeInput || !this.game || !this.game.canvas) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const sx = rect.width / GAME_W;
    const sy = rect.height / GAME_H;
    this.codeInput.style.left = `${rect.left + 480 * sx - 140 * sx}px`;
    this.codeInput.style.top = `${rect.top + 248 * sy - 22 * sy}px`;
    this.codeInput.style.width = `${280 * sx}px`;
    this.codeInput.style.height = `${44 * sy}px`;
    this.codeInput.style.fontSize = `${Math.max(16, 24 * sy)}px`;
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
      if (text && text.includes('已连接')) this.sendLoadout();
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

  openLoadout() {
    if (this.loadoutOverlay) return;
    const role = this.mode === 'host' ? '房主' : (this.mode === 'guest' ? '客人' : '');
    if (!role) return;
    Sfx.uiClick();
    this.tempChar = this.localChar;
    this.tempRing = this.localRing;
    const root = this.add.container(0, 0).setDepth(6000);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.72).setOrigin(0);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);
    const g = this.add.graphics();
    UI.drawPanel(g, 160, 44, 640, 452, { border: 0xe0bd63, bg: 0x141e0f, alpha: 0.98 });
    root.add([dim, g]);
    root.add(this.add.text(480, 72, '联机装备', UI.textStyle(28, {
      color: '#ffe9a8', strokeThickness: 6,
    })).setOrigin(0.5));
    root.add(this.add.text(480, 98, `${role} · 角色和戒指在开局后不能再换`, UI.textStyle(10, {
      color: '#a9bd8f', strokeThickness: 2, bold: false,
    })).setOrigin(0.5));

    const chars = CHAR_DEFS.filter((d) => d.playable && Store.isUnlocked(d.id));
    if (!chars.some((d) => d.id === this.tempChar)) this.tempChar = chars[0] ? chars[0].id : 'gunner';
    const charCards = [];
    const drawChars = () => {
      charCards.forEach((card) => {
        const sel = card.id === this.tempChar;
        card.g.clear();
        card.g.fillStyle(sel ? 0x243a1c : 0x111a0d, 0.98);
        card.g.fillRect(-44, -32, 88, 64);
        card.g.lineStyle(sel ? 3 : 1, sel ? 0xffd76a : 0x5d7048, 1);
        card.g.strokeRect(-44, -32, 88, 64);
      });
    };
    chars.forEach((def, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = 230 + col * 100;
      const y = 170 + row * 82;
      const c = this.add.container(x, y);
      const cg = this.add.graphics();
      const portrait = this.add.image(-22, -4, def.portrait || 'player_idle').setScale(0.68);
      const name = this.add.text(-2, 16, def.name, UI.textStyle(8, {
        color: '#e8ddb8', strokeThickness: 2, bold: false, shadow: false,
      })).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 88, 64, 0x000000, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        this.tempChar = def.id;
        Sfx.uiClick();
        drawChars();
      });
      c.add([cg, portrait, name, hit]);
      root.add(c);
      charCards.push({ id: def.id, g: cg, c });
    });
    drawChars();

    root.add(this.add.text(190, 292, '戒指', UI.textStyle(12, {
      color: '#dfe8c8', strokeThickness: 2, bold: true, shadow: false,
    })).setOrigin(0, 0.5));
    const ringCards = [];
    const ringDefs = [{ id: null, name: '不戴', color: 0x6f8a5a }]
      .concat(Object.values(RINGS).filter((r) => Store.hasRing(r.id)));
    const drawRings = () => {
      ringCards.forEach((card) => {
        const sel = card.id === this.tempRing;
        card.g.clear();
        card.g.fillStyle(sel ? 0x243a1c : 0x111a0d, 0.98);
        card.g.fillRect(-38, -22, 76, 44);
        card.g.lineStyle(sel ? 3 : 1, sel ? 0xffd76a : card.color, 1);
        card.g.strokeRect(-38, -22, 76, 44);
      });
    };
    ringDefs.forEach((ring, i) => {
      const x = 250 + (i % 7) * 78;
      const y = 344 + Math.floor(i / 7) * 54;
      const c = this.add.container(x, y);
      const cg = this.add.graphics();
      const icon = this.add.image(-22, -2, 'ring_icon').setTint(ring.color).setScale(0.68);
      const name = this.add.text(-4, 1, ring.name, UI.textStyle(8, {
        color: '#e8ddb8', strokeThickness: 2, bold: false, shadow: false,
      })).setOrigin(0, 0.5);
      const hit = this.add.rectangle(0, 0, 76, 44, 0x000000, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        this.tempRing = ring.id;
        Sfx.uiClick();
        drawRings();
      });
      c.add([cg, icon, name, hit]);
      root.add(c);
      ringCards.push({ id: ring.id, g: cg, color: ring.color, c });
    });
    drawRings();

    root.add(UI.button(this, 390, 446, 180, 34, '确 定', () => {
      this.localChar = this.tempChar;
      this.localRing = this.tempRing;
      Store.data.lastChar = this.localChar;
      if (this.localRing) Store.equipRing(this.localRing);
      else Store.unequipRing();
      Store.save();
      this.refreshLoadout();
      if (this.mode === 'guest') this.sendLoadout();
      root.destroy();
      this.loadoutOverlay = null;
    }, { fontSize: 15 }));
    root.add(UI.button(this, 570, 446, 180, 34, '取 消', () => {
      root.destroy();
      this.loadoutOverlay = null;
    }, { variant: 'ghost', fontSize: 15 }));
    this.loadoutOverlay = root;
  }

  startHostGame() {
    if (this.starting || !this.guestReady) return;
    this.starting = true;
    this.started = true;
    Sfx.uiClick();
    Store.data.lastChar = this.localChar;
    Store.save();
    Net.send({ t: 'started' });
    this.scene.start('Game', {
      character: this.localChar,
      guestCharacter: this.guestChar,
      guestRing: this.guestRing,
      guestLevel: this.guestLevel,
      guestSkillLevel: this.guestSkillLevel,
      netHost: true,
    });
  }

  removeCodeInput() {
    if (this.codeResize) {
      window.removeEventListener('resize', this.codeResize);
      window.removeEventListener('orientationchange', this.codeResize);
      this.codeResize = null;
    }
    if (this.codeInput) {
      this.codeInput.remove();
      this.codeInput = null;
    }
  }

  back() {
    if (this.starting) return;
    if (this.loadoutOverlay) {
      this.loadoutOverlay.destroy();
      this.loadoutOverlay = null;
      return;
    }
    Net.close();
    this.scene.start('Menu');
  }
}
