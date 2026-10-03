import { decide } from "./agent.js";
import { playEvents, unlock } from "./audio.js";
import { VIEW_H, VIEW_W } from "./constants.js";
import { createGame, step } from "./engine.js";
import { render } from "./render.js";

const view = document.getElementById("game");
const vctx = view.getContext("2d");
const buffer = document.createElement("canvas");
buffer.width = VIEW_W;
buffer.height = VIEW_H;
const ctx = buffer.getContext("2d");
ctx.imageSmoothingEnabled = false;

const params = new URLSearchParams(location.search);
const human = params.has("human");
const game = createGame({ skipTitle: params.has("play"), fast: false });

try {
  const saved = Number(localStorage.getItem("dk-top") || 0);
  if (saved) game.high = saved;
} catch {
  /* private mode */
}

const keys = new Set();

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  const w = VIEW_W * scale;
  const h = VIEW_H * scale;
  if (view.width !== w || view.height !== h) {
    view.width = w;
    view.height = h;
  }
  return scale;
}

function humanInput() {
  return {
    left: keys.has("ArrowLeft"),
    right: keys.has("ArrowRight"),
    up: keys.has("ArrowUp"),
    down: keys.has("ArrowDown"),
    jump: keys.has("KeyZ") || keys.has("Space"),
  };
}

function tick() {
  const events = [];
  const input = game.mode === "play" && human ? humanInput() : game.mode === "play" ? decide(game) : {};
  step(game, input, (e) => events.push(e));
  playEvents(events);
  if (game.score > game.high) {
    game.high = game.score;
    try {
      localStorage.setItem("dk-top", String(game.high));
    } catch {
      /* ignore */
    }
  }
}

function paint() {
  render(ctx, game);
  resize();
  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(buffer, 0, 0, view.width, view.height);
}

let nextStep = 0;
function pump() {
  const now = performance.now();
  if (!nextStep) nextStep = now + 1000 / 60;
  if (now >= nextStep) {
    tick();
    nextStep += 1000 / 60;
    if (now - nextStep > 200) nextStep = now + 1000 / 60;
  }
  paint();
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  unlock();
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("pointerdown", unlock);
window.addEventListener("resize", resize);
resize();
if (params.has("play")) {
  tick();
  tick();
}
paint();
setInterval(pump, 16);
