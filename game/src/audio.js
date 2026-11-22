// WebAudio synthesis only — engine, siren, gunshot, pickups, UI, music.
// No audio files; every sound is an oscillator/noise shape.
window.SOL = window.SOL || {};
SOL.Audio = (function () {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, musicTimer = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  // Ambient music: a slow, sunny I–vi–IV–V pluck loop.
  const CHORDS = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
  let chordIdx = 0;
  function musicStep() {
    if (!ctx) return;
    const ch = CHORDS[chordIdx % CHORDS.length]; chordIdx++;
    ch.forEach((f, i) => setTimeout(() => tone(f, 1.6, 'triangle', 0.055), i * 160));
    tone(ch[0] / 2, 1.8, 'sine', 0.07);
  }
  return {
    unlock: function () { ensure(); },
    click: function () { tone(660, 0.07, 'square', 0.08); },
    pickup: function () { tone(880, 0.12, 'sine', 0.22); setTimeout(() => tone(1320, 0.18, 'sine', 0.22), 80); },
    cash: function () { tone(1046, 0.1, 'triangle', 0.2); setTimeout(() => tone(1568, 0.22, 'triangle', 0.2), 90); },
    missionDone: function () { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.18), i * 110)); },
    fail: function () { tone(220, 0.5, 'sawtooth', 0.15, 110); },
    shot: function () { noise(0.14, 0.5, 2600); tone(150, 0.1, 'square', 0.25, 60); },
    hit: function () { noise(0.08, 0.3, 700); },
    crash: function () { noise(0.3, 0.45, 500); tone(80, 0.3, 'sine', 0.3, 40); },
    door: function () { tone(180, 0.08, 'square', 0.12); setTimeout(() => tone(140, 0.08, 'square', 0.12), 90); },
    startMusic: function () { if (!ensure() || musicTimer) return; musicStep(); musicTimer = setInterval(musicStep, 2400); },
    setEngine: function (on, speed01) {
      if (!ensure()) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain(); engineGain.gain.value = 0.05;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineOsc.start();
      }
      if (engineOsc) {
        engineOsc.frequency.value = 55 + (speed01 || 0) * 130;
        engineGain.gain.value = on ? 0.045 + (speed01 || 0) * 0.05 : 0;
        if (!on) { const o = engineOsc; setTimeout(() => { try { o.stop(); } catch (e) {} }, 120); engineOsc = null; }
      }
    },
    setSiren: function (on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle';
        sirenGain = ctx.createGain(); sirenGain.gain.value = 0.035;
        sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      }
      if (sirenOsc) {
        const t = ctx.currentTime;
        sirenOsc.frequency.value = 700 + Math.sin(t * 5) * 220;
        if (!on) { const o = sirenOsc; try { o.stop(); } catch (e) {} sirenOsc = null; }
      }
    }
  };
})();
