/* 玩家、敌人与 Boss */

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character, levelOverride) {
    const isSword = character === 'swordsman';
    const isFrankenstein = character === 'frankenstein';
    const isMage = character === 'mage';
    const isGuitarist = character === 'guitarist';
    const isDemon = character === 'demon';
    const isVampire = character === 'vampire';
    const heroArt = {
      swordsman: ['swordsman_idle', 'swordsman_walk', 'swordsman_walk'],
      frankenstein: ['frankenstein_idle', 'frankenstein_walk', 'frankenstein_walk'],
      mage: ['mage_0', 'mage_1', 'mage_walk'],
      guitarist: ['guitarist_0', 'guitarist_1', 'guitarist_walk'],
      demon: ['demon_0', 'demon_1', 'demon_walk'],
      vampire: ['vampire_0', 'vampire_1', 'vampire_walk'],
      knight: ['knight_0', 'knight_1', 'knight_walk'],
      ranger: ['ranger_0', 'ranger_1', 'ranger_walk'],
      rogue: ['rogue_0', 'rogue_1', 'rogue_walk'],
      alchemist: ['alchemist_0', 'alchemist_1', 'alchemist_walk'],
    }[character] || ['player_idle', 'player_walk', 'player_walk'];
    const idle = heroArt[0];
    super(scene, x, y, idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(18, 12, false);
    this.body.setOffset(9, 26);

    this.characterId = character || 'gunner';
    this.idleTexture = idle;
    this.walkTexture = heroArt[1];
    this.walkAnim = heroArt[2];
    this.giant = false;
    this.networkGuest = false;
    this.networkWeapon = null;
    this.axeChanneling = false;
    this.axeChanneled = false;
    this.axeChannelStart = 0;
    this.tridentChanneling = false;
    this.tridentThrown = false;
    this.tridentChannelStart = 0;

    const charLevel = typeof levelOverride === 'number' ? levelOverride : (scene.charLevel || 0);
    this.maxHp = BALANCE.playerHP + charLevel * CHAR_UPGRADE.hpPerLevel;
    this.hp = this.maxHp;
    this.maxEnergy = BALANCE.playerEnergy + charLevel * CHAR_UPGRADE.energyPerLevel;
    this.energy = this.maxEnergy;
    this.isDead = false;
    this.aimAngle = 0;
    this.lastMoveAngle = 0;
    this.invulnUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.nextShotAt = 0;
    this.moving = false;
    this.charging = false;
    this.chargeStart = 0;
    this.chargeAim = 0;
    this.chargeRatio = 0;
    this.chargeFx = null;

    this.secondaryNextShotAt = 0;
    this.shadow = scene.add.image(x, y + 19, 'shadow').setAlpha(0.30);
    this.gun = scene.add.image(x, y, (WEAPONS[scene.weaponId] || WEAPONS.pistol).texture)
      .setOrigin(0.22, 0.5);
    this.secondaryGun = scene.add.image(x, y, 'gun').setOrigin(0.22, 0.5).setVisible(false);
    this.setDepth(y + 20);
    this.shadow.setDepth(y + 18);
    this.gun.setDepth(y + 21);

    if (isSword) {
      this.backSword = scene.add.image(x, y, 'back_sword')
        .setOrigin(0.5, 0.5)
        .setRotation(-0.65)
        .setDepth(y + 19);
    }
  }

  refreshScale() {
    const base = (this.scene.buffs && this.scene.buffs.size) || 1;
    this.setScale(this.giant ? base * GIANT.scale : base);
    if (this.shadow) {
      this.shadow.setScale(this.giant ? base * 1.7 : base);
    }
    if (this.backSword) this.backSword.setScale(base);
  }

  isDemonActive() {
    return !!(this.scene.skill && this.scene.skill.active && this.scene.skill.type === 'demon');
  }

  demonDamageMul() {
    return this.isDemonActive() ? 1.4 : 1;
  }

  setGiantForm(active) {
    if (this.giant === active) return;
    if (active) { this.cancelAxeChannel(); this.cancelTridentChannel(); }
    this.giant = active;
    if (active) {
      this.idleTexture = 'frankenstein_giant_0';
      this.walkTexture = 'frankenstein_giant_1';
      this.walkAnim = 'frankenstein_giant_walk';
      this.setTexture(this.idleTexture);
      if (this.gun) this.gun.setVisible(false);
      if (this.secondaryGun) this.secondaryGun.setVisible(false);
      this.nextShotAt = this.scene.time.now + 220;
    } else {
      this.idleTexture = 'frankenstein_idle';
      this.walkTexture = 'frankenstein_walk';
      this.walkAnim = 'frankenstein_walk';
      this.setTexture(this.idleTexture);
      if (this.gun) this.gun.setVisible(true);
    }
    this.refreshScale();
  }

  giantPunch(aim, time) {
    const scene = this.scene;
    const buffs = scene.buffs || {};
    this.nextShotAt = time + Math.max(360, GIANT.attackInterval * (buffs.fireRate || 1));
    const fakeWeapon = {
      damage: GIANT.damage,
      range: GIANT.range,
      arc: GIANT.arc,
      quality: 'green',
      skillFactor: scene.skillFactor ? scene.skillFactor() : 1,
    };
    scene.meleeAttack(this, aim, fakeWeapon);
    const px = this.x + Math.cos(aim) * GIANT.range * 0.55;
    const py = this.y - 8 + Math.sin(aim) * GIANT.range * 0.55;
    const fist = scene.add.image(px, py, 'giant_fist')
      .setDepth(731).setRotation(aim).setScale(1.0);
    scene.tweens.add({
      targets: fist,
      x: this.x + Math.cos(aim) * GIANT.range * 0.82,
      y: this.y - 8 + Math.sin(aim) * GIANT.range * 0.82,
      alpha: 0,
      scale: 1.35,
      duration: 150,
      onComplete: () => fist.destroy(),
    });
    scene.fx.ring(px, py, 0x8fff5a, 0.18, 1.25, 230, 0.75, 730);
    scene.fx.dust.explode(4, this.x, this.y + 18);
    scene.cameras.main.shake(70, 0.0035);
    Sfx.giantPunch();
  }

  cancelAxeChannel() {
    if (!this.axeChanneling) return;
    this.axeChanneling = false;
    this.axeChanneled = false;
    this.clearTint();
  }

  cancelTridentChannel() {
    if (!this.tridentChanneling) return;
    this.tridentChanneling = false;
    this.tridentThrown = false;
    this.clearTint();
  }

  updateDemonTrident(time, aim, firing, w) {
    const scene = this.scene;
    if (firing) {
      if (!this.tridentChanneling) {
        this.tridentChanneling = true;
        this.tridentChannelStart = time;
        this.tridentThrown = false;
        this.setTint(0xff8ae8);
      }
      if (!this.tridentThrown && time - this.tridentChannelStart >= 550) {
        if (this.spendEnergy(w.energyCost)) {
          this.tridentThrown = true;
          this.nextShotAt = time + 1200;
          scene.throwDemonTrident(this, aim, w);
        } else {
          this.tridentThrown = true;
          this.nextShotAt = time + 500;
          scene.onEnergyDenied();
        }
      }
    } else if (this.tridentChanneling) {
      const held = time - this.tridentChannelStart;
      if (!this.tridentThrown && held < 550) {
        if (this.spendEnergy(w.energyCost)) {
          scene.meleeAttack(this, aim, w);
          Sfx.slash();
          this.nextShotAt = time + w.fireRate * 1000;
        } else {
          scene.onEnergyDenied();
        }
      }
      this.tridentChanneling = false;
      this.tridentThrown = false;
      this.clearTint();
    }
  }

  updateBoarAxe(time, aim, firing, w) {
    const scene = this.scene;
    if (firing && scene.dualWield && scene.secondaryWeapon) {
      this.fireSecondary(time, aim, scene.secondaryWeapon);
    }
    if (firing) {
      if (!this.axeChanneling) {
        this.axeChanneling = true;
        this.axeChannelStart = time;
        this.axeChanneled = false;
        this.setTint(0xffb15a);
        scene.fx.ring(this.x, this.y, 0xffb15a, 0.16, 1.1, 420, 0.7, 730);
      }
      if (!this.axeChanneled && time - this.axeChannelStart >= BOAR_AXE.channelMs) {
        if (this.spendEnergy(w.energyCost)) {
          this.axeChanneled = true;
          this.nextShotAt = time + BOAR_AXE.rainCooldown;
          scene.summonBoarAxeRain(this);
        } else {
          this.axeChanneled = true;
          this.nextShotAt = time + 500;
          scene.onEnergyDenied();
        }
      }
    } else if (this.axeChanneling) {
      const held = time - this.axeChannelStart;
      if (!this.axeChanneled && held < BOAR_AXE.channelMs) {
        if (this.spendEnergy(w.energyCost)) {
          scene.meleeAttack(this, aim, w);
          Sfx.slash();
          this.nextShotAt = time + w.fireRate * 1000 * ((scene.buffs && scene.buffs.fireRate) || 1);
        } else {
          scene.onEnergyDenied();
        }
      }
      this.axeChanneling = false;
      this.axeChanneled = false;
      this.clearTint();
    }
  }

  update(time, delta) {
    if (this.isDead) return;
    const scene = this.scene;
    if (!scene || !scene.keys) return;

    let mx = 0, my = 0;
    const k = scene.keys;
    if (k.left.isDown) mx -= 1;
    if (k.right.isDown) mx += 1;
    if (k.up.isDown) my -= 1;
    if (k.down.isDown) my += 1;
    if (scene.touch && scene.touch.move.active) {
      mx += scene.touch.move.dx;
      my += scene.touch.move.dy;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    this.moving = len > 0.14;
    if (this.moving) this.lastMoveAngle = Math.atan2(my, mx);

    // 翻滚
    let dashRequested = false;
    if (Phaser.Input.Keyboard.JustDown(k.dash) || Phaser.Input.Keyboard.JustDown(k.dash2)) dashRequested = true;
    if (scene.consumeDash()) dashRequested = true;
    if (dashRequested && time >= this.dashReadyAt && time >= this.dashUntil) {
      this.startDash(time, mx, my);
    }

    if (time < this.dashUntil) {
      // 冲刺期间保持冲刺速度
    } else {
      const guitarSpeed = scene.skill && scene.skill.active && scene.skill.type === 'guitar'
        ? 1.45 : 1;
      const sp = BALANCE.playerSpeed * ((scene.buffs && scene.buffs.speed) || 1) * guitarSpeed;
      const axeSlow = this.axeChanneling && scene.weapon && scene.weapon.id === 'boar_axe'
        ? BOAR_AXE.slow : 1;
      this.body.setVelocity(mx * sp * axeSlow, my * sp * axeSlow);
    }

    // 走路动画
    if (this.moving && time >= this.dashUntil) {
      if (!this.anims.isPlaying || !this.anims.currentAnim || this.anims.currentAnim.key !== this.walkAnim) {
        this.play(this.walkAnim, true);
      }
    } else {
      if (this.anims.isPlaying) this.anims.stop();
      if (this.texture.key !== this.idleTexture) this.setTexture(this.idleTexture);
    }

    // 瞄准
    const aim = scene.computeAimAngle(this);
    this.aimAngle = aim;
    const cos = Math.cos(aim);
    if (cos < -0.08) this.setFlipX(true);
    else if (cos > 0.08) this.setFlipX(false);

    // 枪的位置（巨人形态用拳头，不显示枪）
    if (!this.giant) {
      if (scene.weapon && this.gun.texture.key !== scene.weapon.texture) {
        this.gun.setTexture(scene.weapon.texture);
      }
      const gx = this.x + cos * 10;
      const gy = this.y + 5 + Math.sin(aim) * 8;
      this.gun.setPosition(gx, gy);
      this.gun.setRotation(aim);
      this.gun.setFlipY(cos < 0);
      this.gun.setDepth(this.y + 21);

      if (this.backSword) {
        this.backSword.setPosition(this.x - 3, this.y + 2);
        this.backSword.setDepth(this.y + 19);
      }

      if (scene.dualWield && scene.secondaryWeapon) {
        const sw = scene.secondaryWeapon;
        if (this.secondaryGun.texture.key !== sw.texture) this.secondaryGun.setTexture(sw.texture);
        const perpX = -Math.sin(aim) * 7;
        const perpY = Math.cos(aim) * 7;
        this.secondaryGun
          .setPosition(gx + perpX, gy + perpY)
          .setRotation(aim)
          .setFlipY(cos < 0)
          .setDepth(this.y + 21)
          .setVisible(true);
      } else if (this.secondaryGun.visible) {
        this.secondaryGun.setVisible(false);
      }
    } else {
      if (this.gun.visible) this.gun.setVisible(false);
      if (this.secondaryGun.visible) this.secondaryGun.setVisible(false);
    }

    // 开火（枪手技能自动攻击期间由技能接管；巨人形态改为铁拳）
    const weapon = scene.weapon || WEAPONS.pistol;
    const firing = scene.canPlayerAct() && scene.wantsToFire();
    if (this.giant) {
      if (firing && time >= this.nextShotAt) this.giantPunch(aim, time);
    } else if (scene.isAimLockSkillActive()) {
      // 枪手技能自动接管攻击
    } else if (weapon.id === 'demon_trident') {
      this.updateDemonTrident(time, aim, firing, weapon);
    } else if (weapon.id === 'demon_sulfur' || weapon.beam) {
      scene.updateSulfurBeam(time, aim, firing, weapon);
    } else if (weapon.id === 'boar_axe') {
      this.updateBoarAxe(time, aim, firing, weapon);
    } else {
      if (this.axeChanneling) this.cancelAxeChannel();
      if (weapon.charge) this.updateChargeWeapon(time, aim, firing, weapon);
      else if (firing && time >= this.nextShotAt) this.fire(time, aim);
      if (firing && scene.dualWield && scene.secondaryWeapon) {
        this.fireSecondary(time, aim, scene.secondaryWeapon);
      }
    }

    const ringRegen = this.scene.hasRing && this.scene.hasRing('azure') ? 3 : 1;
    const energyMul = (scene.buffs && scene.buffs.energyRegen) || 1;
    this.energy = Math.min(this.maxEnergy, this.energy + BALANCE.energyRegen * ringRegen * energyMul * delta / 1000);
    this.setDepth(this.y + 20);
    this.shadow.setPosition(this.x, this.y + (this.giant ? 30 : 19)).setDepth(this.y + 18);
  }

  fireSecondary(time, aim, w) {
    if (time < this.secondaryNextShotAt) return;
    const demon = this.isDemonActive();
    const dmgMul = demon ? 1.4 : 1;
    const cost = w.energyCost || 0;
    if (cost > 0 && !demon && this.energy < cost) return;
    if (cost > 0 && !demon) this.energy -= cost;
    const buffs = this.scene.buffs || {};
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const power = Math.max(0, QUALITY_ORDER.indexOf(w.quality));
    const gx = this.secondaryGun.x;
    const gy = this.secondaryGun.y;
    const tip = this.secondaryGun.displayWidth * (1 - this.secondaryGun.originX);
    const fxX = gx + Math.cos(aim) * tip;
    const fxY = gy + Math.sin(aim) * tip;

    if (w.melee) {
      this.secondaryNextShotAt = time + w.fireRate * 1000 * (buffs.fireRate || 1) * (demon ? 0.5 : 1);
      const mw = demon ? Object.assign({}, w, { damage: w.damage * dmgMul }) : w;
      this.scene.meleeAttack(this, aim, mw);
      Sfx.slash();
      return;
    }
    if (w.ringCount) {
      this.secondaryNextShotAt = time + w.fireRate * 1000 * (buffs.fireRate || 1) * (demon ? 0.5 : 1);
      for (let i = 0; i < w.ringCount; i++) {
        const a = (i / w.ringCount) * Math.PI * 2 + rand(-0.03, 0.03);
        this.scene.spawnPlayerBullet(this.x, this.y - 2, a, Math.round(w.damage * (buffs.damage || 1) * dmgMul), {
          speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
          tint: w.tint, pierce: w.pierce, color: q.color, power,
        });
      }
      this.scene.fx.ring(this.x, this.y - 2, q.color, 0.2, 1.3, 320, 0.8, 720);
      this.scene.fx.shotBurst(this.x, this.y - 2, q.color, power);
      Sfx.shoot();
      return;
    }
    if (w.charge) {
      this.secondaryNextShotAt = time + Math.max(w.fireRate * 1000, w.chargeTime * 1000 * 0.8)
        * (demon ? 0.5 : 1);
      const ratio = 0.7;
      const dmg = Math.round((w.baseDamage + w.maxBonus * ratio) * (buffs.damage || 1) * dmgMul);
      this.scene.spawnPlayerBullet(this.x, this.y - 2, aim, dmg, {
        speed: w.bulletSpeed, tint: null, pierce: 2, color: q.color, power,
        texture: 'charged_arrow', scale: 1.35,
      });
      this.scene.fx.muzzle(fxX, fxY, aim, q.color, power);
      this.scene.fx.shotBurst(fxX, fxY, q.color, power);
      this.scene.cameras.main.shake(60, 0.0018);
      Sfx.bowRelease();
      return;
    }
    const spread = w.spread * (buffs.spreadMul || 1);
    const extra = buffs.twinChance && Math.random() < buffs.twinChance ? 1 : 0;
    for (let i = 0; i < w.pellets + extra; i++) {
      const a = aim + rand(-spread, spread);
      this.scene.spawnPlayerBullet(this.x, this.y - 2, a, Math.round(w.damage * (buffs.damage || 1) * dmgMul), {
        speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: w.tint, pierce: w.pierce, color: q.color, power,
        burn: w.id === 'flamer' ? FLAMER_BURN : null,
      });
    }
    this.secondaryNextShotAt = time + w.fireRate * 1000 * (buffs.fireRate || 1) * (demon ? 0.5 : 1);
    this.scene.fx.muzzle(fxX, fxY, aim, q.color, power);
    this.scene.cameras.main.shake(35, 0.0007);
    if (this.scene.maybeSlimeStaffRing) {
      this.scene.maybeSlimeStaffRing(w, q, power);
    }
    if (this.scene.maybeRingWealth) this.scene.maybeRingWealth();
    Sfx.shoot();
  }

  updateChargeWeapon(time, aim, firing, w) {
    const demon = this.isDemonActive();
    const holding = this.networkGuest
      ? firing
      : (this.scene.touchMode
        ? (Store.data.autoFire ? (this.scene.touch.aim.active && firing) : firing)
        : firing);
    if (holding) {
      this.chargeAim = aim;
      if (!this.charging) {
        if (time < this.nextShotAt) return;
        if (!demon && this.energy < w.energyCost) {
          this.scene.onEnergyDenied();
          return;
        }
        this.charging = true;
        this.chargeStart = time;
        this.createChargeFx();
        Sfx.bowDraw();
      }
      const ratio = clamp((time - this.chargeStart) / (w.chargeTime * 1000), 0, 1);
      this.chargeRatio = ratio;
      this.updateChargeFx(ratio);
    } else if (this.charging) {
      const held = time - this.chargeStart;
      const ratio = clamp(held / (w.chargeTime * 1000), 0, 1);
      const aimAngle = this.chargeAim;
      this.charging = false;
      this.chargeRatio = 0;
      this.destroyChargeFx();
      if (held < 120) return;
      if (!this.spendEnergy(w.energyCost)) {
        this.scene.onEnergyDenied();
        return;
      }
      this.nextShotAt = time + w.fireRate * 1000 * (demon ? 0.5 : 1);
      const buffs = this.scene.buffs || {};
      const dmg = Math.round((w.baseDamage + w.maxBonus * ratio) * (buffs.damage || 1) * (demon ? 1.4 : 1));
      const pierce = w.id === 'bow' ? (ratio >= 0.65 ? 2 : w.pierce) : w.pierce;
      const q = QUALITIES[w.quality] || QUALITIES.white;
      const power = 3 + Math.round(ratio * 3);
      const px = this.x + Math.cos(aimAngle) * 24;
      const py = this.y + 2 + Math.sin(aimAngle) * 24;
      if (w.boomerang) {
        this.scene.throwBoomerang(w, aimAngle, ratio, dmg, q, power);
        this.scene.fx.muzzle(px, py, aimAngle, q.color, power);
        this.scene.cameras.main.shake(70, 0.002);
        Sfx.slash();
        return;
      }
      const projectileScale = w.id === 'bow' ? 1 + ratio * 0.45
        : (w.id === 'sniper' ? 1.1 : (w.id === 'boomerang' ? 1 : 1.0));
      this.scene.spawnPlayerBullet(px, py, aimAngle, dmg, {
        speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: null,
        pierce,
        color: q.color,
        power,
        texture: w.projectileTexture || 'charged_arrow',
        scale: projectileScale,
      });
      this.scene.fx.muzzle(px, py, aimAngle, q.color, power);
      this.scene.fx.shotBurst(px, py, q.color, power);
      this.scene.cameras.main.shake(80, 0.002 + ratio * 0.004);
      if (this.scene.maybeRingWealth) this.scene.maybeRingWealth();
      Sfx.bowRelease();
    }
  }

  createChargeFx() {
    const scene = this.scene;
    this.chargeFx = {
      ring: scene.add.image(this.x, this.y - 4, 'ring')
        .setTint(0xb07bff).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(6).setAlpha(0.5),
      glow: scene.add.image(this.x, this.y - 4, 'glow')
        .setTint(0xb07bff).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5).setAlpha(0.18),
      bar: scene.add.graphics().setDepth(726),
    };
  }

  updateChargeFx(ratio) {
    const fx = this.chargeFx;
    if (!fx) return;
    const full = ratio >= 1;
    fx.ring.setPosition(this.x, this.y - 4)
      .setScale(0.25 + ratio * 0.55)
      .setAlpha(0.55 + ratio * 0.35)
      .setTint(full ? 0xffd76a : 0xb07bff);
    fx.glow.setPosition(this.x, this.y - 4)
      .setScale(0.4 + ratio * 0.9)
      .setAlpha(0.2 + ratio * 0.35)
      .setTint(full ? 0xffd76a : 0xb07bff);
    fx.bar.clear();
    fx.bar.fillStyle(0x0b1208, 0.8);
    fx.bar.fillRect(this.x - 26, this.y - 56, 52, 7);
    fx.bar.fillStyle(full ? 0xffd76a : 0xb07bff, 0.9);
    fx.bar.fillRect(this.x - 24, this.y - 54, 48 * ratio, 3);
    fx.bar.lineStyle(1, 0x9a7bb0, 0.9);
    fx.bar.strokeRect(this.x - 26, this.y - 56, 52, 7);
  }

  destroyChargeFx() {
    const fx = this.chargeFx;
    if (!fx) return;
    if (fx.ring && fx.ring.active) fx.ring.destroy();
    if (fx.glow && fx.glow.active) fx.glow.destroy();
    if (fx.bar && fx.bar.active) fx.bar.destroy();
    this.chargeFx = null;
  }

  cancelCharge() {
    this.charging = false;
    this.chargeRatio = 0;
    this.destroyChargeFx();
  }

  spendEnergy(cost) {
    if (cost <= 0) return true;
    if (this.isDemonActive()) return true;
    if (this.energy < cost) return false;
    this.energy -= cost;
    return true;
  }

  restoreEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  fire(time, aim) {
    const w = this.networkWeapon || this.scene.weapon || WEAPONS.pistol;
    const buffs = this.scene.buffs || {};
    const demon = this.isDemonActive();
    const dmgMul = demon ? 1.4 : 1;
    const cost = w.energyCost || 0;
    if (cost > 0 && !demon && this.energy < cost) {
      this.scene.onEnergyDenied();
      return;
    }
    if (cost > 0 && !demon) this.energy -= cost;
    this.nextShotAt = time + w.fireRate * 1000 * (buffs.fireRate || 1) * (demon ? 0.5 : 1);
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const power = Math.max(0, QUALITY_ORDER.indexOf(w.quality));
    if (w.melee) {
      const mw = demon ? Object.assign({}, w, { damage: w.damage * dmgMul }) : w;
      this.scene.meleeAttack(this, aim, mw);
      this.body.velocity.x -= Math.cos(aim) * 45;
      this.body.velocity.y -= Math.sin(aim) * 45;
      if (this.scene.maybeRingWealth) this.scene.maybeRingWealth();
      Sfx.slash();
      return;
    }
    if (w.ringCount) {
      for (let i = 0; i < w.ringCount; i++) {
        const a = (i / w.ringCount) * Math.PI * 2 + rand(-0.03, 0.03);
        this.scene.spawnPlayerBullet(this.x, this.y - 2, a, Math.round(w.damage * (buffs.damage || 1) * dmgMul), {
          speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
          tint: w.tint,
          pierce: w.pierce,
          color: q.color,
          power,
        });
      }
      this.scene.fx.ring(this.x, this.y - 2, q.color, 0.2, 1.3, 320, 0.8, 720);
      this.scene.fx.shotBurst(this.x, this.y - 2, q.color, power);
      this.scene.cameras.main.shake(60, 0.002);
      if (this.scene.maybeRingWealth) this.scene.maybeRingWealth();
      Sfx.shoot();
      return;
    }
    const px = this.x + Math.cos(aim) * 2;
    const py = this.y + 2 + Math.sin(aim) * 2;
    const tip = this.gun.displayWidth * (1 - this.gun.originX);
    const fxX = this.x + Math.cos(aim) * (10 + tip);
    const fxY = this.y + 5 + Math.sin(aim) * (10 + tip);
    const spread = w.spread * (buffs.spreadMul || 1);
    const extra = buffs.twinChance && Math.random() < buffs.twinChance ? 1 : 0;
    for (let i = 0; i < w.pellets + extra; i++) {
      const a = aim + rand(-spread, spread);
      this.scene.spawnPlayerBullet(px, py, a, Math.round(w.damage * (buffs.damage || 1) * dmgMul), {
        speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: w.tint,
        pierce: w.pierce,
        color: q.color,
        power,
        texture: w.projectileTexture,
        scale: w.projectileScale,
        water: !!w.water,
        burn: w.burn || (w.id === 'flamer' ? FLAMER_BURN : null),
      });
    }
    this.scene.fx.muzzle(fxX, fxY, aim, q.color, power);
    this.scene.fx.shell(this.x + Math.cos(aim) * 10, this.y + 5 + Math.sin(aim) * 8, aim);
    this.body.velocity.x -= Math.cos(aim) * (w.pellets > 1 ? 40 : 10);
    this.body.velocity.y -= Math.sin(aim) * (w.pellets > 1 ? 40 : 10);
    this.scene.cameras.main.shake(45, w.pellets > 1 ? 0.0022 : 0.0009);
    if (this.scene.maybeSlimeStaffRing) {
      this.scene.maybeSlimeStaffRing(w, q, power);
    }
    Sfx.shoot();
  }

  startDash(time, mx, my) {
    if (!this.spendEnergy(BALANCE.dashEnergyCost)) {
      this.scene.onEnergyDenied();
      return;
    }
    this.cancelCharge();
    let ang;
    if (Math.hypot(mx, my) > 0.2) ang = Math.atan2(my, mx);
    else ang = this.aimAngle;
    const buffs = this.scene.buffs || {};
    this.dashUntil = time + BALANCE.dashTime * 1000;
    this.dashReadyAt = time + BALANCE.dashCooldown * 1000 * (buffs.dashCd || 1);
    this.invulnUntil = Math.max(this.invulnUntil, time + 260 + (buffs.dashInvuln || 0));
    this.body.setVelocity(Math.cos(ang) * BALANCE.dashSpeed, Math.sin(ang) * BALANCE.dashSpeed);
    this.scene.fx.dash(this.x, this.y, ang);
    Sfx.dash();
    const scene = this.scene;
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 45, () => {
        if (!this.active || this.isDead) return;
        const img = scene.add.image(this.x, this.y, this.texture.key, this.frame.name)
          .setFlipX(this.flipX)
          .setAlpha(0.32)
          .setTint(0x9ff0e0)
          .setDepth(this.y + 19);
        scene.tweens.add({ targets: img, alpha: 0, duration: 220, onComplete: () => img.destroy() });
      });
    }
  }

  takeDamage(amount, srcX, srcY, time) {
    if (this.isDead || time < this.invulnUntil) return false;
    if (this.scene.isKnightShieldActive && this.scene.isKnightShieldActive()) {
      this.scene.fx.ring(this.x, this.y, 0xfff2c8, 0.2, 0.9, 220, 0.75, 736);
      return false;
    }
    const dodge = this.scene.ringDodgeChance ? this.scene.ringDodgeChance() : 0;
    if (dodge > 0 && Math.random() < dodge) {
      this.scene.onRingDodge();
      return false;
    }
    const armor = Math.min(0.45, (this.scene.buffs && this.scene.buffs.armor) || 0);
    let incoming = amount * (1 - armor);
    const buffs = this.scene.buffs || {};
    if (buffs.lastStand > 0 && this.hp < this.maxHp * 0.4) {
      incoming *= (1 - buffs.lastStand);
    }
    this.hp = Math.max(0, this.hp - incoming);
    this.invulnUntil = time + BALANCE.hurtInvuln;
    const ang = Math.atan2(this.y - srcY, this.x - srcX);
    this.body.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
    this.setTintFill(0xff5a4a);
    this.scene.time.delayedCall(90, () => { if (this.active) this.clearTint(); });
    this.scene.tweens.add({
      targets: this, alpha: { from: 0.35, to: 1 }, duration: 90, yoyo: true, repeat: 3,
      onComplete: () => { if (this.active) this.setAlpha(1); },
    });
    this.scene.cameras.main.shake(150, 0.006);
    Sfx.hurt();
    this.scene.onPlayerHurt();
    if (this.hp <= 0) {
      if (this.scene.tryRingUndying && this.scene.tryRingUndying()) {
        return true;
      }
      if (this.scene.tryGhostSave && this.scene.tryGhostSave()) {
        return true;
      }
      if (this.scene.trySecondWind && this.scene.trySecondWind()) {
        return true;
      }
      this.die();
    }
    return true;
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.hud.hpDirty = true;
  }

  addMaxHp(amount) {
    this.maxHp += amount;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.hud.hpDirty = true;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.cancelCharge();
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setTexture(this.idleTexture);
    this.clearTint();
    this.setAlpha(1);
    this.gun.setVisible(false);
    if (this.secondaryGun) this.secondaryGun.setVisible(false);
    if (this.backSword) this.scene.tweens.add({ targets: this.backSword, alpha: 0, duration: 400 });
    this.scene.tweens.add({ targets: this, angle: 90, alpha: 0, duration: 650, ease: 'Sine.In' });
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 400 });
    this.scene.onPlayerDeath();
  }
}

// ------------------------------------------------------------------ 普通敌人

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type, level, elite) {
    const def = ENEMY_DEFS[type];
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = type;
    this.def = def;
    this.level = level;
    this.isElite = !!elite;
    const round = scene.round || 1;
    const hpScale = (1 + 0.09 * (level - 1)) * (1 + 0.30 * (round - 1)) * (elite ? 2.0 : 1);
    const dmgScale = (1 + 0.045 * (level - 1)) * (1 + 0.12 * (round - 1)) * (elite ? 1.3 : 1);
    this.maxHp = Math.round(def.hp * hpScale);
    this.hp = this.maxHp;
    this.damage = Math.round(def.damage * dmgScale);
    this.dying = false;
    this.spawnedAt = scene.time.now;

    this.body.setSize(def.body[0], def.body[1], false);
    this.body.setOffset(def.offset[0], def.offset[1]);
    this.setCollideWorldBounds(true);

    this.shadow = scene.add.image(x, y + def.shadowY, 'shadow')
      .setAlpha(0.28).setScale(def.shadowScale);
    this.shadow.setDepth(y + def.depthY - 1);
    this.setDepth(y + def.depthY);

    this.hopTimer = rand(350, 900);
    this.shootCd = rand(900, 1800);
    this.charge = 0;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.orbit = Math.random() * Math.PI * 2;

    this.boarState = 'idle';
    this.boarTimer = rand(700, 1300);
    this.chargeAngle = 0;
    this.mushroomCd = rand(900, 1600);
    this.mushroomCharge = 0;
    this.goatState = 'idle';
    this.goatTimer = rand(800, 1400);
    this.goatChargeAngle = 0;
    this.goatAim = null;
    this.goatBeam = null;
    this.ghostRevealUntil = 0;
    this.ghostVisible = false;
    this.ghostCd = rand(700, 1400);
    this.ghostBurst = 0;
    this.guardAttackAt = 0;
    this.dragonCd = rand(900, 1600);
    this.angelCd = rand(900, 1600);

    this.burnUntil = 0;
    this.burnTickAt = 0;
    this.burnDps = 0;
    this.burnEmitter = null;
    this.burnGlow = null;

    if (elite) {
      this.setScale(1.3);
      this.shadow.setScale(def.shadowScale * 1.3);
      this.eliteGlow = scene.add.image(x, y, 'glow')
        .setTint(0xffc04a).setScale(1.0).setAlpha(0.34)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + def.depthY - 1);
      this.aura = scene.add.particles(0, 0, 'spark', {
        lifespan: { min: 380, max: 700 },
        speed: { min: 20, max: 70 },
        scale: { start: 0.72, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xffd76a, 0xff9a3a, 0xffffff],
        frequency: 85,
        quantity: 1,
        blendMode: 'ADD',
      }).setDepth(y + def.depthY + 2);
      this.eliteTag = scene.add.text(x, y - def.depthY - 22, '精英', UI.textStyle(10, {
        color: '#ffe08a', strokeThickness: 3, bold: true, shadow: false,
      })).setOrigin(0.5).setDepth(y + def.depthY + 3);
    }

    if (type === 'goblin') {
      this.bow = scene.add.image(x, y, 'bow').setDepth(y + def.depthY + 1);
      this.play('goblin_walk');
    } else if (type === 'slime') {
      this.play('slime_idle');
    } else if (type === 'slime_mini') {
      this.play('slime_mini_idle');
    } else if (type === 'bat') {
      this.play('bat_fly');
    } else if (type === 'ghost') {
      this.play('ghost_float');
    } else if (type === 'demon_guard') {
      this.play('demon_guard_walk');
    } else if (type === 'dragonling') {
      this.play('dragonling_fly');
      this.setAlpha(0.06);
      this.shadow.setAlpha(0);
    } else if (type === 'angel_guard') {
      this.play('angel_guard_walk');
    } else if (type === 'cloud_wisp') {
      this.play('cloud_wisp_float');
    } else if (type === 'temple_knight') {
      this.play('temple_knight_walk');
    }

    if (type !== 'ghost') {
      this.setAlpha(0);
      scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
    }
  }

  _visualTick() {
    if (this.aura && this.aura.active) this.aura.setPosition(this.x, this.y + 4);
    if (this.eliteGlow && this.eliteGlow.active) {
      this.eliteGlow.setPosition(this.x, this.y);
      this.eliteGlow.setAlpha(0.28 + Math.sin(this.scene.time.now * 0.005) * 0.08);
      this.eliteGlow.setDepth(this.y + this.def.depthY - 1);
    }
    if (this.eliteTag && this.eliteTag.active) {
      this.eliteTag.setPosition(this.x, this.y - this.def.depthY - 22);
      this.eliteTag.setDepth(this.y + this.def.depthY + 3);
    }
    if (!this.shadow || !this.shadow.active) return;
    this.shadow.setPosition(this.x, this.y + this.def.shadowY);
    this.shadow.setDepth(this.y + this.def.depthY - 1);
    this.setDepth(this.y + this.def.depthY);
  }

  applyBurn(duration, dps) {
    if (this.dying || !this.active) return;
    const now = this.scene.time.now;
    this.burnUntil = Math.max(this.burnUntil || 0, now + duration);
    this.burnDps = Math.max(this.burnDps || 0, dps);
    if (!this.burnTickAt) this.burnTickAt = now + 360;
    if (!this.burnEmitter) {
      this.burnEmitter = this.scene.add.particles(0, 0, 'spark', {
        lifespan: { min: 300, max: 600 },
        speed: { min: 25, max: 85 },
        angle: { min: 235, max: 305 },
        scale: { start: 1.35, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffe066, 0xff8a2a, 0xff3a1a],
        frequency: 38,
        quantity: 2,
        blendMode: 'ADD',
      }).setDepth(810);
      this.burnEmitter.startFollow(this, 0, -8);
    }
    if (!this.burnGlow) {
      const size = this.isBoss ? 2.4 : 1.0;
      this.burnGlow = this.scene.add.image(this.x, this.y, 'glow')
        .setTint(0xff6a2a).setScale(size).setAlpha(0.24)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.y + this.def.depthY + 3);
    }
  }

  updateBurn(time) {
    if (!this.burnUntil) return;
    if (time >= this.burnUntil) {
      this.clearBurn();
      return;
    }
    if (this.burnEmitter) {
      this.burnEmitter.setDepth(this.y + this.def.depthY + 4);
    }
    if (this.burnGlow && this.burnGlow.active) {
      this.burnGlow.setPosition(this.x, this.y - 2)
        .setDepth(this.y + this.def.depthY + 3)
        .setAlpha(0.18 + Math.sin(time * 0.02) * 0.07);
    }
    if (time >= this.burnTickAt) {
      this.burnTickAt = time + 400;
      const dmg = Math.max(1, Math.round((this.burnDps || 8) * 0.4));
      if (this.enemyType === 'ghost') {
        this.ghostRevealUntil = time + 3000;
        this.ghostVisible = true;
      }
      this.hp -= dmg;
      this.scene.fx.hitSpark(this.x, this.y - 8);
      if (this.hp <= 0) {
        this.clearBurn();
        this.die();
      }
    }
  }

  clearBurn() {
    this.burnUntil = 0;
    this.burnTickAt = 0;
    this.burnDps = 0;
    if (this.burnEmitter) {
      this.burnEmitter.stop();
      const emitter = this.burnEmitter;
      this.burnEmitter = null;
      this.scene.tweens.add({
        targets: emitter,
        alpha: 0,
        duration: 180,
        onComplete: () => emitter.destroy(),
      });
    }
    if (this.burnGlow) {
      const glow = this.burnGlow;
      this.burnGlow = null;
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 180,
        onComplete: () => glow.destroy(),
      });
    }
  }

  clearGoatFx() {
    if (this.goatAim) {
      this.scene.tweens.killTweensOf(this.goatAim);
      if (this.goatAim.active) this.goatAim.destroy();
      this.goatAim = null;
    }
    if (this.goatBeam) {
      const beam = this.goatBeam;
      this.goatBeam = null;
      this.scene.tweens.killTweensOf(beam.glow);
      this.scene.tweens.killTweensOf(beam.core);
      if (beam.glow.active) beam.glow.destroy();
      if (beam.core.active) beam.core.destroy();
    }
  }

  updateAI(time, delta) {
    if (!this.active || this.dying) return;
    this._visualTick();
    const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
    if (!p || p.isDead) {
      this.setVelocity(0, 0);
      return;
    }
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const angTo = Math.atan2(dy, dx);

    if (this.frozenUntil && time < this.frozenUntil) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.enemyType === 'slime' || this.enemyType === 'slime_mini') {
      this.hopTimer -= delta;
      if (this.hopTimer <= 0) {
        const a = angTo + rand(-0.28, 0.28);
        const power = this.enemyType === 'slime_mini' ? 205 : 165;
        this.setVelocity(Math.cos(a) * power, Math.sin(a) * power);
        this.hopTimer = rand(820, 1350);
        this.scene.fx.hopDust(this.x, this.y + this.def.shadowY);
      }
      this.body.velocity.scale(0.972);
      this.setFlipX(p.x < this.x);
    } else if (this.enemyType === 'goblin') {
      this.updateGoblin(delta, dist, angTo, p);
    } else if (this.enemyType === 'bat') {
      this.orbit += delta * 0.0032;
      const tx = p.x + Math.cos(this.orbit) * 110;
      const ty = p.y + Math.sin(this.orbit * 1.27) * 85;
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.setVelocity(Math.cos(a) * 158, Math.sin(a) * 158);
      this.setFlipX(Math.cos(a) < -0.1);
    } else if (this.enemyType === 'mushroom') {
      this.updateMushroom(delta, dist, angTo, p);
    } else if (this.enemyType === 'boar') {
      this.updateBoar(delta, dist, angTo, p);
    } else if (this.enemyType === 'goat') {
      this.updateGoat(delta, dist, angTo, p);
    } else if (this.enemyType === 'ghost') {
      this.updateGhostEnemy(time, delta, dist, angTo, p);
    } else if (this.enemyType === 'demon_guard') {
      this.updateDemonGuard(time, delta, dist, angTo, p);
    } else if (this.enemyType === 'dragonling') {
      this.updateDragonling(time, delta, dist, angTo, p);
    } else if (this.enemyType === 'angel_guard') {
      this.updateAngelGuard(time, delta, dist, angTo, p);
    } else if (this.enemyType === 'cloud_wisp') {
      this.orbit += delta * 0.0038;
      const tx = p.x + Math.cos(this.orbit) * 120;
      const ty = p.y + Math.sin(this.orbit * 1.3) * 90;
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.setVelocity(Math.cos(a) * 182, Math.sin(a) * 182);
      this.setFlipX(Math.cos(a) < -0.1);
    } else if (this.enemyType === 'temple_knight') {
      this.updateTempleKnight(time, dist, angTo, p);
    }
  }

  updateAngelGuard(time, delta, dist, angTo, p) {
    const strafe = angTo + Math.PI / 2 * this.strafe;
    let vx = Math.cos(strafe) * 52;
    let vy = Math.sin(strafe) * 52;
    if (dist > 330) {
      vx += Math.cos(angTo) * 55;
      vy += Math.sin(angTo) * 55;
    } else if (dist < 190) {
      vx -= Math.cos(angTo) * 70;
      vy -= Math.sin(angTo) * 70;
    }
    this.setVelocity(vx, vy);
    this.setFlipX(p.x < this.x);
    this.angelCd -= delta;
    if (this.angelCd <= 0 && dist < 560) {
      this.angelCd = rand(1500, 2100);
      const base = Math.atan2(p.y - this.y, p.x - this.x);
      for (let i = -1; i <= 1; i++) {
        this.scene.spawnEnemyOrb(this.x, this.y - 4, base + i * 0.15, Math.round(this.damage * 0.7), {
          speed: 285, tint: 0xfff2c8,
        });
      }
      this.scene.fx.muzzle(this.x, this.y - 4, base, 0xfff2c8, 2);
      Sfx.spore();
    }
  }

  updateTempleKnight(time, dist, angTo, p) {
    const sp = 72;
    this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
    this.setFlipX(p.x < this.x);
    if (dist < 88 && time >= this.guardAttackAt) {
      this.guardAttackAt = time + 1250;
      this.setVelocity(0, 0);
      p.takeDamage(this.damage, this.x, this.y, this.scene.time.now);
      const sl = this.scene.add.image(this.x, this.y - 8, 'slash')
        .setTint(0xffe9a8).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(720).setScale(0.95).setRotation(angTo);
      this.scene.tweens.add({ targets: sl, alpha: 0, duration: 160, onComplete: () => sl.destroy() });
      this.scene.cameras.main.shake(55, 0.0022);
    }
  }

  updateDragonling(time, delta, dist, angTo, p) {
    this.orbit += delta * 0.0028;
    const tx = p.x + Math.cos(this.orbit) * 140;
    const ty = p.y + Math.sin(this.orbit * 1.2) * 95;
    const a = Math.atan2(ty - this.y, tx - this.x);
    this.setVelocity(Math.cos(a) * 125, Math.sin(a) * 125);
    this.setFlipX(Math.cos(a) < -0.1);
    this.dragonCd -= delta;
    if (this.dragonCd <= 0 && dist < 520) {
      this.dragonCd = rand(1400, 2200);
      const fire = Math.atan2(p.y - this.y, p.x - this.x);
      this.scene.spawnEnemyOrb(this.x, this.y, fire, Math.round(this.damage * 0.8), {
        speed: 300, tint: 0xff8a3a,
      });
      this.scene.fx.muzzle(this.x, this.y, fire, 0xff8a3a, 2);
      Sfx.spore();
    }
  }

  updateDemonGuard(time, delta, dist, angTo, p) {
    const sp = 86;
    this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
    this.setFlipX(p.x < this.x);
    if (dist < 82 && time >= this.guardAttackAt) {
      this.guardAttackAt = time + 1200;
      this.setVelocity(0, 0);
      p.takeDamage(this.damage, this.x, this.y, this.scene.time.now);
      const sl = this.scene.add.image(this.x, this.y - 6, 'slash')
        .setTint(0xff5a3a).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(720).setScale(0.8).setRotation(angTo);
      this.scene.tweens.add({ targets: sl, alpha: 0, duration: 140, onComplete: () => sl.destroy() });
      this.scene.cameras.main.shake(45, 0.002);
    }
  }

  updateGhostEnemy(time, delta, dist, angTo, p) {
    const near = dist < 135;
    const visible = near || time < this.ghostRevealUntil;
    this.ghostVisible = visible;
    const target = visible ? 1 : 0.06;
    this.setAlpha(Phaser.Math.Linear(this.alpha, target, 0.16));
    if (this.shadow) this.shadow.setAlpha(visible ? 0.2 : 0);
    const sp = 32;
    if (!visible) {
      this.ghostBurst = 0;
      this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
      this.setFlipX(p.x < this.x);
      return;
    }
    this.setFlipX(p.x < this.x);
    if (this.ghostBurst > 0) {
      this.setVelocity(0, 0);
      if (time >= this.ghostCd) {
        this.ghostBurst--;
        this.ghostCd = this.ghostBurst > 0 ? time + 140 : time + rand(1400, 2200);
        this.scene.spawnEnemyOrb(this.x, this.y - 4, angTo, Math.round(this.damage * 0.75), { speed: 315, tint: 0xbfe8e0 });
        this.scene.fx.muzzle(this.x, this.y - 4, angTo, 0xbfe8e0, 1);
      }
      return;
    }
    if (dist > 170) this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
    else this.setVelocity(0, 0);
    if (time >= this.ghostCd && dist < 480) {
      this.ghostBurst = 3;
      this.ghostCd = time + 140;
    }
  }

  updateGoat(delta, dist, angTo, p) {
    this.goatTimer -= delta;
    this.setFlipX(p.x < this.x);
    if (this.goatState === 'idle') {
      const sp = 96;
      this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
      if (dist < 430 && this.goatTimer <= 0) {
        this.startGoatLaser(p);
      }
    } else if (this.goatState === 'windup') {
      this.setVelocity(0, 0);
      if (this.goatAim && this.goatAim.active) {
        this.goatAim.setPosition(this.x, this.y);
      }
      if (this.goatTimer <= 0) this.fireGoatLaser();
    } else if (this.goatState === 'fire') {
      this.setVelocity(0, 0);
      if (this.goatTimer <= 0) {
        this.goatState = 'rest';
        this.goatTimer = 600;
      }
    } else {
      this.setVelocity(0, 0);
      if (this.goatTimer <= 0) {
        this.goatState = 'idle';
        this.goatTimer = rand(900, 1500);
      }
    }
  }

  startGoatLaser(p) {
    this.goatState = 'windup';
    this.goatTimer = 700;
    this.setVelocity(0, 0);
    this.goatChargeAngle = Math.atan2(p.y - this.y, p.x - this.x);
    this.setTint(0xffb08a);
    this.clearGoatFx();
    this.goatAim = this.scene.add.rectangle(
      this.x, this.y, 760, 4, 0xff5a4a, 0.35
    ).setOrigin(0, 0.5)
      .setRotation(this.goatChargeAngle)
      .setDepth(744)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: this.goatAim, alpha: 0.8, duration: 140, yoyo: true, repeat: -1,
    });
    this.scene.fx.ring(this.x, this.y, 0xffb08a, 0.12, 0.9, 300, 0.6, 740);
    Sfx.laserCharge();
  }

  fireGoatLaser() {
    const angle = this.goatChargeAngle;
    const len = 900;
    this.clearGoatFx();
    this.goatState = 'fire';
    this.goatTimer = 300;
    this.setVelocity(0, 0);
    this.clearTint();

    const glow = this.scene.add.rectangle(
      this.x, this.y, len, 16, 0xff5a3a, 0.28
    ).setOrigin(0, 0.5)
      .setRotation(angle)
      .setDepth(744)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.scene.add.rectangle(
      this.x, this.y, len, 5, 0xfff0c0, 0.95
    ).setOrigin(0, 0.5)
      .setRotation(angle)
      .setDepth(745)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.goatBeam = { glow, core };
    this.scene.tweens.add({
      targets: [glow, core],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        if (this.goatBeam && this.goatBeam.glow === glow) this.goatBeam = null;
        if (glow.active) glow.destroy();
        if (core.active) core.destroy();
      },
    });

    const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
    if (p && !p.isDead) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const along = dx * Math.cos(angle) + dy * Math.sin(angle);
      const perp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
      if (along > 0 && along < len && perp < 24) {
        p.takeDamage(Math.round(this.damage * 1.25), this.x, this.y, this.scene.time.now);
        this.scene.fx.hitSpark(p.x, p.y);
      }
    }
    this.scene.cameras.main.shake(160, 0.006);
    Sfx.laser();
  }

  updateMushroom(delta, dist, angTo, p) {
    const sp = 34;
    if (dist > 310) {
      this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
    } else if (dist < 190) {
      this.setVelocity(-Math.cos(angTo) * sp, -Math.sin(angTo) * sp);
    } else {
      this.setVelocity(0, 0);
    }
    this.setFlipX(p.x < this.x);

    if (this.mushroomCharge > 0) {
      this.mushroomCharge -= delta;
      if (this.mushroomCharge <= 0 && this.active && !this.dying) {
        const base = Math.atan2(p.y - this.y, p.x - this.x);
        for (let i = -1; i <= 1; i++) {
          this.scene.spawnEnemyOrb(this.x, this.y - 10, base + i * 0.16, Math.round(this.damage * 0.8));
        }
        this.scene.fx.ring(this.x, this.y - 8, 0x8fd463, 0.15, 0.7, 250, 0.6, 740);
        this.clearTint();
        Sfx.spore();
        this.mushroomCd = rand(1900, 2800);
      }
    } else {
      this.mushroomCd -= delta;
      if (this.mushroomCd <= 0 && dist < 540) {
        this.mushroomCharge = 360;
        this.setTint(0x9ff0a8);
        this.scene.fx.ring(this.x, this.y - 6, 0x8fd463, 0.1, 0.6, 320, 0.6, 740);
      }
    }
  }

  updateBoar(delta, dist, angTo, p) {
    this.boarTimer -= delta;
    this.setFlipX(p.x < this.x);

    if (this.boarState === 'idle') {
      const sp = 68;
      this.setVelocity(Math.cos(angTo) * sp, Math.sin(angTo) * sp);
      if (dist < 380 && this.boarTimer <= 0) {
        this.boarState = 'windup';
        this.boarTimer = 520;
        this.setVelocity(0, 0);
        this.setTint(0xff9a6a);
        this.scene.fx.ring(this.x, this.y, 0xff7a4a, 0.15, 1.0, 500, 0.7, 740);
      }
    } else if (this.boarState === 'windup') {
      this.setVelocity(0, 0);
      if (this.boarTimer <= 0) {
        this.boarState = 'charge';
        this.boarTimer = 480;
        this.chargeAngle = Math.atan2(p.y - this.y, p.x - this.x);
        this.setVelocity(Math.cos(this.chargeAngle) * 460, Math.sin(this.chargeAngle) * 460);
        this.clearTint();
        this.scene.cameras.main.shake(80, 0.002);
        this.scene.fx.hopDust(this.x, this.y + this.def.shadowY);
        Sfx.boar();
      }
    } else if (this.boarState === 'charge') {
      if (this.boarTimer <= 0) {
        this.boarState = 'rest';
        this.boarTimer = 750;
        this.setVelocity(0, 0);
      }
    } else {
      this.setVelocity(0, 0);
      if (this.boarTimer <= 0) {
        this.boarState = 'idle';
        this.boarTimer = rand(800, 1400);
      }
    }
  }

  updateGoblin(delta, dist, angTo, p) {
    const sp = 82;
    let vx = 0, vy = 0;
    if (dist < 180) {
      vx = -Math.cos(angTo) * sp * 1.25;
      vy = -Math.sin(angTo) * sp * 1.25;
    } else if (dist > 300) {
      vx = Math.cos(angTo) * sp;
      vy = Math.sin(angTo) * sp;
    } else {
      vx = Math.cos(angTo + Math.PI / 2) * sp * 0.8 * this.strafe;
      vy = Math.sin(angTo + Math.PI / 2) * sp * 0.8 * this.strafe;
      if (Math.random() < 0.006) this.strafe *= -1;
    }
    this.setVelocity(vx, vy);
    this.setFlipX(p.x < this.x);

    if (this.bow && this.bow.active) {
      const bx = this.x + Math.cos(angTo) * 15;
      const by = this.y - 2 + Math.sin(angTo) * 15;
      this.bow.setPosition(bx, by);
      this.bow.setRotation(angTo);
      this.bow.setDepth(this.y + this.def.depthY + 1);
    }

    if (dist < 520) {
      if (this.charge > 0) {
        this.charge -= delta;
        if (this.bow && this.bow.active) {
          this.bow.setScale(1 + (1 - Math.max(0, this.charge) / 330) * 0.28);
        }
        if (this.charge <= 0) {
          if (this.bow && this.bow.active) {
            this.bow.setScale(1).clearTint();
            const bx = this.bow.x + Math.cos(angTo) * 12;
            const by = this.bow.y + Math.sin(angTo) * 12;
            this.scene.spawnEnemyArrow(bx, by, angTo, this.damage);
            Sfx.bow();
          }
        }
      } else {
        this.shootCd -= delta;
        if (this.shootCd <= 0) {
          this.shootCd = rand(1750, 2450);
          this.charge = 330;
          if (this.bow && this.bow.active) this.bow.setTint(0xffe066);
        }
      }
    }
  }

  takeDamage(dmg, angle) {
    if (this.dying) return;
    if (this.enemyType === 'ghost') {
      this.ghostRevealUntil = this.scene.time.now + 3000;
      this.ghostVisible = true;
    }
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active && !this.dying) this.clearTint();
    });
    const kb = this.enemyType === 'bat' ? 150 : 100;
    this.body.velocity.x += Math.cos(angle) * kb;
    this.body.velocity.y += Math.sin(angle) * kb;
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.active = false;
    this.clearBurn();
    this.clearGoatFx();
    if (this.body) this.body.enable = false;
    if (this.aura) this.aura.stop();
    if (this.eliteGlow) this.scene.tweens.add({ targets: this.eliteGlow, alpha: 0, duration: 200 });
    if (this.eliteTag) this.scene.tweens.add({ targets: this.eliteTag, alpha: 0, duration: 200 });
    this.scene.onEnemyKilled(this);
    this.scene.fx.enemyDeath(this.x, this.y, this.enemyType);
    Sfx.enemyDie();
    if (this.shadow && this.shadow.active) {
      this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 150 });
    }
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 180,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene) {
    this.clearBurn();
    this.clearGoatFx();
    if (this.shadow && this.shadow.active) this.shadow.destroy();
    if (this.bow && this.bow.active) this.bow.destroy();
    if (this.aura && this.aura.active) this.aura.destroy();
    if (this.eliteGlow && this.eliteGlow.active) this.eliteGlow.destroy();
    if (this.eliteTag && this.eliteTag.active) this.eliteTag.destroy();
    super.destroy(fromScene);
  }
}

// ------------------------------------------------------------------ Boss

class Boss extends Enemy {
  constructor(scene, x, y, level, elite) {
    super(scene, x, y, 'boss', level, elite);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = elite ? '精英史莱姆王' : '史莱姆王';
    this.bossWeapon = 'slime_staff';
    this.maxHp = Math.round(560 * (1 + 0.65 * (round - 1)) * (elite ? 1.6 : 1) * BOSS_BALANCE.hp);
    this.hp = this.maxHp;
    this.damage = Math.round(18 * (1 + 0.32 * (round - 1)) * (elite ? 1.3 : 1) * BOSS_BALANCE.damage);
    this.moveSpeed = 52;
    this.mode = 'idle';
    this.modeTimer = 1500;
    this.nextMode = 'leap';
    this.phase2 = false;
    this.actionCount = 0;
    this.play('boss_idle');
    this.setAlpha(1);
    this.bow = null;
  }

  updateAI(time, delta) {
    if (!this.active || this.dying) return;
    this._visualTick();
    const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
    if (!p || p.isDead) {
      this.setVelocity(0, 0);
      return;
    }
    this.setFlipX(p.x < this.x);

    if (!this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.moveSpeed = 78;
      Sfx.bossRoar();
      this.scene.cameras.main.shake(220, 0.007);
      this.scene.fx.bossEnrage(this.x, this.y);
      this.scene.hud.toastQueue.push(`${this.bossName} 暴怒了！`);
    }

    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.setVelocity(Math.cos(ang) * this.moveSpeed, Math.sin(ang) * this.moveSpeed);
      if (this.modeTimer <= 0) this.pickAttack();
    } else if (this.mode === 'windup') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) this.executeAttack();
    } else if (this.mode === 'leap' || this.mode === 'charge') {
      if (this.modeTimer <= 0) {
        if (this.mode === 'leap') this.land();
        else this.endCharge();
      }
    }
  }

  pickAttack() {
    this.actionCount++;
    const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    const r = Math.random();
    if (this.phase2 && this.actionCount % 4 === 0) {
      this.summon();
      return;
    }
    if (dist > 300) {
      this.startWindup(r < 0.55 ? 'leap' : 'charge');
    } else if (r < 0.5) {
      this.startWindup('leap');
    } else if (r < 0.82) {
      this.startWindup('charge');
    } else {
      this.summon();
    }
  }

  startWindup(type) {
    this.mode = 'windup';
    this.nextMode = type;
    this.modeTimer = this.phase2 ? 380 : 520;
    this.setVelocity(0, 0);
    this.setTint(0xffb08a);
    if (type === 'leap') {
      const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
      this.scene.fx.telegraph(p.x, p.y, 46, 0xff9a5a, this.modeTimer);
    }
  }

  executeAttack() {
    this.clearTint();
    const p = this.scene.targetPlayer ? this.scene.targetPlayer() : this.scene.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    if (this.nextMode === 'leap') {
      this.setVelocity(Math.cos(ang) * 450, Math.sin(ang) * 450);
      this.mode = 'leap';
      this.modeTimer = 360;
    } else {
      this.setVelocity(Math.cos(ang) * 440, Math.sin(ang) * 440);
      this.mode = 'charge';
      this.modeTimer = 650;
      this.setTint(0xff7a5a);
    }
  }

  land() {
    this.setVelocity(0, 0);
    this.mode = 'idle';
    this.modeTimer = this.phase2 ? 1000 : 1500;
    this.scene.fx.bossSlam(this.x, this.y + 30);
    this.scene.cameras.main.shake(240, 0.009);
    Sfx.explosion();
    const n = this.phase2 ? 18 : 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
      this.scene.spawnEnemyOrb(this.x, this.y + 20, a, Math.round(this.damage * 0.75));
    }
  }

  endCharge() {
    this.clearTint();
    this.setVelocity(0, 0);
    this.mode = 'idle';
    this.modeTimer = this.phase2 ? 800 : 1200;
  }

  summon() {
    this.setVelocity(0, 0);
    this.mode = 'idle';
    this.modeTimer = 1500;
    Sfx.bossRoar();
    this.scene.cameras.main.shake(180, 0.005);
    this.scene.fx.summonBurst(this.x, this.y);
    const count = this.isElite ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.62;
      const sx = clamp(this.x + Math.cos(a) * 78, ARENA.left + 34, ARENA.right - 34);
      const sy = clamp(this.y + Math.sin(a) * 62, ARENA.top + 34, ARENA.bottom - 34);
      this.scene.spawnEnemyAt('slime', sx, sy, true);
    }
  }

  die() {
    finishBossDeath(this);
  }
}
