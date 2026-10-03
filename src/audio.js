let ctx;

function ac() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlock() {
  try {
    ac();
  } catch {
    /* autoplay */
  }
}

function tone(freq, dur, type = "square", gain = 0.04) {
  let audio;
  try {
    audio = ac();
  } catch {
    return;
  }
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playEvents(events) {
  for (const e of events) {
    if (e.t === "jump") tone(520, 0.06, "square", 0.03);
    else if (e.t === "score" || e.t === "rivet" || e.t === "smash") tone(880, 0.05, "square", 0.03);
    else if (e.t === "die") tone(140, 0.28, "sawtooth", 0.04);
    else if (e.t === "clear" || e.t === "win") tone(660, 0.12, "square", 0.04);
    else if (e.t === "tick") tone(980, 0.02, "square", 0.02);
  }
}
