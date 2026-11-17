// Synthesised sound: every effect is built with WebAudio oscillators and
// filtered noise, so the game ships no audio files and makes no network request.
// The context is created on the first user gesture (browsers block audio before
// one) and stays silent until then.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let pad = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone({ type = 'sine', from = 440, to = null, at = 0, dur = 0.15, vol = 0.2 }) {
    if (!context || !master) return;
    const t0 = context.currentTime + at;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ at = 0, dur = 0.2, vol = 0.15, freq = 1200 }) {
    if (!context || !master) return;
    const t0 = context.currentTime + at;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  /** A soft night pad: two slow detuned triangles under a lowpass, started once. */
  function startPad() {
    if (!context || !master || pad) return;
    pad = context.createGain();
    pad.gain.value = 0.035;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.connect(pad);
    pad.connect(master);
    for (const freq of [110, 164.81, 220]) {
      const osc = context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      osc.connect(filter);
      osc.start();
    }
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(pad.gain);
    lfo.start();
  }

  return {
    /** Call from any user gesture; also starts the pad. Safe to call often. */
    unlock() {
      if (ensure()) startPad();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** Pitch climbs with the combo, so a chain sounds like it is rising. */
    collect(combo) {
      if (!ensure()) return;
      const base = 520 * Math.pow(1.059, Math.min(combo, 12));
      tone({ type: 'sine', from: base, to: base * 1.5, dur: 0.12, vol: 0.22 });
      tone({ type: 'triangle', from: base * 2, to: base * 2.4, at: 0.02, dur: 0.1, vol: 0.08 });
    },
    dash() {
      if (!ensure()) return;
      noise({ dur: 0.25, vol: 0.16, freq: 900 });
      tone({ type: 'sine', from: 300, to: 640, dur: 0.18, vol: 0.1 });
    },
    hit() {
      if (!ensure()) return;
      tone({ type: 'sawtooth', from: 160, to: 55, dur: 0.3, vol: 0.22 });
      noise({ dur: 0.2, vol: 0.2, freq: 300 });
    },
    wave() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ type: 'triangle', from: freq, dur: 0.35, at: i * 0.09, vol: 0.16 });
      });
    },
    win() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
        tone({ type: 'triangle', from: freq, dur: 0.5, at: i * 0.12, vol: 0.16 });
      });
    },
    click() {
      if (!ensure()) return;
      tone({ type: 'sine', from: 660, to: 880, dur: 0.08, vol: 0.12 });
    },
  };
}
