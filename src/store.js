/* 本地存档：金币、解锁、静音、最佳进度 */

const Store = {
  data: {
    coins: 0,
    unlocked: ['gunner'],
    ownedWeapons: ['pistol', 'knife'],
    fragments: {},
    ringFragments: {},
    ownedRings: [],
    equippedRing: null,
    charLevels: {},
    skillLevels: {},
    swordsmanPurchased: false,
    muted: false,
    autoFire: false,
    activationUsed: false,
    superActivationUsed: false,
    best: null,
    lastChar: 'gunner',
    runs: 0,
    totalKills: 0,
    demonHearts: 0,
    runCheckpoint: null,
  },
  _dirty: false,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign(this.data, parsed || {});
      }
    } catch (e) {
      console.warn('存档读取失败，使用默认存档', e);
    }
    if (!Array.isArray(this.data.unlocked)) this.data.unlocked = ['gunner'];
    if (!this.data.unlocked.includes('gunner')) this.data.unlocked.push('gunner');
    // 剑客改为金币解锁：旧存档里免费获得的剑客需要购买或使用全解锁激活码才保留
    if (!this.data.swordsmanPurchased && !this.data.superActivationUsed) {
      this.data.unlocked = this.data.unlocked.filter((id) => id !== 'swordsman');
    }
    if (!Array.isArray(this.data.ownedWeapons)) this.data.ownedWeapons = ['pistol', 'knife'];
    if (!this.data.ownedWeapons.includes('pistol')) this.data.ownedWeapons.push('pistol');
    if (!this.data.ownedWeapons.includes('knife')) this.data.ownedWeapons.push('knife');
    if (!this.data.fragments || typeof this.data.fragments !== 'object') this.data.fragments = {};
    if (!this.data.ringFragments || typeof this.data.ringFragments !== 'object') this.data.ringFragments = {};
    if (!Array.isArray(this.data.ownedRings)) this.data.ownedRings = [];
    if (this.data.equippedRing && !this.data.ownedRings.includes(this.data.equippedRing)) this.data.equippedRing = null;
    Object.keys(WEAPONS).forEach((id) => {
      if (WEAPONS[id].quality === 'white') return;
      if (typeof this.data.fragments[id] !== 'number') this.data.fragments[id] = 0;
    });
    if (!this.data.charLevels || typeof this.data.charLevels !== 'object') this.data.charLevels = {};
    if (!this.data.skillLevels || typeof this.data.skillLevels !== 'object') this.data.skillLevels = {};
    CHAR_DEFS.forEach((def) => {
      if (typeof this.data.charLevels[def.id] !== 'number') this.data.charLevels[def.id] = 0;
      if (typeof this.data.skillLevels[def.id] !== 'number') this.data.skillLevels[def.id] = 0;
    });
    this.data.coins = Math.max(0, Number(this.data.coins) || 0);
    this.data.demonHearts = Math.max(0, Number(this.data.demonHearts) || 0);
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this._dirty = false;
    } catch (e) {
      console.warn('存档写入失败', e);
    }
  },

  addCoins(n) {
    this.data.coins += n;
    this._dirty = true;
    return this.data.coins;
  },

  flush() {
    if (this._dirty) this.save();
  },

  isUnlocked(id) {
    return this.data.unlocked.includes(id);
  },

  addRingFragment(id, amount) {
    if (!this.data.ringFragments) this.data.ringFragments = {};
    this.data.ringFragments[id] = (this.data.ringFragments[id] || 0) + amount;
    this._dirty = true;
    return this.data.ringFragments[id];
  },

  hasRing(id) {
    return this.data.ownedRings.includes(id);
  },

  craftRing(id) {
    const ring = RINGS[id];
    if (!ring) return false;
    if (this.hasRing(id)) return true;
    const have = this.data.ringFragments[id] || 0;
    if (have < ring.fragReq) return false;
    this.data.ringFragments[id] = have - ring.fragReq;
    this.data.ownedRings.push(id);
    this.save();
    return true;
  },

  equipRing(id) {
    if (!id || !this.hasRing(id)) return false;
    this.data.equippedRing = id;
    this.save();
    return true;
  },

  unequipRing() {
    this.data.equippedRing = null;
    this.save();
  },

  loseRingOnDeath() {
    const id = this.data.equippedRing;
    if (!id) return;
    this.data.equippedRing = null;
    this.data.ownedRings = this.data.ownedRings.filter((r) => r !== id);
    this.save();
  },

  addFragment(id, amount) {
    if (!this.data.fragments) this.data.fragments = {};
    this.data.fragments[id] = (this.data.fragments[id] || 0) + amount;
    this._dirty = true;
    return this.data.fragments[id];
  },

  hasWeapon(id) {
    return this.data.ownedWeapons.includes(id);
  },

  getCharLevel(id) {
    if (!this.data.charLevels) this.data.charLevels = {};
    return this.data.charLevels[id] || 0;
  },

  charUpgradeCost(id) {
    return 100 + this.getCharLevel(id) * 60;
  },

  upgradeChar(id) {
    const cost = this.charUpgradeCost(id);
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.data.charLevels[id] = this.getCharLevel(id) + 1;
    this.save();
    return true;
  },

  getSkillLevel(id) {
    if (!this.data.skillLevels) this.data.skillLevels = {};
    return this.data.skillLevels[id] || 0;
  },

  skillUpgradeCost(id) {
    return SKILL_UPGRADE.baseCost + this.getSkillLevel(id) * SKILL_UPGRADE.costPerLevel;
  },

  upgradeSkill(id) {
    const cost = this.skillUpgradeCost(id);
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.data.skillLevels[id] = this.getSkillLevel(id) + 1;
    this.save();
    return true;
  },

  updateBest(round, stage, kills) {
    const cur = this.data.best;
    const idx = levelIndex(round, stage);
    if (!cur || idx > levelIndex(cur.round, cur.stage)) {
      this.data.best = { round, stage, kills: kills || 0, at: Date.now() };
      this._dirty = true;
    } else if (cur && (kills || 0) > (cur.kills || 0)) {
      cur.kills = kills;
      this._dirty = true;
    }
  },

  markRunFinished(round, stage, kills) {
    this.data.runs = (this.data.runs || 0) + 1;
    this.data.totalKills = (this.data.totalKills || 0) + (kills || 0);
    this.updateBest(round, stage, kills);
    this.save();
  },

  toggleMute() {
    this.data.muted = !this.data.muted;
    this.save();
    return this.data.muted;
  },

  toggleAutoFire() {
    this.data.autoFire = !this.data.autoFire;
    this.save();
    return this.data.autoFire;
  },
};
