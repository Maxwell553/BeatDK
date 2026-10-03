import { ROWS, T, TILE } from "./constants.js";

const FLOOR = 11;

function themeOf(world, stage) {
  if (stage === 4) return "castle";
  if (stage === 3) return "athletic";
  if (stage === 2) return world % 2 === 0 ? "underwater" : "underground";
  return "overworld";
}

class Builder {
  constructor(theme, world, stage) {
    this.theme = theme;
    this.world = world;
    this.stage = stage;
    this.h = ROWS;
    this.width = 48;
    this.tiles = new Uint8Array(this.width * this.h);
    this.blocks = {};
    this.entities = [];
    this.decor = [];
    this.bridge = [];
    this.cursor = 0;
    this.floor = FLOOR;
    this.flagX = null;
    this.castleDoor = null;
    this.axeX = null;
  }

  grow(w) {
    if (w <= this.width) return;
    const next = Math.max(w, this.width * 2);
    const n = new Uint8Array(next * this.h);
    for (let y = 0; y < this.h; y++) {
      n.set(this.tiles.subarray(y * this.width, (y + 1) * this.width), y * next);
    }
    this.tiles = n;
    this.width = next;
  }

  set(x, y, t) {
    if (y < 0 || y >= this.h || x < 0) return;
    this.grow(x + 1);
    this.tiles[y * this.width + x] = t;
  }

  get(x, y) {
    if (x < 0 || y < 0 || y >= this.h || x >= this.width) return T.EMPTY;
    return this.tiles[y * this.width + x];
  }

  groundAt(x) {
    const t = this.get(x, this.floor);
    return t === T.GROUND_TOP || t === T.GROUND || t === T.BRIDGE || t === T.STAIR || t === T.BRICK;
  }

  fillGround(x) {
    if (this.theme === "castle") {
      this.set(x, this.floor, T.STAIR);
      this.set(x, this.floor + 1, T.STAIR);
      return;
    }
    if (this.theme === "underground") {
      this.set(x, this.floor, T.BRICK);
      this.set(x, this.floor + 1, T.BRICK);
      return;
    }
    if (this.theme === "underwater") {
      this.set(x, this.floor, T.STAIR);
      this.set(x, this.floor + 1, T.STAIR);
      return;
    }
    this.set(x, this.floor, T.GROUND_TOP);
    this.set(x, this.floor + 1, T.GROUND);
  }

  flat(n) {
    for (let i = 0; i < n; i++) this.fillGround(this.cursor + i);
    this.cursor += n;
  }

  pit(n) {
    if (this.theme === "castle") {
      for (let i = 0; i < n; i++) {
        this.set(this.cursor + i, this.floor, T.LAVA);
        this.set(this.cursor + i, this.floor + 1, T.LAVA);
      }
    }
    this.cursor += n;
  }

  question(x, y, item) {
    this.set(x, y, T.QUESTION);
    this.blocks[`${x},${y}`] = { kind: "q", item };
  }

  brick(x, y, coins = 0) {
    this.set(x, y, T.BRICK);
    if (coins > 0) this.blocks[`${x},${y}`] = { kind: "coins", coins };
  }

  coin(x, y) {
    this.set(x, y, T.COIN);
  }

  pipe(height, piranha = false) {
    const x = this.cursor + 1;
    const top = this.floor - height;
    for (let y = top; y < this.h; y++) {
      const lip = y === top;
      this.set(x, y, lip ? T.PIPE_TL : T.PIPE_L);
      this.set(x + 1, y, lip ? T.PIPE_TR : T.PIPE_R);
    }
    if (piranha) {
      this.entities.push({
        type: "piranha",
        x: x * TILE + 8,
        y: top * TILE,
        baseY: top * TILE + 8,
        w: 16,
        h: 22,
        phase: (x * 19) % 110,
        alive: true,
        awake: true,
        hidden: true,
        vx: 0,
        vy: 0,
      });
    }
    this.flat(Math.max(0, x + 4 - this.cursor));
  }

  stairs(n, dir) {
    if (dir > 0) {
      for (let i = 0; i < n; i++) {
        this.fillGround(this.cursor);
        for (let s = 1; s <= i + 1; s++) this.set(this.cursor, this.floor - s, T.STAIR);
        this.cursor++;
      }
    } else {
      for (let i = 0; i < n; i++) {
        const h = n - i;
        this.fillGround(this.cursor);
        for (let s = 1; s <= h; s++) this.set(this.cursor, this.floor - s, T.STAIR);
        this.cursor++;
      }
    }
  }

  enemy(type, xTile) {
    if (xTile < 4) return;
    const h = type === "koopa" ? 24 : type === "fish" ? 12 : 16;
    const w = type === "koopa" ? 16 : 16;
    let y = this.floor * TILE - h;
    if (type === "fish") y = 64 + ((xTile * 13) % 70);
    this.entities.push({
      type,
      x: xTile * TILE,
      y,
      w,
      h,
      vx: type === "fish" ? -0.7 : -0.5,
      vy: 0,
      dir: -1,
      alive: true,
      awake: false,
      baseY: y,
      phase: xTile * 3,
    });
  }

  scatterEnemies(kind, count, back) {
    for (let i = 0; i < count; i++) {
      const x = this.cursor - 4 - i * 4 - (i % 2);
      if (x > 8 && x > this.cursor - back && this.groundAt(x)) this.enemy(kind, x);
    }
  }

  platform(w, row) {
    const tile = this.theme === "athletic" ? T.TREE : T.PLATFORM;
    for (let i = 0; i < w; i++) this.set(this.cursor + i, row, tile);
    this.cursor += w;
  }

  gap(n) {
    this.cursor += n;
  }

  scenery() {
    if (this.theme !== "overworld" && this.theme !== "athletic") return;
    const groundY = this.floor * TILE;
    for (let x = 0; x < this.cursor; x += 14) {
      this.decor.push({ type: "cloud", x: x * TILE + 20, y: 28 + ((x / 14) % 3) * 16 });
    }
    for (let x = 2; x < this.cursor; x += 18) {
      this.decor.push({ type: "hill", x: x * TILE, y: groundY - 32 });
    }
    for (let x = 6; x < this.cursor; x += 11) {
      if (this.groundAt(x) && this.groundAt(x + 1) && this.groundAt(x + 2)) {
        this.decor.push({ type: "bush", x: x * TILE, y: groundY - 16 });
      }
    }
  }

  ceiling() {
    if (this.theme !== "underground" && this.theme !== "castle" && this.theme !== "underwater") return;
    const tile = this.theme === "underground" ? T.BRICK : T.STAIR;
    for (let x = 0; x < this.cursor; x++) {
      this.set(x, 0, tile);
      if (this.theme !== "underwater") this.set(x, 1, tile);
    }
  }

  stampCastle(x) {
    const door = x + 2;
    const rows = [
      "  CCCC  ",
      " CCCCCC ",
      "CC DD CC",
      "CC DD CC",
      "CC DD CC",
      "CCCCCCCC",
    ];
    const top = this.floor - rows.length;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === "C") this.set(x + c, top + r, T.CASTLE);
        if (ch === "D") this.set(x + c, top + r, T.DOOR);
      }
    }
    this.castleDoor = door;
  }

  finishFlag() {
    this.flat(3);
    const fx = this.cursor;
    for (let y = 2; y < this.floor; y++) this.set(fx, y, y === 2 ? T.POLETOP : T.POLE);
    this.fillGround(fx);
    this.flagX = fx;
    this.flat(5);
    const cx = this.cursor;
    this.flat(8);
    this.stampCastle(cx);
    this.flat(2);
  }

  finishCastle() {
    const start = this.cursor;
    const len = 13;
    for (let i = 0; i < len; i++) {
      this.set(start + i, this.floor, T.BRIDGE);
      if (i < len - 1) this.bridge.push({ x: start + i, y: this.floor });
      this.set(start + i, this.floor + 1, T.LAVA);
    }
    this.entities.push({
      type: "bowser",
      x: (start + 3) * TILE,
      y: this.floor * TILE - 32,
      w: 32,
      h: 32,
      vx: 0.28,
      vy: 0,
      minX: (start + 1) * TILE,
      maxX: (start + 7) * TILE,
      alive: true,
      awake: true,
      dir: -1,
      shot: 0,
    });
    const axe = start + len - 1;
    for (let y = this.floor - 4; y < this.floor; y++) this.set(axe, y, T.AXE);
    this.axeX = axe;
    this.cursor = axe + 1;
    this.flat(4);
    const cx = this.cursor;
    this.flat(6);
    this.set(cx + 2, this.floor - 1, T.DOOR);
    this.set(cx + 2, this.floor - 2, T.DOOR);
    this.set(cx + 3, this.floor - 1, T.DOOR);
    this.set(cx + 3, this.floor - 2, T.DOOR);
    this.castleDoor = cx + 2;
    this.flat(2);
  }

  done() {
    this.scenery();
    this.ceiling();
    const width = this.cursor + 1;
    const tiles = new Uint8Array(width * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < width; x++) tiles[y * width + x] = x < this.width ? this.tiles[y * this.width + x] : 0;
    }
    const time = this.theme === "castle" || this.theme === "athletic" ? 300 : 400;
    return {
      theme: this.theme,
      world: this.world,
      stage: this.stage,
      width,
      height: this.h,
      tiles,
      blocks: this.blocks,
      entities: this.entities,
      decor: this.decor,
      bridge: this.bridge,
      flagX: this.flagX,
      castleDoor: this.castleDoor,
      axeX: this.axeX,
      water: this.theme === "underwater",
      time,
      spawnX: 40,
      spawnY: this.floor * TILE - 16,
    };
  }
}

function openingBlocks(b) {
  b.question(9, 7, "coin");
  b.brick(16, 7);
  b.question(17, 7, "mushroom");
  b.brick(18, 7);
  b.question(19, 7, "coin");
  b.brick(20, 7);
  b.question(18, 3, "coin");
  b.flat(24);
  b.enemy("goomba", 22);
  b.enemy("goomba", 24);
}

function level1_1() {
  const b = new Builder("overworld", 1, 1);
  openingBlocks(b);
  b.flat(6);
  b.pipe(2, false);
  b.flat(4);
  b.enemy("goomba", b.cursor - 2);
  b.pipe(3, false);
  b.flat(3);
  b.pipe(4, true);
  b.flat(6);
  b.pit(3);
  b.flat(6);
  b.enemy("goomba", b.cursor - 3);
  b.enemy("koopa", b.cursor - 6);
  b.flat(4);
  b.question(b.cursor + 2, 7, "coin");
  b.question(b.cursor + 4, 7, "coin");
  b.brick(b.cursor + 3, 7, 8);
  b.flat(8);
  b.stairs(4, 1);
  b.stairs(4, -1);
  b.flat(3);
  b.pit(4);
  b.flat(5);
  b.pipe(2, true);
  b.flat(5);
  b.enemy("goomba", b.cursor - 2);
  b.enemy("goomba", b.cursor - 4);
  b.stairs(8, 1);
  b.stairs(8, -1);
  b.flat(2);
  b.finishFlag();
  return b.done();
}

function overworld(world, stage) {
  const b = new Builder("overworld", world, stage);
  openingBlocks(b);
  const waves = 1 + Math.floor(world / 2);
  for (let i = 0; i < waves; i++) {
    b.flat(4);
    b.pipe(2 + (i % 3 === 2 ? 2 : i % 2), world > 1);
    b.flat(3);
    b.scatterEnemies(i % 2 ? "koopa" : "goomba", 1 + (world > 4 ? 1 : 0), 8);
    if (i % 2 === 0) {
      b.pit(2 + (world > 5 ? 2 : 1));
      b.flat(5);
    } else {
      b.stairs(3 + (i % 3), 1);
      b.stairs(3 + (i % 3), -1);
      b.flat(3);
    }
    if (world % 2 === 1) {
      b.question(b.cursor + 1, 7, i === 0 ? "mushroom" : "coin");
      b.flat(6);
    }
  }
  b.flat(4);
  b.pit(3);
  b.flat(4);
  b.stairs(5 + (world % 3), 1);
  b.stairs(5 + (world % 3), -1);
  b.finishFlag();
  return b.done();
}

function underground(world, stage) {
  const b = new Builder("underground", world, stage);
  b.flat(10);
  b.question(b.cursor - 4, 7, "mushroom");
  b.brick(b.cursor - 3, 7, 6);
  b.coin(b.cursor - 2, 6);
  b.coin(b.cursor - 1, 5);
  const waves = 2 + Math.floor(world / 3);
  for (let i = 0; i < waves; i++) {
    b.flat(5);
    b.scatterEnemies("goomba", 1 + (i % 2), 7);
    b.pipe(2, true);
    b.flat(3);
    if (i % 2 === 0) {
      b.pit(2);
      b.flat(4);
    }
    b.brick(b.cursor - 2, 6);
    b.question(b.cursor - 1, 6, "coin");
  }
  b.flat(4);
  b.stairs(4, 1);
  b.stairs(4, -1);
  b.finishFlag();
  return b.done();
}

function athletic(world, stage) {
  const b = new Builder("athletic", world, stage);
  b.flat(7);
  b.enemy("goomba", 5);
  const plats = 5 + world;
  for (let i = 0; i < plats; i++) {
    const row = 8 + ((i + stage) % 4 === 0 ? -1 : 0);
    const width = 4 + (i % 3 === 0 ? 1 : 0);
    b.platform(width, row);
    if (i % 3 !== 2) {
      b.entities.push({
        type: i % 2 === 0 ? "goomba" : "koopa",
        x: (b.cursor - 2) * TILE,
        y: row * TILE - (i % 2 === 0 ? 16 : 24),
        w: 16,
        h: i % 2 === 0 ? 16 : 24,
        vx: -0.4,
        vy: 0,
        dir: -1,
        alive: true,
        awake: false,
      });
    }
    const gap = i % 4 === 3 ? 3 : 2;
    b.gap(gap);
  }
  b.platform(5, 8);
  b.gap(2);
  b.platform(4, 9);
  b.gap(2);
  b.platform(4, 10);
  b.flat(3);
  b.finishFlag();
  return b.done();
}

function castle(world, stage) {
  const b = new Builder("castle", world, stage);
  b.flat(8);
  const gaps = 2 + Math.floor((world - 1) / 2);
  for (let i = 0; i < gaps; i++) {
    b.pit(2);
    b.flat(4 + (i % 2));
    if (i % 2 === 0) b.scatterEnemies("goomba", 1, 5);
  }
  b.flat(3);
  b.finishCastle();
  return b.done();
}

function underwater(world, stage) {
  const b = new Builder("underwater", world, stage);
  b.flat(8);
  const schools = 3 + Math.floor(world / 2);
  for (let i = 0; i < schools; i++) {
    b.flat(6);
    b.enemy("fish", b.cursor - 2);
    if (i % 2 === 0) b.enemy("fish", b.cursor - 4);
    b.coin(b.cursor - 3, 6);
    b.coin(b.cursor - 2, 5);
  }
  b.flat(6);
  b.finishFlag();
  return b.done();
}

export function buildLevel(world, stage) {
  if (world === 1 && stage === 1) return level1_1();
  const theme = themeOf(world, stage);
  if (theme === "castle") return castle(world, stage);
  if (theme === "athletic") return athletic(world, stage);
  if (theme === "underground") return underground(world, stage);
  if (theme === "underwater") return underwater(world, stage);
  return overworld(world, stage);
}

export function themeFor(world, stage) {
  if (world === 1 && stage === 1) return "overworld";
  return themeOf(world, stage);
}
