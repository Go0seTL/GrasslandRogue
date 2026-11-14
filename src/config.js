/* 草原枪手 — 全局配置 */

const GAME_W = 960;
const GAME_H = 540;

// 可活动区域（四周是树篱）
const ARENA = { left: 62, top: 78, right: 898, bottom: 470 };
const ARENA_BASE = { left: 62, top: 78, right: 898, bottom: 470 };
// 无尽挑战：地图面积约为普通地图的 4 倍
const ENDLESS_W = 1920;
const ENDLESS_H = 1080;
const ENDLESS_ARENA = { left: 62, top: 78, right: ENDLESS_W - 62, bottom: ENDLESS_H - 70 };

const SAVE_KEY = 'grassland_gunner_save_v1';

const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';

const ROUND_LEN = 6; // 每 6 关一个 Boss

const BALANCE = {
  playerHP: 100,
  playerEnergy: 100,
  energyRegen: 14,
  dashEnergyCost: 20,
  skillEnergyCost: 40,
  playerSpeed: 238,
  dashSpeed: 660,
  dashTime: 0.15,
  dashCooldown: 0.7,
  fireRate: 0.21,
  bulletSpeed: 980,
  bulletDamage: 15,
  bulletLife: 0.9,
  hurtInvuln: 900,
  clearHeal: 7,
  bossClearHeal: 28,
};

// 枪手技能：锁定最近 3 名敌人，用当前手持武器自动攻击 3 秒
const SKILL = {
  duration: 3000,
  cooldown: 12000,
  damage: 8,
  interval: 80,
  maxTargets: 3,
};

// 科学怪人：绿色巨人形态
const GIANT = {
  duration: 10000,
  cooldown: 30000,
  damage: 95,
  range: 116,
  arc: 1.45,
  attackInterval: 560,
  scale: 1.55,
};

// 火焰喷射器：命中后 2 秒灼烧
const FLAMER_BURN = { duration: 2000, dps: 8 };

// 角色升级：线性金币、较小的单级属性提升
const CHAR_UPGRADE = {
  hpPerLevel: 5,
  energyPerLevel: 5,
  damagePerLevel: 0.02,
  speedPerLevel: 0.01,
  maxSpeedBonus: 0.30,
};

// 技能强度单独升级：角色等级只加武器伤害/生存，技能伤害只吃这里的等级
const SKILL_UPGRADE = {
  baseCost: 150,
  costPerLevel: 100,
  damagePerLevel: 0.08,
};

// Boss 平衡：血量提高、伤害降低
const BOSS_BALANCE = { hp: 1.5, damage: 0.8 };

// 野猪王之斧：长按蓄力召唤石头雨，期间大幅减速
const BOAR_AXE = {
  channelMs: 650,
  rainCooldown: 1600,
  slow: 0.35,
  rockCount: 12,
};

// 吉他手：持续音浪 + 移速提升
const GUITAR = {
  duration: 6000,
  cooldown: 18000,
  radius: 128,
  tick: 380,
  damage: 16,
  speed: 1.45,
};

// 恶魔：血祭换攻速/伤害/无限能量
const DEMON = {
  duration: 5000,
  cooldown: 20000,
  damageMul: 1.4,
  fireRateMul: 0.5,
};

// 法师：持续 8 秒的跟随朝向激光
const MAGE_LASER = {
  duration: 8000,
  cooldown: 20000,
  length: 780,
  width: 22,
  tick: 180,
  damage: 12,
};

// 联机客人：通用援护爆发（客人技能按钮）
const GUEST_SKILL = { cooldown: 12000, bullets: 14, damageMul: 1.4 };

// 骑士：4 秒圣盾无敌
const KNIGHT_SHIELD = { duration: 4000, cooldown: 18000 };
// 游侠：锁敌箭雨
const RANGER_VOLLEY = { cooldown: 14000, damage: 18, arrowsPerTarget: 4, maxTargets: 3 };
// 刺客：瞬身到最近敌人身后并斩击
const ROGUE_STRIKE = { cooldown: 10000, damage: 85, radius: 82 };
// 炼金术士：毒瓶，命中后持续中毒
const ALCHEMIST_FLASK = { cooldown: 16000, damage: 6, dps: 5, duration: 4000, maxTargets: 5 };

// 吸血鬼：5 秒吸取周围最多 5 个敌人
const VAMPIRE = {
  duration: 5000,
  cooldown: 18000,
  radius: 300,
  maxTargets: 5,
  tick: 380,
  damage: 10,
  healRatio: 0.55,
};

// 品质：白 -> 绿 -> 蓝 -> 紫 -> 红 -> 金 -> 彩色
const QUALITY_ORDER = ['white', 'green', 'blue', 'purple', 'red', 'gold', 'rainbow'];
const QUALITIES = {
  white:   { name: '白色', color: 0xdfe3d8, hex: '#dfe3d8' },
  green:   { name: '绿色', color: 0x6fdd68, hex: '#6fdd68' },
  blue:    { name: '蓝色', color: 0x5ab0ff, hex: '#5ab0ff' },
  purple:  { name: '紫色', color: 0xb07bff, hex: '#b07bff' },
  red:     { name: '红色', color: 0xff6a5a, hex: '#ff6a5a' },
  gold:    { name: '金色', color: 0xffd76a, hex: '#ffd76a' },
  rainbow: { name: '彩色', color: 0xff8ae8, hex: '#ff8ae8' },
};

// 碎片规则：小怪有概率掉普通品质碎片，彩色碎片只由 Boss 掉落
const FRAGMENT_RULES = {
  dropChance: 0.35,
  bundleChance: 0.22,
  pityKills: 8,
  weights: { green: 45, blue: 28, purple: 16, red: 8, gold: 3 },
  bossWeapon: 'slime_staff',
};

// 武器：所有角色初始都是无限弹药手枪；其他武器靠碎片合成解锁
const WEAPONS = {
  pistol: {
    id: 'pistol', name: '手枪', quality: 'white', fragReq: 0, energyCost: 0, damage: 15, fireRate: 0.21,
    bulletSpeed: 980, pellets: 1, spread: 0.03, pierce: 0, tint: null,
    texture: 'gun', desc: '所有角色的初始武器。均衡、可靠、无限弹药。', iconScale: 1.5,
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', quality: 'green', fragReq: 20, energyCost: 6, damage: 9, fireRate: 0.55,
    bulletSpeed: 820, pellets: 5, spread: 0.20, pierce: 0, tint: 0xffb15a,
    texture: 'gun_shotgun', desc: '一次射出 5 发弹丸，贴脸爆发极高。', iconScale: 1.5,
  },
  smg: {
    id: 'smg', name: '冲锋枪', quality: 'blue', fragReq: 45, energyCost: 1, damage: 8, fireRate: 0.08,
    bulletSpeed: 1020, pellets: 1, spread: 0.09, pierce: 0, tint: 0x9fe8ff,
    texture: 'gun_smg', desc: '射速极快的连发武器，适合边走边打。', iconScale: 1.5,
  },
  rifle: {
    id: 'rifle', name: '猎枪', quality: 'purple', fragReq: 90, energyCost: 8, damage: 68, fireRate: 0.55,
    bulletSpeed: 1450, pellets: 1, spread: 0.01, pierce: 3, tint: 0xa8c8ff,
    texture: 'gun_rifle', desc: '单发高伤害，可穿透 2 个敌人。', iconScale: 1.35,
  },
  flamer: {
    id: 'flamer', name: '火焰喷射器', quality: 'red', fragReq: 160, energyCost: 1, damage: 5, fireRate: 0.045,
    bulletSpeed: 430, pellets: 2, spread: 0.30, pierce: 0, tint: 0xff8a3a,
    texture: 'gun_flamer', desc: '近距离持续喷火，射速极快但射程短。', iconScale: 1.4,
  },
  railgun: {
    id: 'railgun', name: '磁暴步枪', quality: 'gold', fragReq: 260, energyCost: 7, damage: 60, fireRate: 0.34,
    bulletSpeed: 1500, pellets: 1, spread: 0.005, pierce: 4, tint: 0xffe066,
    texture: 'gun_railgun', desc: '高伤害电磁弹，可连续穿透 3 个敌人。', iconScale: 1.35,
  },
  slime_staff: {
    id: 'slime_staff', name: '史莱姆王的法杖', quality: 'rainbow', fragReq: 5, energyCost: 5, damage: 30, fireRate: 0.45,
    bulletSpeed: 720, pellets: 3, spread: 0.16, pierce: 2, tint: 0x8fd463,
    texture: 'gun_staff', desc: '史莱姆王的力量。一次喷出 3 颗粘液弹，穿透 1 个敌人。', iconScale: 1.15,
  },
  knife: {
    id: 'knife', name: '小刀', quality: 'white', fragReq: 0, energyCost: 2, melee: true,
    damage: 22, fireRate: 0.30, range: 64, arc: 1.0,
    texture: 'weapon_knife', desc: '免费近战武器。挥刀范围短，但无限使用。', iconScale: 1.5,
  },
  katana: {
    id: 'katana', name: '武士刀', quality: 'purple', fragReq: 100, energyCost: 4, melee: true,
    damage: 70, fireRate: 0.45, range: 95, arc: 1.4,
    texture: 'weapon_katana', desc: '紫色品质近战武器。大范围挥砍，可同时命中多个敌人。', iconScale: 1.3,
  },
  boar_axe: {
    id: 'boar_axe', name: '野猪王之斧', quality: 'rainbow', fragReq: 5, energyCost: 10, melee: true,
    damage: 95, fireRate: 0.60, range: 112, arc: 1.6,
    texture: 'weapon_axe', desc: '野猪王的力量。大范围重斧挥砍，伤害极高。', iconScale: 1.1,
  },
  mushroom_orb: {
    id: 'mushroom_orb', name: '蘑菇怪法球', quality: 'rainbow', fragReq: 5, energyCost: 10,
    damage: 16, fireRate: 0.8, bulletSpeed: 520, ringCount: 10, spread: 0, pierce: 0, tint: 0xc8a0ff,
    texture: 'weapon_orb', desc: '蘑菇怪的力量。向四面八方发射环形法球。', iconScale: 1.2,
  },
  bow: {
    id: 'bow', name: '蓄力弓', quality: 'purple', fragReq: 100, energyCost: 6, charge: true,
    baseDamage: 25, maxBonus: 65, chargeTime: 1.2, fireRate: 0.35, bulletSpeed: 1200,
    pierce: 1, tint: 0xb07bff, texture: 'bow',
    projectileTexture: 'charged_arrow',
    desc: '长按蓄力，松开朝面向方向射出。蓄力越久伤害越高，满蓄力可穿透 2 个敌人。', iconScale: 1.0,
  },
  sniper: {
    id: 'sniper', name: '狙击枪', quality: 'purple', fragReq: 120, energyCost: 9, charge: true,
    baseDamage: 55, maxBonus: 135, chargeTime: 1.35, fireRate: 0.55, bulletSpeed: 1900,
    pierce: 4, tint: 0xa8d8ff, texture: 'gun_sniper', projectileTexture: 'sniper_bullet',
    desc: '长按蓄力狙击，满蓄力伤害极高并穿透多个敌人。', iconScale: 1.25,
  },
  boomerang: {
    id: 'boomerang', name: '回旋镖', quality: 'blue', fragReq: 60, energyCost: 6, charge: true,
    boomerang: true, baseDamage: 24, maxBonus: 42, chargeTime: 0.8, fireRate: 0.7,
    bulletSpeed: 660, pierce: 99, tint: 0xd9b45a, texture: 'weapon_boomerang',
    projectileTexture: 'weapon_boomerang',
    desc: '长按蓄力掷出回旋镖，飞出后自动返回，去程和回程都能伤害敌人。', iconScale: 1.25,
  },
  slingshot: {
    id: 'slingshot', name: '弹弓', quality: 'green', fragReq: 30, energyCost: 4, charge: true,
    baseDamage: 12, maxBonus: 30, chargeTime: 0.75, fireRate: 0.45, bulletSpeed: 980,
    pierce: 1, tint: 0xc89a5a, texture: 'weapon_slingshot', projectileTexture: 'stone_projectile',
    desc: '长按拉弓蓄力，松开射出高速石弹，蓄力越久伤害越高。', iconScale: 1.3,
  },
  crossbow: {
    id: 'crossbow', name: '弩箭', quality: 'blue', fragReq: 50, energyCost: 5, charge: true,
    baseDamage: 26, maxBonus: 52, chargeTime: 0.9, fireRate: 0.6, bulletSpeed: 1350,
    pierce: 2, tint: 0x9fe8ff, texture: 'weapon_crossbow', projectileTexture: 'bolt_projectile',
    desc: '长按上弦蓄力，松开射出可穿透的弩箭。', iconScale: 1.3,
  },
  demon_trident: {
    id: 'demon_trident', name: '恶魔三叉戟', quality: 'rainbow', fragReq: 5, energyCost: 12,
    melee: true, chargeThrow: true, damage: 120, fireRate: 0.6, range: 130, arc: 1.3,
    texture: 'weapon_trident', desc: '撒旦的三叉戟。轻点近战横扫，伤害极高；长按可当作远程武器掷出。', iconScale: 0.95,
  },
  demon_sulfur: {
    id: 'demon_sulfur', name: '恶魔硫磺火', quality: 'rainbow', fragReq: 5, energyCost: 8,
    sulfur: true, beam: true, beamKind: 'sulfur', damage: 7, fireRate: 0.12,
    beamColor: 0xff1a08, beamMid: 0xff6a1a, beamCore: 0xffd08a,
    beamLength: 430, beamWidth: 520, beamThickness: 58, beamCoreThickness: 16,
    beamRadius: 34, beamTick: 110, beamEnergy: 1,
    tint: 0xff3a1a, texture: 'weapon_sulfur',
    desc: '撒旦的硫磺火。长按喷射粗大的红色激光，持续烧穿前方敌人。', iconScale: 1.15,
  },
  fire_staff: {
    id: 'fire_staff', name: '火元素法杖', quality: 'red', fragReq: 150, energyCost: 5,
    damage: 28, fireRate: 0.52, bulletSpeed: 640, pellets: 1, spread: 0.03, pierce: 1,
    tint: 0xff8a3a, texture: 'gun_staff_fire', projectileTexture: 'fire_bolt', projectileScale: 1.25,
    burn: { duration: 2000, dps: 7 },
    desc: '凝聚火元素，发射会持续灼烧的火球。命中后 2 秒内持续掉血。', iconScale: 1.1,
  },
  water_staff: {
    id: 'water_staff', name: '水元素法杖', quality: 'blue', fragReq: 55, energyCost: 3,
    damage: 20, fireRate: 0.38, bulletSpeed: 780, pellets: 1, spread: 0.02, pierce: 2,
    tint: 0x5ad8ff, texture: 'gun_staff_water', projectileTexture: 'water_bolt', projectileScale: 1.25,
    water: true,
    desc: '发射可穿透 2 个敌人的水弹；每次命中回复 1 点能量。', iconScale: 1.1,
  },
  wind_staff: {
    id: 'wind_staff', name: '风元素法杖', quality: 'green', fragReq: 40, energyCost: 1,
    damage: 11, fireRate: 0.15, bulletSpeed: 1100, pellets: 1, spread: 0.05, pierce: 0,
    tint: 0x8ff0b0, texture: 'gun_staff_wind', projectileTexture: 'wind_blade', projectileScale: 1.15,
    desc: '高速射出风刃，单发伤害不高但射速极快，适合持续压制。', iconScale: 1.1,
  },
  goat_eye: {
    id: 'goat_eye', name: '山羊之眼', quality: 'rainbow', fragReq: 5, energyCost: 0,
    sulfur: true, beam: true, beamKind: 'goat', damage: 12, fireRate: 0.1, tint: 0xffd76a,
    beamColor: 0xffb02a, beamMid: 0xffe066, beamCore: 0xfff8d8,
    beamLength: 620, beamWidth: 640,
    beamThickness: 24, beamCoreThickness: 8, beamRadius: 30, beamTick: 90, beamEnergy: 2,
    texture: 'weapon_goat_eye',
    desc: '山羊王的眼睛。长按发射贯穿全场的金色激光，像激光鱼一样持续灼烧前方。', iconScale: 1.05,
  },
};

const CHAR_DEFS = [
  { id: 'gunner',    name: '枪手',     price: 0,    desc: '当前武器 · 自动索敌',     color: 0x2f7f78, playable: true,  portrait: 'player_idle' },
  { id: 'swordsman', name: '剑客',     price: 800,  desc: '手枪 · 万剑归宗',        color: 0x557fb0, playable: true,  portrait: 'swordsman_idle' },
  { id: 'frankenstein', name: '科学怪人', price: 3000, desc: '巨型化 · 铁拳',        color: 0x6fbf4f, playable: true,  portrait: 'frankenstein_idle' },
  { id: 'mage',      name: '法师',     price: 1800, desc: '激光 · 持续输出',        color: 0x7a4fa5, playable: true,  portrait: 'mage_0' },
  { id: 'guitarist', name: '吉他手',   price: 2200, desc: '音浪 · 移速爆发',        color: 0xd96a9a, playable: true,  portrait: 'guitarist_0' },
  { id: 'demon',     name: '恶魔',     price: 3200, desc: '血祭 · 攻速翻倍',        color: 0xb23a2c, playable: true,  portrait: 'demon_0' },
  { id: 'vampire',   name: '吸血鬼',   price: 2600, desc: '汲取 · 五人吸血',        color: 0x8a2a4a, playable: true,  portrait: 'vampire_0' },
  { id: 'knight',    name: '骑士',     price: 1200, desc: '圣盾 · 4秒无敌',         color: 0x4a6fa5, playable: true, portrait: 'knight_0' },
  { id: 'ranger',    name: '游侠',     price: 2500, desc: '箭雨 · 环形齐射',        color: 0x3f8f4a, playable: true, portrait: 'ranger_0' },
  { id: 'rogue',     name: '刺客',     price: 3500, desc: '影袭 · 瞬身斩杀',        color: 0x8a3f4a, playable: true, portrait: 'rogue_0' },
  { id: 'alchemist', name: '炼金术士', price: 5000, desc: '毒瓶 · 持续中毒',        color: 0xa58a3f, playable: true, portrait: 'alchemist_0' },
];

// 海克斯式三选一强化
const UPGRADES = [
  { id: 'big', name: '大而有力', icon: '体', color: 0xd98a4a, desc: '体型增大 10%，生命上限 +35。' },
  { id: 'swift', name: '疾风步', icon: '速', color: 0x5ab0d9, desc: '移动速度 +12%，翻滚冷却 -20%。' },
  { id: 'firepower', name: '火力全开', icon: '火', color: 0xd95a4a, desc: '武器伤害 +15%，射速 +10%。' },
  { id: 'greed', name: '拾金者', icon: '金', color: 0xe8b54a, desc: '每次击杀额外掉落 1 枚金币。' },
  { id: 'tough', name: '铁壁', icon: '盾', color: 0x7a9a5a, desc: '生命上限 +25，清房回血 +5。' },
  { id: 'skillmaster', name: '技能大师', icon: '技', color: 0x9a6ad9, desc: '技能冷却 -20%。' },
  { id: 'vampire', name: '吸血', icon: '血', color: 0xa84a5a, desc: '击杀敌人时回复 2 点生命。' },
  { id: 'focus', name: '专注', icon: '准', color: 0x8ac8e8, desc: '子弹速度 +15%，散射更小。' },
  { id: 'ghost_baby', name: '幽灵宝宝', icon: '灵', color: 0x9fd8ff, rarity: 'epic', desc: '召唤幽灵宝宝跟随作战，远程吐白色小球。主人濒死时把主人传送到安全位置并免疫 3 秒。' },
  { id: 'death_blast', name: '死亡爆破', icon: '爆', color: 0xff7a4a, rarity: 'epic', desc: '击杀敌人时有 30% 概率引发爆炸，对周围敌人造成伤害。' },
  { id: 'twin_barrage', name: '双生弹幕', icon: '双', color: 0xffa8e8, rarity: 'epic', desc: '每次射击有 35% 概率额外发射一颗子弹。' },
  { id: 'dual_wield', name: '双持大师', icon: '双', color: 0xffa8e8, rarity: 'epic', desc: '同时持有两把不同的已拥有武器，自动装备品质最高的另一把，两把武器同时开火。' },
  { id: 'treasure', name: '无限财宝', icon: '财', color: 0xe8b54a, rarity: 'epic', desc: '每活过一轮存下 200 金币，可随时点击「取财」取出；死亡则全部失去。' },
  { id: 'no_scratch', name: '不掉一根毛', icon: '净', color: 0x9fe8ff, rarity: 'epic', desc: '本轮全程无伤时，通关 Boss 获得紫色以上武器碎片和戒指碎片大礼。' },
  { id: 'armor', name: '铁甲护体', icon: '甲', color: 0x9aa8b8, desc: '受到的伤害 -15%（最多叠加到 -45%）。' },
  { id: 'regen', name: '再生', icon: '愈', color: 0x6fdd68, desc: '每 4 秒回复 2% 生命上限。' },
  { id: 'energy_core', name: '能量核心', icon: '能', color: 0x5ab0ff, desc: '能量上限 +30，能量回复 +25%。' },
  { id: 'lucky', name: '幸运', icon: '运', color: 0xffd76a, desc: '武器碎片掉落率 +60%，戒指碎片掉落率提高。' },
  { id: 'magnet', name: '磁铁', icon: '磁', color: 0x9fe8ff, desc: '金币、血包、能量包和碎片的拾取范围 +55%。' },
  { id: 'rich', name: '点金手', icon: '金', color: 0xe8b54a, desc: '金币获取量 +50%。' },
  { id: 'glass', name: '玻璃大炮', icon: '炮', color: 0xff6a5a, rarity: 'epic', desc: '武器伤害 +30%，但生命上限 -20%。' },
  { id: 'dash_master', name: '翻滚大师', icon: '闪', color: 0x9ff0e0, desc: '翻滚冷却 -25%，翻滚无敌时间延长。' },
  { id: 'pierce', name: '穿甲弹', icon: '穿', color: 0xa8c8ff, desc: '所有子弹额外穿透 1 个敌人。' },
  { id: 'crit', name: '暴击', icon: '暴', color: 0xff8a6a, desc: '子弹有 18% 概率造成双倍伤害。' },
  { id: 'thorns', name: '荆棘', icon: '刺', color: 0x6fdd68, desc: '被敌人碰到时，对敌人反伤 12 点。' },
  { id: 'second_wind', name: '第二次呼吸', icon: '生', color: 0xffd76a, rarity: 'epic', desc: '每局一次：受到致命伤害时以 30% 生命复活，并获得 2 秒无敌。' },
  { id: 'bullet_life', name: '远射', icon: '远', color: 0x8ac8e8, desc: '子弹存在时间 +30%，子弹速度 +8%。' },
  { id: 'overcharge', name: '超载', icon: '充', color: 0x5ab0ff, desc: '能量上限 +20，能量回复 +35%。' },
  { id: 'fortress', name: '堡垒', icon: '垒', color: 0x7a9a5a, desc: '生命上限 +45，体型增大 4%。' },
  { id: 'executioner', name: '处刑', icon: '刑', color: 0xff4a4a, desc: '对生命低于 30% 的敌人伤害 +25%。' },
  { id: 'first_aid', name: '急救', icon: '药', color: 0x9ff0a8, desc: '血包回复量 +50%。' },
  { id: 'scavenger', name: '拾荒者', icon: '拾', color: 0xd9b45a, desc: '血包和能量包掉落率 +30%。' },
  { id: 'quick_hands', name: '快手', icon: '快', color: 0xffa8e8, desc: '武器射速 +10%。' },
  { id: 'freeze', name: '冰霜弹', icon: '冰', color: 0x9fe8ff, desc: '子弹有 18% 概率冻结敌人 0.9 秒。' },
  { id: 'chain', name: '连锁闪电', icon: '电', color: 0x8ac8ff, desc: '子弹命中时有 18% 概率弹射到附近敌人，造成 50% 伤害。' },
  { id: 'explosive', name: '爆裂弹', icon: '爆', color: 0xff8a4a, desc: '子弹命中时有 15% 概率引发小范围爆炸。' },
  { id: 'berserk', name: '狂战士', icon: '怒', color: 0xff5a4a, desc: '生命低于 40% 时，伤害 +25%。' },
  { id: 'last_stand', name: '背水一战', icon: '守', color: 0x7a9a5a, desc: '生命低于 40% 时，受到的伤害 -20%。' },
  { id: 'bloodlust', name: '嗜血', icon: '嗜', color: 0xa84a5a, desc: '击杀敌人回复 1% 生命上限。' },
  { id: 'veteran', name: '老兵', icon: '兵', color: 0xd9b45a, desc: '生命上限 +30，受到的伤害 -5%。' },
  { id: 'adrenaline', name: '肾上腺素', icon: '激', color: 0x9ff0e0, desc: '移动速度 +8%，翻滚冷却 -15%。' },
  { id: 'sniper_focus', name: '狙击手', icon: '狙', color: 0xa8d8ff, desc: '子弹伤害 +8%，子弹速度 +10%。' },
  { id: 'gold_armor', name: '金甲', icon: '金', color: 0xe8c467, desc: '受到的伤害 -10%，金币获取 +20%。' },
];

const RINGS = {
  undying: { id: 'undying', name: '不死戒指', quality: 'gold', fragReq: 30, color: 0xffd76a, desc: '抵挡一次致命伤害。' },
  blood: { id: 'blood', name: '血红戒指', quality: 'purple', fragReq: 20, color: 0xff6a5a, desc: '每击杀一个单位，本局生命上限提高。' },
  azure: { id: 'azure', name: '蔚蓝戒指', quality: 'blue', fragReq: 15, color: 0x5ab0ff, desc: '大幅提高能量回复速度。' },
  teleport: { id: 'teleport', name: '传送戒指', quality: 'purple', fragReq: 25, color: 0xb07bff, desc: '进入传送门时随机传送到一个关卡（每局一次）。' },
  execute: { id: 'execute', name: '秒杀戒指', quality: 'gold', fragReq: 35, color: 0xff4a4a, desc: '第一次攻击直接秒杀一个单位（每局一次）。' },
  phantom: { id: 'phantom', name: '幻影戒指', quality: 'purple', fragReq: 25, color: 0x9fe8ff, desc: '获得闪避伤害的几率；移动越快，几率越高。' },
  wealth: { id: 'wealth', name: '财富戒指', quality: 'green', fragReq: 10, color: 0xffd76a, desc: '每次攻击有几率掉落金币。' },
};

const UPGRADE_REFRESH_COST = 30;

// 激活码只存哈希，不在界面/文档里写明文
const ACTIVATION_HASH = {
  tangle: 3275243731,
  super: 3517085611,
};
function hashActivation(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0;
  return h;
}

const ENEMY_LORE = {
  slime: '草原上最常见的史莱姆。会一蹦一蹦地靠近，死亡时有概率分裂成两只小史莱姆。',
  slime_mini: '大史莱姆分裂出来的小家伙。血少但数量多，别被围住。',
  goblin: '保持距离的弓手。拉弓时弓身会发亮，注意横向走位躲开箭矢。',
  bat: '绕着玩家盘旋的快速敌人。血量低，但接触伤害很烦。',
  mushroom: '第二轮开始出现的远程怪。移动缓慢，会停顿蓄力后吐出三颗孢子，注意横向走位。',
  boar: '第二轮开始出现的冲锋怪。会先停顿蓄力，然后沿直线高速冲撞，撞到墙或时间结束才停下。',
  goat: '第三轮开始出现的山羊精。会先在原地停顿蓄力，再朝锁定方向发射一道贯穿激光；看到红线就赶快横向躲开。',
  ghost: '第六轮开始出现的亡灵。平时隐身且移动缓慢，靠近玩家才会现形；受到伤害后会强制现形 3 秒，期间再次受伤会重置时间。',
  goat_king: '第六轮 Boss 之一。会停顿蓄力后扇形发射多道贯穿激光；半血后激光数量增加。',
  demon_guard: '撒旦召唤的恶魔卫兵，手持三叉戟近战突刺；血量不高但数量很多。',
  satan: '恶魔之地的统治者。第一阶段投掷三叉戟、召唤卫兵、巨掌拍击和突刺；第二阶段只剩三分之一生命，但会持续喷射硫磺火。击败后必定掉落撒旦之心。',
  dragonling: '龙巢里的小飞龙，绕圈飞行并从空中吐出火球。',
  dragon_baby: '龙巢的 Boss。会喷吐扇形火球和长条龙息，也会俯冲撞击；半血后攻击频率提高。',
  angel_guard: '天堂的守卫，白色长袍与金色圣枪。会保持距离并连续射出三发圣光弹。',
  cloud_wisp: '天堂云海中诞生的精灵，绕着玩家飘动，接触会造成伤害，血量不高但很灵活。',
  temple_knight: '披着金色铠甲的圣殿骑士，移动缓慢但生命很高，靠近后会挥剑重击。',
  angel: '最终 Boss。六翼天使，会释放环形圣光、追踪光弹并召唤天使侍从；半血后进入圣辉形态，弹幕数量和速度都会提升。击败它即可通关。',
  boss: '草原的统治者。会跳跃砸地放出环形弹幕、蓄力冲锋，半血后暴怒并召唤史莱姆。',
  boar_boss: '第二轮 Boss。会进入狂暴状态到处乱撞，撞击伤害很高；还会召唤持续一段时间的石头雨。',
  mushroom_boss: '第四轮 Boss。会短时间反射子弹，并连续发射三轮会逐渐减速的环形弹幕；精英版会发射六轮。',
  bat_king: '第五轮 Boss 之一。会遮蔽玩家视野 4 秒，也会瞬移到玩家身后发射环形弹幕；精英版效果翻倍。',
};

// 敌人基础数值（等级会在此基础上按关数成长）
const ENEMY_DEFS = {
  slime: {
    name: '史莱姆', texture: 'slime_0', hp: 34, damage: 9, coins: [1, 3],
    body: [30, 18], offset: [7, 14], shadowY: 15, shadowScale: 1.0, depthY: 15,
  },
  slime_mini: {
    name: '小史莱姆', texture: 'slime_mini_0', hp: 14, damage: 6, coins: [1, 2],
    body: [20, 12], offset: [6, 12], shadowY: 11, shadowScale: 0.7, depthY: 11,
  },
  goblin: {
    name: '哥布林弓手', texture: 'goblin_idle', hp: 46, damage: 8, coins: [1, 3],
    body: [16, 12], offset: [8, 18], shadowY: 15, shadowScale: 0.9, depthY: 16,
  },
  bat: {
    name: '蝙蝠', texture: 'bat_0', hp: 22, damage: 7, coins: [1, 2],
    body: [20, 10], offset: [6, 4], shadowY: 10, shadowScale: 0.6, depthY: 8,
  },
  bat_king: {
    name: '蝙蝠王', texture: 'bat_king_0', hp: 720, damage: 15, coins: [24, 34],
    body: [40, 20], offset: [12, 6], shadowY: 16, shadowScale: 1.5, depthY: 12,
  },
  mushroom: {
    name: '蘑菇射手', texture: 'mushroom_0', hp: 62, damage: 9, coins: [2, 4],
    body: [20, 14], offset: [8, 20], shadowY: 17, shadowScale: 1.0, depthY: 16,
  },
  boar: {
    name: '冲锋野猪', texture: 'boar_0', hp: 80, damage: 13, coins: [3, 5],
    body: [32, 16], offset: [4, 10], shadowY: 13, shadowScale: 1.2, depthY: 13,
  },
  goat: {
    name: '山羊精', texture: 'goat_0', hp: 85, damage: 12, coins: [3, 5],
    body: [24, 16], offset: [6, 14], shadowY: 14, shadowScale: 1.0, depthY: 14,
  },
  ghost: {
    name: '亡灵', texture: 'ghost_0', hp: 62, damage: 10, coins: [2, 4],
    body: [24, 18], offset: [8, 18], shadowY: 16, shadowScale: 0.9, depthY: 16,
  },
  demon_guard: {
    name: '恶魔卫兵', texture: 'demon_guard_0', hp: 110, damage: 14, coins: [3, 6],
    body: [28, 18], offset: [6, 18], shadowY: 16, shadowScale: 1.0, depthY: 16,
  },
  satan: {
    name: '撒旦', texture: 'satan_0', hp: 3920, damage: 24, coins: [80, 120],
    body: [44, 24], offset: [18, 36], shadowY: 24, shadowScale: 1.8, depthY: 22,
  },
  dragonling: {
    name: '小飞龙', texture: 'dragonling_0', hp: 85, damage: 11, coins: [3, 6],
    body: [26, 16], offset: [8, 16], shadowY: 12, shadowScale: 0.8, depthY: 12,
  },
  dragon_baby: {
    name: '飞龙宝宝', texture: 'dragon_baby_0', hp: 720, damage: 18, coins: [30, 45],
    body: [42, 22], offset: [8, 26], shadowY: 20, shadowScale: 1.4, depthY: 20,
  },
  angel_guard: {
    name: '天使侍从', texture: 'angel_guard_0', hp: 95, damage: 13, coins: [3, 5],
    body: [20, 16], offset: [7, 20], shadowY: 17, shadowScale: 0.9, depthY: 17,
  },
  cloud_wisp: {
    name: '云端精灵', texture: 'cloud_wisp_0', hp: 58, damage: 9, coins: [2, 4],
    body: [20, 12], offset: [6, 10], shadowY: 13, shadowScale: 0.7, depthY: 12,
  },
  temple_knight: {
    name: '圣殿骑士', texture: 'temple_knight_0', hp: 165, damage: 16, coins: [4, 7],
    body: [28, 18], offset: [6, 20], shadowY: 19, shadowScale: 1.05, depthY: 19,
  },
  angel: {
    name: '天使', texture: 'angel_0', hp: 900, damage: 16, coins: [100, 150],
    body: [44, 26], offset: [10, 36], shadowY: 26, shadowScale: 1.9, depthY: 24,
  },
  goat_king: {
    name: '山羊王', texture: 'goat_king_0', hp: 760, damage: 18, coins: [30, 42],
    body: [44, 22], offset: [10, 18], shadowY: 22, shadowScale: 1.45, depthY: 20,
  },
  boar_boss: {
    name: '野猪王', texture: 'boar_king_0', hp: 560, damage: 20, coins: [24, 34],
    body: [40, 20], offset: [6, 14], shadowY: 18, shadowScale: 1.35, depthY: 18,
  },
  mushroom_boss: {
    name: '蘑菇怪客', texture: 'mushroom_fiend_0', hp: 560, damage: 16, coins: [24, 34],
    body: [28, 18], offset: [10, 28], shadowY: 23, shadowScale: 1.35, depthY: 22,
  },
  boss: {
    name: '史莱姆王', texture: 'boss_0', hp: 460, damage: 16, coins: [20, 30],
    body: [66, 34], offset: [23, 46], shadowY: 40, shadowScale: 2.1, depthY: 40,
  },
};

// 小工具
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function levelIndex(round, stage) {
  return (round - 1) * ROUND_LEN + stage;
}
