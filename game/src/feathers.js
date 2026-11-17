// Feathers: the boss's volley. A fan of slow, dark feathers drifts toward
// where the moth was when the volley fired. They are slow enough to walk
// away from, and they fade — the volley pressures the moth, it never traps it.
import { FEATHER, FIELD } from './config.js';

export function createFeathers(random) {
  const feathers = [];

  return {
    feathers,
    /** A fan of feathers from (x, y) toward (tx, ty). */
    volley(x, y, tx, ty, count, speed) {
      const base = Math.atan2(ty - y, tx - x);
      for (let i = 0; i < count; i += 1) {
        const spread = (i - (count - 1) / 2) * 0.22;
        const a = base + spread;
        const v = speed * random.range(0.9, 1.1);
        feathers.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          angle: a + Math.PI / 2,
          spin: random.range(-1.6, 1.6),
          r: FEATHER.radius,
          age: 0,
          life: FEATHER.life,
        });
      }
    },
    update(dt) {
      for (let i = feathers.length - 1; i >= 0; i -= 1) {
        const f = feathers[i];
        f.age += dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.angle += f.spin * dt;
        // Feathers drift down as they fly, so a volley never holds a line.
        f.vy += 26 * dt;
        if (f.age >= f.life || f.y > FIELD.height + 30 || f.x < -30 || f.x > FIELD.width + 30) {
          feathers.splice(i, 1);
        }
      }
    },
    reset() {
      feathers.length = 0;
    },
  };
}
