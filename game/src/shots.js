// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, so the frame is
// what a short game really looks like and the same seed always gives the same
// frame. The play pilot chases the nearest pollen and keeps clear of bats; the
// end pilot chases pollen and ignores the bats, so the night catches it — as a
// hurried player is caught.
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { FIELD, STEP } from './config.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** The nearest pollen mote, or null when the garden holds none. */
function nearestPollen(world) {
  const moth = world.moth.moth;
  let best = null;
  let bestD = Infinity;
  for (const mote of world.garden.pollen) {
    const dx = mote.x - moth.x;
    const dy = mote.y - moth.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = mote;
    }
  }
  return best;
}

/** The nearest bat, or null. */
function nearestBat(world) {
  const moth = world.moth.moth;
  let best = null;
  let bestD = Infinity;
  for (const bat of world.bats.bats) {
    const dx = bat.x - moth.x;
    const dy = bat.y - moth.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = bat;
    }
  }
  return best;
}

/**
 * Steer for one step. `careful` pilots keep clear of bats and dash away when
 * one closes in; careless ones fly straight at the nearest bat, so the night
 * catches them — as a hurried player is caught.
 */
function autopilot(world, careful) {
  const moth = world.moth.moth;
  const bat = nearestBat(world);
  const batD = bat ? Math.hypot(bat.x - moth.x, bat.y - moth.y) : Infinity;
  let target = null;
  let dash = false;
  if (!careful && bat) {
    // The end scene's pilot: chase the bat, not the pollen.
    target = { x: bat.x, y: bat.y };
  } else if (careful && bat && batD < 130) {
    // Flee: aim away from the bat, and dash if it is close.
    const dx = moth.x - bat.x;
    const dy = moth.y - bat.y;
    const len = Math.hypot(dx, dy) || 1;
    target = { x: moth.x + (dx / len) * 260, y: moth.y + (dy / len) * 260 };
    target.x = Math.max(30, Math.min(FIELD.width - 30, target.x));
    target.y = Math.max(30, Math.min(FIELD.height - 30, target.y));
    dash = batD < 80;
  } else {
    const mote = nearestPollen(world);
    if (mote) target = { x: mote.x, y: mote.y };
    else target = { x: FIELD.width / 2, y: FIELD.height / 2 };
  }
  return { target, keys: { up: false, down: false, left: false, right: false }, dash };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.garden.update(STEP, 1);
      world.particles.update(STEP);
      world.moth.moth.wing += STEP * 16;
      world.state.time += STEP;
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careful = name !== 'end';
  for (let i = 0; i < limit / STEP; i += 1) {
    const events = world.step(STEP, autopilot(world, careful));
    if (events & EVENT_OVER) return { screen: SCREEN_OVER, best: world.state.score };
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
  }
  const over = world.state.lives === 0;
  const won = world.state.dawn >= 1;
  return {
    screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY,
    best: world.state.score,
  };
}
