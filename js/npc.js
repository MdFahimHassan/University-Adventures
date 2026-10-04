// npc.js - a standing student. Data + "am I close enough?" + turning to face the player.
import { TILE } from './map.js';

export class NPC {
  constructor(tx, ty) {
    this.x = tx * TILE; this.y = ty * TILE;  // top-left of the 32x32 tile
    this.name = 'Tanvir';
    this.talkRange = 48;                     // pixels
    // The fields below are what sprites.js needs to draw a character
    this.facing = 'down';
    this.moving = false;                     // the NPC just stands (idle frame)
    this.animTime = 0;
  }
  get cx() { return this.x + TILE / 2; }
  get cy() { return this.y + TILE / 2; }
  get footY() { return this.y + TILE / 2 + 10; }   // where the feet are (same spot as a player standing in this tile)

  isNear(player) {
    return Math.hypot(player.cx - this.cx, player.cy - this.cy) < this.talkRange;
  }

  // Turn toward the player when close, otherwise look down (toward the camera)
  facePlayer(player) {
    if (!this.isNear(player)) { this.facing = 'down'; return; }
    const dx = player.cx - this.cx, dy = player.cy - this.cy;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else this.facing = dy < 0 ? 'up' : 'down';
  }
}