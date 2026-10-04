// sprites.js - draws characters from LPC spritesheets (64x64 frames).
// Both sheets use the same layout, so ONE draw function handles the player AND the NPC.
// WALK animation = rows 8-11 (one row per direction), 9 frames each.
// Frame 0 = standing still, frames 1-8 = the walking cycle.
const FRAME = 64;                                   // frame size in the sheet
const WALK_ROW = { up: 8, left: 9, down: 10, right: 11 };
const WALK_FPS = 12;                                // walking animation speed
const FEET_X = 32, FEET_Y = 56;                     // where the feet are inside a 64x64 frame
const SCALE = 0.75;   // 1 = original 64px, 0.5 = 32px. 

// Load each sheet once. Paths are relative to index.html.
function load(src) { const img = new Image(); img.src = src; return img; }
const sheets = {
  player: load('assets/character-spritesheet.png'),
  npc:    load('assets/npc-spritesheet.png'),
};

// Draws one character. `who` needs: cx (feet x), facing, moving, animTime and footY (or y + h).
// `which` picks the sheet: 'player' or 'npc'.
// Returns true if it drew the sprite, false if the image isn't loaded yet (caller draws a fallback box).
export function drawCharacter(ctx, who, which = 'player') {
  const sheet = sheets[which];
  if (!sheet.complete || sheet.naturalWidth === 0) return false;
  const frame = who.moving ? 1 + (Math.floor(who.animTime * WALK_FPS) % 8) : 0;
  const row = WALK_ROW[who.facing] ?? WALK_ROW.down;
  const footY = who.footY ?? (who.y + who.h);       // players use their hitbox bottom
  const size = FRAME * SCALE;                       // drawn size on screen
  const dx = Math.round(who.cx - FEET_X * SCALE);   // feet stay at the bottom-center
  const dy = Math.round(footY - FEET_Y * SCALE);
  ctx.drawImage(sheet, frame * FRAME, row * FRAME, FRAME, FRAME, dx, dy, size, size);
  return true;
}