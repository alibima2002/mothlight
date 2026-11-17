// Owls: the garden's second hunter, and a different one from the bats. An
// owl slips in along the top of the night, warns the moth with a shadow where
// it will strike, then dives at that spot in a straight line and is gone. The
// warning is the game: a dive is always telegraphed, so it is always dodgeable.
import { FIELD, OWL, WAVES } from './config.js';

export function createOwls(random) {
  const owls = [];
  let spawnTimer = 5;

  return {
    owls,
    update(dt, wave, mothX, mothY, spawning = true) {
      spawnTimer -= dt;
      const cap = WAVES.owlCap(wave);
      if (WAVES.owls(wave) && spawning && spawnTimer <= 0 && owls.length < cap) {
        spawnTimer = WAVES.owlInterval(wave) * random.range(0.85, 1.25);
        owls.push({
          x: random.range(120, FIELD.width - 120),
          y: 64,
          tx: 0,
          ty: 0,
          vx: 0,
          vy: 0,
          r: OWL.radius,
          age: 0,
          state: 'warn',
          timer: OWL.warnTime,
          flap: random.range(0, Math.PI * 2),
        });
      }
      for (let i = owls.length - 1; i >= 0; i -= 1) {
        const owl = owls[i];
        owl.age += dt;
        owl.flap += dt * 9;
        if (owl.state === 'warn') {
          // The shadow tracks the moth while it warns, then locks: the dive
          // goes where the moth was when the warning ended, so it is dodgeable.
          owl.tx = mothX;
          owl.ty = mothY;
          owl.timer -= dt;
          if (owl.timer <= 0) {
            owl.state = 'dive';
            const dx = owl.tx - owl.x;
            const dy = owl.ty - owl.y;
            const len = Math.hypot(dx, dy) || 1;
            owl.vx = (dx / len) * OWL.diveSpeed;
            owl.vy = (dy / len) * OWL.diveSpeed;
          }
        } else if (owl.state === 'dive') {
          owl.x += owl.vx * dt;
          owl.y += owl.vy * dt;
          if (owl.y > FIELD.height + 60 || owl.x < -60 || owl.x > FIELD.width + 60) {
            owls.splice(i, 1);
          }
        }
        if (owl.age > OWL.life && owl.state !== 'dive') owls.splice(i, 1);
      }
    },
    reset() {
      owls.length = 0;
      spawnTimer = 5;
    },
  };
}
