// The boss: the Great Horned Owl, the finale after wave 5. It descends from
// the night, hovers, then attacks in turns: a telegraphed dive at where the
// moth was, and (from phase 2) a spread of slow feathers. The moth strikes
// by dashing through it — a dash carries a short shield, so the hit is fair —
// and a moonpetal's light wounds it too. Three phases by health: dives only,
// then dives + volleys, then faster and angrier.
import { BOSS, FIELD } from './config.js';

export function createBoss(random) {
  const boss = {
    active: false,
    hp: BOSS.maxHp,
    x: FIELD.width / 2,
    y: -80,
    tx: 0,
    ty: 0,
    vx: 0,
    vy: 0,
    r: BOSS.radius,
    state: 'enter',
    timer: 0,
    flap: 0,
    volleyTimer: 0,
    attacks: 0,
    flash: 0,
  };

  function phase() {
    if (boss.hp <= 2) return 3;
    if (boss.hp <= 5) return 2;
    return 1;
  }

  function warnTime() {
    return phase() === 3 ? BOSS.warnTimeEnraged : BOSS.warnTime;
  }

  function diveSpeed() {
    return phase() === 3 ? BOSS.diveSpeedEnraged : BOSS.diveSpeed;
  }

  function volleyInterval() {
    return phase() === 3 ? BOSS.volleyIntervalEnraged : BOSS.volleyInterval;
  }

  return {
    boss,
    phase,
    spawn() {
      boss.active = true;
      boss.hp = BOSS.maxHp;
      boss.x = FIELD.width / 2;
      boss.y = -80;
      boss.vx = 0;
      boss.vy = 0;
      boss.state = 'enter';
      boss.timer = BOSS.enterTime;
      boss.volleyTimer = volleyInterval();
      boss.attacks = 0;
      boss.flash = 0;
    },
    /** A strike lands: dash-through or moonpetal light. Returns true if it fell. */
    damage(amount) {
      if (!boss.active || boss.state === 'enter' || boss.state === 'down') return false;
      boss.hp -= amount;
      boss.flash = 1;
      if (boss.hp <= 0) {
        boss.hp = 0;
        boss.state = 'down';
        boss.timer = 2.4;
        boss.vy = 120;
        return true;
      }
      // A hit staggers it: it stops, wobbles, then hovers again.
      boss.state = 'stun';
      boss.timer = BOSS.stunTime;
      boss.vx = 0;
      boss.vy = 0;
      return false;
    },
    update(dt, mothX, mothY, onVolley) {
      if (!boss.active) return;
      boss.flap += dt * 9;
      boss.flash = Math.max(0, boss.flash - dt * 3);
      if (boss.state === 'enter') {
        boss.y += ((BOSS.hoverY - boss.y) * 1.6 + 60) * dt;
        boss.timer -= dt;
        if (boss.timer <= 0 || boss.y >= BOSS.hoverY) {
          boss.y = BOSS.hoverY;
          boss.state = 'hover';
          boss.timer = BOSS.hoverTime;
        }
        return;
      }
      if (boss.state === 'down') {
        boss.y += boss.vy * dt;
        boss.vy += 260 * dt;
        boss.timer -= dt;
        return;
      }
      if (boss.state === 'stun') {
        boss.timer -= dt;
        boss.x += Math.sin(boss.flap * 2.2) * 26 * dt;
        if (boss.timer <= 0) {
          boss.state = 'hover';
          boss.timer = BOSS.hoverTime * 0.7;
        }
        return;
      }
      // The volley clock runs through the whole fight, so the first attack
      // of phase 2 is a volley: the player sees the new trick at once.
      boss.volleyTimer -= dt;
      if (boss.state === 'hover') {
        // Drift above the garden, tracking the moth slowly.
        boss.x += Math.max(-70, Math.min(70, (mothX - boss.x) * 0.5)) * dt;
        boss.y = BOSS.hoverY + Math.sin(boss.flap * 0.8) * 14;
        boss.timer -= dt;
        if (boss.timer <= 0) {
          // Phase 2+ fires a volley whenever its clock has run out, and
          // dives the rest of the time; phase 1 only dives.
          if (phase() >= 2 && boss.volleyTimer <= 0) {
            boss.volleyTimer = volleyInterval();
            boss.state = 'volley';
            boss.timer = 0.55;
            onVolley(boss.x, boss.y + 30, mothX, mothY);
          } else {
            boss.state = 'warn';
            boss.timer = warnTime();
            boss.tx = mothX;
            boss.ty = mothY;
          }
          boss.attacks += 1;
        }
        return;
      }
      if (boss.state === 'warn') {
        // The strike shadow tracks the moth, then locks: the dive goes where
        // the moth was when the warning ended, so it is always dodgeable.
        boss.tx = mothX;
        boss.ty = mothY;
        boss.timer -= dt;
        if (boss.timer <= 0) {
          boss.state = 'dive';
          const dx = boss.tx - boss.x;
          const dy = boss.ty - boss.y;
          const len = Math.hypot(dx, dy) || 1;
          boss.vx = (dx / len) * diveSpeed();
          boss.vy = (dy / len) * diveSpeed();
        }
        return;
      }
      if (boss.state === 'volley') {
        boss.timer -= dt;
        if (boss.timer <= 0) {
          boss.state = 'hover';
          boss.timer = BOSS.hoverTime;
        }
        return;
      }
      if (boss.state === 'dive') {
        boss.x += boss.vx * dt;
        boss.y += boss.vy * dt;
        if (boss.y > FIELD.height + 90 || boss.x < -90 || boss.x > FIELD.width + 90) {
          // It overshoots, circles back and hovers again.
          boss.x = Math.max(120, Math.min(FIELD.width - 120, boss.x));
          boss.y = BOSS.hoverY;
          boss.vx = 0;
          boss.vy = 0;
          boss.state = 'hover';
          boss.timer = BOSS.hoverTime;
        }
      }
    },
    reset() {
      boss.active = false;
      boss.hp = BOSS.maxHp;
      boss.x = FIELD.width / 2;
      boss.y = -80;
      boss.state = 'enter';
      boss.timer = 0;
      boss.flash = 0;
    },
  };
}
