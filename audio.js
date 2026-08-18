/* MTSC Range Timer — synthesized beep engine (Web Audio API, no audio files, fully offline)
   and screen wake-lock helper.

   Loudness notes (why the numbers below are what they are):
   - Every beep is a full duty-cycle square/sawtooth wave at gain 1 straight to
     the output. A signal like that already has RMS approx equal to its peak —
     the maximum ratio possible for anything bounded to [-1, 1] — so there is
     no more "digital gain" headroom to extract without clipping. (An earlier
     version of this file tried a limiter + stacked harmonic layer to push
     gain past 1; measured with an OfflineAudioContext A/B test, that made
     every beep *quieter*, because a compressor has nothing to compress on a
     signal with no internal dynamic range — it just ducks the whole tone.
     That approach was reverted.)
   - What *does* help, and is applied here:
     1. `exposureInBeep`/`exposureOutBeep` previously had gain 0.95/0.85 —
        below full scale for no reason. Set to 1 like the others.
     2. The two short beeps were 150ms — under the ~150-200ms window over
        which human hearing integrates loudness, so they read as quieter than
        their level would suggest even though the waveform itself was already
        full-scale. Lengthened to 220ms so they sit inside that window.
     3. Frequencies moved up (keeping the exact same relative pitch
        relationships between the four signal types) into the ~1-2.4kHz
        range, closer to where small phone speakers are most efficient and
        where human hearing is most sensitive (equal-loudness contours) —
        this is the one change here that's about perceived loudness on real
        hardware rather than something the signal's raw RMS shows.
*/

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
    startBeep() { tone(2352, 350, { type: "square", gain: 1 }); },
    // Short high beep — appearance ("target up") when distinct from string start is useful
    exposureInBeep() { tone(2352, 220, { type: "square", gain: 1 }); },
    // Short low beep — appearance ends ("target down")
    exposureOutBeep() { tone(1176, 220, { type: "square", gain: 1 }); },
    // Distinct low double-beep — cease fire / time expired, clearly different from the start signal
    ceaseFireBeep() {
      tone(988, 220, { type: "sawtooth", gain: 1 });
      tone(988, 220, { type: "sawtooth", gain: 1, delayMs: 300 });
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
