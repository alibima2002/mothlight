// Dew shields: the game's one power-up. A dewdrop falls from the night now
// and then; gather it and the moth carries a shield that takes one bat or owl
// hit for it, then shatters. One drop at a time, one shield at a time.
import { DEW, FIELD, WAVES } from './config.js';

export function createPowerups(random) {
  const drops = [];
  let spawnTimer = DEW.interval * 0.6;

  return {
    drops,
    /**
     * `flowers` anchors the fall: a drop comes down above a random bloom,
     * where the moth already flies, so it is a choice, not a lottery.
     */
    update(dt, wave, flowers) {
      if (WAVES.dew(wave)) {
        spawnTimer -= dt;
        if (spawnTimer <= 0 && drops.length === 0) {
          spawnTimer = DEW.interval * random.range(0.85, 1.2);
          const flower = random.pick(flowers);
          drops.push({
            x: flower.x + random.range(-30, 30),
            y: 110,
            vy: DEW.fallSpeed,
            r: DEW.radius,
            age: 0,
            life: DEW.life,
            phase: random.range(0, Math.PI * 2),
          });
        }
      }
      for (let i = drops.length - 1; i >= 0; i -= 1) {
        const drop = drops[i];
        drop.age += dt;
        drop.phase += dt * 2.4;
        drop.y += drop.vy * dt;
        drop.x += Math.sin(drop.phase) * 18 * dt;
        if (drop.age >= drop.life || drop.y > FIELD.height + 20) {
          drops.splice(i, 1);
        }
      }
    },
    /** Take a drop out (the moth gathered it). */
    take(index) {
      return drops.splice(index, 1)[0];
    },
    reset() {
      drops.length = 0;
      spawnTimer = DEW.interval * 0.6;
    },
  };
}
