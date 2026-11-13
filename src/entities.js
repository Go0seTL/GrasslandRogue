/* 玩家、敌人与 Boss */

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character) {
    const isSword = character === 'swordsman';
    const idle = isSword ? 'swordsman_idle' : 'player_idle';
    super(scene, x, y, idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(18, 12, false);
    this.body.setOffset(9, 26);

    this.characterId = character || 'gunner';
    this.idleTexture = idle;
    this.walkTexture = isSword ? 'swordsman_walk' : 'player_walk';
    this.walkAnim = isSword ? 'swordsman_walk' : 'player_walk';

    this.maxHp = BALANCE.playerHP;
    this.hp = this.maxHp;
    this.isDead = false;
    this.aimAngle = 0;
    this.lastMoveAngle = 0;
    this.invulnUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.nextShotAt = 0;
    this.moving = false;

    this.shadow = scene.add.image(x, y + 19, 'shadow').setAlpha(0.30);
    this.gun = scene.add.image(x, y, (WEAPONS[scene.weaponId] || WEAPONS.pistol).texture)
      .setOrigin(0.22, 0.5);
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
      const sp = BALANCE.playerSpeed * ((scene.buffs && scene.buffs.speed) || 1);
      this.body.setVelocity(mx * sp, my * sp);
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

    // 枪的位置
    if (scene.weapon && this.gun.texture.key !== scene.weapon.texture) {
      this.gun.setTexture(scene.weapon.texture);
    }
    const gx = this.x + cos * 8;
    const gy = this.y - 5 + Math.sin(aim) * 8;
    this.gun.setPosition(gx, gy);
    this.gun.setRotation(aim);
    this.gun.setFlipY(cos < 0);
    this.gun.setDepth(this.y + 21);

    if (this.backSword) {
      this.backSword.setPosition(this.x - 3, this.y + 2);
      this.backSword.setDepth(this.y + 19);
    }

    // 开火（枪手技能扫射期间由技能接管）
    if (!scene.isAimLockSkillActive() && time >= this.nextShotAt && scene.canPlayerAct() && scene.wantsToFire()) {
      this.fire(time, aim);
    }

    this.setDepth(this.y + 20);
    this.shadow.setPosition(this.x, this.y + 19).setDepth(this.y + 18);
  }

  fire(time, aim) {
    const w = this.scene.weapon || WEAPONS.pistol;
    const buffs = this.scene.buffs || {};
    this.nextShotAt = time + w.fireRate * 1000 * (buffs.fireRate || 1);
    if (w.melee) {
      this.scene.meleeAttack(this, aim, w);
      this.body.velocity.x -= Math.cos(aim) * 45;
      this.body.velocity.y -= Math.sin(aim) * 45;
      Sfx.slash();
      return;
    }
    const px = this.x + Math.cos(aim) * 2;
    const py = this.y - 2 + Math.sin(aim) * 2;
    const tip = this.gun.displayWidth * (1 - this.gun.originX);
    const fxX = this.x + Math.cos(aim) * (8 + tip);
    const fxY = this.y - 5 + Math.sin(aim) * (8 + tip);
    const spread = w.spread * (buffs.spreadMul || 1);
    const extra = buffs.twinChance && Math.random() < buffs.twinChance ? 1 : 0;
    for (let i = 0; i < w.pellets + extra; i++) {
      const a = aim + rand(-spread, spread);
      this.scene.spawnPlayerBullet(px, py, a, Math.round(w.damage * (buffs.damage || 1)), {
        speed: w.bulletSpeed * (buffs.bulletSpeed || 1),
        tint: w.tint,
        pierce: w.pierce,
      });
    }
    this.scene.fx.muzzle(fxX, fxY, aim);
    this.scene.fx.shell(this.x + Math.cos(aim) * 8, this.y - 5 + Math.sin(aim) * 8, aim);
    this.body.velocity.x -= Math.cos(aim) * (w.pellets > 1 ? 40 : 10);
    this.body.velocity.y -= Math.sin(aim) * (w.pellets > 1 ? 40 : 10);
    this.scene.cameras.main.shake(45, w.pellets > 1 ? 0.0022 : 0.0009);
    Sfx.shoot();
  }

  startDash(time, mx, my) {
    let ang;
    if (Math.hypot(mx, my) > 0.2) ang = Math.atan2(my, mx);
    else ang = this.aimAngle;
    const buffs = this.scene.buffs || {};
    this.dashUntil = time + BALANCE.dashTime * 1000;
    this.dashReadyAt = time + BALANCE.dashCooldown * 1000 * (buffs.dashCd || 1);
    this.invulnUntil = Math.max(this.invulnUntil, time + 260);
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
    this.hp = Math.max(0, this.hp - amount);
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
      if (this.scene.tryGhostSave && this.scene.tryGhostSave()) {
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
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setTexture(this.idleTexture);
    this.clearTint();
    this.setAlpha(1);
    this.gun.setVisible(false);
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
    }

    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
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

  updateAI(time, delta) {
    if (!this.active || this.dying) return;
    this._visualTick();
    const p = this.scene.player;
    if (!p || p.isDead) {
      this.setVelocity(0, 0);
      return;
    }
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const angTo = Math.atan2(dy, dx);

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
    }
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
  constructor(scene, x, y, level) {
    super(scene, x, y, 'boss', level);
    const round = scene.round || 1;
    this.maxHp = Math.round(560 * (1 + 0.65 * (round - 1)));
    this.hp = this.maxHp;
    this.damage = Math.round(18 * (1 + 0.32 * (round - 1)));
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
    const p = this.scene.player;
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
      this.scene.hud.toastQueue.push('史莱姆王暴怒了！');
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
    const p = this.scene.player;
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
      const p = this.scene.player;
      this.scene.fx.telegraph(p.x, p.y, 46, 0xff9a5a, this.modeTimer);
    }
  }

  executeAttack() {
    this.clearTint();
    const p = this.scene.player;
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
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.8;
      const sx = clamp(this.x + Math.cos(a) * 78, ARENA.left + 34, ARENA.right - 34);
      const sy = clamp(this.y + Math.sin(a) * 62, ARENA.top + 34, ARENA.bottom - 34);
      this.scene.spawnEnemyAt('slime', sx, sy, true);
    }
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.active = false;
    if (this.body) this.body.enable = false;
    this.setVelocity(0, 0);
    this.clearTint();
    this.scene.onEnemyKilled(this);
    this.scene.onBossDefeated(this);
    Sfx.explosion();
    Sfx.bossRoar();
    this.scene.fx.bossDeath(this.x, this.y);
    this.scene.cameras.main.shake(420, 0.014);
    if (this.shadow && this.shadow.active) {
      this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: 500 });
    }
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.55, scaleY: 0.55, duration: 850, ease: 'Sine.In',
      onComplete: () => this.destroy(),
    });
  }
}
