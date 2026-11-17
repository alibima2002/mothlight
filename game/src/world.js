// The world: one fixed 1/60 s step of everything that plays. The screen state
// (title, playing, paused, over, won) lives in main.js; this module only knows
// the garden, the moth, the bats and the score, and reports what happened as an
// event bitmask so main.js can play sounds and change screens.
import { BOSS, EMBERFLY, FIELD, MOONPETAL, MOTH, POLLEN, WAVES } from './config.js';
import { createGarden } from './garden.js';
import { createBats } from './bats.js';
import { createOwls } from './owls.js';
import { createBoss } from './boss.js';
import { createFeathers } from './feathers.js';
import { createEmberflies } from './emberflies.js';
import { createPowerups } from './powerups.js';
import { createMoth } from './moth.js';
import { createParticles } from './particles.js';

export const EVENT_NONE = 0;
export const EVENT_COLLECT = 1;
export const EVENT_DASH = 2;
export const EVENT_HIT = 4;
export const EVENT_WAVE = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;
export const EVENT_MOON = 64;
export const EVENT_SHIELD = 128;
export const EVENT_BLOCK = 256;
export const EVENT_BOSS = 512;
export const EVENT_BOSS_HIT = 1024;
export const EVENT_BOSS_DOWN = 2048;
export const EVENT_FUSE = 4096;
export const EVENT_EMBER = 8192;

export function createWorld(random) {
  const garden = createGarden(random);
  const bats = createBats(random);
  const owls = createOwls(random);
  const boss = createBoss(random);
  const feathers = createFeathers(random);
  const emberflies = createEmberflies(random);
  const powerups = createPowerups(random);
  const moth = createMoth();
  const particles = createParticles(random);

  const state = {
    time: 0,
    wave: 1,
    score: 0,
    combo: 0,
    chain: 0,
    comboTimer: 0,
    bestCombo: 0,
    lives: MOTH.lives,
    shield: false,
    modifier: '',
    moonCollected: 0,
    dewCollected: 0,
    collected: 0,
    quota: WAVES.quota(1),
    shake: 0,
    flash: 0,
    banner: '',
    bannerTimer: 0,
    dawn: 0,
    bossActive: false,
    bossHp: BOSS.maxHp,
    bossPhase: 1,
    bossHits: 0,
    emberPopped: 0,
  };

  function comboMultiplier() {
    return 1 + Math.min(POLLEN.maxCombo - 1, Math.floor(state.chain / POLLEN.comboStep));
  }

  function reset() {
    state.time = 0;
    state.wave = 1;
    state.score = 0;
    state.combo = 0;
    state.chain = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.lives = MOTH.lives;
    state.shield = false;
    state.modifier = '';
    state.moonCollected = 0;
    state.dewCollected = 0;
    state.collected = 0;
    state.quota = WAVES.quota(1);
    state.shake = 0;
    state.flash = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.dawn = 0;
    state.bossActive = false;
    state.bossHp = BOSS.maxHp;
    state.bossPhase = 1;
    state.bossHits = 0;
    state.emberPopped = 0;
    garden.reset();
    bats.reset();
    owls.reset();
    boss.reset();
    feathers.reset();
    emberflies.reset();
    powerups.reset();
    moth.reset();
    particles.clear();
  }

  /** One hit from a bat or an owl. A shield takes it instead of a life. */
  function takeHit(fromX, fromY) {
    if (state.shield) {
      state.shield = false;
      state.shake = 0.6;
      moth.moth.invuln = MOTH.hitInvuln;
      particles.ring(moth.moth.x, moth.moth.y, '#7ef0e0', 110, 0.7);
      particles.burst(moth.moth.x, moth.moth.y, {
        count: 26,
        color: '#7ef0e0',
        speed: 280,
        life: 0.8,
      });
      particles.text(moth.moth.x, moth.moth.y - 20, 'SHIELD!', '#7ef0e0');
      return EVENT_BLOCK;
    }
    state.lives -= 1;
    state.chain = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 1;
    state.flash = 1;
    moth.moth.invuln = MOTH.hitInvuln;
    moth.moth.vx = (moth.moth.x < FIELD.width / 2 ? -1 : 1) * 320;
    moth.moth.vy = -260;
    particles.burst(moth.moth.x, moth.moth.y, {
      count: 22,
      color: '#ff5a4e',
      speed: 260,
      life: 0.8,
    });
    return state.lives <= 0 ? EVENT_HIT | EVENT_OVER : EVENT_HIT;
  }

  /**
   * Advance one step. `steer` is { target, keys, dash } from main.js (live input
   * or the screenshot autopilot). Returns an event bitmask.
   */
  function step(dt, steer) {
    let events = EVENT_NONE;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 1.8);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.chain = 0;
        state.combo = 0;
      }
    }

    if (moth.steer(dt, steer.target, steer.keys, steer.dash)) {
      events |= EVENT_DASH;
    }
    if (moth.trailReady()) {
      particles.trail(moth.moth.x, moth.moth.y, '#bfe9c0');
    }

    garden.update(dt, state.wave);
    // During the boss fight no new bats or owls slip in: the owl is the hunt.
    bats.update(dt, state.wave, moth.moth.x, moth.moth.y, !state.bossActive);
    owls.update(dt, state.wave, moth.moth.x, moth.moth.y, !state.bossActive);
    boss.update(dt, moth.moth.x, moth.moth.y, (x, y, tx, ty) => {
      feathers.volley(x, y, tx, ty, BOSS.feathersPerVolley, BOSS.featherSpeed);
    });
    feathers.update(dt);
    // An emberfly's burst: a flash of orange, a shake, and a hurt moth
    // caught inside the blast.
    const fused = emberflies.update(dt, state.wave, moth.moth.x, moth.moth.y, !state.bossActive, (x, y, radius) => {
      particles.burst(x, y, { count: 30, color: '#ff9a3d', speed: 320, life: 0.9 });
      particles.ring(x, y, '#ff9a3d', radius + 40, 0.6);
      state.shake = Math.max(state.shake, 0.5);
      const d = Math.hypot(moth.moth.x - x, moth.moth.y - y);
      if (d < radius + MOTH.radius && !moth.isInvulnerable()) {
        events |= takeHit(x, y);
      }
    });
    if (fused) events |= EVENT_FUSE;
    powerups.update(dt, state.wave, garden.flowers);
    state.bossHp = boss.boss.hp;
    state.bossPhase = boss.phase();

    // Gather pollen. A moonpetal is worth five times a mote, and rings.
    const pollen = garden.pollen;
    for (let i = pollen.length - 1; i >= 0; i -= 1) {
      const mote = pollen[i];
      if (moth.touches(mote.x, mote.y, mote.r)) {
        garden.take(i);
        state.chain += 1;
        state.combo = comboMultiplier();
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.comboTimer = POLLEN.comboWindow;
        const moon = mote.kind === 'moon';
        const points = (moon ? MOONPETAL.basePoints : POLLEN.basePoints) * state.combo;
        state.score += points;
        state.collected += 1;
        particles.burst(mote.x, mote.y, {
          count: moon ? 26 : 12,
          color: mote.color,
          speed: moon ? 260 : 150,
        });
        particles.text(mote.x, mote.y - 14, `+${points}`, mote.color);
        if (moon) {
          state.moonCollected += 1;
          particles.ring(mote.x, mote.y, '#ffe9b0', 100, 0.7);
          events |= EVENT_MOON;
          // During the boss fight a moonpetal's light wounds the owl.
          if (state.bossActive && boss.boss.active && boss.boss.state !== 'down') {
            const fell = boss.damage(1);
            state.bossHp = boss.boss.hp;
            state.bossPhase = boss.phase();
            particles.ring(boss.boss.x, boss.boss.y, '#ffe9b0', 130, 0.8);
            particles.text(boss.boss.x, boss.boss.y - 56, 'LIGHT!', '#ffe9b0');
            if (fell) {
              state.dawn = 1;
              events |= EVENT_BOSS_DOWN | EVENT_WIN;
            } else {
              events |= EVENT_BOSS_HIT;
            }
          }
        }
        events |= EVENT_COLLECT;
      }
    }

    // Dew shields: gather one and the moth carries a shield for the next hit.
    // A shield already carried turns the drop into points instead.
    const drops = powerups.drops;
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const drop = drops[i];
      if (moth.touches(drop.x, drop.y, drop.r)) {
        powerups.take(i);
        if (state.shield) {
          const points = 25 * state.combo || 25;
          state.score += points;
          particles.text(drop.x, drop.y - 14, `+${points}`, '#7ef0e0');
          events |= EVENT_COLLECT;
        } else {
          state.shield = true;
          state.dewCollected += 1;
          particles.ring(moth.moth.x, moth.moth.y, '#7ef0e0', 100, 0.7);
          particles.burst(moth.moth.x, moth.moth.y, {
            count: 20,
            color: '#7ef0e0',
            speed: 220,
            life: 0.8,
          });
          particles.text(moth.moth.x, moth.moth.y - 20, 'SHIELD!', '#7ef0e0');
          events |= EVENT_SHIELD;
        }
      }
    }

    // Bats and owls: one hit costs a life and breaks the chain — or a shield.
    if (!moth.isInvulnerable()) {
      for (let i = bats.bats.length - 1; i >= 0; i -= 1) {
        const bat = bats.bats[i];
        if (moth.touches(bat.x, bat.y, bat.r - 2)) {
          bats.bats.splice(i, 1);
          events |= takeHit(bat.x, bat.y);
          break;
        }
      }
      if (!(events & EVENT_OVER)) {
        for (let i = owls.owls.length - 1; i >= 0; i -= 1) {
          const owl = owls.owls[i];
          if (moth.touches(owl.x, owl.y, owl.r - 2)) {
            owls.owls.splice(i, 1);
            events |= takeHit(owl.x, owl.y);
            break;
          }
        }
      }
      if (!(events & EVENT_OVER)) {
        for (let i = feathers.feathers.length - 1; i >= 0; i -= 1) {
          const f = feathers.feathers[i];
          if (moth.touches(f.x, f.y, f.r - 2)) {
            feathers.feathers.splice(i, 1);
            events |= takeHit(f.x, f.y);
            break;
          }
        }
      }
    }

    // The boss: dash through it to strike; any other touch is a hit. A dash
    // carries its own short shield, so the strike is always fair — the check
    // is the dash itself, not the invulnerability it grants.
    if (state.bossActive && boss.boss.active && boss.boss.state !== 'enter' && boss.boss.state !== 'down') {
      const b = boss.boss;
      if (moth.touches(b.x, b.y, b.r - 4)) {
        if (moth.isDashing()) {
          // A dash carries a shield, so the strike is always fair.
          state.bossHits += 1;
          state.score += 100;
          particles.burst(b.x, b.y, { count: 30, color: '#ffe9b0', speed: 300, life: 0.9 });
          particles.ring(b.x, b.y, '#ffe9b0', 150, 0.8);
          particles.text(b.x, b.y - 60, '+100', '#ffe9b0');
          const fell = boss.damage(1);
          state.bossHp = boss.boss.hp;
          state.bossPhase = boss.phase();
          if (fell) {
            state.dawn = 1;
            events |= EVENT_BOSS_HIT | EVENT_BOSS_DOWN | EVENT_WIN;
          } else {
            events |= EVENT_BOSS_HIT;
          }
        } else if (!moth.isInvulnerable()) {
          events |= takeHit(b.x, b.y);
        }
      }
    }

    // Emberflies: dashing through one pops it safely, for points. A dash
    // carries a shield, so the pop is always fair — and worth doing.
    if (moth.isDashing()) {
      for (let i = emberflies.flies.length - 1; i >= 0; i -= 1) {
        const f = emberflies.flies[i];
        if (moth.touches(f.x, f.y, f.r)) {
          emberflies.take(i);
          state.score += EMBERFLY.popPoints;
          state.emberPopped += 1;
          particles.burst(f.x, f.y, { count: 16, color: '#ffb347', speed: 200, life: 0.6 });
          particles.text(f.x, f.y - 14, `+${EMBERFLY.popPoints}`, '#ffb347');
          events |= EVENT_EMBER;
          break;
        }
      }
    }

    // Wave complete: bonus, fanfare, next wave — or the boss, and then dawn.
    if (state.collected >= state.quota && !(events & EVENT_OVER) && !state.bossActive) {
      const bonus = WAVES.waveBonus(state.wave);
      state.score += bonus;
      if (state.wave >= WAVES.total) {
        state.bossActive = true;
        state.banner = WAVES.bossBanner;
        state.modifier = WAVES.bossLine;
        state.bannerTimer = 3.2;
        boss.spawn();
        state.shake = 0.8;
        events |= EVENT_BOSS;
      } else {
        state.wave += 1;
        state.collected = 0;
        state.quota = WAVES.quota(state.wave);
        state.banner = WAVES.banner(state.wave);
        state.modifier = WAVES.modifier(state.wave);
        state.bannerTimer = 2.6;
        particles.burst(moth.moth.x, moth.moth.y, {
          count: 30,
          color: '#ffd76a',
          speed: 240,
          life: 0.9,
        });
        events |= EVENT_WAVE;
      }
    }

    // Dawn creeps in as the waves pass, even before the win.
    state.dawn = Math.max(state.dawn, (state.wave - 1) / WAVES.total);
    particles.update(dt);
    return events;
  }

  return { state, garden, bats, owls, boss, feathers, emberflies, powerups, moth, particles, reset, step };
}
