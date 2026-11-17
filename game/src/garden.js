// The night garden: stars, the moon, silhouetted hills and ferns, the
// night-blooming flowers that release pollen, and the pollen motes themselves.
// Flowers are both scenery and the game's economy: each open bloom lets go of
// a glowing mote on its own rhythm, and the moth gathers them.
import { COLORS, FIELD, GARDEN, MOONPETAL, POLLEN, WAVES } from './config.js';
import { clamp } from './random.js';

const FLOWER_COLORS = [COLORS.gold, COLORS.cyan, COLORS.pink, COLORS.violet];

export function createGarden(random) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, 420),
      r: random.range(0.6, 1.9),
      phase: random.range(0, Math.PI * 2),
      speed: random.range(0.4, 1.4),
    });
  }

  const flowers = [];
  const spacing = FIELD.width / (GARDEN.flowerCount + 1);
  for (let i = 0; i < GARDEN.flowerCount; i += 1) {
    flowers.push({
      x: spacing * (i + 1) + random.range(-26, 26),
      y: GARDEN.top + random.range(6, 84),
      stem: random.range(26, 52),
      bloom: random.range(0.3, 1),
      phase: random.range(0, Math.PI * 2),
      color: FLOWER_COLORS[i % FLOWER_COLORS.length],
      timer: random.range(0.4, 2.2),
    });
  }

  // Silhouette ridge points, fixed at creation so the hills never shimmer.
  const ridgeFar = [];
  const ridgeNear = [];
  for (let x = 0; x <= FIELD.width; x += 64) {
    ridgeFar.push({ x, y: 560 + random.range(-26, 10) });
    ridgeNear.push({ x, y: 596 + random.range(-14, 12) });
  }

  const pollen = [];
  let ambientTimer = 1.5;

  function spawnMote(x, y, color, rise = true, kind = 'pollen') {
    const moon = kind === 'moon';
    pollen.push({
      x,
      y,
      vx: random.range(-14, 14),
      vy: -POLLEN.fallSpeed * random.range(0.7, 1.2),
      r: moon ? MOONPETAL.radius : POLLEN.radius,
      color,
      age: 0,
      life: moon ? MOONPETAL.life : POLLEN.life,
      swayPhase: random.range(0, Math.PI * 2),
      rise,
      kind,
    });
  }

  // A moonpetal blooms from a random flower, rarely, once the garden warms up.
  let moonTimer = MOONPETAL.interval * 0.6;

  return {
    stars,
    flowers,
    ridgeFar,
    ridgeNear,
    pollen,
    /** Release motes from the blooms; ambient motes drift in from the top. */
    update(dt, wave) {
      for (const flower of flowers) {
        flower.bloom = clamp(flower.bloom + dt * 0.08, 0, 1);
        flower.timer -= dt;
        if (flower.timer <= 0) {
          flower.timer = Math.max(1.6, 3.4 - wave * 0.25) * random.range(0.8, 1.25);
          spawnMote(flower.x, flower.y - flower.stem - 8, flower.color);
        }
      }
      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        ambientTimer = random.range(2.2, 3.6);
        // Ambient motes drift down from the night sky; bloom motes float up.
        spawnMote(random.range(60, FIELD.width - 60), -12, random.pick(FLOWER_COLORS), false);
      }
      // Moonpetals: one fat golden mote at a time, from wave 2 on.
      if (WAVES.moonpetals(wave)) {
        moonTimer -= dt;
        const hasMoon = pollen.some((mote) => mote.kind === 'moon');
        if (moonTimer <= 0 && !hasMoon) {
          moonTimer = MOONPETAL.interval * random.range(0.85, 1.2);
          const flower = random.pick(flowers);
          spawnMote(flower.x, flower.y - flower.stem - 8, '#ffe9b0', true, 'moon');
        }
      }
      for (let i = pollen.length - 1; i >= 0; i -= 1) {
        const mote = pollen[i];
        mote.age += dt;
        mote.swayPhase += dt * 2.2;
        const fall = mote.kind === 'moon' ? MOONPETAL.fallSpeed : POLLEN.fallSpeed;
        mote.x += (mote.vx + Math.sin(mote.swayPhase) * POLLEN.sway * 0.4) * dt;
        mote.y += (mote.rise ? -1 : 1) * fall * 0.55 * dt;
        mote.y += Math.sin(mote.swayPhase * 0.5) * 6 * dt;
        if (mote.age >= mote.life || mote.y < -20 || mote.y > FIELD.height + 20) {
          pollen.splice(i, 1);
        }
      }
    },
    /** Take a mote out of the garden (the moth gathered it). */
    take(index) {
      return pollen.splice(index, 1)[0];
    },
    reset() {
      pollen.length = 0;
      ambientTimer = 1.5;
      moonTimer = MOONPETAL.interval * 0.6;
      for (const flower of flowers) flower.timer = random.range(0.4, 2.2);
    },
  };
}
