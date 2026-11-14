/* 本局佣兵：暄暄（黑刃近战）与亮宝（手雷） */

const MERC_DEFS = {
  xuan: {
    name: '暄暄',
    texture: 'merc_xuan_0',
    walkAnim: 'merc_xuan_walk',
    hp: 180,
    cost: 120,
    speed: 108,
    restMs: 2000,
    defaultName: '黑刃',
    defaultWeapon: {
      id: 'merc_blade', name: '黑刃', melee: true, damage: 45,
      range: 140, arc: 1.55, fireRate: 0.75, quality: 'purple',
    },
  },
  liang: {
    name: '亮宝',
    texture: 'merc_liang_0',
    walkAnim: 'merc_liang_walk',
    hp: 220,
    cost: 160,
    speed: 88,
    restMs: 2600,
    defaultName: '手雷',
    defaultWeapon: {
      id: 'merc_grenade', name: '手雷', grenade: true, damage: 38,
      radius: 70, fireRate: 1.5, quality: 'red',
    },
  },
};

const MERC_GRENADE_BURN = { duration: 2000, dps: 10 };

class Mercenary extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    const def = MERC_DEFS[type] || MERC_DEFS.xuan;
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(18, 12, false);
    this.body.setOffset(9, 26);

    this.mercType = type;
    this.mercDef = def;
    this.mercName = def.name;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.cost = def.cost;
    this.speed = def.speed;
    this.state = 'neutral';
    this.recruited = false;
    this.dead = false;
    this.invulnUntil = 0;
    this.lastTouchAt = 0;
    this.nextAttackAt = 0;
    this.burstEnd = 0;
    this.restEnd = 0;
    this.target = null;

    this.defaultWeapon = def.defaultWeapon;
    this.givenWeapon = null;
    this.weaponName = def.defaultName;
    this.attackIndex = 0;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = rand(1200, 2200);

    this.shadow = scene.add.image(x, y + 19, 'shadow')
      .setAlpha(0.25).setScale(0.95).setDepth(y + 18);
    this.label = scene.add.text(x, y - 64, '', UI.textStyle(9, {
      color: '#ffe9a8', strokeThickness: 3, bold: true, shadow: false,
    })).setOrigin(0.5).setDepth(900);
    this.hpG = scene.add.graphics().setDepth(899);
    this.setDepth(y + 20);
    this.setAlpha(1);
    this.setTexture(def.texture);
    this.updateLabel();
  }

  get weapon() {
    return this.givenWeapon || this.defaultWeapon;
  }

  get resting() {
    return this.scene.time.now < this.restEnd;
  }

  recruit() {
    this.recruited = true;
    this.state = 'recruited';
    const now = this.scene.time.now;
    this.burstEnd = now + 4200;
    this.restEnd = 0;
    this.nextAttackAt = now + 450;
    this.updateLabel();
  }

  giveWeapon(id, weapon) {
    const w = WEAPONS[id] || weapon;
    if (!w) return;
    this.givenWeapon = w;
    this.weaponName = `${this.mercDef.defaultName} + ${w.name}`;
    this.nextAttackAt = this.scene.time.now + 250;
    this.updateLabel();
  }

  takeDamage(amount, srcX, srcY) {
    if (!this.recruited || this.dead) return;
    const now = this.scene.time.now;
    if (now < this.invulnUntil) return;
    this.invulnUntil = now + 260;
    this.hp -= amount;
    this.setTintFill(0xff5a4a);
    this.scene.time.delayedCall(70, () => {
      if (this.active && !this.dead) this.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.setVelocity(0, 0);
    this.body.enable = false;
    this.label.destroy();
    this.hpG.destroy();
    this.shadow.destroy();
    this.scene.hud.toastQueue.push(`${this.mercName} 倒下了……`);
    this.scene.tweens.add({
      targets: this, alpha: 0, angle: 90, duration: 450,
      onComplete: () => {
        if (this.active) this.destroy();
      },
    });
    if (this.scene.onMercenaryDead) this.scene.onMercenaryDead(this);
  }

  findNearestEnemy(maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    this.scene.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  update(time, delta, player) {
    if (!this.active || this.dead) return;
    if (!this.recruited) {
      this.setVelocity(0, 0);
      if (player) this.setFlipX(player.x < this.x);
      this.updateVisual(time, false);
      return;
    }
    if (!player || player.isDead) {
      this.setVelocity(0, 0);
      this.updateVisual(time, false);
      return;
    }

    if (this.burstEnd === 0) this.burstEnd = time + 4200;
    if (time >= this.burstEnd) {
      this.restEnd = time + this.mercDef.restMs;
      this.burstEnd = this.restEnd + 4200;
    }
    const resting = time < this.restEnd;

    this.target = this.findNearestEnemy(430);
    let moveTo = null;
    let stopDist = 0;
    const dw = this.defaultWeapon;
    if (this.target) {
      moveTo = this.target;
      stopDist = dw.grenade ? 300 : (dw.melee ? dw.range * 0.72 : 280);
    } else {
      const side = player.flipX ? 1 : -1;
      moveTo = { x: player.x + side * 58, y: player.y + 26 };
      stopDist = 24;
    }
    const dx = moveTo.x - this.x;
    const dy = moveTo.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.strafeTimer -= delta;
    if (this.strafeTimer <= 0) {
      this.strafe *= -1;
      this.strafeTimer = rand(1200, 2400);
    }
    if (dist > stopDist + 8) {
      const a = Math.atan2(dy, dx);
      const sp = this.speed * (resting ? 0.5 : 1);
      this.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      this.setFlipX(Math.cos(a) < 0);
      if (!this.anims.isPlaying) this.play(this.mercDef.walkAnim, true);
    } else {
      // 攻击时保持横向移动，不要站桩
      const a = Math.atan2(dy, dx) + this.strafe * Math.PI / 2;
      const sp = this.speed * (resting ? 0.32 : 0.55);
      this.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      this.setFlipX(Math.cos(Math.atan2(dy, dx)) < 0);
      if (!this.anims.isPlaying) this.play(this.mercDef.walkAnim, true);
    }

    if (!resting && this.target && time >= this.nextAttackAt) {
      const attackAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      const attackDist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
      const candidates = [];
      [dw, this.givenWeapon].forEach((w) => {
        if (!w) return;
        const maxRange = w.grenade ? 430 : (w.melee ? w.range : 470);
        if (attackDist <= maxRange) candidates.push(w);
      });
      if (candidates.length > 0) {
        const w = candidates[this.attackIndex % candidates.length];
        this.attackIndex++;
        this.attack(this.target, attackAngle, w, time);
      }
    }
    this.updateVisual(time, resting);
  }

  updateVisual(time, resting) {
    this.shadow.setPosition(this.x, this.y + 19).setDepth(this.y + 18);
    this.setDepth(this.y + 20);
    this.label.setPosition(this.x, this.y - 64).setDepth(900);
    this.hpG.clear();
    if (this.recruited) {
      const pct = clamp(this.hp / this.maxHp, 0, 1);
      this.hpG.fillStyle(0x0b1208, 0.9);
      this.hpG.fillRect(this.x - 27, this.y - 55, 54, 5);
      this.hpG.fillStyle(pct > 0.35 ? 0x67d45a : 0xe8564a, 1);
      this.hpG.fillRect(this.x - 26, this.y - 54, 52 * pct, 3);
      this.hpG.lineStyle(1, 0x7a8a62, 0.8);
      this.hpG.strokeRect(this.x - 27, this.y - 55, 54, 5);
    }
    this.updateLabel(resting);
    if (this.givenWeapon) {
      // 给武器后保持走路/待机动画正常
    }
  }

  updateLabel(resting) {
    if (!this.label || !this.label.active) return;
    if (!this.recruited) {
      this.label.setText(`佣兵 ${this.mercName} · ${this.cost} 金币`)
        .setColor('#ffe9a8');
    } else {
      const rest = resting || this.scene.time.now < this.restEnd;
      this.label.setText(`${this.mercName} · ${this.weaponName}${rest ? ' · 休息中' : ''}`)
        .setColor(rest ? '#b9c7a8' : '#fff1c4');
    }
  }

  attack(target, angle, w, time) {
    const q = QUALITIES[w.quality] || QUALITIES.white;
    const power = Math.max(0, QUALITY_ORDER.indexOf(w.quality));
    const interval = Math.max(260, (w.fireRate || 0.75) * 1000);
    this.nextAttackAt = time + interval;
    this.setFlipX(Math.cos(angle) < 0);

    if (w.grenade) {
      this.throwGrenade(target, w);
      return;
    }
    if (w.melee) {
      this.scene.meleeAttack(this, angle, w);
      Sfx.slash();
      return;
    }
    if (w.ringCount) {
      for (let i = 0; i < w.ringCount; i++) {
        const a = (i / w.ringCount) * Math.PI * 2;
        this.scene.spawnPlayerBullet(this.x, this.y - 2, a, Math.round(w.damage), {
          speed: w.bulletSpeed, tint: w.tint, pierce: w.pierce,
          color: q.color, power,
        });
      }
      this.scene.fx.shotBurst(this.x, this.y - 2, q.color, power);
      Sfx.shoot();
      return;
    }
    const px = this.x + Math.cos(angle) * 12;
    const py = this.y - 4 + Math.sin(angle) * 12;
    if (w.charge) {
      this.scene.spawnPlayerBullet(px, py, angle, Math.round(w.baseDamage + w.maxBonus), {
        speed: w.bulletSpeed, tint: null, pierce: 2,
        color: q.color, power, texture: 'charged_arrow', scale: 1.4,
      });
      Sfx.bowRelease();
      return;
    }
    const spread = w.spread || 0;
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = angle + rand(-spread, spread);
      this.scene.spawnPlayerBullet(px, py, a, Math.round(w.damage), {
        speed: w.bulletSpeed || 900, tint: w.tint, pierce: w.pierce,
        color: q.color, power,
        burn: w.id === 'flamer' ? FLAMER_BURN : null,
      });
    }
    this.scene.fx.muzzle(px, py, angle, q.color, power);
    Sfx.shoot();
  }

  throwGrenade(target, w) {
    if (this.scene.relayFx) {
      this.scene.relayFx({ k: 'grenade', x1: this.x, y1: this.y - 10, x2: target.x, y2: target.y });
    }
    const gx = this.x + Math.cos(Math.atan2(target.y - this.y, target.x - this.x)) * 18;
    const gy = this.y - 10;
    const tx = target.x;
    const ty = target.y;
    const nade = this.scene.add.image(gx, gy, 'grenade')
      .setDepth(735).setScale(1.2);
    this.scene.tweens.add({
      targets: nade,
      x: tx,
      y: ty,
      angle: 720,
      duration: 420,
      ease: 'Quad.In',
      onComplete: () => {
        if (nade.active) nade.destroy();
        this.explodeGrenade(tx, ty, w);
      },
    });
  }

  explodeGrenade(x, y, w) {
    const scene = this.scene;
    if (scene.relayFx) scene.relayFx({ k: 'explosion', x, y, rad: w.radius || 70 });
    const radius = w.radius || 70;
    scene.fx.ring(x, y, 0xff9a3a, 0.18, 1.8, 360, 0.9, 745);
    scene.fx.dust.explode(12, x, y);
    scene.fx.smoke.explode(5, x, y);
    scene.fx.sparks.explode(12, x, y);
    scene.cameras.main.shake(100, 0.004);
    scene.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dying) return;
      if (dist2(x, y, e.x, e.y) > radius * radius) return;
      e.takeDamage(Math.round(w.damage), Math.atan2(e.y - y, e.x - x));
      if (e.applyBurn) e.applyBurn(MERC_GRENADE_BURN.duration, MERC_GRENADE_BURN.dps);
      scene.fx.weaponHit(e.x, e.y, 0xff9a3a, 3);
    });
    Sfx.explosion();
  }

  destroy(fromScene) {
    if (this.shadow && this.shadow.active) this.shadow.destroy();
    if (this.label && this.label.active) this.label.destroy();
    if (this.hpG && this.hpG.active) this.hpG.destroy();
    super.destroy(fromScene);
  }
}
