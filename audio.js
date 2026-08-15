/* MTSC Range Timer — synthesized beep engine (Web Audio API, no audio files, fully offline)
   and screen wake-lock helper. */

const AudioEngine = (() => {
  let ctx = null;
  let volume = 0.9;

  function ensureContext() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); }

  // Plays a single tone. type: oscillator waveform.
  function tone(freq, durationMs, { type = "square", gain = 1, delayMs = 0 } = {}) {
    const c = ensureContext();
    const start = c.currentTime + delayMs / 1000;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const peak = volume * gain;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + 0.01);
    g.gain.setValueAtTime(peak, start + durationMs / 1000 - 0.02);
    g.gain.linearRampToValueAtTime(0, start + durationMs / 1000);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + durationMs / 1000 + 0.02);
  }

  return {
    ensureContext,
    setVolume,
    // Loud single high beep — start of a string / start of an appearance ("target up")
    startBeep() { tone(1568, 350, { type: "square", gain: 1 }); },
    // Short high beep — appearance ("target up") when distinct from string start is useful
    exposureInBeep() { tone(1568, 150, { type: "square", gain: 0.95 }); },
    // Short low beep — appearance ends ("target down")
    exposureOutBeep() { tone(784, 150, { type: "square", gain: 0.85 }); },
    // Distinct low double-beep — cease fire / time expired, clearly different from the start signal
    ceaseFireBeep() {
      tone(659, 220, { type: "sawtooth", gain: 1 });
      tone(659, 220, { type: "sawtooth", gain: 1, delayMs: 300 });
    },
    // Short click for countdown ticks (3..2..1) if ever wanted
    tick() { tone(440, 60, { type: "sine", gain: 0.4 }); }
  };
})();

const WakeLock = (() => {
  let sentinel = null;
  let enabled = false;

  async function request() {
    enabled = true;
    if (!("wakeLock" in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => { sentinel = null; });
    } catch (e) {
      // ignore — not fatal, just means screen may sleep
    }
  }

  async function release() {
    enabled = false;
    if (sentinel) {
      try { await sentinel.release(); } catch (e) {}
      sentinel = null;
    }
  }

  // Re-acquire when tab becomes visible again (wake locks are dropped on hide)
  document.addEventListener("visibilitychange", () => {
    if (enabled && document.visibilityState === "visible") request();
  });

  return { request, release };
})();
