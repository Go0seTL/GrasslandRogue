/* 野猪王、蘑菇怪客与共享 Boss 死亡流程 */

function finishBossDeath(boss) {
  if (boss.dying) return;
  boss.dying = true;
  boss.active = false;
  if (boss.clearBurn) boss.clearBurn();
  if (boss.clearGoatFx) boss.clearGoatFx();
  if (boss.clearKingFx) boss.clearKingFx();
  if (boss.body) boss.body.enable = false;
  boss.setVelocity(0, 0);
  boss.clearTint();
  boss.scene.onEnemyKilled(boss);
  boss.scene.onBossDefeated(boss);
  Sfx.explosion();
  Sfx.bossRoar();
  boss.scene.fx.bossDeath(boss.x, boss.y);
  boss.scene.cameras.main.shake(420, 0.014);
  if (boss.aura) boss.aura.stop();
  const fade = (obj) => {
    if (obj && obj.active) boss.scene.tweens.add({ targets: obj, alpha: 0, duration: 400 });
  };
  fade(boss.shadow);
  fade(boss.eliteGlow);
  fade(boss.eliteTag);
  fade(boss.crown);
  fade(boss.shield);
  fade(boss.fiendGlow);
  boss.scene.tweens.add({
    targets: boss, alpha: 0, scaleX: 0.55, scaleY: 0.55, duration: 850, ease: 'Sine.In',
    onComplete: () => boss.destroy(),
  });
}

class BoarKingBoss extends Enemy {
  constructor(scene, x, y, level, elite) {
    super(scene, x, y, 'boar_boss', level, elite);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = elite ? '精英野猪王' : '野猪王';
    this.bossWeapon = 'boar_axe';
    this.maxHp = Math.round(560 * (1 + 0.65 * (round - 1)) * (elite ? 1.6 : 1));
    this.hp = this.maxHp;
    this.baseDamage = Math.round(20 * (1 + 0.32 * (round - 1)) * (elite ? 1.3 : 1));
    this.damage = this.baseDamage;
    const scale = elite ? 2.4 : 2.0;
    this.setScale(scale);
    this.shadow.setScale(this.def.shadowScale * scale);
    this.moveSpeed = 56;
    this.mode = 'idle';
    this.modeTimer = rand(1400, 2100);
    this.actionCount = 0;
    this.berserkTimer = 0;
    this.dirTimer = 0;
    this.rockTimer = 0;
    this.crownScale = elite ? 1.35 : 1.15;
    this.crownOffsetX = elite ? 38 : 32;
    this.crownOffsetY = elite ? 44 : 38;
    this.crown = scene.add.image(x, y - this.crownOffsetY, 'crown')
      .setDepth(y + this.def.depthY + 3).setScale(this.crownScale);
    this.play('boar_king_idle');
    this.setAlpha(1);
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
    if (this.crown) {
      const dir = this.flipX ? -1 : 1;
      this.crown.setPosition(this.x + this.crownOffsetX * dir, this.y - this.crownOffsetY)
        .setDepth(this.y + this.def.depthY + 3);
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.setVelocity(Math.cos(ang) * this.moveSpeed, Math.sin(ang) * this.moveSpeed);
      if (this.modeTimer <= 0) this.pickSkill();
    } else if (this.mode === 'berserk') {
      this.berserkTimer -= delta;
      this.dirTimer -= delta;
      if (this.dirTimer <= 0) {
        // 狂暴时也优先朝玩家冲，只加一点小幅偏移，避免笔直得毫无威胁
        const a = Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.45, 0.45);
        this.setVelocity(Math.cos(a) * 390, Math.sin(a) * 390);
        this.dirTimer = rand(240, 430);
      }
      if (this.berserkTimer <= 0) this.endBerserk();
    } else if (this.mode === 'rocks') {
      this.setVelocity(0, 0);
      this.rockTimer -= delta;
      if (this.rockTimer <= 0) {
        this.rockTimer = rand(260, 420);
        const rocks = this.isElite ? 2 : 1;
        for (let i = 0; i < rocks; i++) {
          this.scene.spawnFallingRock(
            rand(ARENA.left + 46, ARENA.right - 46),
            rand(ARENA.top + 70, ARENA.bottom - 40)
          );
        }
        this.scene.cameras.main.shake(80, 0.002);
      }
      if (this.modeTimer <= 0) {
        this.mode = 'idle';
        this.modeTimer = 1200;
      }
    }
    this.clampToArena();
  }

  // 野猪王体型很大，只靠物理世界边界仍可能把身体/贴图撞出去
  clampToArena() {
    if (!this.body) return;
    const padX = Math.min(96, this.displayWidth * 0.5 + 2);
    const padY = Math.min(96, this.displayHeight * 0.5 + 2);
    const minX = ARENA.left + padX;
    const maxX = ARENA.right - padX;
    const minY = ARENA.top + padY;
    const maxY = ARENA.bottom - padY;
    let bounced = false;
    if (this.x < minX) {
      this.x = minX;
      if (this.body.velocity.x < 0) { this.body.velocity.x *= -0.85; bounced = true; }
    } else if (this.x > maxX) {
      this.x = maxX;
      if (this.body.velocity.x > 0) { this.body.velocity.x *= -0.85; bounced = true; }
    }
    if (this.y < minY) {
      this.y = minY;
      if (this.body.velocity.y < 0) { this.body.velocity.y *= -0.85; bounced = true; }
    } else if (this.y > maxY) {
      this.y = maxY;
      if (this.body.velocity.y > 0) { this.body.velocity.y *= -0.85; bounced = true; }
    }
    if (bounced && this.mode === 'berserk') this.dirTimer = 0;
  }

  pickSkill() {
    this.actionCount++;
    if (this.actionCount % 2 === 0) this.startRockRain();
    else this.startBerserk();
  }

  startBerserk() {
    this.mode = 'berserk';
    this.berserkTimer = 2800;
    this.dirTimer = 0;
    this.damage = Math.round(this.baseDamage * 1.8);
    this.setTint(0xff7a5a);
    Sfx.bossRoar();
    this.scene.cameras.main.shake(250, 0.007);
    this.scene.hud.toastQueue.push(`${this.bossName} 进入狂暴！`);
    const p = this.scene.player;
    const a = p
      ? Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.3, 0.3)
      : rand(0, Math.PI * 2);
    this.setVelocity(Math.cos(a) * 390, Math.sin(a) * 390);
  }

  endBerserk() {
    this.mode = 'idle';
    this.modeTimer = 1200;
    this.damage = this.baseDamage;
    this.clearTint();
    this.setVelocity(0, 0);
  }

  startRockRain() {
    this.mode = 'rocks';
    this.modeTimer = 2600;
    this.rockTimer = 250;
    this.setVelocity(0, 0);
    Sfx.bossRoar();
    this.scene.cameras.main.shake(2400, 0.002);
    this.scene.hud.toastQueue.push('石头雨来了！');
  }

  die() {
    finishBossDeath(this);
  }

  destroy(fromScene) {
    if (this.crown && this.crown.active) this.crown.destroy();
    super.destroy(fromScene);
  }
}

class MushroomFiendBoss extends Enemy {
  constructor(scene, x, y, level, elite) {
    super(scene, x, y, 'mushroom_boss', level, elite);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = elite ? '精英蘑菇怪客' : '蘑菇怪客';
    this.bossWeapon = 'mushroom_orb';
    this.maxHp = Math.round(560 * (1 + 0.65 * (round - 1)) * (elite ? 1.6 : 1));
    this.hp = this.maxHp;
    this.damage = Math.round(16 * (1 + 0.32 * (round - 1)) * (elite ? 1.3 : 1));
    const scale = elite ? 2.4 : 2.2;
    this.setScale(scale);
    this.shadow.setScale(this.def.shadowScale * scale);
    this.moveSpeed = 38;
    this.mode = 'idle';
    this.modeTimer = 1600;
    this.actionCount = 0;
    this.reflectUntil = 0;
    this.shield = null;
    this.ringBursts = 0;
    this.ringTimer = 0;
    this.fiendGlow = scene.add.image(x, y, 'glow')
      .setTint(0xb07bff).setScale(elite ? 2.3 : 2.0).setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
    this.play('mushroom_fiend_idle');
    this.setAlpha(1);
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
    if (this.fiendGlow) {
      this.fiendGlow.setPosition(this.x, this.y).setDepth(this.y + this.def.depthY - 1);
      this.fiendGlow.setAlpha(0.24 + Math.sin(time * 0.005) * 0.08);
    }
    if (this.shield && this.shield.active) {
      this.shield.setPosition(this.x, this.y).setDepth(this.y + this.def.depthY + 3);
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.setVelocity(Math.cos(ang) * this.moveSpeed, Math.sin(ang) * this.moveSpeed);
      if (this.modeTimer <= 0) this.pickSkill();
    } else if (this.mode === 'reflect') {
      this.setVelocity(0, 0);
      if (time >= this.reflectUntil) this.endReflect();
    } else if (this.mode === 'rings') {
      this.setVelocity(0, 0);
      if (this.ringBursts > 0) {
        this.ringTimer -= delta;
        if (this.ringTimer <= 0) {
          this.fireRing();
          this.ringBursts--;
          this.ringTimer = 320;
        }
      } else {
        this.mode = 'idle';
        this.modeTimer = 1400;
      }
    }
  }

  pickSkill() {
    this.actionCount++;
    if (this.actionCount % 2 === 1) this.startReflect();
    else this.startRings();
  }

  startReflect() {
    this.mode = 'reflect';
    this.reflectUntil = this.scene.time.now + 2800;
    this.setVelocity(0, 0);
    if (!this.shield || !this.shield.active) {
      this.shield = this.scene.add.image(this.x, this.y, 'ring')
        .setTint(0x9fd8ff).setScale(this.isElite ? 2.3 : 2.0).setAlpha(0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.y + this.def.depthY + 3);
      this.scene.tweens.add({ targets: this.shield, angle: 360, duration: 1800, repeat: -1 });
    }
    Sfx.bossRoar();
    this.scene.cameras.main.flash(200, 120, 200, 255);
    this.scene.hud.toastQueue.push('蘑菇怪客进入反射状态！');
  }

  endReflect() {
    this.reflectUntil = 0;
    if (this.shield && this.shield.active) {
      this.shield.destroy();
      this.shield = null;
    }
    this.mode = 'idle';
    this.modeTimer = 1200;
  }

  startRings() {
    this.mode = 'rings';
    this.ringBursts = this.isElite ? 6 : 3;
    this.ringTimer = 200;
    this.setVelocity(0, 0);
    Sfx.bossRoar();
  }

  fireRing() {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.scene.spawnEnemyOrb(this.x, this.y, a, Math.round(this.damage * 0.7), {
        speed: 220, decelAfter: 170, tint: 0xc8a0ff,
      });
    }
    this.scene.fx.ring(this.x, this.y, 0xb07bff, 0.2, 2.0, 450, 0.8, 745);
    this.scene.cameras.main.shake(100, 0.003);
  }

  die() {
    finishBossDeath(this);
  }

  destroy(fromScene) {
    if (this.shield && this.shield.active) this.shield.destroy();
    if (this.fiendGlow && this.fiendGlow.active) this.fiendGlow.destroy();
    super.destroy(fromScene);
  }
}

class BatKingBoss extends Enemy {
  constructor(scene, x, y, level, elite) {
    super(scene, x, y, 'bat_king', level, elite);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = elite ? '精英蝙蝠王' : '蝙蝠王';
    this.bossWeapon = null;
    this.maxHp = Math.round(720 * (1 + 0.55 * (round - 1)) * (elite ? 1.6 : 1));
    this.hp = this.maxHp;
    this.damage = Math.round(15 * (1 + 0.3 * (round - 1)) * (elite ? 1.3 : 1));
    const scale = elite ? 2.35 : 2.05;
    this.setScale(scale);
    this.shadow.setScale(this.def.shadowScale * scale);
    this.moveSpeed = 70;
    this.mode = 'idle';
    this.modeTimer = rand(1500, 2200);
    this.actionCount = 0;
    this.orbit = rand(0, Math.PI * 2);
    this.kingGlow = scene.add.image(x, y, 'glow')
      .setTint(0x8a4fb0).setScale(elite ? 2.0 : 1.7).setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
    this.play('bat_king_fly');
    this.setAlpha(1);
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
    if (this.kingGlow && this.kingGlow.active) {
      this.kingGlow.setPosition(this.x, this.y)
        .setDepth(this.y + this.def.depthY - 1)
        .setAlpha(0.16 + Math.sin(time * 0.006) * 0.07);
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      this.orbit += delta * 0.0011;
      const tx = p.x + Math.cos(this.orbit) * 175;
      const ty = p.y + Math.sin(this.orbit * 1.35) * 100;
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.setVelocity(Math.cos(a) * this.moveSpeed, Math.sin(a) * this.moveSpeed);
      if (this.modeTimer <= 0) this.pickSkill();
    } else if (this.mode === 'vision' || this.mode === 'teleport') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.mode = 'idle';
        this.modeTimer = 1300;
      }
    }
  }

  pickSkill() {
    this.actionCount++;
    if (this.actionCount % 2 === 1) this.startVision();
    else this.startTeleport();
  }

  startVision() {
    this.mode = 'vision';
    this.modeTimer = 900;
    this.setVelocity(0, 0);
    Sfx.bossRoar();
    this.scene.cameras.main.shake(220, 0.006);
    this.scene.cameras.main.flash(180, 40, 10, 60);
    this.scene.startVisionShrink(
      this.isElite ? 8000 : 4000,
      this.isElite ? 100 : 120
    );
    this.scene.hud.toastQueue.push(`${this.bossName} 遮蔽了你的视野！`);
  }

  startTeleport() {
    this.mode = 'teleport';
    this.modeTimer = 1200;
    this.setVelocity(0, 0);
    const p = this.scene.player;
    if (!p || p.isDead) return;
    this.scene.fx.ring(this.x, this.y, 0x8a4fb0, 0.2, 1.8, 300, 0.8, 745);
    Sfx.portal();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 140,
      onComplete: () => {
        if (!this.active || this.dying) return;
        const behind = (p.aimAngle || 0) + Math.PI;
        const x = clamp(p.x + Math.cos(behind) * 120, ARENA.left + 60, ARENA.right - 60);
        const y = clamp(p.y + Math.sin(behind) * 120, ARENA.top + 50, ARENA.bottom - 50);
        this.setPosition(x, y);
        this.scene.fx.ring(x, y, 0xb07bff, 0.15, 1.6, 300, 0.9, 746);
        Sfx.portal();
        this.scene.tweens.add({ targets: this, alpha: 1, duration: 160 });
        this.scene.time.delayedCall(260, () => {
          if (this.active && !this.dying) this.fireTeleportRing();
        });
      },
    });
  }

  fireTeleportRing() {
    const n = this.isElite ? 36 : 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.scene.spawnEnemyOrb(this.x, this.y, a, Math.round(this.damage * 0.8), {
        speed: 250,
        tint: 0xc8a0ff,
      });
    }
    this.scene.fx.ring(this.x, this.y, 0xb07bff, 0.2, 2.2, 420, 0.9, 745);
    this.scene.cameras.main.shake(120, 0.004);
    Sfx.spore();
  }

  die() {
    finishBossDeath(this);
  }

  destroy(fromScene) {
    if (this.kingGlow && this.kingGlow.active) this.kingGlow.destroy();
    super.destroy(fromScene);
  }
}

class GoatKingBoss extends Enemy {
  constructor(scene, x, y, level, elite) {
    super(scene, x, y, 'goat_king', level, elite);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = elite ? '精英山羊王' : '山羊王';
    this.bossWeapon = null;
    this.maxHp = Math.round(760 * (1 + 0.6 * (round - 1)) * (elite ? 1.6 : 1));
    this.hp = this.maxHp;
    this.damage = Math.round(18 * (1 + 0.3 * (round - 1)) * (elite ? 1.3 : 1));
    const scale = elite ? 2.4 : 2.15;
    this.setScale(scale);
    this.shadow.setScale(this.def.shadowScale * scale);
    this.moveSpeed = 55;
    this.mode = 'idle';
    this.modeTimer = rand(1400, 2000);
    this.actionCount = 0;
    this.phase2 = false;
    this.kingAngles = [];
    this.kingAims = [];
    this.kingBeams = [];
    this.kingGlow = scene.add.image(x, y, 'glow')
      .setTint(0xd9b45a).setScale(elite ? 2.0 : 1.7).setAlpha(0.17)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
    this.play('goat_king_idle');
    this.setAlpha(1);
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
    if (this.kingGlow && this.kingGlow.active) {
      this.kingGlow.setPosition(this.x, this.y)
        .setDepth(this.y + this.def.depthY - 1)
        .setAlpha(0.12 + Math.sin(time * 0.005) * 0.06);
    }
    if (!this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      Sfx.bossRoar();
      this.scene.cameras.main.shake(220, 0.007);
      this.scene.hud.toastQueue.push(`${this.bossName} 暴怒了！激光数量增加！`);
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.setVelocity(Math.cos(ang) * this.moveSpeed, Math.sin(ang) * this.moveSpeed);
      if (this.modeTimer <= 0) this.startLaser(p);
    } else if (this.mode === 'windup') {
      this.setVelocity(0, 0);
      this.updateAimLines();
      if (this.modeTimer <= 0) this.fireLaser(p);
    } else {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.mode = 'idle';
        this.modeTimer = 1400;
      }
    }
  }

  startLaser(p) {
    this.clearAims();
    this.mode = 'windup';
    this.modeTimer = this.phase2 ? 700 : 850;
    this.setVelocity(0, 0);
    this.actionCount++;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const count = this.phase2 ? 5 : 3;
    const spread = this.phase2 ? 0.4 : 0.24;
    this.kingAngles = [];
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      this.kingAngles.push(a);
      const line = this.scene.add.rectangle(this.x, this.y, 820, 4, 0xff5a4a, 0.28)
        .setOrigin(0, 0.5).setRotation(a).setDepth(744).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: line, alpha: 0.7, duration: 140, yoyo: true, repeat: -1 });
      this.kingAims.push(line);
    }
    this.setTint(0xffb08a);
    this.scene.fx.ring(this.x, this.y, 0xffb08a, 0.14, 1.2, 360, 0.7, 740);
    Sfx.laserCharge();
  }

  updateAimLines() {
    this.kingAims.forEach((line) => {
      if (line && line.active) line.setPosition(this.x, this.y);
    });
  }

  fireLaser(p) {
    this.clearAims();
    this.mode = 'fire';
    this.modeTimer = 700;
    this.setVelocity(0, 0);
    this.clearTint();
    const len = 920;
    let hit = false;
    this.kingAngles.forEach((a) => {
      const glow = this.scene.add.rectangle(this.x, this.y, len, 18, 0xff5a3a, 0.26)
        .setOrigin(0, 0.5).setRotation(a).setDepth(744).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.scene.add.rectangle(this.x, this.y, len, 6, 0xfff0c0, 0.95)
        .setOrigin(0, 0.5).setRotation(a).setDepth(745).setBlendMode(Phaser.BlendModes.ADD);
      this.kingBeams.push(glow, core);
      this.scene.tweens.add({
        targets: [glow, core], alpha: 0, duration: 320,
        onComplete: () => {
          if (glow.active) glow.destroy();
          if (core.active) core.destroy();
        },
      });
      if (p && !p.isDead) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const along = dx * Math.cos(a) + dy * Math.sin(a);
        const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
        if (along > 0 && along < len && perp < 24) hit = true;
      }
    });
    if (hit && p && !p.isDead) {
      p.takeDamage(Math.round(this.damage * 1.25), this.x, this.y, this.scene.time.now);
      this.scene.fx.hitSpark(p.x, p.y);
    }
    this.scene.cameras.main.shake(220, 0.007);
    Sfx.laser();
  }

  clearAims() {
    this.kingAims.forEach((line) => {
      if (!line) return;
      this.scene.tweens.killTweensOf(line);
      if (line.active) line.destroy();
    });
    this.kingAims = [];
  }

  clearKingFx() {
    this.clearAims();
    this.kingBeams.forEach((beam) => {
      if (!beam) return;
      this.scene.tweens.killTweensOf(beam);
      if (beam.active) beam.destroy();
    });
    this.kingBeams = [];
  }

  die() {
    finishBossDeath(this);
  }

  destroy(fromScene) {
    this.clearKingFx();
    if (this.kingGlow && this.kingGlow.active) this.kingGlow.destroy();
    super.destroy(fromScene);
  }
}

class SatanBoss extends Enemy {
  constructor(scene, x, y, level) {
    super(scene, x, y, 'satan', level, false);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = '撒旦';
    this.bossWeapon = null;
    const base = 560 * (1 + 0.65 * (round - 1));
    this.maxHp = Math.round(base * 7);
    this.hp = this.maxHp;
    this.damage = Math.round(24 * (1 + 0.32 * (round - 1)));
    this.setScale(2.2);
    this.shadow.setScale(this.def.shadowScale * 2.2);
    this.moveSpeed = 42;
    this.phase = 1;
    this.mode = 'idle';
    this.modeTimer = 1600;
    this.throwTimer = 1100;
    this.actionCount = 0;
    this.dashHitDone = false;
    this.beamAngle = 0;
    this.phase2Beam = null;
    this.beamNextTick = 0;
    this.satanGlow = scene.add.image(x, y, 'glow')
      .setTint(0xff3a2a).setScale(2.2).setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
    this.play('satan_idle');
    this.setAlpha(1);
  }

  updateAI(time, delta) {
    if (!this.active || this.dying) return;
    this._visualTick();
    const p = this.scene.player;
    if (!p || p.isDead) {
      this.setVelocity(0, 0);
      this.clearSatanBeam();
      return;
    }
    this.setFlipX(p.x < this.x);
    if (this.satanGlow && this.satanGlow.active) {
      this.satanGlow.setPosition(this.x, this.y)
        .setDepth(this.y + this.def.depthY - 1)
        .setAlpha(0.16 + Math.sin(time * 0.006) * 0.07);
    }
    if (this.phase === 2) {
      this.updatePhase2(time, delta, p);
      return;
    }
    this.throwTimer -= delta;
    if (this.throwTimer <= 0) {
      this.throwTimer = rand(1500, 2300);
      this.throwTrident(p);
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      this.setVelocity(Math.cos(ang) * this.moveSpeed, Math.sin(ang) * this.moveSpeed);
      if (this.modeTimer <= 0) this.pickSkill(p);
    } else if (this.mode === 'summon') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.scene.spawnDemonGuards(randInt(6, 10));
        this.mode = 'idle';
        this.modeTimer = 1600;
      }
    } else if (this.mode === 'hand') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.scene.spawnSatanHand(p.x, p.y);
        this.mode = 'idle';
        this.modeTimer = 1500;
      }
    } else if (this.mode === 'dashWindup') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.mode = 'dash';
        this.modeTimer = 320;
        this.dashHitDone = false;
        const ang = Math.atan2(p.y - this.y, p.x - this.x);
        this.setVelocity(Math.cos(ang) * 560, Math.sin(ang) * 560);
        this.scene.cameras.main.shake(100, 0.004);
      }
    } else if (this.mode === 'dash') {
      if (!this.dashHitDone && dist2(this.x, this.y, p.x, p.y) < 95 * 95) {
        this.dashHitDone = true;
        p.takeDamage(Math.round(this.damage * 1.5), this.x, this.y, this.scene.time.now);
        this.scene.cameras.main.shake(180, 0.007);
      }
      if (this.modeTimer <= 0) {
        this.mode = 'idle';
        this.modeTimer = 1300;
      }
    }
  }

  pickSkill(p) {
    this.actionCount++;
    const roll = this.actionCount % 3;
    if (roll === 1) {
      this.mode = 'summon';
      this.modeTimer = 750;
      this.setVelocity(0, 0);
      this.scene.hud.toastQueue.push('撒旦召唤恶魔卫兵！');
      Sfx.bossRoar();
    } else if (roll === 2) {
      this.mode = 'hand';
      this.modeTimer = 650;
      this.setVelocity(0, 0);
      this.scene.hud.toastQueue.push('撒旦的巨掌落下了！');
      Sfx.bossRoar();
    } else {
      this.mode = 'dashWindup';
      this.modeTimer = 600;
      this.setVelocity(0, 0);
      this.scene.fx.ring(this.x, this.y, 0xff5a3a, 0.2, 2.0, 500, 0.8, 745);
      this.scene.hud.toastQueue.push('撒旦准备三叉戟突刺！');
      Sfx.bossRoar();
    }
  }

  throwTrident(p) {
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    this.scene.spawnEnemyOrb(this.x, this.y, ang, Math.round(this.damage * 0.8), {
      speed: 430, tint: 0xff5a3a, texture: 'weapon_trident', scale: 1.25,
    });
    this.scene.fx.muzzle(this.x, this.y, ang, 0xff5a3a, 5);
    Sfx.bowRelease();
  }

  updatePhase2(time, delta, p) {
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    this.setVelocity(Math.cos(ang) * 22, Math.sin(ang) * 22);
    const target = ang;
    this.beamAngle = Phaser.Math.Angle.RotateTo(this.beamAngle, target, 0.018);
    if (!this.phase2Beam) {
      const glow = this.scene.add.rectangle(this.x, this.y - 10, 760, 34, 0xff2a1a, 0.27)
        .setOrigin(0, 0.5).setDepth(740).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.scene.add.rectangle(this.x, this.y - 10, 760, 10, 0xffb04a, 0.95)
        .setOrigin(0, 0.5).setDepth(741).setBlendMode(Phaser.BlendModes.ADD);
      this.phase2Beam = { glow, core };
    }
    this.phase2Beam.glow.setPosition(this.x, this.y - 10).setRotation(this.beamAngle)
      .setAlpha(0.22 + Math.sin(time * 0.03) * 0.08);
    this.phase2Beam.core.setPosition(this.x, this.y - 10).setRotation(this.beamAngle);
    if (time >= this.beamNextTick) {
      this.beamNextTick = time + 140;
      const len = 760;
      const cos = Math.cos(this.beamAngle);
      const sin = Math.sin(this.beamAngle);
      const dx = p.x - this.x;
      const dy = p.y - (this.y - 10);
      const along = dx * cos + dy * sin;
      const perp = Math.abs(-dx * sin + dy * cos);
      if (along > 0 && along < len && perp < 34) {
        p.takeDamage(Math.round(this.damage * 0.5), this.x, this.y, this.scene.time.now);
        this.scene.fx.hitSpark(p.x, p.y);
      }
      this.scene.cameras.main.shake(30, 0.001);
      if (time % 500 < 140) Sfx.shoot();
    }
  }

  clearSatanBeam() {
    if (!this.phase2Beam) return;
    const beam = this.phase2Beam;
    this.phase2Beam = null;
    if (beam.glow.active) beam.glow.destroy();
    if (beam.core.active) beam.core.destroy();
  }

  die() {
    if (this.phase === 1) {
      this.phase = 2;
      this.maxHp = Math.ceil(this.maxHp / 3);
      this.hp = this.maxHp;
      this.mode = 'phase2';
      this.modeTimer = 0;
      this.beamNextTick = 0;
      this.setTint(0xff3a2a);
      this.scene.cameras.main.flash(320, 255, 60, 30);
      this.scene.cameras.main.shake(360, 0.01);
      Sfx.bossRoar();
      this.scene.hud.toastQueue.push('撒旦进入第二阶段：硫磺火！');
      return;
    }
    this.clearSatanBeam();
    finishBossDeath(this);
    if (this.scene.onSatanDefeated) this.scene.onSatanDefeated(this);
  }

  destroy(fromScene) {
    this.clearSatanBeam();
    if (this.satanGlow && this.satanGlow.active) this.satanGlow.destroy();
    super.destroy(fromScene);
  }
}

class DragonBabyBoss extends Enemy {
  constructor(scene, x, y, level) {
    super(scene, x, y, 'dragon_baby', level, false);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = '飞龙宝宝';
    this.bossWeapon = null;
    this.maxHp = Math.round(620 * (1 + 0.65 * (round - 1)));
    this.hp = this.maxHp;
    this.damage = Math.round(18 * (1 + 0.32 * (round - 1)));
    this.setScale(2.15);
    this.shadow.setScale(this.def.shadowScale * 2.15);
    this.moveSpeed = 58;
    this.mode = 'idle';
    this.modeTimer = 1500;
    this.actionCount = 0;
    this.fireTimer = 1200;
    this.phase2 = false;
    this.breathBeam = null;
    this.breathFlag = null;
    this.breathAngle = 0;
    this.breathNextTick = 0;
    this.diveHit = false;
    this.babyGlow = scene.add.image(x, y, 'glow')
      .setTint(0x7fd06a).setScale(2.0).setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
    this.play('dragon_baby_idle');
    this.setAlpha(1);
  }

  updateAI(time, delta) {
    if (!this.active || this.dying) return;
    this._visualTick();
    const p = this.scene.player;
    if (!p || p.isDead) {
      this.setVelocity(0, 0);
      this.clearBreath();
      return;
    }
    this.setFlipX(p.x < this.x);
    if (this.babyGlow && this.babyGlow.active) {
      this.babyGlow.setPosition(this.x, this.y)
        .setDepth(this.y + this.def.depthY - 1)
        .setAlpha(0.14 + Math.sin(time * 0.006) * 0.06);
    }
    if (!this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.moveSpeed = 76;
      Sfx.bossRoar();
      this.scene.cameras.main.shake(220, 0.006);
      this.scene.hud.toastQueue.push('飞龙宝宝暴怒了！');
    }
    this.modeTimer -= delta;
    if (this.mode === 'idle') {
      const orbit = time * 0.0012;
      const tx = p.x + Math.cos(orbit) * 170;
      const ty = p.y + Math.sin(orbit * 1.4) * 105;
      const a = Math.atan2(ty - this.y, tx - this.x);
      this.setVelocity(Math.cos(a) * this.moveSpeed, Math.sin(a) * this.moveSpeed);
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.phase2 ? 1100 : 1600;
        this.throwFire(p);
      }
      if (this.modeTimer <= 0) this.pickSkill(p);
    } else if (this.mode === 'breathWindup') {
      this.setVelocity(0, 0);
      if (this.breathFlag) {
        this.breathFlag.setPosition(this.x, this.y - 6);
      }
      if (this.modeTimer <= 0) this.fireBreath(p);
    } else if (this.mode === 'breath') {
      this.setVelocity(0, 0);
      this.updateBreath(time, p);
      if (this.modeTimer <= 0) {
        this.clearBreath();
        this.mode = 'idle';
        this.modeTimer = 1300;
      }
    } else if (this.mode === 'diveWindup') {
      this.setVelocity(0, 0);
      if (this.modeTimer <= 0) {
        this.mode = 'dive';
        this.modeTimer = 420;
        this.diveHit = false;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        this.setVelocity(Math.cos(a) * 620, Math.sin(a) * 620);
        this.scene.cameras.main.shake(100, 0.004);
      }
    } else if (this.mode === 'dive') {
      if (!this.diveHit && dist2(this.x, this.y, p.x, p.y) < 90 * 90) {
        this.diveHit = true;
        p.takeDamage(Math.round(this.damage * 1.3), this.x, this.y, this.scene.time.now);
        this.scene.cameras.main.shake(160, 0.006);
      }
      if (this.modeTimer <= 0) {
        this.mode = 'idle';
        this.modeTimer = 1200;
      }
    }
  }

  pickSkill(p) {
    this.actionCount++;
    const roll = this.actionCount % 3;
    if (roll === 1) {
      this.startBreath(p);
    } else if (roll === 2) {
      this.mode = 'diveWindup';
      this.modeTimer = 600;
      this.setVelocity(0, 0);
      this.scene.hud.toastQueue.push('飞龙宝宝准备俯冲！');
    } else {
      this.throwFire(p);
      this.modeTimer = 900;
    }
  }

  throwFire(p) {
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    const n = this.phase2 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.16;
      this.scene.spawnEnemyOrb(this.x, this.y, a, Math.round(this.damage * 0.7), {
        speed: 330, tint: 0xff8a3a,
      });
    }
    this.scene.fx.muzzle(this.x, this.y, base, 0xff8a3a, 3);
    Sfx.spore();
  }

  startBreath(p) {
    this.mode = 'breathWindup';
    this.modeTimer = 700;
    this.setVelocity(0, 0);
    this.breathAngle = Math.atan2(p.y - this.y, p.x - this.x);
    this.clearBreath();
    this.breathFlag = this.scene.add.rectangle(this.x, this.y - 6, 620, 6, 0xff5a2a, 0.35)
      .setOrigin(0, 0.5).setDepth(744).setBlendMode(Phaser.BlendModes.ADD)
      .setRotation(this.breathAngle);
    this.scene.tweens.add({
      targets: this.breathFlag, alpha: 0.8, duration: 120, yoyo: true, repeat: -1,
    });
    this.scene.hud.toastQueue.push('飞龙宝宝开始蓄力龙息！');
  }

  fireBreath(p) {
    if (this.breathFlag) {
      this.scene.tweens.killTweensOf(this.breathFlag);
      this.breathFlag.destroy();
      this.breathFlag = null;
    }
    this.mode = 'breath';
    this.modeTimer = 750;
    this.breathNextTick = 0;
    this.setVelocity(0, 0);
    const glow = this.scene.add.rectangle(this.x, this.y - 6, 620, 28, 0xff3a1a, 0.25)
      .setOrigin(0, 0.5).setDepth(740).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.scene.add.rectangle(this.x, this.y - 6, 620, 10, 0xffc04a, 0.95)
      .setOrigin(0, 0.5).setDepth(741).setBlendMode(Phaser.BlendModes.ADD);
    this.breathBeam = { glow, core };
    this.scene.cameras.main.shake(140, 0.004);
    Sfx.laser();
  }

  updateBreath(time, p) {
    if (!this.breathBeam) return;
    this.breathBeam.glow.setPosition(this.x, this.y - 6).setRotation(this.breathAngle);
    this.breathBeam.core.setPosition(this.x, this.y - 6).setRotation(this.breathAngle);
    if (time >= this.breathNextTick) {
      this.breathNextTick = time + 140;
      const len = 620;
      const cos = Math.cos(this.breathAngle);
      const sin = Math.sin(this.breathAngle);
      const dx = p.x - this.x;
      const dy = p.y - (this.y - 6);
      const along = dx * cos + dy * sin;
      const perp = Math.abs(-dx * sin + dy * cos);
      if (along > 0 && along < len && perp < 30) {
        p.takeDamage(Math.round(this.damage * 0.6), this.x, this.y, this.scene.time.now);
        this.scene.fx.hitSpark(p.x, p.y);
      }
    }
  }

  clearBreath() {
    if (this.breathFlag) {
      this.scene.tweens.killTweensOf(this.breathFlag);
      if (this.breathFlag.active) this.breathFlag.destroy();
      this.breathFlag = null;
    }
    if (this.breathBeam) {
      const beam = this.breathBeam;
      this.breathBeam = null;
      if (beam.glow.active) beam.glow.destroy();
      if (beam.core.active) beam.core.destroy();
    }
  }

  die() {
    this.clearBreath();
    finishBossDeath(this);
  }

  destroy(fromScene) {
    this.clearBreath();
    if (this.babyGlow && this.babyGlow.active) this.babyGlow.destroy();
    super.destroy(fromScene);
  }
}
