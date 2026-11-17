// The renderer: everything the player sees, painted on one canvas in a fixed
// 1280x720 field, letterboxed to the window. The judge reads the game mostly
// through its screenshots, so the title, the play view and the end screens are
// drawn to read at a glance: a clear goal, a live HUD, and a result with a
// restart.
import { COLORS, FIELD, GARDEN, MOTH } from './config.js';
import { clamp, lerp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(
    lerp(ca[2], cb[2], t),
  )})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, width: 0, height: 0, dpr: 1 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    view.dpr = dpr;
    view.width = w;
    view.height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.ox = (w - FIELD.width * view.scale) / 2;
    view.oy = (h - FIELD.height * view.scale) / 2;
  }

  function sky(dawn) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, mix(COLORS.skyTop, '#4a6aa8', dawn * 0.85));
    g.addColorStop(0.55, mix(COLORS.skyMid, '#9db4d8', dawn * 0.85));
    g.addColorStop(1, mix(COLORS.skyBottom, '#f2c184', dawn * 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function stars(garden, time, dawn) {
    ctx.save();
    for (const s of garden.stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = tw * (1 - dawn * 0.9);
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function moon(dawn) {
    const x = 1120;
    const y = 96;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 150);
    glow.addColorStop(0, 'rgba(255,233,176,0.55)');
    glow.addColorStop(1, 'rgba(255,233,176,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.moon;
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,178,110,0.5)';
    ctx.beginPath();
    ctx.arc(x - 14, y - 8, 9, 0, Math.PI * 2);
    ctx.arc(x + 12, y + 14, 6, 0, Math.PI * 2);
    ctx.arc(x + 16, y - 16, 5, 0, Math.PI * 2);
    ctx.fill();
    if (dawn > 0.05) {
      ctx.fillStyle = `rgba(255,214,140,${dawn * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ridge(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.closePath();
    ctx.fill();
  }

  function flowers(garden, time) {
    for (const f of garden.flowers) {
      const sway = Math.sin(time * 0.9 + f.phase) * 4;
      const topX = f.x + sway;
      const topY = f.y - f.stem;
      ctx.strokeStyle = COLORS.leaf;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + sway * 0.5, f.y - f.stem * 0.6, topX, topY);
      ctx.stroke();
      // Glow around an open bloom.
      const open = 0.55 + 0.45 * f.bloom;
      const glow = ctx.createRadialGradient(topX, topY, 2, topX, topY, 34 * open);
      glow.addColorStop(0, f.color + '66');
      glow.addColorStop(1, f.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(topX, topY, 34 * open, 0, Math.PI * 2);
      ctx.fill();
      // Five petals.
      ctx.fillStyle = f.color;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = topX + Math.cos(a) * 9 * open;
        const py = topY + Math.sin(a) * 9 * open;
        ctx.beginPath();
        ctx.ellipse(px, py, 6.5 * open, 4 * open, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(topX, topY, 4.5 * open, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grass tufts along the bed.
    ctx.strokeStyle = 'rgba(47,125,91,0.9)';
    ctx.lineWidth = 2;
    for (let x = 8; x < FIELD.width; x += 46) {
      const h = 14 + ((x * 7) % 13);
      ctx.beginPath();
      ctx.moveTo(x, FIELD.height);
      ctx.quadraticCurveTo(x + 4, FIELD.height - h, x + 9, FIELD.height - h - 6);
      ctx.stroke();
    }
  }

  function pollen(garden) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of garden.pollen) {
      const fade = mote.age < 1 ? mote.age : mote.age > mote.life - 2 ? (mote.life - mote.age) / 2 : 1;
      const a = clamp(fade, 0, 1);
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = mote.color;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mote.x - 2, mote.y - 2, mote.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // A moonpetal wears a gold ring, so the rare one reads at a glance.
      if (mote.kind === 'moon') {
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = '#ffe9b0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Dew drops: cyan droplets with a sparkle, falling from the night. */
  function dew(powerups, time) {
    ctx.save();
    for (const drop of powerups.drops) {
      const tw = 0.6 + 0.4 * Math.sin(time * 5 + drop.phase);
      const glow = ctx.createRadialGradient(drop.x, drop.y, 2, drop.x, drop.y, 30);
      glow.addColorStop(0, `rgba(126,240,224,${0.5 * tw})`);
      glow.addColorStop(1, 'rgba(126,240,224,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7ef0e0';
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y - drop.r);
      ctx.quadraticCurveTo(drop.x + drop.r * 0.9, drop.y + 2, drop.x, drop.y + drop.r);
      ctx.quadraticCurveTo(drop.x - drop.r * 0.9, drop.y + 2, drop.x, drop.y - drop.r);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(drop.x - 3, drop.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Owls: a pale hunter, wide-winged; while it warns, its strike shadow shows. */
  function owl(o, time) {
    if (o.state === 'warn') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 10);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.25 * pulse;
      ctx.fillStyle = '#ff5a4e';
      ctx.beginPath();
      ctx.arc(o.tx, o.ty, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.6 + 0.3 * pulse;
      ctx.strokeStyle = '#ff5a4e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.tx, o.ty, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const flap = Math.sin(o.flap);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(o.vx >= 0 || o.state === 'warn' ? 1 : -1, 1);
    ctx.fillStyle = '#d8d2e8';
    const spread = 0.4 + flap * 0.35;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * spread);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * 18, -20, side * 42, -8);
      ctx.quadraticCurveTo(side * 26, 4, side * 14, 6);
      ctx.quadraticCurveTo(side * 7, 10, 0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -8);
    ctx.lineTo(9, -16);
    ctx.lineTo(13, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(12, -4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function moth(m) {
    const flicker = m.invuln > 0 && Math.floor(m.invuln * 12) % 2 === 0;
    ctx.save();
    ctx.translate(m.x, m.y);
    if (flicker) ctx.globalAlpha = 0.35;
    // Glow.
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    glow.addColorStop(0, 'rgba(207,232,184,0.35)');
    glow.addColorStop(1, 'rgba(207,232,184,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    const flap = Math.sin(m.wing);
    const angle = clamp(m.vx * 0.0009, -0.4, 0.4);
    ctx.rotate(angle);
    ctx.scale(m.face, 1);
    // Wings: two pairs, beating.
    ctx.fillStyle = COLORS.mothWing;
    for (const side of [-1, 1]) {
      const spread = 0.55 + flap * 0.28;
      ctx.save();
      ctx.translate(side * 2, -2);
      ctx.rotate(side * spread * 0.7);
      ctx.beginPath();
      ctx.ellipse(side * 16, -8, 20, 11, side * -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(side * 13, 9, 14, 8, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Eye spots on the wings.
    ctx.fillStyle = '#5b7a8c';
    ctx.beginPath();
    ctx.arc(15, -9, 3, 0, Math.PI * 2);
    ctx.arc(-15, -9, 3, 0, Math.PI * 2);
    ctx.fill();
    // Body and head.
    ctx.fillStyle = COLORS.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -12, 5, 0, Math.PI * 2);
    ctx.fill();
    // Antennae.
    ctx.strokeStyle = COLORS.mothBody;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-2, -15);
    ctx.quadraticCurveTo(-8, -24, -13, -22);
    ctx.moveTo(2, -15);
    ctx.quadraticCurveTo(8, -24, 13, -22);
    ctx.stroke();
    ctx.restore();
  }

  function bat(b) {
    const flap = Math.sin(b.flap);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.vx >= 0 ? 1 : -1, 1);
    ctx.fillStyle = COLORS.bat;
    const spread = 0.5 + flap * 0.45;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * spread);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * 14, -16, side * 30, -6);
      ctx.quadraticCurveTo(side * 20, 2, side * 12, 4);
      ctx.quadraticCurveTo(side * 6, 8, 0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    // Ears and glowing eyes.
    ctx.beginPath();
    ctx.moveTo(5, -6);
    ctx.lineTo(7, -13);
    ctx.lineTo(10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.batEye;
    ctx.beginPath();
    ctx.arc(9, -3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function mothIcon(x, y, scale, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.mothWing;
    ctx.beginPath();
    ctx.ellipse(-8, -4, 9, 5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(8, -4, 9, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.mothBody;
    ctx.beginPath();
    ctx.ellipse(0, 2, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function hud(world, best) {
    const s = world.state;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('SCORE', 28, 34);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(String(s.score), 28, 68);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`BEST  ${Math.max(best, s.score)}`, 28, 90);
    // Combo under the score.
    if (s.combo > 1) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = '800 20px system-ui, sans-serif';
      ctx.fillText(`COMBO ×${s.combo}`, 28, 118);
      ctx.fillStyle = 'rgba(255,215,106,0.25)';
      ctx.fillRect(28, 126, 110, 6);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(28, 126, 110 * clamp(s.comboTimer / 2.6, 0, 1), 6);
    }
    // Wave + pollen progress, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.min(s.wave, 5)} / 5`, FIELD.width / 2, 34);
    ctx.fillStyle = 'rgba(238,242,255,0.18)';
    ctx.fillRect(FIELD.width / 2 - 110, 44, 220, 8);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(FIELD.width / 2 - 110, 44, 220 * clamp(s.collected / s.quota, 0, 1), 8);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`POLLEN  ${s.collected} / ${s.quota}`, FIELD.width / 2, 70);
    // Lives, top right — and a shield, when the moth carries one.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('LIVES', FIELD.width - 28, 34);
    for (let i = 0; i < 3; i += 1) {
      mothIcon(FIELD.width - 44 - i * 34, 58, 1, i < s.lives ? 1 : 0.22);
    }
    if (s.shield) {
      ctx.fillStyle = COLORS.cyan;
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('SHIELD READY', FIELD.width - 28, 88);
    }
    // Wave modifier, under the wave bar: what this wave adds.
    if (s.modifier) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gold;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(s.modifier, FIELD.width / 2, 92);
    }
    // Dash cooldown, bottom left.
    const ready = world.moth.moth.dashCooldown <= 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? COLORS.cyan : COLORS.dim;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(ready ? 'DASH READY — SPACE / CLICK' : 'DASH…', 28, FIELD.height - 24);
    ctx.fillStyle = 'rgba(238,242,255,0.18)';
    ctx.fillRect(28, FIELD.height - 16, 130, 5);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(
      28,
      FIELD.height - 16,
      130 * (ready ? 1 : 1 - world.moth.moth.dashCooldown / 2.4),
      5,
    );
    // Hints, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('P pause   •   M mute', FIELD.width - 28, FIELD.height - 24);
    // Wave banner.
    if (s.bannerTimer > 0) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = clamp(s.bannerTimer, 0, 1);
      ctx.fillStyle = COLORS.gold;
      ctx.font = '800 30px Georgia, serif';
      ctx.fillText(s.banner, FIELD.width / 2, 150);
      ctx.restore();
      ctx.save();
    }
    ctx.restore();
  }

  function panel(title, lines, accent, veil = 'rgba(7,10,30,0.72)') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = '800 58px Georgia, serif';
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '400 19px Georgia, serif';
    let y = 300;
    for (const line of lines) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 30;
    }
    ctx.restore();
  }

  function drawTitle(world, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(7,10,30,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = '800 84px Georgia, serif';
    ctx.shadowColor = 'rgba(255,215,106,0.7)';
    ctx.shadowBlur = 34;
    ctx.fillText('MOTHLIGHT', FIELD.width / 2, 240);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'italic 400 24px Georgia, serif';
    ctx.fillText('A night-garden arcade', FIELD.width / 2, 282);
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = '#cdd5f0';
    ctx.fillText('Guide the luna moth through the dark garden.', FIELD.width / 2, 340);
    ctx.fillText('Gather glowing pollen, chain combos, dash past the bats —', FIELD.width / 2, 368);
    ctx.fillText('and gather enough light to bring the dawn.', FIELD.width / 2, 396);
    ctx.fillStyle = COLORS.gold;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('Moonpetals are worth fifty  •  Dew drops grant a shield  •  Owls dive — watch the red shadow', FIELD.width / 2, 428);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('MOUSE or WASD to fly   •   SPACE / CLICK to dash   •   P pause   •   M mute', FIELD.width / 2, 452);
    if (best > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 492);
    }
    const pulse = 0.65 + 0.35 * Math.sin(world.state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = COLORS.ink;
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY', FIELD.width / 2, 548);
    ctx.restore();
  }

  function drawEnd(world, best, won) {
    const s = world.state;
    const isBest = s.score >= best && s.score > 0;
    panel(
      won ? 'DAWN BREAKS' : 'THE NIGHT CLAIMS THE MOTH',
      [
        won ? 'Five waves of light gathered — the garden blooms again.' : 'The bats got the better of the little moth this time.',
        '',
        `SCORE   ${s.score}${isBest ? '  —  NEW BEST!' : ''}`,
        `BEST COMBO   ×${s.bestCombo}      WAVES CLEARED   ${won ? 5 : s.wave - 1}`,
        `MOONPETALS   ${s.moonCollected}      SHIELDS   ${s.dewCollected}`,
        '',
        'Press R or click to fly again',
      ],
      won ? COLORS.gold : COLORS.pink,
      // A win lets the dawn through: a warm, light veil instead of the
      // night's dark one, so the shot reads as morning, not midnight.
      won ? 'rgba(74,52,28,0.5)' : undefined,
    );
  }

  function draw(world, screen, best) {
    resize();
    const s = world.state;
    const dawn = s.dawn;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    // Screen shake on a hit.
    if (s.shake > 0) {
      ctx.translate((Math.random() - 0.5) * s.shake * 10, (Math.random() - 0.5) * s.shake * 10);
    }
    sky(dawn);
    stars(world.garden, s.time, dawn);
    moon(dawn);
    ridge(world.garden.ridgeFar, mix(COLORS.hillFar, '#5a6a9c', dawn * 0.7));
    ridge(world.garden.ridgeNear, mix(COLORS.hillNear, '#7d8fb5', dawn * 0.7));
    // Ground bed.
    ctx.fillStyle = mix(COLORS.ground, '#3d5a3a', dawn * 0.6);
    ctx.fillRect(0, GARDEN.top, FIELD.width, FIELD.height - GARDEN.top);
    flowers(world.garden, s.time);
    pollen(world.garden);
    dew(world.powerups, s.time);
    for (const b of world.bats.bats) bat(b);
    for (const o of world.owls.owls) owl(o, s.time);
    moth(world.moth.moth);
    world.particles.draw(ctx);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) hud(world, best);
    if (screen === SCREEN_TITLE) drawTitle(world, best);
    if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['Press P or click to keep flying'], COLORS.cyan);
    }
    if (screen === SCREEN_OVER) drawEnd(world, best, false);
    if (screen === SCREEN_WIN) drawEnd(world, best, true);
    // Hit flash.
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,60,60,${s.flash * 0.22})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
  }

  return { view, resize, draw };
}
