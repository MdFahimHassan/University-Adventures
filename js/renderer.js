// renderer.js - ALL drawing lives here. Game logic never touches the canvas.
import { TILE, cols, rows, widthPx, heightPx, getTile, isSolid, items, zoneId } from './map.js';
import { transition } from './transition.js';
import { quest } from './quest.js';
import { dialogue } from './dialogue.js';
import { intro, escalator } from './intro.js';
import { drawCharacter } from './sprites.js';
import { drawGlassFront, drawGlassTops } from './glass.js';
import { skyline, drawSkyline } from './skyline.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;           // crisp pixels
const VW = canvas.width, VH = canvas.height;  // viewport size in pixels

const camera = { x: 0, y: 0 };

// Placeholder colors. Later you can swap these for real sprites.
const COLORS = {
  '#': '#5b5b66', '.': '#b8b2a4', '~': '#3a7bd5', 'h': '#2e6b34', 'g': '#4caf50',   // generic
  'p': '#a9a28e',                       // path
  'R': '#b8b2a4',                       // railing (floor drawn first, bars on top)
  'S': '#d3d1c7',                       // stairs
  'L': '#7d8aa0',                       // lift
  'D': '#9c6428',                       // store room door
  'E': '#5c5c66', 'F': '#5c5c66',       // escalators (animated in drawEscalator)
  'v': '#030305',                       // escalator well = black void (the floor below)
  'X': '#a9a28e', 'U': '#a9a28e',       // exit paths (arrow drawn on top)
  'B': '#d9dde0',                       // pool rim / lawn border
  'K': '#4f4f5a',                       // storage room block (solid)
  'C': '#b8b2a4', 'T': '#b8b2a4', 'b': '#4a9a4a',   // bench + planter (floor first, drawn in drawBench / drawPlanter), bush
  'H': '#1f5a28', 'Y': '#1f5a28', 'Z': '#1f5a28',   // planted areas: hedge / bush mound / tree (drawn in drawPlanted)
  'M': '#5b5b66', 'G': '#5b5b66',       // restroom doors (wall colour, door drawn on top)
  'W': '#2f3b43',                       // glass skylight: the dark floor you see through it (drawn in drawGlass)
};

function updateCamera(player) {
  // center on player, then clamp so we never show outside the map...
  // ...EXCEPT near a rail: skyline.over[side] lets the camera slide past that edge to reveal the city (see skyline.js)
  skyline.sync();
  const o = skyline.over, push = skyline.push();            // push = extra nudge toward the rail while leaning out
  const wantX = player.cx - VW / 2 + push.x, wantY = player.cy - VH / 2 + push.y;
  camera.x = Math.max(-o.w, Math.min(wantX, widthPx - VW + o.e));
  camera.y = Math.max(-o.n, Math.min(wantY, heightPx - VH + o.s));
  camera.x = Math.round(camera.x); camera.y = Math.round(camera.y); // avoids seams
}

function drawBlobs(px, py, a) {                       // two leafy bush blobs (a = opacity)
  ctx.globalAlpha = a;
  ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.ellipse(px + 10, py + 19, 8, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.ellipse(px + 22, py + 14, 8, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66bb6a'; ctx.fillRect(px + 12, py + 9, 5, 3);
  ctx.globalAlpha = 1;
}

// ---- planted areas: H = clipped hedge, Y = bush mound, Z = tree -----------------------------------------
// All three are solid. Leaf positions come from tx/ty (no random flicker). A pale guard rail is drawn
// automatically on every edge that faces open floor (see drawGuardRail), like the hedges in the real photos.
const isPlanted = (x, y) => { const c = getTile(x, y); return c === 'H' || c === 'Y' || c === 'Z'; };
const rnd = (a, b, c = 0) => Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1;
function disc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

function drawPlanted(ch, px, py, tx, ty) {
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, TILE, TILE); ctx.clip();       // leaves never spill onto neighbour tiles
  if (ch === 'Y') {                                                // bush mounds: rounder and lighter than the hedge
    ctx.fillStyle = '#24652b'; ctx.fillRect(px, py, TILE, TILE);
    const shades = ['#2f8a37', '#3a9a42', '#43a047', '#2c7d33'];
    [[9, 10], [22, 9], [11, 23], [24, 22], [16, 16]].forEach(([sx, sy], i) => {
      const cx = px + sx + (rnd(tx, ty, i) - 0.5) * 4, cy = py + sy + (rnd(tx, ty, i + 9) - 0.5) * 4;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; disc(cx + 1, cy + 2, 9);
      ctx.fillStyle = shades[i % shades.length]; disc(cx, cy, 8.5);
      ctx.fillStyle = '#8bd18f'; ctx.fillRect(Math.round(cx - 3), Math.round(cy - 4), 3, 2);
    });
  } else if (ch === 'Z') {                                         // tree: one big canopy
    ctx.fillStyle = '#1f5a28'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; disc(px + 17, py + 19, 14.5);
    ctx.fillStyle = '#2e7d32'; disc(px + 16, py + 15, 14.5);
    ctx.fillStyle = '#388e3c'; disc(px + 12, py + 12, 9); disc(px + 21, py + 17, 8);
    ctx.fillStyle = '#4caf50'; disc(px + 11, py + 9, 5);
    ctx.fillStyle = '#8bd18f';
    ctx.fillRect(px + 9, py + 7, 3, 2); ctx.fillRect(px + 20, py + 13, 3, 2); ctx.fillRect(px + 14, py + 20, 3, 2);
  } else {                                                         // clipped hedge: dense wall of leaves
    const shades = ['#2e7d32', '#388e3c', '#2a7030', '#43a047'];
    for (let i = 0; i < 9; i++) {                                  // 3x3 grid of overlapping leaf blobs
      const gx = i % 3, gy = Math.floor(i / 3);
      const h = Math.abs(Math.sin((tx * 3 + gx) * 12.9898 + (ty * 3 + gy) * 78.233) * 43758.5453) % 1;
      ctx.fillStyle = shades[Math.floor(h * shades.length)];
      ctx.beginPath(); ctx.arc(px + gx * 11 + 5 + (h - 0.5) * 4, py + gy * 11 + 5 + (h * 7 % 1 - 0.5) * 4, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#7bc47f';                                     // a few bright leaf highlights
    for (let i = 0; i < 4; i++) {
      const h = Math.abs(Math.sin((tx * 5 + i) * 39.346 + (ty * 7 + i) * 11.135) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin((tx * 5 + i) * 17.17 + (ty * 7 + i) * 91.7) * 12345.678) % 1;
      ctx.fillRect(px + 3 + Math.floor(h * 24), py + 3 + Math.floor(h2 * 22), 3, 2);
    }
    ctx.fillStyle = '#143d1a';                                     // deep gaps between the leaves
    ctx.fillRect(px + 7, py + 14, 3, 2); ctx.fillRect(px + 20, py + 8, 3, 2); ctx.fillRect(px + 14, py + 24, 3, 2);
  }
  // light top edge / dark base only where the planted area ENDS, so a block of tiles reads as one big mass
  if (ty > 0 && !isPlanted(tx, ty - 1)) { ctx.fillStyle = 'rgba(190,240,170,0.28)'; ctx.fillRect(px, py, TILE, 4); }   // (none at the map's top edge: the hedge carries on)
  if (!isPlanted(tx, ty + 1)) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(px, py + TILE - 6, TILE, 6); }
  ctx.restore();
  drawGuardRail(px, py, tx, ty);
}

// Pale grey safety rail for planted areas (NOT the dark two-bar roof railing): a slim handrail on top,
// thin vertical balusters under it, and a post at each end of every tile. Drawn on every open face.
const RAIL = { hand: '#d6dadd', bal: '#98a0a5', post: '#eceff1', shadow: 'rgba(0,0,0,0.28)' };
function railH(x, y) {                                    // horizontal rail segment (top / bottom faces)
  ctx.fillStyle = RAIL.shadow; ctx.fillRect(x, y + 6, TILE, 1);
  ctx.fillStyle = RAIL.bal; for (let i = 3; i < TILE - 2; i += 4) ctx.fillRect(x + i, y + 3, 1, 4);
  ctx.fillStyle = RAIL.hand; ctx.fillRect(x, y + 1, TILE, 2);
  ctx.fillStyle = RAIL.post; ctx.fillRect(x, y, 2, 7); ctx.fillRect(x + TILE - 2, y, 2, 7);
}
function railV(x, y, east) {                              // vertical rail segment (left / right faces)
  const hx = east ? x + 4 : x + 1, bx = east ? x + 1 : x + 3;
  ctx.fillStyle = RAIL.shadow; ctx.fillRect(east ? x : x + 6, y, 1, TILE);
  ctx.fillStyle = RAIL.bal; for (let i = 3; i < TILE - 2; i += 4) ctx.fillRect(bx, y + i, 3, 1);
  ctx.fillStyle = RAIL.hand; ctx.fillRect(hx, y, 2, TILE);
  ctx.fillStyle = RAIL.post; ctx.fillRect(x, y, 7, 2); ctx.fillRect(x, y + TILE - 2, 7, 2);
}
function drawGuardRail(px, py, tx, ty) {
  const open = (x, y) => !isPlanted(x, y) && !isSolid(x, y);   // floor / path next to the planted area
  if (open(tx, ty - 1)) railH(px, py);
  if (open(tx, ty + 1)) railH(px, py + TILE - 7);
  if (open(tx - 1, ty)) railV(px, py, false);
  if (open(tx + 1, ty)) railV(px + TILE - 7, py, true);
}

// ---- concrete bench (C) and tree planter (T) -------------------------------------------------------
// Light speckled concrete seat with a darker front face, like the benches in the photos.
// T tiles sit in the middle of the bench ring: a dark grey tapered planter box with a tree growing out of it.
const isBenchPart = (x, y) => { const c = getTile(x, y); return c === 'C' || c === 'T'; };
function drawBench(px, py, tx, ty) {
  const n = isBenchPart(tx, ty - 1), s = isBenchPart(tx, ty + 1), w = isBenchPart(tx - 1, ty), e = isBenchPart(tx + 1, ty);
  const x0 = w ? 0 : 1, x1 = e ? TILE : TILE - 1, y0 = n ? 0 : 1, yb = s ? TILE : TILE - 6;
  ctx.fillStyle = '#c9cccd'; ctx.fillRect(px + x0, py + y0, x1 - x0, yb - y0);           // seat top
  for (let i = 0; i < 8; i++) {                                                           // concrete speckle
    ctx.fillStyle = i % 2 ? '#aeb2b4' : '#dfe1e2';
    ctx.fillRect(px + 2 + Math.floor(rnd(tx, ty, i) * (TILE - 5)), py + 2 + Math.floor(rnd(tx, ty, i + 30) * (yb - 4)), 1, 1);
  }
  if (!n) { ctx.fillStyle = '#e1e3e4'; ctx.fillRect(px + x0, py + y0, x1 - x0, 2); }      // lit top lip
  if (!w) { ctx.fillStyle = '#dfe1e2'; ctx.fillRect(px + x0, py + y0, 1, yb - y0); }
  if (!e) { ctx.fillStyle = '#a9adaf'; ctx.fillRect(px + x1 - 1, py + y0, 1, yb - y0); }
  if (!s) {                                                                               // darker front face + base shadow
    ctx.fillStyle = '#9da1a3'; ctx.fillRect(px + x0, py + yb, x1 - x0, 4);
    ctx.fillStyle = '#6f7477'; ctx.fillRect(px + x0 + 1, py + yb + 4, x1 - x0 - 2, 1);
  }
}
function drawPlanter(px, py, tx, ty) {
  drawBench(px, py, tx, ty);                                                              // the seat continues under the planter
  const isT = (x, y) => getTile(x, y) === 'T';
  const n = isT(tx, ty - 1), s = isT(tx, ty + 1);
  const x0 = px + 3, x1 = px + TILE - 3, y0 = py + (n ? 0 : 2), y1 = py + (s ? TILE : TILE - 2);
  ctx.fillStyle = '#6a6c72'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);                      // box body
  if (!n) { ctx.fillStyle = '#868890'; ctx.fillRect(x0, y0, x1 - x0, 2); }                // lit rim
  if (!s) { ctx.fillStyle = '#4d4f55'; ctx.fillRect(x0, y1 - 5, x1 - x0, 5); }            // darker front face
  ctx.fillStyle = '#3b4a33'; ctx.fillRect(x0 + 3, y0 + (n ? 0 : 3), x1 - x0 - 6, (y1 - y0) - (n ? 0 : 3) - (s ? 0 : 6));   // soil
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; disc(px + 17, py + 17, 12);                         // canopy shadow
  ctx.fillStyle = '#2e7d32'; disc(px + 16, py + 14, 12);
  ctx.fillStyle = '#43a047'; disc(px + 12, py + 10, 7);
  ctx.fillStyle = '#8bd18f'; ctx.fillRect(px + 9, py + 7, 3, 2); ctx.fillRect(px + 19, py + 14, 3, 2);
}

// ---- railings (R): wide grey steel slats (4px slat, 4px gap) between a thin top bar and bottom bar, standing on a
// weathered board-formed concrete parapet - like the rails in the photos. On the edge of a zone the rail sits on the OUTER
// 24px of the tile (parapet inside, slats outside) and the gaps show the drop + skyline beyond (see skyline.js).
// Rails in the middle of a zone get the same slats without the parapet.
const RC = { slat: '#5a646d', lit: '#8e99a3', dark: '#3b434a', bar: '#a9b2ba', barShade: '#6f7881', post: '#c3c8cb',
             para: '#a8a69d', cap: '#cdcbc2', seam: 'rgba(40,36,30,0.28)', stain: 'rgba(30,26,20,0.22)' };
const isRail = (x, y) => getTile(x, y) === 'R';

// One 32px piece of rail in a LOCAL frame: x runs along the rail (0-32), y runs from the outer edge (0) inwards.
function railPiece(idx, hasPrev, hasNext, slatH, paraH, parapet, seed) {
  if (parapet) {                                                       // concrete parapet under the slats
    ctx.fillStyle = RC.para; ctx.fillRect(0, slatH, 32, paraH);
    ctx.fillStyle = RC.cap; ctx.fillRect(0, slatH, 32, 2);             // lighter cap
    ctx.fillStyle = RC.seam; ctx.fillRect(0, slatH + 2, 1, paraH - 2); ctx.fillRect(16, slatH + 2, 1, paraH - 2);   // board seams
    ctx.fillStyle = RC.stain; ctx.fillRect(Math.floor(rnd(seed, 1) * 26) + 3, slatH + paraH - 5, 3, 5);               // weathering
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, slatH + paraH - 2, 32, 2);                                    // dark base
  } else {
    ctx.fillStyle = '#8a9096'; ctx.fillRect(0, slatH, 32, paraH);      // thin steel base channel
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, slatH + paraH, 32, 2);
  }
  for (const x of [2, 10, 18, 26]) {                                   // the slats: lit face on one side, dark edge on the other
    ctx.fillStyle = RC.slat; ctx.fillRect(x, 2, 4, slatH - 3);
    ctx.fillStyle = RC.lit;  ctx.fillRect(x, 2, 1, slatH - 3);
    ctx.fillStyle = RC.dark; ctx.fillRect(x + 3, 2, 1, slatH - 3);
  }
  ctx.fillStyle = RC.bar; ctx.fillRect(0, 0, 32, 2); ctx.fillRect(0, slatH - 2, 32, 2);   // top bar, bottom bar
  ctx.fillStyle = RC.barShade; ctx.fillRect(0, 2, 32, 1);
  const post = (x) => { ctx.fillStyle = RC.post; ctx.fillRect(x, 0, 3, slatH); ctx.fillStyle = RC.dark; ctx.fillRect(x + 2, 0, 1, slatH); };
  if (idx % 4 === 0 || !hasPrev) post(0);                              // a post every 4 tiles and at the ends
  if (!hasNext) post(29);
}
function inFrame(m, fn) { ctx.save(); ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]); fn(); ctx.restore(); }

function drawRail(px, py, tx, ty) {
  const seed = tx * 7 + ty;
  const edges = [];
  if (ty === 0) edges.push('n');
  if (ty === rows - 1) edges.push('s');
  if (tx === 0) edges.push('w');
  if (tx === cols - 1) edges.push('e');
  if (edges.length) {                                                  // on the edge of the zone: parapet + slats, outer side
    for (const s of edges) {
      const m = { e: [0, 1, -1, 0, px + TILE, py], w: [0, 1, 1, 0, px, py], n: [1, 0, 0, 1, px, py], s: [1, 0, 0, -1, px, py + TILE] }[s];
      const horiz = s === 'n' || s === 's';
      const idx = horiz ? tx : ty;
      const prev = horiz ? isRail(tx - 1, ty) : isRail(tx, ty - 1), next = horiz ? isRail(tx + 1, ty) : isRail(tx, ty + 1);
      inFrame(m, () => railPiece(idx, prev, next, 16, 8, true, seed));
    }
    return;
  }
  let h = isRail(tx - 1, ty) || isRail(tx + 1, ty), v = isRail(tx, ty - 1) || isRail(tx, ty + 1);
  if (!h && !v) h = true;
  if (h) inFrame([1, 0, 0, 1, px, py + 6], () => railPiece(tx, isRail(tx - 1, ty), isRail(tx + 1, ty), 16, 3, false, seed));
  if (v) inFrame([0, 1, 1, 0, px + 6, py], () => railPiece(ty, isRail(tx, ty - 1), isRail(tx, ty + 1), 16, 3, false, seed));
}

// ---- the rounded nose of the escalator railing (zone 1) ----------------------------------------------------------------
// Where the two straight rails meet the end rail, they sweep round in one smooth half-ellipse (tiles x 16-18, y 13-17)
// instead of meeting at a square corner. The black well is clipped to the same curve, with a strip of floor between.
// It is painted once into an offscreen image and stamped over those tiles every frame.
// (zones.js: the two corner tiles outside the curve, (18,13) and (18,17), are plain floor.)
const NOSE = { tx: 16, ty: 13, w: 3, h: 5 };
const lerpN = (a, b, t) => a + (b - a) * t;
let noseImg = null;
function buildNose() {
  const c = document.createElement('canvas'); c.width = NOSE.w * TILE; c.height = NOSE.h * TILE;
  const g = c.getContext('2d');
  const cy = 2 * TILE + 15.5, rx = 79.5, ry = 64;               // centre-line of the rail: top rail y, end rail x (tile 18 centre)
  g.fillStyle = COLORS.v;                                        // the black well, inset from the rail
  g.beginPath(); g.ellipse(0, cy, 63.5, 48, 0, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();

  const N = 800, pts = []; let len = 0;                          // walk along the curve
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI / 2 + Math.PI * i / N, x = rx * Math.cos(th), y = cy + ry * Math.sin(th);
    const tx = -rx * Math.sin(th), ty = ry * Math.cos(th), tl = Math.hypot(tx, ty);
    if (i) len += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, ang: Math.atan2(ty, tx), m: tx / tl, s: len });   // m: +1 on the top rail, 0 at the tip, -1 on the bottom rail
  }
  const k = Math.max(1, Math.round(len / 8)) * 8 / len;          // stretch so the slats line up with the straight rails at both ends
  const w = 1.0;
  for (const p of pts) {
    const ph = (p.s * k) % 8, t = (p.m + 1) / 2;
    const ob = lerpN(-6.5, -9.5, t), ib = lerpN(7.5, 4.5, t);   // outer / inner bar (blends from the top-rail layout to the bottom-rail layout)
    g.save(); g.translate(p.x, p.y); g.rotate(p.ang);            // local x runs along the rail, local y points into the well
    if (ph >= 2 && ph < 6) {                                     // a slat: lit face on one side, dark edge on the other
      g.fillStyle = RC.slat; g.fillRect(0, ob + 2, w, ib - ob - 2);
      if (ph < 3) { g.fillStyle = RC.lit; g.fillRect(0, ob + 2, w, ib - ob - 2); }
      else if (ph >= 5) { g.fillStyle = RC.dark; g.fillRect(0, ob + 2, w, ib - ob - 2); }
    }
    g.fillStyle = RC.bar; g.fillRect(0, ob, w, 2); g.fillRect(0, ib, w, 2);
    g.fillStyle = RC.barShade; if (p.m >= 0) g.fillRect(0, ob + 2, w, 1); else g.fillRect(0, ib - 1, w, 1);
    if (p.m > 0.02) {                                            // steel base channel + shadow, on the side the straight rail has it
      g.fillStyle = '#8a9096'; g.fillRect(0, ib + 2, w, 3 * p.m);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, ib + 2 + 3 * p.m, w, 2 * p.m);
    } else if (p.m < -0.02) {
      const a = -p.m;
      g.fillStyle = '#8a9096'; g.fillRect(0, ob - 3 * a, w, 3 * a);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, ob - 5 * a, w, 2 * a);
    }
    g.restore();
  }
  const tip = pts.reduce((b, p) => (Math.abs(p.s - len / 2) < Math.abs(b.s - len / 2) ? p : b));
  g.save(); g.translate(tip.x, tip.y); g.rotate(tip.ang);        // one post at the tip of the curve
  g.fillStyle = RC.post; g.fillRect(-1.5, -9.5, 3, 19); g.fillStyle = RC.dark; g.fillRect(0.5, -9.5, 1, 19);
  g.restore();
  return c;
}
function drawEscalatorNose(x0, x1, y0, y1) {
  for (let ty = NOSE.ty; ty < NOSE.ty + NOSE.h; ty++) for (let tx = NOSE.tx; tx < NOSE.tx + NOSE.w; tx++) {
    if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
    drawTile('.', tx * TILE, ty * TILE, tx, ty, 0);              // fresh floor under the curve
  }
  if (!noseImg) noseImg = buildNose();
  ctx.drawImage(noseImg, NOSE.tx * TILE, NOSE.ty * TILE);
}

function drawTile(ch, px, py, tx, ty, time) {
  ctx.fillStyle = COLORS[ch];
  ctx.fillRect(px, py, TILE, TILE);
  if (ch === '.' && (tx + ty) % 2 === 0) {           // checker = stone tiles
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(px, py, TILE, TILE);
  } else if (ch === '~') {                           // moving ripple line
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(px + 4 + Math.sin(time * 2 + tx) * 4, py + 14, 16, 3);
  } else if (ch === 'h') {                           // leafy dots
    ctx.fillStyle = '#1f4d25';
    ctx.fillRect(px + 6, py + 6, 6, 6); ctx.fillRect(px + 18, py + 16, 6, 6);
  } else if (ch === '#') {
    ctx.fillStyle = '#44444d'; ctx.fillRect(px, py + TILE - 6, TILE, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(px + 10, py, 1, TILE - 6); ctx.fillRect(px + 21, py, 1, TILE - 6);   // board-formed concrete seams
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px + 11, py, 1, TILE - 6); ctx.fillRect(px + 22, py, 1, TILE - 6);
  } else if (ch === 'p' || ch === 'X' || ch === 'U') {  // path: stone slab seams
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
    if ((tx + ty) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, py, TILE, TILE); }
    if (ch !== 'p') drawArrow(ch === 'U' ? '\u2191' : (tx === 0 ? '\u2190' : (ty === rows - 1 ? '\u2193' : '\u2192')), px, py);   // X: west edge = left, bottom edge = down, otherwise right
  } else if (ch === 'R') {                            // railing: grey steel slats on a concrete parapet
    drawRail(px, py, tx, ty);
  } else if (ch === 'B') {                            // pool rim: light concrete with seams
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px, py, TILE, 2); ctx.fillRect(px, py, 2, TILE);
  } else if (ch === 'M' || ch === 'G') {              // restroom door with a sign: M = men, W = women
    ctx.fillStyle = '#44444d'; ctx.fillRect(px, py + TILE - 6, TILE, 6);
    ctx.fillStyle = ch === 'M' ? '#2f6fb5' : '#c2548c'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 3);
    ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 1; ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 4);
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(ch === 'M' ? 'M' : 'W', px + 11, py + 22);
  } else if (ch === 'g') {                            // grass: a few darker tufts
    if ((tx * 7 + ty * 13) % 4 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(px + 6 + (tx % 3) * 5, py + 8, 2, 4); ctx.fillRect(px + 20 - (ty % 3) * 4, py + 20, 2, 4);
    }
  } else if (ch === 'C') {                            // concrete bench
    drawBench(px, py, tx, ty);
  } else if (ch === 'T') {                            // tree in a grey planter box
    drawPlanter(px, py, tx, ty);
  } else if (ch === 'b') {                            // bush (walkable)
    drawBlobs(px, py, 1);
  } else if (ch === 'H' || ch === 'Y' || ch === 'Z') {   // planted areas: solid, with a pale guard rail on open edges
    drawPlanted(ch, px, py, tx, ty);
  } else if (ch === 'K') {                            // storage room block: roof edge on top, shadow below
    ctx.fillStyle = '#6a6a76'; ctx.fillRect(px, py, TILE, 3);
    ctx.fillStyle = '#3b3b45'; ctx.fillRect(px, py + TILE - 6, TILE, 6);
  } else if (ch === 'S') {                            // stairs: horizontal steps
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8 + 6, TILE, 2);
  } else if (ch === 'L') {                            // lift: two sliding door panels
    ctx.fillStyle = '#4d586b'; ctx.fillRect(px + 15, py + 4, 2, TILE - 4);
    ctx.fillStyle = '#aab6c9'; ctx.fillRect(px + 3, py + 8, 10, 3);
  } else if (ch === 'D') {                            // door with a knob
    ctx.fillStyle = '#6e4519'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 2);
    ctx.fillStyle = '#e0b04a'; ctx.fillRect(px + 22, py + 16, 4, 4);
  } else if (ch === 'E' || ch === 'F') {
    drawEscalator(ch, px, py, tx, ty, time);
  } else if (ch === 'W') {
    drawGlassFront(ctx, px, py, tx, ty);
  }
}

function drawArrow(glyph, px, py) {                   // exit marker on a path tile
  ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#7ed957';
  ctx.fillText(glyph, px + 8, py + 23);
}

function drawLabel(text, x, y) {
  ctx.font = '14px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(text, x, y);
}

export function render(game, time) {
  const { player, npc, debug } = game;
  updateCamera(player);
  ctx.clearRect(0, 0, VW, VH);
  if (skyline.any()) { ctx.fillStyle = '#a9b1b6'; ctx.fillRect(0, 0, VW, VH); }   // safety colour behind the skyline
  ctx.save();
  ctx.translate(-camera.x, -camera.y);               // everything below is in WORLD pixels
  drawSkyline(ctx, camera, VW, VH, time);            // the city beyond the rails (before the tiles, so the rail slats are see-through)

  // Only draw tiles that are on screen (cheap "culling"); max/min keep us inside the map when the camera slides past an edge
  const x0 = Math.max(0, Math.floor(camera.x / TILE)), x1 = Math.min(cols - 1, Math.floor((camera.x + VW) / TILE));
  const y0 = Math.max(0, Math.floor(camera.y / TILE)), y1 = Math.min(rows - 1, Math.floor((camera.y + VH) / TILE));
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      drawTile(getTile(tx, ty), tx * TILE, ty * TILE, tx, ty, time);
  if (zoneId === 'zone1') drawEscalatorNose(x0, x1, y0, y1);   // rounded end of the escalator railing
  drawGlassTops(ctx, time, camera, VW, VH);          // glass skylight + the students seen through it (after tiles, before characters)

  // Item (ID card): small white card with a bobbing motion
  for (const it of items) {
    if (it.collected) continue;
    const bob = Math.sin(time * 4) * 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(it.x * TILE + 8, it.y * TILE + 10 + bob, 16, 12);
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(it.x * TILE + 10, it.y * TILE + 12 + bob, 5, 5);
  }

  // Draw NPC and player in order of their feet (whoever is lower on screen is drawn on top)
  if (npc.zone !== zoneId) drawPlayer(player);        // NPC is in another zone
  else if (player.y + player.h < npc.footY) { drawPlayer(player); drawNPC(npc, player); }
  else { drawNPC(npc, player); drawPlayer(player); }

  if (debug) drawDebug(game);
  ctx.restore();

  // ---- HUD (screen space, not affected by camera) ----
  if (!intro.active) {
    drawQuestTracker(game.hasCard);
    ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText('[C] Credits', VW - 100, 24);
  }
  if (dialogue.active) drawDialogue();
  else if (game.hint && !intro.active) drawHint(game.hint);
  if (game.showCredits) drawCredits();
  const fade = Math.max(intro.fade, transition.alpha);   // intro fade-in OR zone-change fade
  if (fade > 0) {                                    // drawn last = covers everything
    ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, VW, VH);
  }
}

function drawDebug({ player, npc }) {
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, heightPx); ctx.stroke(); }
  for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(widthPx, y * TILE); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,0,0,0.3)';
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++)
    if (isSolid(tx, ty)) ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
  ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;       // player hitbox
  ctx.strokeRect(player.x, player.y, player.w, player.h);
  if (npc.zone === zoneId) {
    ctx.strokeStyle = '#ff0';                        // NPC talk range
    ctx.beginPath(); ctx.arc(npc.cx, npc.cy, npc.talkRange, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawQuestTracker(hasCard) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10, 10, 330, 44);
  ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ffd54f'; ctx.fillText('QUEST: Lost ID Card', 18, 28);
  ctx.font = '13px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(quest.trackerText, 18, 46);
}

function drawDialogue() {
  const h = 110, y = VH - h - 10;
  ctx.fillStyle = 'rgba(15,15,30,0.92)'; ctx.fillRect(10, y, VW - 20, h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(10, y, VW - 20, h);
  ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ffd54f'; ctx.fillText(dialogue.speaker, 26, y + 28);
  ctx.font = '16px monospace'; ctx.fillStyle = '#fff';
  // simple word-wrap so long lines don't run off the box
  let line = '', ly = y + 56;
  for (const word of dialogue.text.split(' ')) {
    if (ctx.measureText(line + word).width > VW - 70) { ctx.fillText(line, 26, ly); line = ''; ly += 22; }
    line += word + ' ';
  }
  ctx.fillText(line, 26, ly);
  ctx.font = '12px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText('[E] next', VW - 90, y + h - 12);
}

function drawHint(text) {                             // small bar at the bottom of the screen
  ctx.font = '14px monospace';
  const w = ctx.measureText(text).width + 24;
  const x = (VW - w) / 2, y = VH - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = '#7ed957'; ctx.fillText(text, x + 12, y + 19);
}

// ---- Animated escalator (top-down, pixel style) ----------------------------
// E (arrival) moves WEST, F moves EAST. Steps are vertical ridges that slide along the belt
// at escalator.speed (same speed as the intro rider, so he stands still on the belt).
function drawEscalator(ch, px, py, tx, ty, time) {
  const dir = ch === 'E' ? -1 : 1;
  const shift = (((dir * Math.floor(time * escalator.speed)) % 8) + 8) % 8;   // whole pixels = crisp

  ctx.save();                                            // clip so sliding ridges never leak onto neighbour tiles
  ctx.beginPath(); ctx.rect(px, py, TILE, TILE); ctx.clip();

  // belt base + handrail strips (top and bottom) + yellow safety lines
  ctx.fillStyle = '#5c5c66'; ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#2a2a31'; ctx.fillRect(px, py, TILE, 5); ctx.fillRect(px, py + TILE - 5, TILE, 5);
  ctx.fillStyle = '#e0a030'; ctx.fillRect(px, py + 5, TILE, 2); ctx.fillRect(px, py + TILE - 7, TILE, 2);

  // moving handrail dashes (travel with the steps)
  ctx.fillStyle = '#4a4a54';
  for (let k = -1; k < 4; k++) {
    const x = px + k * 8 + shift;
    ctx.fillRect(x, py + 1, 4, 2); ctx.fillRect(x, py + TILE - 3, 4, 2);
  }

  // step ridges: dark groove + light edge, 8px apart
  for (let k = -1; k < 4; k++) {
    const x = px + k * 8 + shift;
    ctx.fillStyle = '#3a3a43'; ctx.fillRect(x, py + 7, 2, TILE - 14);
    ctx.fillStyle = '#7d7d8a'; ctx.fillRect(x + 2, py + 7, 2, TILE - 14);
  }

  const isEsc = (c) => c === 'E' || c === 'F';
  // west end: flat "comb plate" where the steps flatten out
  if (!isEsc(getTile(tx - 1, ty))) {
    ctx.fillStyle = '#8f8f9c'; ctx.fillRect(px, py + 7, 6, TILE - 14);
    ctx.fillStyle = '#55555f';
    for (let i = 0; i < TILE - 14; i += 4) ctx.fillRect(px, py + 7 + i, 6, 1);
  }
  // east end: dark hatch where the steps go into / come out of the floor
  if (!isEsc(getTile(tx + 1, ty))) {
    const hx = px + TILE - escalator.hatchW;
    ctx.fillStyle = '#23262b'; ctx.fillRect(hx, py, escalator.hatchW, TILE);
    ctx.fillStyle = '#f2c230'; ctx.fillRect(hx - 2, py + 5, 2, TILE - 10);   // yellow safety lip
  }
  ctx.restore();
}

function drawNPC(npc, player) {                       // NPC: drawn from its own spritesheet
  if (!drawCharacter(ctx, npc, 'npc')) {             // sheet not loaded yet -> orange box fallback
    ctx.fillStyle = '#ff9800'; ctx.fillRect(npc.x + 6, npc.y + 4, 20, 26);
    ctx.fillStyle = '#ffe0b2'; ctx.fillRect(npc.x + 10, npc.y + 6, 12, 10);
  }
  if (npc.isNear(player) && !dialogue.active) drawLabel('[E] Talk', npc.x - 6, npc.footY - 44);
}

function drawPlayer(player) {
  ctx.save();
  if (intro.active) {                                // during the ride, hide everything east of the hatch
    ctx.beginPath(); ctx.rect(0, 0, escalator.hatchLeft, heightPx); ctx.clip();
  }
  const lean = skyline.bodyShift();                  // leaning out: the sprite shifts a few px toward the rail
  ctx.translate(lean.x, lean.y);
  if (!drawCharacter(ctx, player)) {                 // sprite not loaded yet -> blue box fallback
    const sx = player.cx - 16, sy = player.cy - 22;
    ctx.fillStyle = '#1976d2'; ctx.fillRect(sx + 6, sy + 8, 20, 24);
    ctx.fillStyle = '#ffe0b2'; ctx.fillRect(sx + 10, sy + 10, 12, 10);
  }
  ctx.restore();
  // Walking in a bush: draw the bush leaves again over the player's feet so he looks "inside" it
  const ftx = Math.floor(player.cx / TILE), fty = Math.floor((player.y + player.h - 1) / TILE);
  if (!intro.active && getTile(ftx, fty) === 'b') drawBlobs(ftx * TILE, fty * TILE, 0.9);
}

// ---- Credits screen (press C). LPC art REQUIRES visible credits, so keep this! ----
function wrap(text, x, y, maxW, lineH) {
  let line = '';
  for (const word of text.split(' ')) {
    if (ctx.measureText(line + word).width > maxW) { ctx.fillText(line, x, y); line = ''; y += lineH; }
    line += word + ' ';
  }
  ctx.fillText(line, x, y);
  return y + lineH;
}
function drawCredits() {
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, VW, VH);
  ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#ffd54f'; ctx.fillText('CREDITS', 30, 44);
  ctx.font = '14px monospace'; ctx.fillStyle = '#fff';
  let y = 78;
  y = wrap('Game: [YOUR NAMES HERE] - BRAC University, Dept. of CSE', 30, y, VW - 60, 20) + 8;
  y = wrap('Character sprite: made with the Universal LPC Spritesheet Character Generator.', 30, y, VW - 60, 20) + 8;
  y = wrap('Sprites contributed as part of the Liberated Pixel Cup project from OpenGameArt.org: http://opengameart.org/content/lpc-collection', 30, y, VW - 60, 20) + 8;
  y = wrap('License: Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA 3.0) http://creativecommons.org/licenses/by-sa/3.0/', 30, y, VW - 60, 20) + 8;
  y = wrap('Detailed per-artist credits: see CREDITS.md and assets/character-credits.txt', 30, y, VW - 60, 20);
  ctx.fillStyle = '#aaa'; ctx.fillText('[C] close', 30, VH - 24);
}