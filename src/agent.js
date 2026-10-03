import { CLIMB } from "./constants.js";
import { bestSupport, cloneState, girderY, ladderAt, ladderSpan, step } from "./engine.js";

const NONE = { left: false, right: false, up: false, down: false, jump: false };

function press(dir, extra = {}) {
  return {
    left: dir < 0,
    right: dir > 0,
    up: !!extra.up,
    down: !!extra.down,
    jump: !!extra.jump,
  };
}

function link(a, b, cost) {
  a.edges.push({ to: b.id, cost });
  b.edges.push({ to: a.id, cost });
}

function buildGraph(state) {
  const nodes = [];
  const add = (n) => {
    n.id = nodes.length;
    n.edges = [];
    nodes.push(n);
    return n;
  };
  const byGirder = state.girders.map((g, gi) => {
    const xs = new Set();
    const span = g.x1 - g.x0;
    const stepX = Math.max(12, Math.min(18, span / 5));
    for (let x = g.x0 + 8; x <= g.x1 - 8; x += stepX) xs.add(Math.round(x));
    xs.add(Math.round(Math.min(g.x1 - 6, Math.max(g.x0 + 6, g.x0 + 8))));
    xs.add(Math.round(Math.max(g.x0 + 6, g.x1 - 8)));
    for (const lad of state.ladders) {
      if (lad.broken) continue;
      if (lad.g0 !== gi && lad.g1 !== gi) continue;
      if (lad.x > g.x0 + 2 && lad.x < g.x1 - 2) xs.add(Math.round(lad.x));
    }
    return [...xs]
      .filter((x) => x > g.x0 && x < g.x1)
      .sort((a, b) => a - b)
      .map((x) => add({ girder: gi, x, y: girderY(g, x) }));
  });
  for (const list of byGirder) {
    for (let i = 0; i < list.length - 1; i++) {
      link(list[i], list[i + 1], Math.abs(list[i + 1].x - list[i].x));
    }
  }
  for (const lad of state.ladders) {
    if (lad.broken) continue;
    const a = nearestOn(byGirder[lad.g0], lad.x);
    const b = nearestOn(byGirder[lad.g1], lad.x);
    if (!a || !b) continue;
    const span = ladderSpan(state, lad);
    link(a, b, Math.abs(span.y0 - span.y1) + 8);
  }
  return nodes;
}

function nearestOn(list, x) {
  if (!list || !list.length) return null;
  let best = list[0];
  let bestD = Math.abs(best.x - x);
  for (const n of list) {
    const d = Math.abs(n.x - x);
    if (d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

function nearest(nodes, girder, x) {
  let best = null;
  let bestD = 1e9;
  for (const n of nodes) {
    if (n.girder !== girder) continue;
    const d = Math.abs(n.x - x);
    if (d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

function distFrom(nodes, origin) {
  const dist = new Array(nodes.length).fill(1e9);
  if (!origin) return dist;
  dist[origin.id] = 0;
  const pending = [origin.id];
  while (pending.length) {
    let bi = 0;
    for (let i = 1; i < pending.length; i++) {
      if (dist[pending[i]] < dist[pending[bi]]) bi = i;
    }
    const id = pending.splice(bi, 1)[0];
    for (const e of nodes[id].edges) {
      const nd = dist[id] + e.cost;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        pending.push(e.to);
      }
    }
  }
  return dist;
}

function goalNode(state, nodes) {
  if (state.stage.kind === "rivets") {
    const rivet = nextRivet(state);
    if (!rivet) return nodes[0];
    return nearest(nodes, rivet.girder, rivet.x) || nodes[0];
  }
  const p = state.pauline;
  return nearest(nodes, p.girder, p.x) || nodes[0];
}

function nextRivet(state) {
  const left = state.rivets.filter((r) => r.alive && r.side === "right");
  if (left.length) return left.sort((a, b) => a.girder - b.girder)[0];
  const right = state.rivets.filter((r) => r.alive && r.side === "left");
  if (right.length) return right.sort((a, b) => b.girder - a.girder)[0];
  return null;
}

function ladderDanger(state, lad, goingUp) {
  const span = ladderSpan(state, lad);
  const m = state.mario;
  for (const b of state.baddies) {
    if (!b.alive || b.y < 0 || b.wait) continue;
    if (Math.abs(b.x - lad.x) < 13 && b.y < span.y0 + 4 && b.y > span.y1 - 12) {
      if (goingUp && b.y <= m.y + 4) return true;
      if (!goingUp && b.y >= m.y - 4) return true;
    }
    if (!b.falling && (b.girder === lad.g0 || b.girder === lad.g1)) {
      const dx = b.x - lad.x;
      if (Math.abs(dx) < 14) return true;
      const closing = dx !== 0 && Math.sign(b.vx) === -Math.sign(dx);
      const reach = Math.abs(span.y0 - span.y1) + 30;
      if (closing && Math.abs(dx) < reach) return true;
    }
  }
  return false;
}

function approaching(state, dir) {
  const m = state.mario;
  let hit = null;
  for (const b of state.baddies) {
    if (!b.alive || b.falling || b.wait || b.y < 0 || b.girder !== m.girder) continue;
    const dx = b.x - m.x;
    const belt = state.girders[m.girder]?.convey || 0;
    const ddx = b.vx - (dir * 1.12 + belt);
    const closing = dx === 0 || dx * ddx < 0;
    if (!closing) continue;
    const adx = Math.abs(dx);
    if (adx > 60) continue;
    const speed = Math.max(0.45, Math.abs(ddx));
    const eta = Math.max(0, adx - 9) / speed;
    if (!hit || adx < hit.adx) hit = { adx, dx, eta };
  }
  return hit;
}

function jumpSafe(state, dir) {
  const m = state.mario;
  const g = state.girders[m.girder];
  if (!g) return false;
  const land = m.x + dir * 24;
  return land > g.x0 + 6 && land < g.x1 - 6;
}

function onlyZone(state) {
  const e = state.elevators[0];
  const xs = [];
  for (let x = Math.ceil(e.x + 2); x <= e.x + e.w - 2; x++) {
    const onGirder = state.girders.some((g) => x >= g.x0 && x <= g.x1);
    if (!onGirder) xs.push(x);
  }
  if (!xs.length) return e.x + e.w / 2;
  return xs[Math.floor(xs.length / 2)];
}

function nextDeck(state, fromY) {
  const e = state.elevators[0];
  let best = null;
  for (let i = 0; i < state.girders.length; i++) {
    const g = state.girders[i];
    if (g.y0 > fromY - 16) continue;
    if (g.x1 < e.x + 6 || g.x0 > e.x + e.w - 6) continue;
    if (!best || g.y0 > best.g.y0) best = { i, g };
  }
  return best;
}

function elevatorInput(state) {
  const m = state.mario;
  const e = state.elevators[0];
  const zone = onlyZone(state);
  if (m.onGround && m.girder === state.pauline.girder) {
    if (Math.abs(m.x - state.pauline.x) <= 4) return press(0);
    const dir = m.x < state.pauline.x ? 1 : -1;
    if (state.dk && Math.abs(m.x + dir * 8 - state.dk.x) < 20) return press(0);
    return press(dir);
  }
  if (!m.onGround) return press(m.x < zone ? 1 : -1);
  if (m.elev != null) {
    const deck = nextDeck(state, m.rideFromY ?? m.y);
    if (!deck) return press(0);
    const dy = Math.abs(e.y - deck.g.y0);
    const mid = (deck.g.x0 + deck.g.x1) / 2;
    const leaving = Math.abs(m.x - zone) > 5;
    if (dy < 7 || (leaving && dy < 18)) return press(mid >= m.x ? 1 : -1);
    if (Math.abs(m.x - zone) > 3) return press(m.x < zone ? 1 : -1);
    return press(0);
  }
  const threat = approaching(state, m.x < zone ? 1 : -1);
  if (threat && jumpSafe(state, 0)) return press(0, { jump: true });
  if (Math.abs(m.x - zone) > 2) return press(m.x < zone ? 1 : -1);
  return press(m.x <= zone ? 1 : -1);
}

function desiredGirder(state) {
  if (state.stage.kind === "rivets") {
    const rivet = nextRivet(state);
    return rivet ? rivet.girder : state.mario.girder;
  }
  return state.pauline.girder;
}

function steer(state) {
  const m = state.mario;
  if (state.stage.kind === "elevator") return elevatorInput(state);
  const nodes = buildGraph(state);
  const goal = goalNode(state, nodes);
  const dist = distFrom(nodes, goal);
  const want = desiredGirder(state);

  if (m.climbing) {
    const info = ladderAt(state, m.x, m.y);
    if (!info) return NONE;
    const top = nearest(nodes, info.lad.g1, info.lad.x);
    const bot = nearest(nodes, info.lad.g0, info.lad.x);
    const topD = top ? dist[top.id] : 1e9;
    const botD = bot ? dist[bot.id] : 1e9;
    if (botD < topD) return press(0, { down: true });
    return press(0, { up: true });
  }

  if (state.stage.kind === "rivets") {
    const rivet = nextRivet(state);
    if (rivet && m.girder === rivet.girder && Math.abs(m.x - rivet.x) > 3) {
      const dir = m.x < rivet.x ? 1 : -1;
      return dodge(state, dir);
    }
  } else if (m.onGround && m.girder === state.pauline.girder) {
    if (Math.abs(m.x - state.pauline.x) > 4) {
      const dir = m.x < state.pauline.x ? 1 : -1;
      if (state.dk && !state.dk.falling) {
        const next = m.x + dir * 6;
        if (Math.abs(next - state.dk.x) < 22) return press(0);
      }
      return dodge(state, dir);
    }
    return press(0);
  }

  const here = m.girder >= 0 ? nearest(nodes, m.girder, m.x) : null;
  if (!here) return press(0);
  let nxt = here;
  for (const e of here.edges) {
    if (dist[e.to] < dist[nxt.id] - 0.01) nxt = nodes[e.to];
  }
  if (nxt.girder === m.girder && Math.abs(m.x - nxt.x) <= 4) {
    let better = null;
    for (const e of nxt.edges) {
      const node = nodes[e.to];
      if (node.girder === m.girder) continue;
      if (!better || dist[node.id] < dist[better.id]) better = node;
    }
    if (better && dist[better.id] < dist[here.id]) nxt = better;
  }
  let dir = 0;
  if (nxt.girder !== m.girder) {
    const lad = ladderJoining(state, m.girder, nxt.girder, m.x);
    if (!lad) return press(0);
    if (!m.onGround) return press(m.x < lad.x ? 1 : -1);
    if (ladderDanger(state, lad, nxt.girder > m.girder)) return dodge(state, 0);
    if (Math.abs(m.x - lad.x) > 2) dir = m.x < lad.x ? 1 : -1;
    else {
      const up = nxt.girder > m.girder;
      return press(0, { up, down: !up });
    }
  } else if (Math.abs(m.x - nxt.x) > 1) {
    dir = m.x < nxt.x ? 1 : -1;
  }
  if (!m.onGround) return press(dir);
  return dodge(state, dir);
}

function ladderJoining(state, g0, g1, x) {
  let best = null;
  let bestD = 1e9;
  for (const lad of state.ladders) {
    if (lad.broken) continue;
    const pair = (lad.g0 === g0 && lad.g1 === g1) || (lad.g0 === g1 && lad.g1 === g0);
    if (!pair) continue;
    const d = Math.abs(lad.x - x);
    if (d < bestD) {
      best = lad;
      bestD = d;
    }
  }
  return best;
}

function dodge(state, dir) {
  const threat = approaching(state, dir);
  if (!threat || !state.mario.onGround) return press(dir);
  if (threat.eta <= 11 && threat.adx > 8) {
    if (jumpSafe(state, dir)) return press(dir, { jump: true });
    if (jumpSafe(state, 0)) return press(0, { jump: true });
  }
  return press(dir);
}

function scoreOf(state, start) {
  if (state.mode === "won") return 1e9;
  if (state.mode === "tally" || state.cleared) return 5e7;
  if (state.mode === "dead" || state.mode === "gameover" || state.deathReason) return -1e8;
  const m = state.mario;
  if (!m) return -1e8;
  if (state.stage.kind === "elevator") {
    const deck = m.girder >= 0 ? m.girder : 0;
    return (220 - m.y) * 30 + deck * 400 - Math.abs(m.x - state.pauline.x) * 0.2;
  }
  if (state.stage.kind === "rivets") {
    const left = state.rivets.filter((r) => r.alive).length;
    const rivet = nextRivet(state);
    const close = rivet && m.girder === rivet.girder ? -Math.abs(m.x - rivet.x) : -400;
    return (8 - left) * 20000 + close + (m.onGround ? 50 : -200);
  }
  const nodes = buildGraph(state);
  const goal = goalNode(state, nodes);
  const dist = distFrom(nodes, goal);
  const here = m.girder >= 0 ? nearest(nodes, m.girder, m.x) : null;
  const d = here ? dist[here.id] : 1e6;
  const climbed = start.mario ? start.mario.y - m.y : 0;
  return -d * 20 + climbed * 4 + (m.onGround ? 30 : -80) + state.score * 0.01;
}

function rollout(state, first, horizon) {
  const sim = cloneState(state);
  for (let i = 0; i < horizon; i++) {
    const input = i === 0 ? first : steer(sim);
    step(sim, input);
    if (sim.mode !== "play") break;
  }
  return sim;
}

export function decide(state) {
  if (state.mode !== "play" || !state.mario) return NONE;
  const base = steer(state);
  if (base.jump) return base;
  const threatened = approaching(state, base.right ? 1 : base.left ? -1 : 0);
  if (!threatened || threatened.eta > 20) return base;
  const options = [
    base,
    { ...base, jump: true },
    { ...base, jump: false },
    press(0),
    press(base.right ? -1 : 1),
  ];
  let best = base;
  let bestScore = -1e18;
  for (const opt of options) {
    const end = rollout(state, opt, 40);
    const sc = scoreOf(end, state);
    if (sc > bestScore) {
      bestScore = sc;
      best = opt;
    }
  }
  return best;
}

export const AGENT_CLIMB = CLIMB;
