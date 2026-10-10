// map.js - loads ONE zone at a time from zones.js into a 2D array.
// Other files import cols/rows/items/spawn... as "live bindings", so they update automatically
// when loadZone() switches zones.
import { ZONES } from './zones.js';
export const TILE = 32;

export let zoneId = 'zone1';                 // which zone is loaded right now
export let cols = 0, rows = 0, widthPx = 0, heightPx = 0;
export const grid = [];                      // grid[y][x] = a single tile character
export let spawn = { x: 1, y: 1 };
export let npcSpawn = { x: 2, y: 2 };
export let items = [];                       // [{x, y, collected}] in tile coordinates
const itemCache = {};                        // keeps the ID card "collected" when you leave and come back

export function loadZone(id) {
  const zone = ZONES[id];
  const text = zone.rows;
  if (text.some((r) => r.length !== text[0].length))
    throw new Error(`Zone "${id}": every row must be the same length (check for a missing or extra character)`);
  zoneId = id;
  cols = text[0].length; rows = text.length;
  widthPx = cols * TILE; heightPx = rows * TILE;
  spawn = zone.spawn ?? { x: 1, y: 1 };
  grid.length = 0;
  const found = [];
  // Parse the text: P/N/I are "markers", so we store the floor under them.
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      let ch = text[y][x];
      if (ch === 'P') { spawn = { x, y }; ch = '.'; }
      else if (ch === 'N') { npcSpawn = { x, y }; ch = '.'; }
      else if (ch === 'I') { found.push({ x, y, collected: false }); ch = '.'; }
      grid[y][x] = ch;
    }
  }
  if (!itemCache[id]) itemCache[id] = found;
  items = itemCache[id];
}
loadZone('zone1');                           // the game starts in zone 1

export function getTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return '#'; // outside = wall
  return grid[ty][tx];
}
export const isSolid = (tx, ty) => '#RLDvEFB~MGKCTWHYZJQaoc'.includes(getTile(tx, ty));   // H = hedge, Y = bush mound, Z = tree, J = gym door, Q = gym poster wall, c = pillar (all solid)

// Exit info for a tile of the current zone (or null)
export const getExit = (tx, ty) => ZONES[zoneId].exits?.[tx + ',' + ty] ?? null;

export function getExitHint(tx, ty) {
  const e = getExit(tx, ty);
  if (e && !e.to) return e.label + ' - leads to another zone (coming soon)';
  return null;
}

// Does a pixel-space box overlap any solid tile? (the core of AABB tile collision)
export function boxHitsSolid(x, y, w, h) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      if (isSolid(tx, ty)) return true;
  return false;
}
// Nearest bench tile ('C') close enough to sit on, or null. `facing` = the open side of the bench, i.e. the way a
// person sits (looking away from the planter, towards the side the player walked up from).
export function findSeat(cx, cy) {
  const tx0 = Math.floor(cx / TILE), ty0 = Math.floor(cy / TILE);
  let best = null, bestD = 46;
  for (let ty = ty0 - 2; ty <= ty0 + 2; ty++) for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
    if (getTile(tx, ty) !== 'C') continue;
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2, d = Math.hypot(cx - x, cy - y);
    if (d >= bestD) continue;
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    dirs.sort((a, b) => (b[1] * (cx - x) + b[2] * (cy - y)) - (a[1] * (cx - x) + a[2] * (cy - y)));   // side the player is on first
    const open = (d) => !isSolid(tx + d[1], ty + d[2]);
    best = { tx, ty, x, y, facing: (dirs.find(open) ?? dirs[0])[0] }; bestD = d;
  }
  return best;
}