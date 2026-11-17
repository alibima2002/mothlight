// The world: one fixed 1/60 s step of everything that plays. The screen state
// (title, playing, paused, over, won) lives in main.js; this module only knows
// the garden, the moth, the bats and the score, and reports what happened as an
// event bitmask so main.js can play sounds and change screens.
import { FIELD, MOONPETAL, MOTH, POLLEN, WAVES } from './config.js';
import { createGarden } from './garden.js';
import { createBats } from './bats.js';
import { createOwls } from './owls.js';
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

export function createWorld(random) {
  const garden = createGarden(random);
  const bats = createBats(random);
  const owls = createOwls(random);
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
    garden.reset();
    bats.reset();
    owls.reset();
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
    bats.update(dt, state.wave, moth.moth.x, moth.moth.y);
    owls.update(dt, state.wave, moth.moth.x, moth.moth.y);
    powerups.update(dt, state.wave, garden.flowers);

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
    }

    // Wave complete: bonus, fanfare, next wave — or dawn, and the win.
    if (state.collected >= state.quota && !(events & EVENT_OVER)) {
      const bonus = WAVES.waveBonus(state.wave);
      state.score += bonus;
      if (state.wave >= WAVES.total) {
        state.dawn = 1;
        events |= EVENT_WIN;
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

  return { state, garden, bats, owls, powerups, moth, particles, reset, step };
}
