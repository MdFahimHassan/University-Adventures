// renderer.js - ALL drawing lives here. Game logic never touches the canvas.
import { TILE, cols, rows, widthPx, heightPx, getTile, isSolid, items, zoneId } from './map.js';
import { transition } from './transition.js';
import { quest } from './quest.js';
import { dialogue } from './dialogue.js';
import { intro, escalator } from './intro.js';
import { drawCharacter } from './sprites.js';
import { drawGlassFront, drawGlassTops } from './glass.js';

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
  'C': '#c9b583', 'T': '#6b5a3a', 'b': '#4a9a4a',   // bench, tree (on soil), bush
  'M': '#5b5b66', 'G': '#5b5b66',       // restroom doors (wall colour, door drawn on top)
  'W': '#2f3b43',                       // glass skylight: the dark floor you see through it (drawn in drawGlass)
};

function updateCamera(player) {
  // center on player, then clamp so we never show outside the map
  camera.x = Math.max(0, Math.min(player.cx - VW / 2, widthPx - VW));
  camera.y = Math.max(0, Math.min(player.cy - VH / 2, heightPx - VH));
  camera.x = Math.round(camera.x); camera.y = Math.round(camera.y); // avoids seams
}

function drawBlobs(px, py, a) {                       // two leafy bush blobs (a = opacity)
  ctx.globalAlpha = a;
  ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.ellipse(px + 10, py + 19, 8, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.ellipse(px + 22, py + 14, 8, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66bb6a'; ctx.fillRect(px + 12, py + 9, 5, 3);
  ctx.globalAlpha = 1;
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
  } else if (ch === 'p' || ch === 'X' || ch === 'U') {  // path: stone slab seams
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
    if ((tx + ty) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, py, TILE, TILE); }
    if (ch !== 'p') drawArrow(ch === 'U' ? '\u2191' : (tx === 0 ? '\u2190' : (ty === rows - 1 ? '\u2193' : '\u2192')), px, py);   // X: west edge = left, bottom edge = down, otherwise right
  } else if (ch === 'R') {                            // railing: two rails + posts
    ctx.fillStyle = '#6e6c66';
    ctx.fillRect(px, py + 8, TILE, 3); ctx.fillRect(px, py + 18, TILE, 3);
    ctx.fillRect(px + 2, py + 6, 3, 18); ctx.fillRect(px + 27, py + 6, 3, 18);
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
  } else if (ch === 'C') {                            // stone bench: sandy seat with a darker front edge
    ctx.fillStyle = '#d8c79b'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = '#a8946a'; ctx.fillRect(px, py + TILE - 5, TILE, 5);
  } else if (ch === 'T') {                            // small tree on soil
    ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(px + 16, py + 16, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(px + 13, py + 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d4037'; ctx.fillRect(px + 14, py + 14, 5, 5);
  } else if (ch === 'b') {                            // bush (walkable)
    drawBlobs(px, py, 1);
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
  ctx.save();
  ctx.translate(-camera.x, -camera.y);               // everything below is in WORLD pixels

  // Only draw tiles that are on screen (cheap "culling")
  const x0 = Math.floor(camera.x / TILE), x1 = Math.min(cols - 1, Math.floor((camera.x + VW) / TILE));
  const y0 = Math.floor(camera.y / TILE), y1 = Math.min(rows - 1, Math.floor((camera.y + VH) / TILE));
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      drawTile(getTile(tx, ty), tx * TILE, ty * TILE, tx, ty, time);
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