// Emberflies: the garden's third hunter. They drift toward the moth on a
// slow, glowing path. Close in, one stops, flashes for a beat — a bright
// core and a growing ring — and then bursts. The burst has a blast radius,
// so a moth standing next to it is hurt; a moth that dashed through it pops
// it safely instead, for points. The flash is the game: a burst is always
// telegraphed, so it is always dodgeable.
import { EMBERFLY, FIELD, WAVES } from './config.js';

export function createEmberflies(random) {
  const flies = [];
  let spawnTimer = 6;

  return {
    flies,
    /**
     * `detonate` is called with (x, y, blastRadius) when a fly bursts, so
     * the world can hurt the moth and play the burst. Returns 'fuse' when a
     * fly starts flashing, so the world can sound it.
     */
    update(dt, wave, mothX, mothY, spawning, detonate) {
      spawnTimer -= dt;
      const cap = WAVES.emberCap(wave);
      if (WAVES.emberflies(wave) && spawning && spawnTimer <= 0 && flies.length < cap) {
        spawnTimer = WAVES.emberInterval(wave) * random.range(0.85, 1.25);
        // Slip in from a random edge, away from the moth.
        const edge = random.range(0, 4);
        let x = random.range(80, FIELD.width - 80);
        let y = random.range(80, FIELD.height - 220);
        if (edge < 1) x = -20;
        else if (edge < 2) x = FIELD.width + 20;
        else if (edge < 3) y = -20;
        else y = FIELD.height + 20;
        flies.push({
          x,
          y,
          r: EMBERFLY.radius,
          age: 0,
          life: EMBERFLY.life,
          state: 'approach',
          timer: 0,
          phase: random.range(0, Math.PI * 2),
          fused: false,
        });
      }
      let fused = false;
      for (let i = flies.length - 1; i >= 0; i -= 1) {
        const f = flies[i];
        f.age += dt;
        f.phase += dt * 3;
        if (f.state === 'approach') {
          // Drift toward the moth, wobbling, never fast.
          const dx = mothX - f.x;
          const dy = mothY - f.y;
          const len = Math.hypot(dx, dy) || 1;
          f.x += (dx / len) * EMBERFLY.approachSpeed * dt + Math.sin(f.phase) * 12 * dt;
          f.y += (dy / len) * EMBERFLY.approachSpeed * dt + Math.cos(f.phase * 0.7) * 10 * dt;
          if (len < 95) {
            f.state = 'flash';
            f.timer = EMBERFLY.flashTime;
            fused = true;
          }
        } else {
          // Flashing: hold still and burn brighter, then burst.
          f.timer -= dt;
          if (f.timer <= 0) {
            flies.splice(i, 1);
            detonate(f.x, f.y, EMBERFLY.blastRadius);
            continue;
          }
        }
        if (f.age > f.life && f.state === 'approach') flies.splice(i, 1);
      }
      return fused;
    },
    /** Pop a fly out (the moth dashed through it). */
    take(index) {
      return flies.splice(index, 1)[0];
    },
    reset() {
      flies.length = 0;
      spawnTimer = 6;
    },
  };
}
