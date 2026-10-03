import { CLIMB, GRAV, JUMP_V, MAX_FALL, VIEW_H, WALK } from "./constants.js";
import { STAGES } from "./stages.js";

const POINTS = [100, 300, 500, 800];

export function girderY(g, x) {
  const span = g.x1 - g.x0 || 1;
  const t = (x - g.x0) / span;
  return g.y0 + (g.y1 - g.y0) * t;
}

export function slopeDir(g) {
  const d = g.y1 - g.y0;
  if (Math.abs(d) < 1) return 1;
  return d > 0 ? 1 : -1;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function emit(sink, event) {
  if (sink) sink(event);
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function marioBox(m) {
  return { x: m.x - 5, y: m.y - 14, w: 10, h: 14 };
}

function baddieBox(b) {
  const h = 6;
  return { x: b.x - 4, y: b.y - h, w: 8, h };
}

export function bestSupport(state, x, y) {
  let bestG = null;
  let bestGD = 10;
  for (let i = 0; i < state.girders.length; i++) {
    const g = state.girders[i];
    if (x < g.x0 || x > g.x1) continue;
    const sy = girderY(g, x);
    const dy = Math.abs(sy - y);
    if (dy <= bestGD) {
      bestGD = dy;
      bestG = { kind: "girder", i, y: sy };
    }
  }
  if (bestG) return bestG;
  let bestE = null;
  let bestED = 12;
  for (let i = 0; i < state.elevators.length; i++) {
    const e = state.elevators[i];
    if (x < e.x || x > e.x + e.w) continue;
    const dy = Math.abs(e.y - y);
    if (dy <= bestED) {
      bestED = dy;
      bestE = { kind: "elev", i, y: e.y };
    }
  }
  return bestE;
}

export function ladderSpan(state, lad) {
  const bottom = state.girders[lad.g0];
  const top = state.girders[lad.g1];
  return {
    y0: girderY(bottom, lad.x),
    y1: girderY(top, lad.x),
  };
}

export function ladderAt(state, x, y, bias = null) {
  let best = null;
  let bestScore = 1e9;
  for (const lad of state.ladders) {
    if (lad.broken) continue;
    const dx = Math.abs(lad.x - x);
    if (dx > 9) continue;
    const span = ladderSpan(state, lad);
    if (y > span.y0 + 4 || y < span.y1 - 4) continue;
    let score = dx * 8;
    if (bias === "up") score += Math.abs(y - span.y0);
    else if (bias === "down") score += Math.abs(y - span.y1);
    else score += Math.min(Math.abs(y - span.y0), Math.abs(y - span.y1));
    if (score < bestScore) {
      bestScore = score;
      best = { lad, ...span };
    }
  }
  return best;
}

function boot(state) {
  const def = STAGES[state.stageIndex]();
  state.stage = def;
  state.girders = def.girders.map((g) => ({ ...g }));
  state.ladders = def.ladders.map((l) => ({ ...l }));
  state.elevators = def.elevators.map((e) => ({ ...e }));
  state.springs = def.springs;
  state.rivets = def.rivets.map((r) => ({ ...r, alive: true }));
  state.hammers = def.hammers.map((h) => ({
    ...h,
    y: girderY(def.girders[h.girder], h.x),
    alive: true,
  }));
  state.baddies = [];
  for (const pie of def.pies) {
    const g = state.girders[pie.girder];
    state.baddies.push({
      kind: "pie",
      x: pie.x,
      y: girderY(g, pie.x),
      girder: pie.girder,
      vx: -(Math.sign(g.convey) || 1) * 1.35,
      vy: 0,
      falling: false,
      alive: true,
      id: state.nextId++,
    });
  }
  for (const fire of def.fires) {
    const g = state.girders[fire.girder];
    state.baddies.push({
      kind: "fire",
      x: fire.x,
      y: girderY(g, fire.x),
      girder: fire.girder,
      vx: fire.vx,
      vy: 0,
      falling: false,
      alive: true,
      id: state.nextId++,
    });
  }
  state.bonus = def.bonus;
  state.bonusAcc = 0;
  state.pauline = {
    x: def.pauline.x,
    girder: def.pauline.girder,
    y: girderY(state.girders[def.pauline.girder], def.pauline.x),
  };
  state.dk = {
    x: def.dk.x,
    girder: def.dk.girder,
    y: girderY(state.girders[def.dk.girder], def.dk.x),
    vy: 0,
    falling: false,
  };
  state.oil = def.oil
    ? { x: def.oil.x, girder: def.oil.girder, y: girderY(state.girders[def.oil.girder], def.oil.x) }
    : null;
  const sg = state.girders[def.spawn.girder];
  state.mario = {
    x: def.spawn.x,
    y: girderY(sg, def.spawn.x),
    girder: def.spawn.girder,
    elev: null,
    vx: 0,
    vy: 0,
    onGround: true,
    climbing: false,
    wasJump: false,
    hammer: 0,
    jumpedFrom: -1,
    combo: 0,
    scored: [],
    rideFromY: null,
  };
  state.cleared = false;
  state.deathReason = null;
  state.attempt++;
  state.throwAcc = 0;
}

export function createGame(opts = {}) {
  return {
    mode: opts.skipTitle ? "howhigh" : "title",
    modeTimer: opts.skipTitle ? 100 : 0,
    fast: !!opts.fast,
    score: 0,
    high: 0,
    lives: 3,
    stageIndex: 0,
    frame: 0,
    attempt: 0,
    nextId: 1,
    girders: [],
    ladders: [],
    elevators: [],
    springs: [],
    rivets: [],
    hammers: [],
    baddies: [],
    mario: null,
    bonus: 5000,
    bonusAcc: 0,
    cleared: false,
  };
}

export function cloneState(s) {
  return {
    mode: s.mode,
    modeTimer: s.modeTimer,
    fast: s.fast,
    score: s.score,
    high: s.high,
    lives: s.lives,
    stageIndex: s.stageIndex,
    frame: s.frame,
    attempt: s.attempt,
    nextId: s.nextId,
    bonus: s.bonus,
    bonusAcc: s.bonusAcc,
    cleared: s.cleared,
    deathReason: s.deathReason,
    throwAcc: s.throwAcc,
    stage: s.stage,
    ladders: s.ladders,
    springs: s.springs,
    oil: s.oil,
    pauline: s.pauline,
    girders: s.girders.map((g) => ({ ...g })),
    elevators: s.elevators.map((e) => ({ ...e })),
    rivets: s.rivets.map((r) => ({ ...r })),
    hammers: s.hammers.map((h) => ({ ...h })),
    baddies: s.baddies.map((b) => ({ ...b })),
    dk: s.dk ? { ...s.dk } : null,
    mario: s.mario ? { ...s.mario, scored: s.mario.scored.slice() } : null,
  };
}

function die(state, reason, sink) {
  if (state.mode !== "play") return;
  state.mode = "dead";
  state.deathReason = reason;
  state.modeTimer = 0;
  state.mario.vy = -2.6;
  state.mario.onGround = false;
  state.mario.climbing = false;
  emit(sink, { t: "die" });
}

function addScore(state, n, x, y, sink) {
  state.score += n;
  if (state.score > state.high) state.high = state.score;
  emit(sink, { t: "score", n, x, y });
}

function throwBarrel(state) {
  const gi = state.girders.length - 2;
  const g = state.girders[gi];
  if (!g) return;
  const dir = slopeDir(g);
  const x = dir > 0 ? g.x0 + 28 : g.x1 - 28;
  state.baddies.push({
    kind: "barrel",
    x,
    y: girderY(g, x),
    girder: gi,
    vx: dir * 0.86,
    vy: 0,
    falling: false,
    alive: true,
    id: state.nextId++,
  });
}

function moveElevators(state) {
  for (const e of state.elevators) {
    e.y += e.vy;
    if (e.y < e.y0) {
      e.y = e.y0;
      e.vy = Math.abs(e.vy);
    } else if (e.y > e.y1) {
      e.y = e.y1;
      e.vy = -Math.abs(e.vy);
    }
  }
  const m = state.mario;
  if (m && m.onGround && m.elev != null && !m.climbing) m.y = state.elevators[m.elev].y;
}

function snapSupport(state) {
  const m = state.mario;
  if (!m.onGround || m.climbing) return;
  const s = bestSupport(state, m.x, m.y);
  if (!s) {
    m.onGround = false;
    m.girder = -1;
    m.elev = null;
    m.vy = 0.35;
    return;
  }
  m.y = s.y;
  if (s.kind === "elev") {
    if (m.elev !== s.i) m.rideFromY = s.y;
    m.elev = s.i;
    m.girder = -1;
  } else {
    m.girder = s.i;
    m.elev = null;
  }
}

function applyConveyor(state) {
  const m = state.mario;
  if (!m.onGround || m.girder < 0 || m.climbing) return;
  const g = state.girders[m.girder];
  if (!g.convey) return;
  const nx = m.x + g.convey;
  if (bestSupport(state, nx, m.y)) m.x = nx;
}

function tryLand(state, prevY) {
  const m = state.mario;
  if (m.vy <= 0 || m.climbing) return;
  let best = null;
  let bestY = Infinity;
  const consider = (kind, i, sy, xOk) => {
    if (!xOk) return;
    if (prevY <= sy + 4 && m.y >= sy - 1 && sy < bestY) {
      bestY = sy;
      best = { kind, i, y: sy };
    }
  };
  for (let i = 0; i < state.girders.length; i++) {
    const g = state.girders[i];
    consider("girder", i, girderY(g, clamp(m.x, g.x0, g.x1)), m.x >= g.x0 && m.x <= g.x1);
  }
  for (let i = 0; i < state.elevators.length; i++) {
    const e = state.elevators[i];
    consider("elev", i, e.y, m.x >= e.x && m.x <= e.x + e.w);
  }
  if (!best) return;
  m.y = best.y;
  m.vy = 0;
  m.onGround = true;
  m.climbing = false;
  m.girder = best.kind === "girder" ? best.i : -1;
  m.elev = best.kind === "elev" ? best.i : null;
  if (m.elev != null) m.rideFromY = m.y;
}

function springs(state, sink) {
  const m = state.mario;
  if (m.climbing || m.vy <= 0) return;
  for (const s of state.springs) {
    if (Math.abs(m.x - s.x) < 16 && m.y >= s.y - 4 && prevClose(m, s)) {
      m.vy = -3.7;
      m.onGround = false;
      m.girder = -1;
      m.elev = null;
      emit(sink, { t: "spring" });
      return;
    }
  }
}

function prevClose(m, s) {
  return m.y <= s.y + 12;
}

function moveBaddies(state) {
  for (const b of state.baddies) {
    if (!b.alive) continue;
    if (b.falling) {
      b.vy = Math.min(MAX_FALL, b.vy + 0.22);
      b.y += b.vy;
      const hit = bestSupport(state, b.x, b.y);
      if (hit && b.vy > 0 && b.y >= hit.y) {
        b.falling = false;
        b.y = hit.y;
        b.vy = 0;
        b.girder = hit.kind === "girder" ? hit.i : -1;
        if (b.girder >= 0) b.vx = slopeDir(state.girders[b.girder]) * 0.86;
      } else if (b.y > VIEW_H + 8) b.alive = false;
      continue;
    }
    const g = state.girders[b.girder];
    if (!g) {
      b.alive = false;
      continue;
    }
    if (b.kind === "fire") {
      b.x += b.vx;
      const lo = g.x0 + 26;
      const hi = g.x1 - 26;
      const hold =
        state.mario &&
        state.mario.girder === b.girder &&
        Math.abs(state.mario.x - b.x) < 34;
      if (b.x < lo) {
        b.x = lo;
        if (!hold) b.vx = Math.abs(b.vx);
      } else if (b.x > hi) {
        b.x = hi;
        if (!hold) b.vx = -Math.abs(b.vx);
      } else if (hold && Math.abs(b.x - lo) < 3) {
        b.vx = Math.abs(b.vx);
        b.x = lo;
      } else if (hold && Math.abs(b.x - hi) < 3) {
        b.vx = -Math.abs(b.vx);
        b.x = hi;
      }
      b.y = girderY(g, clamp(b.x, g.x0, g.x1));
      continue;
    }
    if (b.kind === "pie") {
      if (b.wait > 0) {
        b.y = -60;
        const respawn = b.vx < 0 ? g.x1 - 18 : g.x0 + 18;
        const clear = !state.mario || state.mario.girder !== b.girder || Math.abs(state.mario.x - respawn) > 42;
        if (b.wait > 1 || !clear) b.wait -= b.wait > 1 ? 1 : 0;
        else {
          b.wait = 0;
          b.x = respawn;
          b.y = girderY(g, b.x);
        }
        continue;
      }
      b.x += b.vx;
      if (b.x < g.x0 + 8 || b.x > g.x1 - 8) b.wait = 28;
      else b.y = girderY(g, b.x);
      continue;
    }
    if (b.kind === "barrel") {
      const dir = slopeDir(g);
      b.vx = dir * 0.86;
      if (maybeDropLadder(state, b)) continue;
    }
    b.x += b.vx;
    if (b.x < g.x0 + 6 || b.x > g.x1 - 6) {
      if (b.kind === "barrel") {
        if (b.girder === 0 && state.oil && b.x < state.oil.x + 10) {
          b.alive = false;
          if (state.baddies.filter((f) => f.alive && f.kind === "fire").length < 1 && b.id % 2 === 0) {
            state.baddies.push({
              kind: "fire",
              x: 36,
              y: girderY(state.girders[0], 36),
              girder: 0,
              vx: 0.55,
              vy: 0,
              falling: false,
              alive: true,
              id: state.nextId++,
            });
          }
          continue;
        }
        b.falling = true;
        b.vy = 0.45;
        b.girder = -1;
        continue;
      }
      b.vx *= -1;
      b.x = clamp(b.x, g.x0 + 8, g.x1 - 8);
    }
    b.y = girderY(g, clamp(b.x, g.x0, g.x1));
  }
  state.baddies = state.baddies.filter((b) => b.alive);
}

function maybeDropLadder(state, b) {
  for (const lad of state.ladders) {
    if (lad.broken || lad.g1 !== b.girder) continue;
    if (Math.abs(lad.x - b.x) > 4) continue;
    if (state.mario?.climbing && Math.abs(state.mario.x - lad.x) < 8) continue;
    if ((b.id + state.frame) % 5 !== 0) continue;
    b.falling = true;
    b.vy = 0.7;
    b.girder = -1;
    return true;
  }
  return false;
}

function collectHammer(state) {
  const m = state.mario;
  if (m.climbing || m.hammer > 0) return;
  for (const h of state.hammers) {
    if (!h.alive || h.girder !== m.girder) continue;
    if (Math.abs(h.x - m.x) < 8 && Math.abs(h.y - m.y) < 8) {
      h.alive = false;
      m.hammer = 420;
    }
  }
}

function passBarrels(state, sink) {
  const m = state.mario;
  if (m.onGround || m.jumpedFrom < 0) return;
  for (const b of state.baddies) {
    if (!b.alive || b.kind !== "barrel" || b.falling || b.girder !== m.jumpedFrom) continue;
    if (m.scored.includes(b.id)) continue;
    const prev = b.x - b.vx;
    if ((prev - m.x) * (b.x - m.x) <= 0 && Math.abs(b.y - m.y) < 40) {
      m.scored.push(b.id);
      const n = POINTS[Math.min(POINTS.length - 1, m.combo)];
      m.combo++;
      addScore(state, n, m.x, m.y - 20, sink);
    }
  }
}

function removeRivet(state, sink) {
  const m = state.mario;
  if (!m.onGround || m.girder < 0) return;
  for (const r of state.rivets) {
    if (!r.alive || r.girder !== m.girder) continue;
    if (Math.abs(m.x - r.x) > 6) continue;
    r.alive = false;
    const g = state.girders[r.girder];
    if (r.side === "right") {
      g.x1 = r.x - 12;
      if (m.x > g.x1) m.x = g.x1 - 1;
    } else {
      g.x0 = r.x + 12;
      if (m.x < g.x0) m.x = g.x0 + 1;
    }
    addScore(state, 100, m.x, m.y - 18, sink);
    emit(sink, { t: "rivet" });
  }
}

function hazards(state, sink) {
  const m = state.mario;
  if (state.mode !== "play") return;
  const box = marioBox(m);
  if (state.dk && !state.dk.falling && state.stage.kind !== "rivets") {
    const dk = { x: state.dk.x - 14, y: state.dk.y - 36, w: 28, h: 36 };
    if (boxesOverlap(box, dk)) {
      die(state, "dk", sink);
      return;
    }
  }
  for (const b of state.baddies) {
    if (!b.alive || b.y < 0) continue;
    if (!boxesOverlap(box, baddieBox(b))) continue;
    if (m.climbing && Math.abs(m.y - b.y) > 10) continue;
    if (m.hammer > 0 && !m.climbing) {
      b.alive = false;
      const n = POINTS[Math.min(POINTS.length - 1, m.combo)];
      m.combo++;
      addScore(state, n, b.x, b.y - 16, sink);
      emit(sink, { t: "smash" });
      continue;
    }
    die(state, b.kind, sink);
    return;
  }
}

function checkGoal(state, sink) {
  if (state.mode !== "play") return;
  if (state.stage.kind === "rivets") {
    if (state.rivets.length && state.rivets.every((r) => !r.alive)) {
      state.cleared = true;
      state.mode = "tally";
      state.modeTimer = 0;
      if (state.dk) state.dk.falling = true;
      emit(sink, { t: "clear" });
    }
    return;
  }
  const m = state.mario;
  const p = state.pauline;
  if (!p || !m.onGround || m.girder !== p.girder) return;
  if (Math.abs(m.x - p.x) < 14) {
    state.cleared = true;
    state.mode = "tally";
    state.modeTimer = 0;
    emit(sink, { t: "clear" });
  }
}

function control(state, input, sink) {
  const m = state.mario;
  const dir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
  const jumpEdge = !!input.jump && !m.wasJump;

  if (m.hammer > 0) m.hammer--;

  if (m.climbing) {
    const info = ladderAt(state, m.x, m.y, m.climbAim > 0 ? "down" : "up");
    if (!info || m.hammer > 0) {
      m.climbing = false;
      m.climbAim = 0;
    } else {
      m.x = info.lad.x;
      if (m.climbAim > 0) m.y += CLIMB;
      else m.y -= CLIMB;
      if (jumpEdge) {
        m.climbing = false;
        m.onGround = false;
        m.vy = JUMP_V * 0.65;
        m.girder = -1;
        m.scored = [];
        emit(sink, { t: "jump" });
      } else if (m.y <= info.y1) {
        m.y = info.y1;
        m.climbing = false;
        m.onGround = true;
        m.girder = info.lad.g1;
        m.elev = null;
      } else if (m.y >= info.y0) {
        m.y = info.y0;
        m.climbing = false;
        m.onGround = true;
        m.girder = info.lad.g0;
        m.elev = null;
      }
      m.wasJump = !!input.jump;
      return;
    }
  }

  if (m.onGround && !m.hammer && (input.up || input.down)) {
    const info = ladderAt(state, m.x, m.y, input.down ? "down" : "up");
    if (info) {
      const nearBottom = Math.abs(m.y - info.y0) < 8;
      const nearTop = Math.abs(m.y - info.y1) < 8;
      if ((input.up && nearBottom) || (input.down && nearTop)) {
        m.climbing = true;
        m.climbAim = input.down ? 1 : -1;
        m.onGround = false;
        m.x = info.lad.x;
        m.girder = -1;
        m.elev = null;
        m.wasJump = !!input.jump;
        return;
      }
    }
  }

  if (m.onGround) {
    if (dir) {
      const nx = clamp(m.x + dir * WALK, 6, 218);
      if (bestSupport(state, nx, m.y)) m.x = nx;
    }
    applyConveyor(state);
    snapSupport(state);
    collectHammer(state);
    if (jumpEdge && m.onGround) {
      m.vy = JUMP_V;
      m.onGround = false;
      m.jumpedFrom = m.girder;
      m.combo = 0;
      m.scored = [];
      m.elev = null;
      emit(sink, { t: "jump" });
    }
  }

  if (!m.onGround && !m.climbing) {
    if (dir) m.x += dir * WALK;
    else m.x += m.vx * 0.2;
    m.x = clamp(m.x, 6, 218);
    const prevY = m.y;
    m.vy = Math.min(MAX_FALL, m.vy + GRAV);
    m.y += m.vy;
    springs(state, sink);
    tryLand(state, prevY);
    passBarrels(state, sink);
  }

  m.wasJump = !!input.jump;
  if (m.onGround) m.combo = m.hammer > 0 ? m.combo : 0;
}

function stepPlay(state, input, sink) {
  moveElevators(state);
  if (state.stage.kind === "barrels") {
    state.throwAcc++;
    const barrels = state.baddies.filter((b) => b.alive && b.kind === "barrel").length;
    if (state.throwAcc > 150 && barrels < 3) {
      state.throwAcc = 0;
      throwBarrel(state);
    }
  }
  control(state, input || {}, sink);
  moveBaddies(state);
  if (state.mode !== "play") return;
  removeRivet(state, sink);
  checkGoal(state, sink);
  if (state.mode !== "play") return;
  hazards(state, sink);
  if (state.mode !== "play") return;
  if (state.mario.y > VIEW_H - 2) {
    die(state, "pit", sink);
    return;
  }
  state.bonusAcc++;
  const rate = state.fast ? 600 : 48;
  if (state.bonusAcc >= rate) {
    state.bonusAcc = 0;
    state.bonus = Math.max(0, state.bonus - 100);
    if (state.bonus <= 0) die(state, "time", sink);
  }
  if (state.dk && state.dk.falling) {
    state.dk.vy += 0.18;
    state.dk.y += state.dk.vy;
  }
}

function stepMode(state, sink) {
  const fast = state.fast;
  state.modeTimer++;
  if (state.mode === "title") {
    if (state.modeTimer > (fast ? 0 : 150)) {
      state.mode = "howhigh";
      state.modeTimer = 0;
    }
    return;
  }
  if (state.mode === "howhigh") {
    if (state.modeTimer > (fast ? 0 : 100)) {
      state.mode = "play";
      state.modeTimer = 0;
      boot(state);
    }
    return;
  }
  if (state.mode === "dead") {
    const m = state.mario;
    if (m) {
      m.vy += 0.18;
      m.y += m.vy;
    }
    if (state.modeTimer > (fast ? 1 : 80)) {
      state.lives--;
      if (state.lives <= 0) {
        state.mode = "gameover";
        state.modeTimer = 0;
        if (state.score > state.high) state.high = state.score;
      } else {
        state.mode = "play";
        boot(state);
      }
    }
    return;
  }
  if (state.mode === "tally") {
    if (state.dk && state.dk.falling) {
      state.dk.vy = (state.dk.vy || 0) + 0.2;
      state.dk.y += state.dk.vy;
    }
    if (state.bonus > 0) {
      const n = fast ? state.bonus : Math.min(200, state.bonus);
      state.bonus -= n;
      state.score += n;
      if (state.score > state.high) state.high = state.score;
      if (!fast && state.modeTimer % 2 === 0) emit(sink, { t: "tick" });
    } else if (state.modeTimer > (fast ? 0 : 40)) {
      if (state.stageIndex >= STAGES.length - 1) {
        state.mode = "won";
        state.modeTimer = 0;
        emit(sink, { t: "win" });
      } else {
        state.stageIndex++;
        state.mode = "howhigh";
        state.modeTimer = 0;
      }
    }
  }
}

export function step(state, input, sink = null) {
  state.frame++;
  if (state.mode === "play") stepPlay(state, input || {}, sink);
  else stepMode(state, sink);
}
