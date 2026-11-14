class GuestScene extends Phaser.Scene {
  constructor() {
    super('Guest');
  }

  create() {
    this.ended = false;
    this.keys = {};
    this.moveTouch = null;
    this.aimTouch = null;
    this.aimX = null;
    this.aimY = null;
    this.aimSet = false;
    this.fire = false;
    this.inputTimer = null;
    this.overlay = null;
    this.video = null;
    this.status = null;

    this.showOverlay();

    Net.onStream = (stream) => this.attachStream(stream);
    Net.onEnded = (reason) => this.showEnded(reason);
    Net.onStatus = (text) => {
      if (this.status) this.status.textContent = text;
    };
    if (Net.remoteStream) this.attachStream(Net.remoteStream);
    if (Net.conn && !Net.conn.open) this.showEnded('与房主断开连接');

    this.inputTimer = setInterval(() => this.sendInput(), 33);
    this.events.once('shutdown', () => this.cleanup());
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  showOverlay() {
    this.game.canvas.style.display = 'none';
    const root = document.createElement('div');
    root.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:900', 'background:#050805',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-family:"Microsoft YaHei","PingFang SC",sans-serif', 'color:#e8d9a8',
      'touch-action:none', 'user-select:none', 'overflow:hidden',
    ].join(';');

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;display:block;';
    root.appendChild(video);

    const top = document.createElement('div');
    top.style.cssText = [
      'position:absolute', 'left:14px', 'top:12px', 'right:14px',
      'display:flex', 'justify-content:space-between', 'align-items:center',
      'pointer-events:none', 'text-shadow:0 2px 0 #000',
    ].join(';');
    const title = document.createElement('div');
    title.textContent = `联机合作 · 房间 ${Net.code || ''}`;
    title.style.cssText = 'font-size:14px;color:#ffe9a8;font-weight:700;';
    const status = document.createElement('div');
    status.textContent = '等待房主画面…';
    status.style.cssText = 'font-size:12px;color:#9fe8ff;';
    top.appendChild(title);
    top.appendChild(status);
    root.appendChild(top);

    const controls = document.createElement('div');
    controls.style.cssText = [
      'position:absolute', 'right:16px', 'bottom:16px', 'display:flex',
      'gap:8px', 'pointer-events:auto',
    ].join(';');
    const makeBtn = (label, action) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = [
        'min-width:64px', 'height:44px', 'border:2px solid #d9b45a',
        'background:rgba(23,35,18,.92)', 'color:#ffe9a8', 'font-size:14px',
        'font-weight:700', 'border-radius:4px', 'padding:0 10px',
        'touch-action:none',
      ].join(';');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (action === 'exit') this.exitToMenu();
        else this.sendAction(action);
      });
      controls.appendChild(b);
      return b;
    };
    makeBtn('技能', 'skill');
    makeBtn('翻滚', 'dash');
    makeBtn('切枪', 'switch');
    makeBtn('退出', 'exit');
    root.appendChild(controls);

    const help = document.createElement('div');
    help.textContent = '键鼠：WASD 移动 / 鼠标瞄准 / 左键开火 / E 技能 / 空格翻滚 / Q 切枪　手机：左半屏移动、右半屏瞄准开火、右下按钮';
    help.style.cssText = [
      'position:absolute', 'left:14px', 'bottom:12px', 'right:260px',
      'font-size:11px', 'color:#b9cba0', 'text-shadow:0 2px 0 #000',
      'pointer-events:none',
    ].join(';');
    root.appendChild(help);

    document.body.appendChild(root);
    this.overlay = root;
    this.video = video;
    this.status = status;
    this.attachPointer(root);
  }

  attachPointer(root) {
    const mapPoint = (clientX, clientY) => {
      const r = this.video.getBoundingClientRect();
      const vw = this.video.videoWidth || 960;
      const vh = this.video.videoHeight || 540;
      const scale = Math.min(r.width / vw, r.height / vh);
      const cw = vw * scale;
      const ch = vh * scale;
      const ox = r.left + (r.width - cw) / 2;
      const oy = r.top + (r.height - ch) / 2;
      return {
        x: Math.max(0, Math.min(960, (clientX - ox) / scale)),
        y: Math.max(0, Math.min(540, (clientY - oy) / scale)),
        left: clientX - r.left,
        top: clientY - r.top,
        width: r.width,
      };
    };

    root.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.tagName === 'BUTTON') return;
      const pt = mapPoint(e.clientX, e.clientY);
      if (e.pointerType === 'touch') {
        if (pt.left < pt.width / 2) {
          this.moveTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0 };
        } else {
          this.aimTouch = { id: e.pointerId, baseX: e.clientX, baseY: e.clientY, dx: 0, dy: 0 };
          this.fire = true;
          this.aimX = pt.x;
          this.aimY = pt.y;
          this.aimSet = true;
        }
      } else {
        this.fire = true;
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
      }
      e.preventDefault();
    });
    root.addEventListener('pointermove', (e) => {
      const pt = mapPoint(e.clientX, e.clientY);
      if (this.moveTouch && this.moveTouch.id === e.pointerId) {
        this.moveTouch.dx = e.clientX - this.moveTouch.baseX;
        this.moveTouch.dy = e.clientY - this.moveTouch.baseY;
      }
      if (this.aimTouch && this.aimTouch.id === e.pointerId) {
        this.aimTouch.dx = e.clientX - this.aimTouch.baseX;
        this.aimTouch.dy = e.clientY - this.aimTouch.baseY;
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
        this.fire = true;
      } else if (e.pointerType !== 'touch') {
        this.aimX = pt.x;
        this.aimY = pt.y;
        this.aimSet = true;
      }
    });
    const release = (e) => {
      if (this.moveTouch && this.moveTouch.id === e.pointerId) this.moveTouch = null;
      if (this.aimTouch && this.aimTouch.id === e.pointerId) {
        this.aimTouch = null;
        this.fire = false;
      } else if (e.pointerType !== 'touch') {
        this.fire = false;
      }
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') this.fire = false;
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown = (e) => {
      const k = e.code;
      this.keys[k] = true;
      if (k === 'KeyE') this.sendAction('skill');
      if (k === 'Space') { e.preventDefault(); this.sendAction('dash'); }
      if (k === 'KeyQ') this.sendAction('switch');
      if (k === 'Escape') this.exitToMenu();
    });
    window.addEventListener('keyup', this.onKeyUp = (e) => { this.keys[e.code] = false; });
  }

  sendInput() {
    if (this.ended) return;
    let mx = 0, my = 0;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) my -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my += 1;
    if (this.moveTouch) {
      mx = this.moveTouch.dx / 60;
      my = this.moveTouch.dy / 60;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    Net.send({
      t: 'input',
      moveX: mx,
      moveY: my,
      fire: !!this.fire,
      aimX: this.aimSet ? this.aimX : null,
      aimY: this.aimSet ? this.aimY : null,
    });
  }

  sendAction(key) {
    if (this.ended) return;
    Net.send({ t: 'action', key });
  }

  attachStream(stream) {
    if (!this.video || !stream) return;
    try {
      this.video.srcObject = stream;
      this.video.play().catch(() => {});
      if (this.status) this.status.textContent = '画面已连接';
    } catch (e) { /* ignore */ }
  }

  showEnded(reason) {
    this.ended = true;
    this.fire = false;
    if (this.status) this.status.textContent = reason || '房主结束了游戏';
    if (this.overlay) {
      const mask = document.createElement('div');
      mask.style.cssText = [
        'position:absolute', 'inset:0', 'background:rgba(4,8,4,.72)',
        'display:flex', 'flex-direction:column', 'align-items:center',
        'justify-content:center', 'gap:16px', 'z-index:5',
      ].join(';');
      const t = document.createElement('div');
      t.textContent = reason || '联机已结束';
      t.style.cssText = 'font-size:22px;color:#ffb09a;font-weight:700;';
      const b = document.createElement('button');
      b.textContent = '返回主菜单';
      b.style.cssText = 'min-width:160px;height:44px;border:2px solid #d9b45a;background:#23301f;color:#ffe9a8;font-size:16px;font-weight:700;border-radius:4px;';
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.exitToMenu(); });
      mask.appendChild(t);
      mask.appendChild(b);
      this.overlay.appendChild(mask);
    }
  }

  exitToMenu() {
    if (this.leaving) return;
    this.leaving = true;
    Net.close();
    this.cleanup();
    this.scene.start('Menu');
  }

  cleanup() {
    if (this.inputTimer) {
      clearInterval(this.inputTimer);
      this.inputTimer = null;
    }
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    this.onKeyDown = null;
    this.onKeyUp = null;
    if (this.overlay && this.overlay.parentNode) this.overlay.remove();
    this.overlay = null;
    this.video = null;
    if (this.game && this.game.canvas) this.game.canvas.style.display = '';
  }
}
