/* 房间码联机：PeerJS 公共信令 + 房主权威 + 房主画面共享 */

const Net = {
  peer: null,
  conn: null,
  mediaCall: null,
  role: null,
  code: null,
  guestPeerId: null,
  remoteStream: null,
  onStatus: null,
  onGuestReady: null,
  onGuestLeft: null,
  onInput: null,
  onAction: null,
  onStarted: null,
  onEnded: null,
  onStream: null,
  onHud: null,
  onState: null,
  onWait: null,

  peerIdFor(code) {
    return `leshen-gunner-${code}`;
  },

  initHost() {
    this.closePeer(false);
    this.role = 'host';
    this.code = String(Math.floor(100000 + Math.random() * 900000));
    const peer = new Peer(this.peerIdFor(this.code), { debug: 0 });
    this.peer = peer;
    this.status('正在创建房间…');
    peer.on('open', () => {
      this.status(`房间已创建：${this.code}`);
    });
    peer.on('connection', (conn) => {
      if (this.conn) {
        conn.close();
        return;
      }
      this.conn = conn;
      this.guestPeerId = conn.peer;
      conn.on('open', () => {
        this.status('玩家已加入，可以开始游戏');
        if (this.onGuestReady) this.onGuestReady(true);
      });
      conn.on('data', (data) => this.handleData(data));
      conn.on('close', () => {
        this.conn = null;
        this.guestPeerId = null;
        this.status('玩家已离开');
        if (this.onGuestReady) this.onGuestReady(false);
        if (this.onGuestLeft) this.onGuestLeft();
      });
      conn.on('error', () => this.status('玩家连接出错'));
    });
    peer.on('error', (err) => {
      this.status(`房间错误：${err.type || err.message || 'unknown'}`);
    });
  },

  initGuest(code) {
    this.closePeer(false);
    this.role = 'guest';
    this.code = String(code || '').trim();
    const peer = new Peer({ debug: 0 });
    this.peer = peer;
    this.status('正在连接房间…');
    peer.on('open', () => {
      const conn = peer.connect(this.peerIdFor(this.code), { reliable: true });
      this.conn = conn;
      conn.on('open', () => this.status('已连接，等待房主开始'));
      conn.on('data', (data) => this.handleData(data));
      conn.on('close', () => {
        this.status('与房主断开连接');
        if (this.onEnded) this.onEnded('房主已断开连接');
      });
      conn.on('error', () => this.status('加入房间失败'));
    });
    peer.on('call', (call) => {
      this.mediaCall = call;
      call.answer();
      call.on('stream', (stream) => {
        this.remoteStream = stream;
        if (this.onStream) this.onStream(stream);
      });
    });
    peer.on('error', (err) => {
      this.status(`连接错误：${err.type || err.message || 'unknown'}`);
    });
  },

  handleData(data) {
    if (!data || typeof data !== 'object') return;
    if (this.role === 'host') {
      if (data.t === 'input' && this.onInput) this.onInput(data);
      else if (data.t === 'action' && this.onAction) this.onAction(data);
      else if (data.t === 'leave' && this.onGuestLeft) this.onGuestLeft();
      return;
    }
    if (this.role === 'guest') {
      if (data.t === 'started' && this.onStarted) this.onStarted();
      else if (data.t === 'hud' && this.onHud) this.onHud(data);
      else if (data.t === 'state' && this.onState) this.onState(data);
      else if (data.t === 'wait' && this.onWait) this.onWait(data.text || '房主正在操作');
      else if (data.t === 'ended' && this.onEnded) this.onEnded(data.reason || '房主结束了游戏');
    }
  },

  send(data) {
    try {
      if (this.conn && this.conn.open) this.conn.send(data);
    } catch (e) { /* ignore */ }
  },

  startHostStream(canvas) {
    if (this.role !== 'host' || !this.peer || !this.guestPeerId) return false;
    this.send({ t: 'started' });
    if (this.mediaCall) return true;
    try {
      const stream = canvas.captureStream(60);
      const track = stream.getVideoTracks()[0];
      if (track) {
        try { track.contentHint = 'detail'; } catch (e) { /* ignore */ }
        try { track.applyConstraints({ frameRate: 60 }).catch(() => {}); } catch (e) { /* ignore */ }
      }
      this.mediaCall = this.peer.call(this.guestPeerId, stream);
      this.boostVideoSender();
      return true;
    } catch (e) {
      this.status('画面共享启动失败');
      return false;
    }
  },

  boostVideoSender() {
    const apply = () => {
      try {
        const pc = this.mediaCall && this.mediaCall.peerConnection;
        if (!pc) return false;
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (!sender || !sender.getParameters) return false;
        const params = sender.getParameters();
        if (!params.encodings || !params.encodings.length) params.encodings = [{}];
        params.encodings[0].maxFramerate = 60;
        params.encodings[0].maxBitrate = 8000000;
        params.encodings[0].scaleResolutionDownBy = 1;
        if ('degradationPreference' in params) params.degradationPreference = 'maintain-resolution';
        const p = sender.setParameters(params);
        if (p && p.catch) p.catch(() => {});
        return true;
      } catch (e) {
        return false;
      }
    };
    if (!apply()) {
      setTimeout(apply, 600);
      setTimeout(apply, 1600);
    }
  },

  status(text) {
    if (this.onStatus) this.onStatus(text);
  },

  closePeer(sendEnded) {
    if (sendEnded) {
      try { this.send({ t: 'ended', reason: '房主结束了游戏' }); } catch (e) { /* ignore */ }
    }
    if (this.mediaCall) {
      try { this.mediaCall.close(); } catch (e) { /* ignore */ }
      this.mediaCall = null;
    }
    if (this.remoteStream) {
      try { this.remoteStream.getTracks().forEach((t) => t.stop()); } catch (e) { /* ignore */ }
      this.remoteStream = null;
    }
    if (this.conn) {
      try { this.conn.close(); } catch (e) { /* ignore */ }
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) { /* ignore */ }
      this.peer = null;
    }
    this.role = null;
    this.code = null;
    this.guestPeerId = null;
  },

  close() {
    this.closePeer(this.role === 'host');
  },
};
