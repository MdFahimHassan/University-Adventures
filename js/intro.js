// intro.js - the opening cutscene: the player rides the escalator up from the
// floor below, the screen fades in, then he steps off onto the landing.
// It finds the escalator by scanning the map for 'E' tiles, so if you move or
// resize the escalator in map.js, nothing here needs to change.
// (This escalator runs WEST: the steps come out of a hatch at its EAST end.)
import { TILE, grid, rows, cols, spawn } from './map.js';

// --- find the 'E' escalator: its row, and its west (left) / east (right) end columns ---
let row = 0, left = Infinity, right = -1;
for (let y = 0; y < rows; y++)
  for (let x = 0; x < cols; x++)
    if (grid[y][x] === 'E') { row = y; left = Math.min(left, x); right = Math.max(right, x); }
if (right < 0) { left = 1; right = 1; }          // no 'E' in the map: don't crash, just use a dummy

// --- timings (seconds). Tweak these to taste! ---
const RIDE_TIME = 3.4;   // how long the ride lasts
const STEP_TIME = 0.7;   // walking off the end
const FADE_TIME = 1.8;   // black -> clear
const HATCH_W = 10;      // width in pixels of the dark hatch at the east end

// Positions in WORLD pixels (x = along the escalator, y = its row).
const hatchLeft = (right + 1) * TILE - HATCH_W;  // anything east of this is hidden by the hatch
const startX = hatchLeft + 20;                   // start fully hidden behind the hatch
const endX = left * TILE + TILE / 2;             // west end of the belt
const centerY = row * TILE + TILE / 2;

export const escalator = {
  row, left, right, hatchLeft, hatchW: HATCH_W,
  speed: (startX - endX) / RIDE_TIME,            // px/sec; the belt stripes use this too, so they match the rider
};

export const intro = {
  active: true,
  t: 0,
  // 1 = fully black, 0 = clear
  get fade() { return Math.max(0, 1 - this.t / FADE_TIME); },

  update(dt, player) {
    this.t += dt;
    player.facing = 'left';                                          // we travel west
    if (this.t < RIDE_TIME) {
      player.moving = false; player.animTime = 0;                    // standing still on the belt
      const cx = startX + (endX - startX) * (this.t / RIDE_TIME);   // linear = steady belt
      place(player, cx, centerY);
    } else if (this.t < RIDE_TIME + STEP_TIME) {
      player.moving = true; player.animTime += dt;                   // walk off the end
      const k = (this.t - RIDE_TIME) / STEP_TIME;
      const e = k * k * (3 - 2 * k);                                 // smoothstep ease
      const goalX = spawn.x * TILE + TILE / 2, goalY = spawn.y * TILE + TILE / 2;
      place(player, endX + (goalX - endX) * e, centerY + (goalY - centerY) * e);
    } else {
      this.skip(player);
    }
  },

  // Jump straight to the end (also called when the cutscene finishes naturally)
  skip(player) {
    place(player, spawn.x * TILE + TILE / 2, spawn.y * TILE + TILE / 2);
    player.facing = 'left'; player.moving = false; player.animTime = 0;
    this.active = false;
    this.t = FADE_TIME;
  },
};

// Put the player's HITBOX so its center is at (cx, cy)
function place(p, cx, cy) { p.x = cx - p.w / 2; p.y = cy - p.h / 2; }