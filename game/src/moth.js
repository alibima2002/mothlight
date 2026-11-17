// The luna moth: the player. It eases toward the mouse, or flies on WASD and
// the arrow keys when the mouse has not moved. Space or a click dashes — a
// burst of speed with a short shield — on a cooldown the HUD shows.
import { FIELD, MOTH } from './config.js';
import { clamp, distanceSquared } from './random.js';

export function createMoth() {
  const moth = {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 60,
    vx: 0,
    vy: 0,
    face: 1,
    wing: 0,
    dashTime: 0,
    dashCooldown: 0,
    invuln: 0,
    trailTimer: 0,
  };

  return {
    moth,
    reset() {
      moth.x = FIELD.width / 2;
      moth.y = FIELD.height / 2 + 60;
      moth.vx = 0;
      moth.vy = 0;
      moth.face = 1;
      moth.wing = 0;
      moth.dashTime = 0;
      moth.dashCooldown = 0;
      moth.invuln = 0;
      moth.trailTimer = 0;
    },
    /**
     * Steer toward `target` (field coordinates) or, when the target is null,
     * along the held keys. Returns true on the frame a dash starts.
     */
    steer(dt, target, keys, wantDash) {
      let startedDash = false;
      if (wantDash && moth.dashCooldown <= 0 && moth.dashTime <= 0) {
        moth.dashTime = MOTH.dashTime;
        moth.dashCooldown = MOTH.dashCooldown;
        moth.invuln = Math.max(moth.invuln, MOTH.dashInvuln);
        startedDash = true;
      }
      moth.dashCooldown = Math.max(0, moth.dashCooldown - dt);
      moth.invuln = Math.max(0, moth.invuln - dt);
      if (moth.dashTime > 0) moth.dashTime -= dt;

      const speed = moth.dashTime > 0 ? MOTH.dashSpeed : MOTH.speed;
      let tx = 0;
      let ty = 0;
      if (target) {
        tx = (target.x - moth.x) * 9;
        ty = (target.y - moth.y) * 9;
        const len = Math.hypot(tx, ty);
        if (len > speed) {
          tx = (tx / len) * speed;
          ty = (ty / len) * speed;
        }
      } else {
        const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        const len = Math.hypot(dx, dy) || 1;
        tx = (dx / len) * speed;
        ty = (dy / len) * speed;
      }
      const rate = moth.dashTime > 0 ? 20 : 12;
      moth.vx += (tx - moth.vx) * Math.min(1, rate * dt);
      moth.vy += (ty - moth.vy) * Math.min(1, rate * dt);
      moth.x = clamp(moth.x + moth.vx * dt, 24, FIELD.width - 24);
      moth.y = clamp(moth.y + moth.vy * dt, 24, FIELD.height - 24);
      if (Math.abs(moth.vx) > 12) moth.face = moth.vx > 0 ? 1 : -1;
      moth.wing += dt * (moth.dashTime > 0 ? 34 : 16);
      moth.trailTimer -= dt;
      return startedDash;
    },
    /** True while the dash is still carrying the moth. */
    isDashing() {
      return moth.dashTime > 0;
    },
    isInvulnerable() {
      return moth.invuln > 0;
    },
    /** The moth's glow trail while dashing: emit a dot every few frames. */
    trailReady() {
      if (moth.dashTime > 0 && moth.trailTimer <= 0) {
        moth.trailTimer = 0.03;
        return true;
      }
      return false;
    },
    touches(x, y, radius) {
      const reach = MOTH.radius + radius;
      return distanceSquared(moth.x, moth.y, x, y) < reach * reach;
    },
  };
}
