// Mothlight — tuning constants. One place for every number the game balances on,
// so a tweak never means hunting through the simulation or the renderer.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'mothlight.best';

/** The moth. */
export const MOTH = {
  radius: 15,
  speed: 340,
  dashSpeed: 920,
  dashTime: 0.32,
  dashCooldown: 2.4,
  dashInvuln: 0.6,
  hitInvuln: 2.0,
  lives: 3,
};

/** Pollen motes and the wave quota. */
export const POLLEN = {
  radius: 7,
  basePoints: 10,
  comboWindow: 2.6,
  comboStep: 5,
  maxCombo: 8,
  life: 8,
  fallSpeed: 26,
  sway: 34,
};

/** Moonpetals: rare, fat golden motes worth five times a pollen mote. */
export const MOONPETAL = {
  radius: 11,
  basePoints: 50,
  life: 12,
  fallSpeed: 18,
  /** One blooms every so often, once the garden has warmed up. */
  interval: 19,
};

/** Dew shields: a drop that grants one free hit. */
export const DEW = {
  radius: 10,
  life: 12,
  fallSpeed: 55,
  /** One falls every so often, once the garden has warmed up. */
  interval: 18,
};

/** Owls: a second hunter. It warns, then dives at where the moth was. */
export const OWL = {
  radius: 22,
  warnTime: 0.9,
  diveSpeed: 540,
  life: 12,
};

/** The boss: the Great Horned Owl, the finale after wave 5. Dash through it
 * to strike; a moonpetal's light wounds it too. Three phases: dives, then
 * dives + feather volleys, then faster and angrier. */
export const BOSS = {
  radius: 46,
  maxHp: 8,
  enterTime: 2.2,
  hoverTime: 1.6,
  hoverY: 150,
  warnTime: 1.0,
  warnTimeEnraged: 0.7,
  diveSpeed: 500,
  diveSpeedEnraged: 580,
  volleyInterval: 4.2,
  volleyIntervalEnraged: 3.2,
  feathersPerVolley: 5,
  featherSpeed: 150,
  stunTime: 0.9,
};

/** Feathers: the boss's volley. Slow, spread out, always dodgeable. */
export const FEATHER = { radius: 9, life: 9 };

/** Emberflies: a third hunter, and a different one again. They drift toward
 * the moth, then flash and burst — a small explosion with a blast radius.
 * The flash is the game: a burst is always telegraphed, so it is always
 * dodgeable. Dashing through one pops it safely, for points. */
export const EMBERFLY = {
  radius: 12,
  approachSpeed: 55,
  flashTime: 0.6,
  blastRadius: 72,
  life: 16,
  popPoints: 25,
};

/** Waves: five waves, then dawn breaks and the game is won. */
export const WAVES = {
  total: 5,
  quota: (wave) => 10 + wave * 4,
  batInterval: (wave) => Math.max(2.0, 4.6 - wave * 0.65),
  batSpeed: (wave) => 120 + wave * 26,
  batCap: (wave) => 2 + wave,
  waveBonus: (wave) => 100 * wave,
  /** What each wave adds, so every wave feels different. */
  moonpetals: (wave) => wave >= 2,
  dew: (wave) => wave >= 2,
  owls: (wave) => wave >= 3,
  owlInterval: (wave) => Math.max(4.5, 9 - wave),
  owlCap: (wave) => (wave >= 4 ? 2 : 1),
  emberflies: (wave) => wave >= 3,
  emberInterval: (wave) => Math.max(4.5, 8 - wave),
  emberCap: (wave) => (wave >= 4 ? 3 : 2),
  banner: (wave) => [
    '',
    'Wave 2 — moonpetals bloom, worth fifty',
    'Wave 3 — emberflies ignite',
    'Wave 4 — the swarm thickens',
    'Wave 5 — the last light before dawn',
  ][wave - 1] ?? '',
  /** Short modifier line under the wave bar, while the wave runs. */
  modifier: (wave) => {
    if (wave >= 3) return 'OWLS HUNT  •  EMBERFLIES IGNITE  •  MOONPETALS BLOOM';
    if (wave >= 2) return 'MOONPETALS BLOOM';
    return '';
  },
  /** The finale: after wave 5's quota, the Great Horned Owl descends. */
  bossBanner: 'THE GREAT HORNED OWL',
  bossLine: 'DASH THROUGH IT TO STRIKE  •  DODGE ITS DIVES',
};

/** Bats. */
export const BAT = { radius: 19, life: 14, wobble: 46 };

/** The garden bed along the bottom of the field. */
export const GARDEN = { top: 600, flowerCount: 9 };

/** Palette: one night, warm light against it. */
export const COLORS = {
  skyTop: '#070a1e',
  skyMid: '#131a3d',
  skyBottom: '#241a4d',
  hillFar: '#1a1440',
  hillNear: '#120d33',
  ground: '#0c0824',
  moon: '#ffe9b0',
  gold: '#ffd76a',
  cyan: '#7ef0e0',
  pink: '#ff9ad5',
  violet: '#b78cff',
  leaf: '#2f7d5b',
  mothBody: '#f4f1de',
  mothWing: '#cfe8b8',
  bat: '#0a0618',
  batEye: '#ff5a4e',
  danger: '#ff5a4e',
  ink: '#eef2ff',
  dim: '#9aa3c7',
};
