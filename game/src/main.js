// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, game over and dawn (the win).
//
// ?seed=N fixes the garden's pattern. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BLOCK, EVENT_BOSS, EVENT_BOSS_DOWN, EVENT_BOSS_HIT, EVENT_COLLECT, EVENT_DASH, EVENT_EMBER, EVENT_FUSE, EVENT_HIT, EVENT_MOON, EVENT_OVER, EVENT_SHIELD, EVENT_WAVE, EVENT_WIN } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

let screen = SCREEN_TITLE;
let best = readBest();
let lastTime = 0;
let accumulator = 0;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function startGame() {
  audio.unlock();
  audio.click();
  world.reset();
  screen = SCREEN_PLAY;
  announce('Mothlight: wave 1. Gather pollen, dodge the bats.');
}

/** The moth's steer target for this frame: keys win over the mouse. */
function steerTarget(snapshot) {
  const moth = world.moth.moth;
  const keys = snapshot.keys;
  if (keys.up || keys.down || keys.left || keys.right) {
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    return { x: moth.x + dx * 240, y: moth.y + dy * 240 };
  }
  return snapshot.mouse;
}

function playEvents(events) {
  const s = world.state;
  if (events & EVENT_COLLECT) audio.collect(s.combo);
  if (events & EVENT_MOON) audio.moon();
  if (events & EVENT_SHIELD) audio.shield();
  if (events & EVENT_BLOCK) audio.block();
  if (events & EVENT_DASH) audio.dash();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_BOSS) audio.screech();
  if (events & EVENT_BOSS_HIT) audio.bossHit();
  if (events & EVENT_BOSS_DOWN) audio.bossDown();
  if (events & EVENT_FUSE) audio.fuse();
  if (events & EVENT_EMBER) audio.emberPop();
  if (events & EVENT_WAVE) {
    audio.wave();
    announce(`Wave ${s.wave}: ${s.collected} of ${s.quota} pollen gathered.`);
  }
  if (events & EVENT_WIN) {
    audio.win();
    if (s.score > best) {
      best = s.score;
      saveBest(best);
    }
    screen = SCREEN_WIN;
    announce(`Dawn breaks! Final score ${s.score}. Press R to fly again.`);
  } else if (events & EVENT_OVER) {
    if (s.score > best) {
      best = s.score;
      saveBest(best);
    }
    screen = SCREEN_OVER;
    announce(`Game over. Score ${s.score}. Press R to fly again.`);
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  const dt = Math.min(MAX_FRAME, (time - lastTime) / 1000 || 0);
  lastTime = time;
  const snapshot = input.read(renderer.view);
  if (snapshot.mute) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }

  if (screen === SCREEN_TITLE) {
    // A living backdrop: the garden blooms behind the title, and the moth
    // drifts low over the flowers, clear of the words.
    world.garden.update(dt, 1);
    world.particles.update(dt);
    world.moth.moth.wing += dt * 16;
    world.moth.moth.x = FIELD.width / 2 + Math.sin(world.state.time * 0.7) * 130;
    world.moth.moth.y = 590 + Math.sin(world.state.time * 1.3) * 10;
    world.state.time += dt;
    if (snapshot.confirm) startGame();
  } else if (screen === SCREEN_PLAY) {
    if (snapshot.pause) {
      screen = SCREEN_PAUSED;
      announce('Paused. Press P to keep flying.');
    } else {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const steer = {
          target: steerTarget(snapshot),
          keys: snapshot.keys,
          dash: snapshot.dash,
        };
        const events = world.step(STEP, steer);
        playEvents(events);
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    }
  } else if (screen === SCREEN_PAUSED) {
    if (snapshot.pause || snapshot.confirm) {
      screen = SCREEN_PLAY;
      announce('Flying again.');
    }
  } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if (snapshot.restart || snapshot.confirm) startGame();
  }

  renderer.draw(world, screen, best);
}

// Audio may only start after a gesture: unlock on any of them.
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    announce('Paused. Press P to keep flying.');
  }
});

if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  renderer.draw(world, screen, best);
  renderer.draw(world, screen, best);
  window.__shotReady = true;
} else {
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Read-only handle for automated playtests (and for a curious player): the
// live world state and the screen name. It changes nothing about the game.
window.__mothlight = {
  world,
  get screen() {
    return screen;
  },
  get best() {
    return best;
  },
};
