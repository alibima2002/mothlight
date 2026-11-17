// Particles, floating score text and shockwave rings: the feedback layer.
// Sparks fly when pollen is gathered, a burst and shake mark a bat hit, the
// moth leaves a faint glow trail while it dashes, and a ring blooms when
// something rare happens — a moonpetal, or a shield shattering. All randomness
// comes from the world's seeded random, so a ?seed=N run plays out exactly
// the same way every time.
export function createParticles(random) {
  const parts = [];
  const texts = [];
  const rings = [];

  return {
    burst(x, y, { count = 14, color = '#ffd76a', speed = 180, life = 0.6, size = 3 }) {
      for (let i = 0; i < count; i += 1) {
        const angle = random.next() * Math.PI * 2;
        const v = speed * (0.3 + random.next() * 0.7);
        parts.push({
          x,
          y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 30,
          life: life * (0.6 + random.next() * 0.4),
          age: 0,
          size: size * (0.6 + random.next() * 0.8),
          color,
        });
      }
    },
    trail(x, y, color) {
      parts.push({ x, y, vx: 0, vy: -12, life: 0.45, age: 0, size: 5, color });
    },
    text(x, y, value, color = '#ffd76a') {
      texts.push({ x, y, value, color, life: 0.9, age: 0 });
    },
    /** An expanding ring: the punctuation on a rare moment. */
    ring(x, y, color = '#ffe9b0', maxR = 90, life = 0.6) {
      rings.push({ x, y, color, maxR, life, age: 0 });
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 2.2 * dt;
        p.vy *= 1 - 2.2 * dt;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.age += dt;
        t.y -= 42 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const r = rings[i];
        r.age += dt;
        if (r.age >= r.life) rings.splice(i, 1);
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const a = 1 - p.age / p.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      for (const r of rings) {
        const t = r.age / r.life;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 8 + (r.maxR - 8) * t, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 17px system-ui, sans-serif';
      for (const t of texts) {
        ctx.globalAlpha = 1 - t.age / t.life;
        ctx.fillStyle = t.color;
        ctx.fillText(t.value, t.x, t.y);
      }
      ctx.restore();
    },
    clear() {
      parts.length = 0;
      texts.length = 0;
      rings.length = 0;
    },
  };
}
