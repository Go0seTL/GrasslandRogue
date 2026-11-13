/* 草原枪手 — 全局配置 */

const GAME_W = 960;
const GAME_H = 540;

// 可活动区域（四周是树篱）
const ARENA = { left: 62, top: 78, right: 898, bottom: 470 };

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

// 枪手技能：锁定最近 3 名敌人，机枪扫射 3 秒
const SKILL = {
  duration: 3000,
  cooldown: 12000,
  damage: 8,
  interval: 80,
  maxTargets: 3,
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
    desc: '长按蓄力，松开朝面向方向射出。蓄力越久伤害越高，满蓄力可穿透 2 个敌人。', iconScale: 1.0,
  },
};

const CHAR_DEFS = [
  { id: 'gunner',    name: '枪手',     price: 0,    desc: '手枪 · 锁定扫射',        color: 0x2f7f78, playable: true,  portrait: 'player_idle' },
  { id: 'swordsman', name: '剑客',     price: 800,  desc: '手枪 · 万剑归宗',        color: 0x557fb0, playable: true,  portrait: 'swordsman_idle' },
  { id: 'knight',    name: '骑士',     price: 1200, desc: '近战 · 高生命 · 格挡',   color: 0x4a6fa5, playable: false, portrait: 'player_idle' },
  { id: 'mage',      name: '法师',     price: 1800, desc: '法术 · 范围爆发',        color: 0x7a4fa5, playable: false, portrait: 'player_idle' },
  { id: 'ranger',    name: '游侠',     price: 2500, desc: '弓箭 · 高机动',          color: 0x3f8f4a, playable: false, portrait: 'player_idle' },
  { id: 'rogue',     name: '刺客',     price: 3500, desc: '匕首 · 暴击 · 闪避',     color: 0x8a3f4a, playable: false, portrait: 'player_idle' },
  { id: 'alchemist', name: '炼金术士', price: 5000, desc: '药水 · 控制 · 召唤',     color: 0xa58a3f, playable: false, portrait: 'player_idle' },
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
];

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
  goat: '第三轮开始出现的山羊精。会快速蓄力后头槌冲锋，体型比野猪小但更灵活。',
  boss: '草原的统治者。会跳跃砸地放出环形弹幕、蓄力冲锋，半血后暴怒并召唤史莱姆。',
  boar_boss: '第二轮 Boss。会进入狂暴状态到处乱撞，撞击伤害很高；还会召唤持续一段时间的石头雨。',
  mushroom_boss: '第四轮 Boss。会短时间反射子弹，并连续发射三轮会逐渐减速的环形弹幕。',
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
  boar_boss: {
    name: '野猪王', texture: 'boar_0', hp: 560, damage: 20, coins: [24, 34],
    body: [32, 16], offset: [4, 10], shadowY: 13, shadowScale: 1.2, depthY: 13,
  },
  mushroom_boss: {
    name: '蘑菇怪客', texture: 'mushroom_0', hp: 560, damage: 16, coins: [24, 34],
    body: [20, 14], offset: [8, 20], shadowY: 17, shadowScale: 1.2, depthY: 16,
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
