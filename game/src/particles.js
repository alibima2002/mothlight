// Particles and floating score text: the feedback layer. Sparks fly when pollen
// is gathered, a burst and shake mark a bat hit, and the moth leaves a faint
// glow trail while it dashes.
export function createParticles() {
  const parts = [];
  const texts = [];

  return {
    burst(x, y, { count = 14, color = '#ffd76a', speed = 180, life = 0.6, size = 3 }) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        parts.push({
          x,
          y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 30,
          life: life * (0.6 + Math.random() * 0.4),
          age: 0,
          size: size * (0.6 + Math.random() * 0.8),
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
    },
  };
}
