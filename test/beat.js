import { createGame, step } from "../src/engine.js";
import { decide } from "../src/agent.js";

const game = createGame({ skipTitle: true, fast: true });
let guard = 0;
let lastMode = game.mode;
let lastStage = -1;
let deaths = 0;
const t0 = Date.now();

while (game.mode !== "won" && game.mode !== "gameover" && guard < 250000) {
  if (game.mode === "play" && game.stageIndex !== lastStage) {
    console.log(
      "enter",
      game.stage.kind,
      "lives",
      game.lives,
      "frame",
      game.frame,
    );
    lastStage = game.stageIndex;
  }
  const input = game.mode === "play" ? decide(game) : {};
  step(game, input);
  if (lastMode === "play" && game.mode === "dead") {
    deaths++;
    const m = game.mario;
    console.log(
      "died",
      game.deathReason,
      game.stage?.kind,
      "x",
      m && Math.round(m.x),
      "y",
      m && Math.round(m.y),
      "vy",
      m && m.vy.toFixed(2),
      "ground",
      m && m.onGround,
      "climb",
      m && m.climbing,
      "girder",
      m && m.girder,
      "lives",
      game.lives,
      game.baddies.map((b) => `${b.kind}@${Math.round(b.x)},${Math.round(b.y)} g${b.girder}${b.falling ? "f" : ""}`).join(" "),
    );
  }
  if (lastMode === "play" && game.mode === "tally") {
    console.log("cleared", game.stage.kind, "score", game.score, "frame", game.frame);
  }
  if (guard > 0 && guard % 2500 === 0 && game.mode === "play") {
    const m = game.mario;
    console.log(
      "at",
      game.stage.kind,
      "x",
      Math.round(m.x),
      "y",
      Math.round(m.y),
      "g",
      m.girder,
      "elev",
      m.elev,
      "rivets",
      game.rivets.filter((r) => r.alive).length,
    );
  }
  lastMode = game.mode;
  guard++;
}

console.log(
  "stop",
  game.mode,
  "lives",
  game.lives,
  "score",
  game.score,
  "frames",
  guard,
  "deaths",
  deaths,
  "ms",
  Date.now() - t0,
);
process.exit(game.mode === "won" && deaths === 0 ? 0 : 1);
