// Keyboard and mouse input. The game reads a single snapshot each frame: which
// movement keys are held, where the mouse is (in field coordinates), and the
// edge-triggered actions (confirm, dash, pause, mute, restart) that fired since
// the last read.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_DASH = 'dash';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Spacebar: ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = null;
  let mouseY = null;
  let mouseDown = false;
  let mouseClicked = false;
  let focused = true;

  function keyOf(event) {
    return event.key === ' ' ? ' ' : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyOf(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(key);
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyOf(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
    focused = false;
  });
  window.addEventListener('focus', () => {
    focused = true;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      mouseClicked = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });

  function hasAction(action) {
    for (const key of pressed) {
      if (KEY_ACTIONS[key] === action) return true;
    }
    if (action === ACTION_CONFIRM && mouseClicked) return true;
    if (action === ACTION_DASH && mouseClicked) return true;
    return false;
  }

  return {
    /** Snapshot for this frame; clears the edge-triggered presses. */
    read(view) {
      const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
      const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
      const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
      const snapshot = {
        keys: { up, down, left, right },
        dash: keys.has(' ') || mouseDown,
        mouse:
          mouseX === null
            ? null
            : { x: (mouseX - view.ox) / view.scale, y: (mouseY - view.oy) / view.scale },
        confirm: hasAction(ACTION_CONFIRM),
        pause: hasAction(ACTION_PAUSE),
        mute: hasAction(ACTION_MUTE),
        restart: hasAction(ACTION_RESTART),
        focused,
      };
      pressed.clear();
      mouseClicked = false;
      return snapshot;
    },
  };
}
