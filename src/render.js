import { VIEW_H, VIEW_W } from "./constants.js";
import { girderY, ladderSpan } from "./engine.js";

const PINK = "#FF46C2";
const PINK_HI = "#FFA0E4";
const PINK_LO = "#C01888";
const CYAN = "#3CFFF8";
const CYAN_DK = "#00A8C8";
const RED = "#F82818";
const SKIN = "#F8C090";
const BROWN = "#A04010";
const YELLOW = "#FFE040";
const WHITE = "#F8F8F8";
const BLUE = "#48D4FC";

const GLYPH = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};

function text(ctx, str, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of str) {
    const g = GLYPH[ch] || GLYPH[" "];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === "1") ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
      }
    }
    cx += 6 * scale;
  }
}

function textW(str, scale = 1) {
  return str.length * 6 * scale;
}

export function render(ctx, game) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.mode === "title") return drawTitle(ctx, game);
  if (game.mode === "howhigh") return drawHowHigh(ctx, game);
  if (game.mode === "gameover") return drawGameOver(ctx, game);
  if (game.mode === "won") return drawWon(ctx, game);
  drawStage(ctx, game);
  drawHud(ctx, game);
  if (game.mode === "tally") {
    text(ctx, "BONUS", 86, 120, YELLOW);
  }
}

function drawHud(ctx, game) {
  text(ctx, "1UP", 8, 4, WHITE);
  text(ctx, String(game.lives), 32, 4, CYAN);
  text(ctx, String(game.score).padStart(6, "0"), 8, 14, WHITE);
  text(ctx, "HIGH SCORE", 78, 4, WHITE);
  text(ctx, String(game.high).padStart(6, "0"), 96, 14, WHITE);
  text(ctx, "BONUS", 176, 4, YELLOW);
  text(ctx, String(Math.max(0, game.bonus)).padStart(4, "0"), 182, 14, YELLOW);
}

function drawStage(ctx, game) {
  if (!game.girders?.length) return;
  for (const lad of game.ladders || []) drawLadder(ctx, game, lad);
  for (const g of game.girders) drawGirder(ctx, g);
  for (const r of game.rivets || []) {
    if (!r.alive) continue;
    ctx.fillStyle = CYAN;
    ctx.fillRect(r.x - 3, r.y - 5, 6, 5);
    ctx.fillStyle = WHITE;
    ctx.fillRect(r.x - 1, r.y - 4, 2, 2);
  }
  for (const e of game.elevators || []) {
    ctx.fillStyle = "#F87820";
    ctx.fillRect(e.x, e.y - 5, e.w, 5);
    ctx.fillStyle = "#F8C070";
    ctx.fillRect(e.x, e.y - 5, e.w, 1);
  }
  for (const s of game.springs || []) drawSpring(ctx, s.x, s.y);
  if (game.oil) drawOil(ctx, game.oil.x, game.oil.y);
  for (const h of game.hammers || []) if (h.alive) drawHammer(ctx, h.x, h.y);
  for (const b of game.baddies || []) drawBaddie(ctx, b, game.frame);
  if (game.dk) drawKong(ctx, game.dk.x, game.dk.y, game.frame, game.dk.falling);
  if (game.pauline) {
    drawPauline(ctx, game.pauline.x, game.pauline.y, game.frame);
    if (Math.floor(game.frame / 20) % 2 === 0) {
      text(ctx, "HELP!", game.pauline.x - 42, game.pauline.y - 22, WHITE);
    }
  }
  if (game.mario) {
    const m = game.mario;
    jumpman(ctx, m.x, m.y, game.frame, !m.onGround || m.climbing, m.climbing);
  }
}

function drawGirder(ctx, g) {
  const step = 8;
  for (let x = g.x0; x < g.x1 - 1; x += step) {
    const y = Math.round(girderY(g, Math.min(g.x1, x + 4)));
    ctx.fillStyle = PINK;
    ctx.fillRect(x, y - 7, step, 7);
    ctx.fillStyle = PINK_HI;
    ctx.fillRect(x, y - 7, step, 2);
    ctx.fillStyle = PINK_LO;
    ctx.fillRect(x, y - 1, step, 1);
    if (((x / step) | 0) % 2 === 0) {
      ctx.fillStyle = YELLOW;
      ctx.fillRect(x + 3, y - 4, 2, 2);
    }
  }
  if (g.convey) {
    ctx.fillStyle = g.convey > 0 ? "#FFD040" : "#40E0FF";
    const y = Math.round(girderY(g, (g.x0 + g.x1) / 2));
    const dir = g.convey > 0 ? 1 : -1;
    for (let x = g.x0 + 16; x < g.x1 - 8; x += 28) {
      ctx.fillRect(x, y - 5, 6, 1);
      ctx.fillRect(x + (dir > 0 ? 5 : -1), y - 6, 1, 3);
    }
  }
}

function drawLadder(ctx, game, lad) {
  const span = ladderSpan(game, lad);
  const top = Math.round(Math.min(span.y0, span.y1));
  const bot = Math.round(Math.max(span.y0, span.y1));
  const mid = (top + bot) / 2;
  const gap = (y) => lad.broken && y > mid - 7 && y < mid + 7;
  for (let y = top; y <= bot; y++) {
    if (gap(y)) continue;
    ctx.fillStyle = CYAN;
    ctx.fillRect(lad.x - 4, y, 2, 1);
    ctx.fillRect(lad.x + 3, y, 2, 1);
  }
  for (let y = top + 3; y < bot; y += 5) {
    if (gap(y)) continue;
    ctx.fillStyle = CYAN_DK;
    ctx.fillRect(lad.x - 3, y, 7, 1);
    ctx.fillStyle = CYAN;
    ctx.fillRect(lad.x - 3, y + 1, 7, 1);
  }
}

function jumpman(ctx, x, y, frame, air, climbing = false) {
  const bob = !air && Math.floor(frame / 6) % 2 ? 1 : 0;
  const left = Math.round(x) - 5;
  const top = Math.round(y) - 15 + (climbing ? 0 : bob);
  ctx.fillStyle = RED;
  ctx.fillRect(left + 2, top, 6, 3);
  ctx.fillStyle = SKIN;
  ctx.fillRect(left + 3, top + 3, 4, 3);
  ctx.fillStyle = BROWN;
  ctx.fillRect(left + 2, top + 3, 2, 2);
  ctx.fillStyle = RED;
  ctx.fillRect(left + 2, top + 6, 6, 5);
  ctx.fillStyle = RED;
  ctx.fillRect(left + 1, top + 6, 2, 4);
  ctx.fillRect(left + 7, top + 6, 2, 4);
  ctx.fillStyle = BROWN;
  if (climbing) {
    ctx.fillRect(left + 1, top + 11, 3, 3);
    ctx.fillRect(left + 6, top + 11, 3, 3);
  } else if (air) {
    ctx.fillRect(left + 2, top + 11, 3, 3);
    ctx.fillRect(left + 6, top + 10, 3, 3);
  } else if (bob) {
    ctx.fillRect(left + 1, top + 11, 3, 3);
    ctx.fillRect(left + 6, top + 11, 3, 3);
  } else {
    ctx.fillRect(left + 2, top + 11, 3, 3);
    ctx.fillRect(left + 6, top + 11, 3, 3);
  }
}

function drawKong(ctx, x, y, frame, falling) {
  const left = Math.round(x) - 14;
  const top = Math.round(y) - 30;
  const arm = Math.floor(frame / 18) % 2;
  ctx.fillStyle = BROWN;
  ctx.fillRect(left + 4, top + 6, 18, 16);
  ctx.fillRect(left + 6, top, 12, 8);
  ctx.fillStyle = "#E08040";
  ctx.fillRect(left + 8, top + 3, 8, 5);
  ctx.fillStyle = "#201008";
  ctx.fillRect(left + 8, top + 4, 2, 2);
  ctx.fillRect(left + 14, top + 4, 2, 2);
  ctx.fillStyle = BROWN;
  ctx.fillRect(left + (arm ? 0 : 2), top + 8, 5, 4);
  ctx.fillRect(left + 20, top + (arm ? 6 : 10), 6, 4);
  ctx.fillRect(left + 6, top + 20, 5, falling ? 4 : 8);
  ctx.fillRect(left + 16, top + 20, 5, falling ? 4 : 8);
  if (falling) return;
  ctx.fillStyle = "#6A2808";
  ctx.fillRect(left + 8, top + 22, 10, 3);
}

function drawPauline(ctx, x, y, frame) {
  const left = Math.round(x) - 5;
  const top = Math.round(y) - 20;
  const arm = Math.floor(frame / 16) % 2;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(left + 2, top, 6, 4);
  ctx.fillStyle = SKIN;
  ctx.fillRect(left + 3, top + 3, 4, 3);
  ctx.fillStyle = "#FF78C8";
  ctx.fillRect(left + 2, top + 6, 6, 8);
  ctx.fillRect(left + (arm ? 0 : 1), top + 6, 2, 4);
  ctx.fillRect(left + 8, top + 6, 2, 4);
  ctx.fillStyle = SKIN;
  ctx.fillRect(left + 3, top + 14, 2, 4);
  ctx.fillRect(left + 6, top + 14, 2, 4);
}

function drawOil(ctx, x, y) {
  const left = Math.round(x) - 6;
  const top = Math.round(y) - 14;
  ctx.fillStyle = "#1858E8";
  ctx.fillRect(left, top + 4, 12, 10);
  ctx.fillStyle = "#78C0FF";
  ctx.fillRect(left, top + 4, 12, 2);
  ctx.fillStyle = "#0C2888";
  ctx.fillRect(left, top + 8, 12, 2);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(left + 4, top + 1, 4, 3);
  ctx.fillStyle = RED;
  ctx.fillRect(left + 5, top - 2, 2, 3);
  ctx.fillStyle = "#FFD040";
  ctx.fillRect(left + 4, top - 1, 2, 2);
}

function drawHammer(ctx, x, y) {
  ctx.fillStyle = YELLOW;
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 12, 2, 10);
  ctx.fillStyle = "#C8C8C8";
  ctx.fillRect(Math.round(x) - 5, Math.round(y) - 14, 10, 4);
}

function drawSpring(ctx, x, y) {
  ctx.fillStyle = "#D0D0D0";
  for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x) - 6, Math.round(y) - 10 + i * 3, 12, 1);
}

function drawBaddie(ctx, b, frame) {
  if (b.y < 0) return;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  if (b.kind === "barrel") {
    ctx.fillStyle = BLUE;
    ctx.fillRect(x - 5, y - 9, 10, 8);
    ctx.fillStyle = "#1868C8";
    ctx.fillRect(x - 5, y - 7, 10, 1);
    ctx.fillRect(x - 5, y - 4, 10, 1);
    ctx.fillStyle = "#C8F8FF";
    ctx.fillRect(x - 4, y - 8, 3, 2);
  } else if (b.kind === "pie") {
    ctx.fillStyle = frame % 16 < 8 ? "#F8F8F8" : "#FFD0E8";
    ctx.fillRect(x - 5, y - 8, 10, 7);
    ctx.fillStyle = "#FF48C0";
    ctx.fillRect(x - 2, y - 6, 4, 3);
  } else {
    const flick = Math.floor(frame / 4) % 2;
    ctx.fillStyle = flick ? "#FF4020" : "#FFC040";
    ctx.fillRect(x - 4, y - 9, 8, 8);
    ctx.fillStyle = "#401000";
    ctx.fillRect(x - 2, y - 6, 2, 2);
    ctx.fillRect(x + 1, y - 6, 2, 2);
  }
}

function drawTitle(ctx, game) {
  text(ctx, "HIGH SCORE", 78, 8, WHITE);
  text(ctx, String(game.high).padStart(6, "0"), 90, 18, WHITE);
  text(ctx, "DONKEY", 58, 58, RED, 2);
  text(ctx, "KONG", 70, 78, RED, 2);
  drawKong(ctx, 70, 150, game.frame, false);
  drawPauline(ctx, 150, 148, game.frame);
  jumpman(ctx, 112, 168, game.frame, false);
  if (Math.floor(game.frame / 24) % 2 === 0) text(ctx, "1 PLAYER GAME", 58, 200, CYAN);
}

function drawHowHigh(ctx, game) {
  text(ctx, "HOW HIGH CAN YOU GET?", 28, 48, YELLOW);
  const labels = ["25", "50", "75", "100"];
  labels.forEach((label, i) => {
    const y = 90 + i * 28;
    ctx.fillStyle = i <= game.stageIndex ? PINK : "#401030";
    ctx.fillRect(70, y, 84, 8);
    text(ctx, label, 40, y, WHITE);
  });
  drawKong(ctx, 170, 200, game.frame, false);
}

function drawGameOver(ctx, game) {
  drawHud(ctx, game);
  text(ctx, "GAME OVER", 70, 120, RED, 1);
}

function drawWon(ctx, game) {
  text(ctx, "HIGH SCORE", 78, 8, WHITE);
  text(ctx, String(game.high).padStart(6, "0"), 90, 18, WHITE);
  text(ctx, "YOU WIN", 76, 70, YELLOW, 1);
  drawPauline(ctx, 96, 150, game.frame);
  jumpman(ctx, 128, 156, game.frame, false);
  if (Math.floor(game.frame / 12) % 2 === 0) {
    ctx.fillStyle = RED;
    ctx.fillRect(108, 118, 4, 4);
    ctx.fillRect(112, 114, 4, 4);
    ctx.fillRect(116, 118, 4, 4);
  }
  text(ctx, String(game.score).padStart(6, "0"), 86, 190, WHITE);
}
