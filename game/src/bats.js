// Bats: the night's hazard. They slip in from the left or right edge, beat
// toward the moth's neighbourhood on a wobbling path, and leave after a while.
// Faster and more numerous as the waves rise.
import { BAT, FIELD, WAVES } from './config.js';

export function createBats(random) {
  const bats = [];
  let spawnTimer = 3;

  return {
    bats,
    update(dt, wave, mothX, mothY, spawning = true) {
      spawnTimer -= dt;
      const cap = WAVES.batCap(wave);
      if (spawning && spawnTimer <= 0 && bats.length < cap) {
        spawnTimer = WAVES.batInterval(wave) * random.range(0.75, 1.3);
        const fromLeft = random.chance(0.5);
        const speed = WAVES.batSpeed(wave) * random.range(0.9, 1.15);
        bats.push({
          x: fromLeft ? -30 : FIELD.width + 30,
          y: random.range(60, FIELD.height - 180),
          vx: (fromLeft ? 1 : -1) * speed,
          vy: 0,
          baseY: 0,
          amp: BAT.wobble * random.range(0.6, 1.3),
          freq: random.range(1.4, 2.4),
          phase: random.range(0, Math.PI * 2),
          r: BAT.radius,
          age: 0,
          flap: random.range(0, Math.PI * 2),
          steer: random.range(0.25, 0.6),
        });
      }
      for (let i = bats.length - 1; i >= 0; i -= 1) {
        const bat = bats[i];
        bat.age += dt;
        bat.flap += dt * 14;
        // Gentle steering toward the moth's height, so bats feel like hunters,
        // not furniture — but they never home perfectly, so dodging stays fair.
        const dy = mothY - bat.y;
        bat.vy += Math.max(-60, Math.min(60, dy * bat.steer)) * dt;
        bat.vy = Math.max(-90, Math.min(90, bat.vy));
        bat.x += bat.vx * dt;
        bat.y += (bat.vy + Math.sin(bat.age * bat.freq + bat.phase) * bat.amp * 0.9) * dt;
        if (bat.age > BAT.life || bat.x < -80 || bat.x > FIELD.width + 80) {
          bats.splice(i, 1);
        }
      }
    },
    reset() {
      bats.length = 0;
      spawnTimer = 3;
    },
  };
}
