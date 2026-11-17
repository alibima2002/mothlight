// The world: one fixed 1/60 s step of everything that plays. The screen state
// (title, playing, paused, over, won) lives in main.js; this module only knows
// the garden, the moth, the bats and the score, and reports what happened as an
// event bitmask so main.js can play sounds and change screens.
import { FIELD, MOTH, POLLEN, WAVES } from './config.js';
import { createGarden } from './garden.js';
import { createBats } from './bats.js';
import { createMoth } from './moth.js';
import { createParticles } from './particles.js';

export const EVENT_NONE = 0;
export const EVENT_COLLECT = 1;
export const EVENT_DASH = 2;
export const EVENT_HIT = 4;
export const EVENT_WAVE = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

export function createWorld(random) {
  const garden = createGarden(random);
  const bats = createBats(random);
  const moth = createMoth();
  const particles = createParticles();

  const state = {
    time: 0,
    wave: 1,
    score: 0,
    combo: 0,
    chain: 0,
    comboTimer: 0,
    bestCombo: 0,
    lives: MOTH.lives,
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
    state.collected = 0;
    state.quota = WAVES.quota(1);
    state.shake = 0;
    state.flash = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.dawn = 0;
    garden.reset();
    bats.reset();
    moth.reset();
    particles.clear();
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

    // Gather pollen.
    const pollen = garden.pollen;
    for (let i = pollen.length - 1; i >= 0; i -= 1) {
      const mote = pollen[i];
      if (moth.touches(mote.x, mote.y, mote.r)) {
        garden.take(i);
        state.chain += 1;
        state.combo = comboMultiplier();
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.comboTimer = POLLEN.comboWindow;
        const points = POLLEN.basePoints * state.combo;
        state.score += points;
        state.collected += 1;
        particles.burst(mote.x, mote.y, { count: 12, color: mote.color, speed: 150 });
        particles.text(mote.x, mote.y - 14, `+${points}`, mote.color);
        events |= EVENT_COLLECT;
      }
    }

    // Bats: one hit costs a life and breaks the chain.
    if (!moth.isInvulnerable()) {
      for (let i = bats.bats.length - 1; i >= 0; i -= 1) {
        const bat = bats.bats[i];
        if (moth.touches(bat.x, bat.y, bat.r - 2)) {
          bats.bats.splice(i, 1);
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
          events |= EVENT_HIT;
          if (state.lives <= 0) events |= EVENT_OVER;
          break;
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
        state.banner = `Wave ${state.wave} — the garden glows brighter`;
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

  return { state, garden, bats, moth, particles, reset, step };
}
