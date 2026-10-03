function ramp(x0, x1, y, tilt) {
  return { x0, x1, y0: y - tilt, y1: y + tilt, convey: 0 };
}

function flat(x0, x1, y, convey = 0) {
  return { x0, x1, y0: y, y1: y, convey };
}

function stage25() {
  const girders = [
    ramp(4, 220, 232, -7),
    ramp(4, 220, 196, 7),
    ramp(4, 220, 160, -7),
    ramp(4, 220, 124, 7),
    ramp(4, 220, 88, -7),
    flat(24, 200, 54),
  ];
  const ladders = [
    { x: 198, g0: 0, g1: 1 },
    { x: 112, g0: 0, g1: 1, broken: true },
    { x: 28, g0: 1, g1: 2 },
    { x: 154, g0: 1, g1: 2, broken: true },
    { x: 198, g0: 2, g1: 3 },
    { x: 72, g0: 2, g1: 3, broken: true },
    { x: 28, g0: 3, g1: 4 },
    { x: 146, g0: 3, g1: 4, broken: true },
    { x: 198, g0: 4, g1: 5 },
    { x: 92, g0: 4, g1: 5 },
  ];
  return {
    kind: "barrels",
    bonus: 5000,
    girders,
    ladders,
    hammers: [
      { girder: 0, x: 18 },
      { girder: 2, x: 14 },
    ],
    dk: { x: 46, girder: 5 },
    pauline: { x: 168, girder: 5 },
    oil: { x: 18, girder: 0 },
    spawn: { girder: 0, x: 56 },
    elevators: [],
    springs: [],
    rivets: [],
    pies: [],
    fires: [],
  };
}

function stage50() {
  const girders = [
    flat(4, 220, 228),
    flat(12, 212, 184, 0.42),
    flat(12, 212, 140, -0.42),
    flat(12, 212, 96, 0.42),
    flat(36, 210, 56),
  ];
  const ladders = [
    { x: 36, g0: 0, g1: 1 },
    { x: 188, g0: 1, g1: 2 },
    { x: 36, g0: 2, g1: 3 },
    { x: 188, g0: 3, g1: 4 },
    { x: 112, g0: 1, g1: 2, broken: true },
    { x: 112, g0: 2, g1: 3, broken: true },
  ];
  return {
    kind: "conveyor",
    bonus: 6000,
    girders,
    ladders,
    hammers: [],
    dk: { x: 70, girder: 4 },
    pauline: { x: 132, girder: 4 },
    oil: null,
    spawn: { girder: 0, x: 40 },
    elevators: [],
    springs: [],
    rivets: [],
    pies: [
      { girder: 1, x: 70 },
      { girder: 1, x: 150 },
      { girder: 2, x: 60 },
      { girder: 2, x: 160 },
      { girder: 3, x: 90 },
      { girder: 3, x: 170 },
    ],
    fires: [],
  };
}

function stage75() {
  const girders = [
    flat(0, 100, 214),
    flat(122, 224, 164),
    flat(0, 100, 114),
    flat(120, 210, 58),
  ];
  return {
    kind: "elevator",
    bonus: 8000,
    girders,
    ladders: [],
    hammers: [],
    dk: { x: 190, girder: 3 },
    pauline: { x: 140, girder: 3 },
    oil: null,
    spawn: { girder: 0, x: 36 },
    elevators: [{ x: 84, w: 64, y: 214, y0: 50, y1: 222, vy: -0.32 }],
    springs: [{ x: 112, y: 246 }],
    rivets: [],
    pies: [],
    fires: [{ girder: 1, x: 180, vx: -0.45 }],
  };
}

function stage100() {
  const girders = [flat(8, 216, 232)];
  const rivets = [];
  const rows = [196, 156, 116, 76];
  for (const y of rows) {
    const left = girders.length;
    girders.push(flat(20, 104, y));
    const right = girders.length;
    girders.push(flat(120, 204, y));
    rivets.push({ girder: left, side: "right", x: 104, y });
    rivets.push({ girder: right, side: "left", x: 120, y });
  }
  girders.push(flat(78, 146, 64));
  const ladders = [
    { x: 32, g0: 0, g1: 1 },
    { x: 192, g0: 0, g1: 2 },
    { x: 32, g0: 1, g1: 3 },
    { x: 192, g0: 2, g1: 4 },
    { x: 32, g0: 3, g1: 5 },
    { x: 192, g0: 4, g1: 6 },
    { x: 32, g0: 5, g1: 7 },
    { x: 192, g0: 6, g1: 8 },
  ];
  return {
    kind: "rivets",
    bonus: 5000,
    girders,
    ladders,
    hammers: [{ girder: 0, x: 112 }],
    dk: { x: 100, girder: 9 },
    pauline: { x: 128, girder: 9 },
    oil: null,
    spawn: { girder: 0, x: 48 },
    elevators: [],
    springs: [],
    rivets,
    pies: [],
    fires: [],
  };
}

export const STAGES = [stage25, stage50, stage75, stage100];
