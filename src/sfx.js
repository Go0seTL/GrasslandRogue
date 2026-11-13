/* 用 WebAudio 现场合成音效，不依赖任何音频文件 */

const Sfx = {
  ctx: null,
  master: null,
  musicGain: null,
  noiseBuf: null,
  muted: false,
  musicStarted: false,
  _musicTimer: null,
  _step: 0,
  _nextTime: 0,
  _stepDur: 0.185,
  _bass: [98.00, 98.00, 116.54, 130.81, 98.00, 87.31, 116.54, 130.81],
  _arp: [392.00, 493.88, 587.33, 493.88, 440.00, 523.25, 659.25, 523.25],

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.20;
    this.musicGain.connect(this.master);

    const len = Math.floor(this.ctx.sampleRate * 0.6);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  },

  _tone(freq, dur, opts) {
    if (!this.ctx || this.muted) return;
    const o = opts || {};
    const t = this.ctx.currentTime + (o.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    const vol = Math.max(0.0002, o.vol == null ? 0.07 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.dest || this.master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  },

  _noise(dur, opts) {
    if (!this.ctx || this.muted) return;
    const o = opts || {};
    const t = this.ctx.currentTime + (o.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = o.filterType || 'bandpass';
    filter.frequency.setValueAtTime(o.filter || 1200, t);
    if (o.filterSlide) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.filterSlide), t + dur);
    filter.Q.value = o.q == null ? 0.8 : o.q;
    const g = this.ctx.createGain();
    const vol = Math.max(0.0002, o.vol == null ? 0.08 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(o.dest || this.master);
    src.start(t);
    src.stop(t + dur + 0.04);
  },

  // —— 具体音效 ——
  uiClick() { this._tone(620, 0.045, { type: 'square', vol: 0.035, slide: 760 }); },
  uiDeny() { this._tone(170, 0.12, { type: 'square', vol: 0.05, slide: 110 }); },
  shoot() {
    this._tone(820, 0.05, { type: 'square', vol: 0.045, slide: 150 });
    this._noise(0.035, { filter: 2600, vol: 0.035, q: 0.6 });
  },
  hit() { this._noise(0.045, { filter: 1900, vol: 0.04, q: 1.2 }); },
  enemyDie() {
    const base = 250 + Math.random() * 90;
    this._tone(base, 0.16, { type: 'square', vol: 0.06, slide: 65 });
    this._tone(base * 2.1, 0.08, { type: 'triangle', vol: 0.035, slide: 140 });
    this._noise(0.14, { filter: 900, vol: 0.07, filterType: 'lowpass' });
    this._noise(0.05, { filter: 2800, vol: 0.03 });
  },
  coin() {
    this._tone(1180, 0.05, { type: 'sine', vol: 0.05 });
    this._tone(1760, 0.09, { type: 'sine', vol: 0.04, delay: 0.045 });
  },
  hurt() {
    this._tone(150, 0.22, { type: 'sawtooth', vol: 0.06, slide: 55 });
    this._noise(0.15, { filter: 500, vol: 0.06, filterType: 'lowpass' });
  },
  dash() { this._noise(0.16, { filter: 500, filterSlide: 2600, vol: 0.06, filterType: 'bandpass', q: 1.5 }); },
  bow() { this._tone(500, 0.09, { type: 'triangle', vol: 0.04, slide: 220 }); },
  bossRoar() {
    this._tone(72, 0.65, { type: 'sawtooth', vol: 0.075, slide: 42 });
    this._tone(110, 0.5, { type: 'square', vol: 0.03, slide: 60, delay: 0.05 });
  },
  explosion() {
    this._noise(0.5, { filter: 700, filterSlide: 90, vol: 0.13, filterType: 'lowpass' });
    this._tone(90, 0.35, { type: 'sawtooth', vol: 0.06, slide: 35 });
  },
  portal() {
    this._tone(420, 0.5, { type: 'sine', vol: 0.05, slide: 1000 });
    this._tone(630, 0.35, { type: 'triangle', vol: 0.03, slide: 1400, delay: 0.08 });
  },
  levelClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this._tone(n, 0.14, { type: 'triangle', vol: 0.05, delay: i * 0.08 }));
  },
  heal() {
    this._tone(660, 0.1, { type: 'sine', vol: 0.04 });
    this._tone(880, 0.14, { type: 'sine', vol: 0.035, delay: 0.08 });
  },
  unlock() {
    const notes = [523.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => this._tone(n, 0.18, { type: 'square', vol: 0.035, delay: i * 0.07 }));
  },
  skillStart() {
    this._noise(0.5, { filter: 380, filterSlide: 2600, vol: 0.09, q: 1.4 });
    this._tone(170, 0.42, { type: 'sawtooth', vol: 0.055, slide: 540 });
    this._tone(340, 0.3, { type: 'square', vol: 0.03, slide: 900, delay: 0.05 });
  },
  mg() {
    this._tone(560 + Math.random() * 90, 0.03, { type: 'square', vol: 0.024, slide: 190 });
    this._noise(0.018, { filter: 2400, vol: 0.018, q: 0.7 });
  },
  skillEnd() {
    this._tone(560, 0.22, { type: 'triangle', vol: 0.04, slide: 170 });
    this._noise(0.12, { filter: 1200, vol: 0.03, filterType: 'lowpass' });
  },
  swordSummon() {
    this._tone(300, 0.4, { type: 'triangle', vol: 0.05, slide: 900 });
    this._tone(600, 0.3, { type: 'sine', vol: 0.03, slide: 1400, delay: 0.08 });
    this._noise(0.25, { filter: 3000, vol: 0.03, q: 1.5 });
  },
  swordLaunch() {
    this._noise(0.25, { filter: 500, filterSlide: 4000, vol: 0.06, q: 1.2 });
    this._tone(900, 0.18, { type: 'sawtooth', vol: 0.04, slide: 200 });
  },
  shard() {
    this._tone(880, 0.08, { type: 'triangle', vol: 0.04 });
    this._tone(1320, 0.12, { type: 'sine', vol: 0.032, delay: 0.05 });
  },
  spore() {
    this._tone(320, 0.1, { type: 'sine', vol: 0.04, slide: 180 });
    this._noise(0.08, { filter: 900, vol: 0.03 });
  },
  boar() {
    this._tone(120, 0.25, { type: 'sawtooth', vol: 0.05, slide: 70 });
    this._noise(0.18, { filter: 400, vol: 0.05, filterType: 'lowpass' });
  },
  slash() {
    this._noise(0.09, { filter: 2600, vol: 0.04, q: 1.4 });
    this._tone(720, 0.05, { type: 'triangle', vol: 0.03, slide: 300 });
  },
  ghostSummon() {
    this._tone(520, 0.4, { type: 'sine', vol: 0.04, slide: 980 });
    this._tone(780, 0.3, { type: 'triangle', vol: 0.025, slide: 1200, delay: 0.08 });
  },
  ghostShot() {
    this._tone(980, 0.04, { type: 'sine', vol: 0.025, slide: 520 });
  },
  ghostSave() {
    this._tone(420, 0.5, { type: 'sine', vol: 0.06, slide: 1200 });
    this._noise(0.3, { filter: 1600, filterSlide: 4200, vol: 0.04, q: 1.2 });
  },
  energy() {
    this._tone(520, 0.1, { type: 'sine', vol: 0.04, slide: 880 });
    this._tone(880, 0.12, { type: 'triangle', vol: 0.03, delay: 0.06, slide: 1320 });
  },
  bowDraw() {
    this._tone(260, 0.45, { type: 'triangle', vol: 0.025, slide: 520 });
  },
  bowRelease() {
    this._tone(640, 0.16, { type: 'sawtooth', vol: 0.045, slide: 160 });
    this._noise(0.12, { filter: 2200, filterSlide: 600, vol: 0.05, q: 1.1 });
  },
  giantPunch() {
    this._tone(95, 0.2, { type: 'sawtooth', vol: 0.07, slide: 48 });
    this._noise(0.15, { filter: 520, filterSlide: 140, vol: 0.09, filterType: 'lowpass', q: 0.9 });
    this._tone(360, 0.06, { type: 'square', vol: 0.025, slide: 140 });
  },
  laserCharge() {
    this._tone(520, 0.32, { type: 'sawtooth', vol: 0.035, slide: 1350 });
    this._tone(880, 0.22, { type: 'sine', vol: 0.025, slide: 1700, delay: 0.08 });
  },
  laser() {
    this._tone(1500, 0.22, { type: 'sawtooth', vol: 0.06, slide: 180 });
    this._tone(260, 0.2, { type: 'square', vol: 0.04, slide: 90 });
    this._noise(0.16, { filter: 3600, filterSlide: 500, vol: 0.05, q: 1.4 });
  },
  rockRain() {
    this._tone(70, 0.6, { type: 'sawtooth', vol: 0.06, slide: 45 });
    this._noise(0.5, { filter: 300, filterSlide: 900, vol: 0.06, filterType: 'lowpass', q: 0.8 });
  },

  // —— 背景音乐：简单 8-bit 循环 ——
  startMusic() {
    if (!this.ctx || this.musicStarted) return;
    this.musicStarted = true;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.15;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 90);
  },

  _scheduleMusic() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') return;
    const ahead = 0.4;
    let guard = 0;
    while (this._nextTime < this.ctx.currentTime + ahead && guard < 24) {
      const s = this._step % 32;
      const delay = this._nextTime - this.ctx.currentTime;
      this._playStep(s, delay);
      this._nextTime += this._stepDur;
      this._step++;
      guard++;
    }
  },

  _playStep(s, delay) {
    if (this.muted) return;
    if (s % 4 === 0) {
      const n = this._bass[(s / 4) % 8];
      this._tone(n, 0.24, { type: 'triangle', vol: 0.05, delay, dest: this.musicGain });
      this._tone(n / 2, 0.26, { type: 'sine', vol: 0.05, delay, dest: this.musicGain });
    }
    if (s % 2 === 0) {
      const n = this._arp[(s / 2) % 8];
      const soft = s % 8 === 0 ? 0.026 : 0.017;
      this._tone(n, 0.11, { type: 'square', vol: soft, delay, dest: this.musicGain });
    }
    if (s % 8 === 4) {
      this._noise(0.03, { filter: 5200, vol: 0.012, delay, dest: this.musicGain, q: 0.7 });
    }
  },
};
