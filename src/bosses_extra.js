/* 野猪王、蘑菇怪客与共享 Boss 死亡流程 */

function finishBossDeath(boss) {
  if (boss.dying) return;
  boss.dying = true;
  boss.active = false;
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
    this.crownOffsetX = elite ? 26 : 22;
    this.crownOffsetY = elite ? 46 : 40;
    this.crown = scene.add.image(x, y - this.crownOffsetY, 'crown')
      .setDepth(y + this.def.depthY + 3).setScale(this.crownScale);
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
        this.scene.spawnFallingRock(
          rand(ARENA.left + 46, ARENA.right - 46),
          rand(ARENA.top + 70, ARENA.bottom - 40)
        );
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
  constructor(scene, x, y, level) {
    super(scene, x, y, 'mushroom_boss', level, false);
    const round = scene.round || 1;
    this.isBoss = true;
    this.bossName = '蘑菇怪客';
    this.bossWeapon = 'mushroom_orb';
    this.maxHp = Math.round(560 * (1 + 0.65 * (round - 1)));
    this.hp = this.maxHp;
    this.damage = Math.round(16 * (1 + 0.32 * (round - 1)));
    const scale = 2.2;
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
      .setTint(0xb07bff).setScale(1.6).setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + this.def.depthY - 1);
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
        .setTint(0x9fd8ff).setScale(1.4).setAlpha(0.8)
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
    this.ringBursts = 3;
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
