// glass.js - the raised glass skylight ('W' tiles) and the little students walking on the floor BELOW it.
//
// Drawing order for the glass (all inside a clip that only covers the glass tops):
//   1. the lower floor            (small tiles = it is far away)
//   2. students walking on it     (drawn small = far away, and they shift a bit when the camera moves = parallax)
//   3. a depth dimmer             (the floor below is in the shade)
//   4. the glass itself           (tint, sky reflection, glints, water drops, seams, metal frame)
// So it reads as a sheet of real glass, not as a hole.
//
// Every block of 'W' tiles in a zone becomes one platform. The bottom row of a block shows a louvered front.
import { TILE, getTile, zoneId, cols, rows } from './map.js';
import { drawStudent, prepareVariants, VARIANT_COUNT } from './sprites.js';

export const FRONT_H = 10;              // height (px) of the louvered FRONT face (bottom edge)
export const SIDE_W = 10;               // width (px) of the louvered LEFT face (left edge)

// ---------- TWEAK ME ----------------------------------------------------------------------
const STUDENT_SCALE = 0.32;             // size of people below (the player is 0.75) -> bigger = closer floor
const FLOOR_TILE = 13;                  // lower-floor tile size in px (the roof floor is 32) -> smaller = deeper
const PARALLAX = 0.30;                  // 0 = floor below is glued to the roof, higher = more depth when you move
const STUDENT_COUNT = 34;               // how many people walk around down there
const DIM = 0.16;                       // how dark the floor below is (0-1)
const GLASS_TINT = 0.18;                // how strongly the glass tints what's below (0-1)
// -------------------------------------------------------------------------------------------

const fract = (v) => v - Math.floor(v);
const hash = (a, b, c = 0) => fract(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453);

// ---- find the glass in the current zone (cached per zone) ----
let cachedZone = null, glass = [], bbox = null;
function scan() {
  if (cachedZone === zoneId) return;
  cachedZone = zoneId; glass = []; bbox = null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    if (getTile(tx, ty) !== 'W') continue;
    const isW = (x, y) => getTile(x, y) === 'W';
    const n = isW(tx, ty - 1), s = isW(tx, ty + 1), w = isW(tx - 1, ty), e = isW(tx + 1, ty);
    const top = s ? TILE : TILE - FRONT_H;          // glass height inside this tile (the front face takes the rest)
    const lx = w ? 0 : SIDE_W;                      // glass starts this far right (the left face takes the rest)
    glass.push({ tx, ty, n, s, w, e, top, lx, tw: TILE - lx });
    x0 = Math.min(x0, tx * TILE + lx); y0 = Math.min(y0, ty * TILE);
    x1 = Math.max(x1, (tx + 1) * TILE); y1 = Math.max(y1, ty * TILE + top);
  }
  if (glass.length) bbox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// ---- the lower floor: one small repeating pattern ----
let floorPattern = null;
function makeFloorPattern(ctx) {
  const T = FLOOR_TILE, c = document.createElement('canvas'); c.width = c.height = T * 2;
  const g = c.getContext('2d');
  g.fillStyle = '#5d6469'; g.fillRect(0, 0, T * 2, T * 2);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, T, T); g.fillRect(T, T, T, T);   // checker
  g.fillStyle = 'rgba(0,0,0,0.28)';                                                          // joints
  g.fillRect(0, 0, T * 2, 1); g.fillRect(0, T, T * 2, 1); g.fillRect(0, 0, 1, T * 2); g.fillRect(T, 0, 1, T * 2);
  return ctx.createPattern(c, 'repeat');
}

// ---- the students (positions are RELATIVE to the glass centre, so they work wherever you put the glass) ----
// Each student walks along a straight lane across the whole glass (plus a margin for the parallax), and some stop
// for a few seconds on the way. Pairs walk together. Lanes are scaled to the size of the glass automatically.
const students = [];
(function makeStudents() {
  let k = 0;
  const rnd = () => hash(k++, 7.7);
  for (let i = 0; i < STUDENT_COUNT; i++) {
    const s = {
      horizontal: i % 2 === 0,
      laneN: rnd() * 2 - 1,                                          // -1..1 across the glass
      laneOff: 0,
      dir: rnd() < 0.5 ? -1 : 1,
      speed: 30 + rnd() * 22,                                        // px/s in "below" space
      variant: Math.floor(rnd() * VARIANT_COUNT),
      phase: i * 2.1 + rnd() * 1.5,                                  // spread start times so the glass is never empty
      pauseAt: 0.3 + rnd() * 0.4,                                    // where on the lane he stops (fraction)
      pauseDur: rnd() < 0.5 ? 1.5 + rnd() * 3 : 0,                   // 0 = never stops
    };
    students.push(s);
    if (i % 5 === 1) {                                               // a friend walking right behind him
      students.push({ ...s, laneOff: 9, phase: s.phase - 0.45, variant: (s.variant + 3) % VARIANT_COUNT });
    }
  }
})();

// position of a student at `time`: { along, moving, t }   (t = seconds spent walking, drives the walk cycle)
function studentState(s, time, half) {
  const walkTime = (half * 2) / s.speed;
  const cycle = walkTime + s.pauseDur;
  const tt = (((time + s.phase) % cycle) + cycle) % cycle;
  const tA = s.pauseAt * walkTime;
  let d, moving = true, walked;
  if (tt < tA) { d = tt * s.speed; walked = tt; }
  else if (tt < tA + s.pauseDur) { d = tA * s.speed; moving = false; walked = tA; }
  else { d = (tt - s.pauseDur) * s.speed; walked = tt - s.pauseDur; }
  return { along: s.dir > 0 ? -half + d : half - d, moving, t: walked };
}

// ---- the metal faces of the box (called by the normal tile loop) ----
// FRONT face = louvers with horizontal slats, on the bottom row.  LEFT face = louvers with vertical slats, on the left column.
export function drawGlassFront(ctx, px, py, tx, ty) {
  ctx.fillStyle = '#2f3b43'; ctx.fillRect(px, py, TILE, TILE);            // base (the glass pass paints over the top part)
  const isW = (x, y) => getTile(x, y) === 'W';
  const hasS = isW(tx, ty + 1), hasE = isW(tx + 1, ty), hasW = isW(tx - 1, ty), hasN = isW(tx, ty - 1);

  if (!hasW) {                                                            // left face
    const h = hasS ? TILE : TILE - FRONT_H;                               // the front face covers the bottom part
    ctx.fillStyle = "#b0b5b8"; ctx.fillRect(px, py, SIDE_W, h);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    for (let i = 3; i < SIDE_W - 2; i += 3) ctx.fillRect(px + i, py, 1, h);   // vertical slats
    ctx.fillStyle = '#d6d9db'; ctx.fillRect(px, py, 2, h);                // bright outer post
    ctx.fillStyle = '#868b8f'; ctx.fillRect(px + SIDE_W - 2, py, 2, h);   // shadowed edge next to the glass
    if (hasN) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(px, py, SIDE_W, 1); }   // joint between panels
    else      { ctx.fillStyle = '#d6d9db';          ctx.fillRect(px, py, SIDE_W, 2); }   // top cap
  }
  if (!hasS) {                                                            // front face (full tile width, so it also wraps the corner)
    const fy = py + TILE - FRONT_H;
    ctx.fillStyle = '#c9cdcf'; ctx.fillRect(px, fy, TILE, FRONT_H);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    for (let i = 2; i < FRONT_H - 2; i += 3) ctx.fillRect(px, fy + i, TILE, 1);   // horizontal slats
    ctx.fillStyle = '#8d9296'; ctx.fillRect(px, fy + FRONT_H - 2, TILE, 2);       // shadowed base
    ctx.fillStyle = '#a2a7aa'; ctx.fillRect(px, fy, 2, FRONT_H);                  // vertical post
    if (!hasE) ctx.fillRect(px + TILE - 2, fy, 2, FRONT_H);
  }
}

// ---- the glass tops + everything seen through them (called once per frame, after the tiles) ----
export function drawGlassTops(ctx, time, camera, VW, VH) {
  scan();
  if (!bbox) return;
  prepareVariants();                                                      // builds one recoloured student per frame
  // skip if the platform is off-screen
  if (bbox.x > camera.x + VW || bbox.x + bbox.w < camera.x || bbox.y > camera.y + VH || bbox.y + bbox.h < camera.y) return;
  if (!floorPattern) floorPattern = makeFloorPattern(ctx);

  ctx.save();
  const clip = new Path2D();
  for (const t of glass) clip.rect(t.tx * TILE + t.lx, t.ty * TILE, t.tw, t.top);
  ctx.clip(clip);

  // parallax: the floor below is far away, so it slides less than the roof when the camera moves
  const px = (camera.x + VW / 2 - bbox.cx) * PARALLAX, py = (camera.y + VH / 2 - bbox.cy) * PARALLAX;
  const ox = bbox.cx + px, oy = bbox.cy + py;                             // origin of the "below" world

  // 1) lower floor
  const ex = bbox.w / 2 + 150, ey = bbox.h / 2 + 150;                      // how far the floor must extend (parallax margin)
  ctx.save();
  ctx.translate(Math.round(ox), Math.round(oy));
  ctx.fillStyle = floorPattern; ctx.fillRect(-ex, -ey, ex * 2, ey * 2);
  // painted lane lines (dashed), a tactile strip and a few hatches, like on the real floor
  ctx.fillStyle = 'rgba(235,235,235,0.55)';
  for (const ly of [-150, 58, 170]) for (let x = -ex; x < ex; x += 22) ctx.fillRect(x, ly, 12, 2);
  ctx.fillStyle = 'rgba(205,200,170,0.5)'; ctx.fillRect(-62, -ey, 5, ey * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = -ey; y < ey; y += 4) ctx.fillRect(-61, y, 3, 1);
  for (const [hx, hy] of [[40, -70], [-30, 120], [30, 210], [-20, -200]]) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(hx, hy, 26, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(hx + 2, hy + 2, 22, 2);
  }

  // 2) students (drawn small, sorted so the lower ones are on top)
  ctx.imageSmoothingEnabled = true;                                        // tiny sprites look better smoothed
  const list = [];
  for (const s of students) {
    const half = (s.horizontal ? bbox.w : bbox.h) / 2 + 110;                // lane length (covers the glass + margin)
    const lane = s.laneN * ((s.horizontal ? bbox.h : bbox.w) / 2 + 40) + s.laneOff;
    const st = studentState(s, time, half);
    const bx = s.horizontal ? st.along : lane, by = s.horizontal ? lane : st.along;
    if (Math.abs(bx + px) > bbox.w / 2 + 24 || Math.abs(by + py) > bbox.h / 2 + 24) continue;   // not near the glass
    list.push({ s, st, bx, by });
  }
  list.sort((a, b) => a.by - b.by);
  for (const { s, st, bx, by } of list) {
    const facing = s.horizontal ? (s.dir > 0 ? 'right' : 'left') : (s.dir > 0 ? 'down' : 'up');
    drawStudent(ctx, s.variant, facing, st.moving, st.t, bx, by, STUDENT_SCALE, 12 * (s.speed / 60) * 1.6);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.restore();

  // 3) depth dimmer: the floor below is in shade
  ctx.fillStyle = `rgba(14,24,32,${DIM})`; ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

  // 4) the glass ------------------------------------------------------------
  ctx.fillStyle = `rgba(170,208,222,${GLASS_TINT})`; ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);   // blue-green tint
  const sky = ctx.createLinearGradient(bbox.x, bbox.y, bbox.x + bbox.w * 0.55, bbox.y + bbox.h);      // sky reflection
  sky.addColorStop(0, 'rgba(240,248,252,0.38)'); sky.addColorStop(0.55, 'rgba(240,248,252,0.14)'); sky.addColorStop(1, 'rgba(240,248,252,0.04)');
  ctx.fillStyle = sky; ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

  // reflection of the roof beams: a soft dark diagonal band, plus drifting bright glints
  ctx.save();
  ctx.translate(bbox.x, bbox.y);
  ctx.fillStyle = 'rgba(25,35,45,0.15)';
  for (const bx0 of [bbox.w * 0.1, bbox.w * 0.1 - bbox.h * 0.6]) {         // two soft dark bands (reflected roof beams)
    ctx.beginPath(); ctx.moveTo(bx0, 0); ctx.lineTo(bx0 + 30, 0); ctx.lineTo(bx0 + 30 + bbox.h, bbox.h); ctx.lineTo(bx0 + bbox.h, bbox.h); ctx.fill();
  }
  const shift = (time * 6) % 80;
  for (let c = -bbox.h - 80 + shift; c < bbox.w + 80; c += 80) {
    ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c + bbox.h, bbox.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.17)'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();

  // per-panel details: water drops, dust, seams, metal frame
  for (const t of glass) {
    const x = t.tx * TILE + t.lx, y = t.ty * TILE, tw = t.tw;               // x,y,tw,top = the glass rectangle of this panel
    // water drops (fixed random spots)
    for (let i = 0; i < 3; i++) {
      const dx = x + 3 + hash(t.tx, t.ty, i) * (tw - 8), dy = y + 3 + hash(t.tx, t.ty, i + 9) * (t.top - 8);
      const r = 0.6 + hash(t.tx, t.ty, i + 20) * 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(dx, dy, r * 1.3, r, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(dx - 1), Math.round(dy - 1), 1, 1);
    }
    // a faint scratch / dust streak on some panels
    if (hash(t.tx, t.ty, 33) > 0.55) {
      ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; ctx.beginPath();
      const sx = x + hash(t.tx, t.ty, 40) * 14, sy = y + hash(t.tx, t.ty, 41) * (t.top - 12);
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 10, sy + 8); ctx.stroke();
    }
    // seams between panels: dark gap with a light metal edge
    if (t.e) { ctx.fillStyle = 'rgba(12,18,24,0.55)'; ctx.fillRect(x + tw - 1, y, 2, t.top); ctx.fillStyle = 'rgba(215,224,229,0.55)'; ctx.fillRect(x + tw - 2, y, 1, t.top); }
    if (t.s) { ctx.fillStyle = 'rgba(12,18,24,0.55)'; ctx.fillRect(x, y + TILE - 1, tw, 2); ctx.fillStyle = 'rgba(215,224,229,0.55)'; ctx.fillRect(x, y + TILE - 2, tw, 1); }
    // metal frame on the outer edges + green glass edge + inner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    if (!t.n) ctx.fillRect(x, y + 3, tw, 3);
    if (!t.w) ctx.fillRect(x + 3, y, 3, t.top);
    ctx.fillStyle = 'rgba(120,200,190,0.45)';
    if (!t.n) ctx.fillRect(x, y + 3, tw, 1);
    if (!t.w) ctx.fillRect(x + 3, y, 1, t.top);
    ctx.fillStyle = '#b4babd';
    if (!t.n) ctx.fillRect(x, y, tw, 3);
    if (!t.w) ctx.fillRect(x, y, 3, t.top);
    if (!t.e) ctx.fillRect(x + tw - 3, y, 3, t.top);
    if (!t.s) { ctx.fillRect(x, y + t.top - 3, tw, 3); ctx.fillStyle = '#7d8387'; ctx.fillRect(x, y + t.top - 1, tw, 1); }
  }
  ctx.restore();
}