// player.js - position, movement, and X/Y-separated collision.
import { TILE, boxHitsSolid, widthPx, heightPx } from './map.js';
import { input } from './input.js';

export class Player {
  constructor(tx, ty) {
    this.w = 20; this.h = 20;               // hitbox is smaller than the 32px sprite
    this.x = tx * TILE + (TILE - this.w) / 2; // x,y = top-left of the HITBOX
    this.y = ty * TILE + (TILE - this.h) / 2;
    this.speed = 120;                        // pixels PER SECOND (not per frame!)
    this.facing = 'down';                    // 'up' | 'left' | 'down' | 'right' (which sprite row to draw)
    this.moving = false;                     // true while actually walking (plays the walk cycle)
    this.animTime = 0;                       // seconds spent walking (drives the animation frame)
    this.sitting = false;                    // true while sitting on a bench
    this.sitTime = 0;                        // seconds spent sitting (so a held walk key doesn't stand you up instantly)
    this.preSit = null;                      // where we stood before sitting (we go back there when standing up)
  }
  // Sit on a bench tile found by findSeat(): the sprite's sitting pose is drawn by sprites.js
  sitDown(seat) {
    this.preSit = { x: this.x, y: this.y };
    this.sitting = true; this.sitTime = 0; this.moving = false; this.animTime = 0;
    this.facing = seat.facing;
    this.x = seat.x - this.w / 2;
    this.y = seat.y - this.h / 2 + 1;        // +1: nudge so the seated sprite rests on the seat
  }
  standUp() {
    this.sitting = false;
    if (this.preSit) { this.x = this.preSit.x; this.y = this.preSit.y; }
  }
  get cx() { return this.x + this.w / 2; }   // center, handy for distance checks
  get cy() { return this.y + this.h / 2; }

  update(dt, canMove) {
    if (!canMove) { this.moving = false; this.animTime = 0; return; }   // frozen during dialogue
    let dx = (input.right() ? 1 : 0) - (input.left() ? 1 : 0);
    let dy = (input.down() ? 1 : 0) - (input.up() ? 1 : 0);
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; } // diagonal isn't faster

    const ox = this.x, oy = this.y;           // remember where we started (to know if we really moved)
    if (dx < 0) this.facing = 'left'; else if (dx > 0) this.facing = 'right';
    else if (dy < 0) this.facing = 'up'; else if (dy > 0) this.facing = 'down';

    // --- X axis first: move, then undo overlap ---
    this.x += dx * this.speed * dt;
    if (boxHitsSolid(this.x, this.y, this.w, this.h)) {
      // snap flush against the tile edge we ran into
      if (dx > 0) this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w;
      else if (dx < 0) this.x = (Math.floor(this.x / TILE) + 1) * TILE;
    }
    // --- then Y axis: doing them separately lets you SLIDE along walls ---
    this.y += dy * this.speed * dt;
    if (boxHitsSolid(this.x, this.y, this.w, this.h)) {
      if (dy > 0) this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h;
      else if (dy < 0) this.y = (Math.floor(this.y / TILE) + 1) * TILE;
    }

    // walking animation only plays if we actually moved (not when pushing against a wall)
    this.moving = Math.hypot(this.x - ox, this.y - oy) > 0.01;
    this.animTime = this.moving ? this.animTime + dt : 0;
  }
}