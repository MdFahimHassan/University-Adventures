// transition.js - black fade between zones: fade OUT -> swap zone -> fade IN.
import { TILE, loadZone } from './map.js';

const FADE = 0.35;   // seconds for each half. Make it bigger for a slower fade.

export const transition = {
  active: false,
  phase: 'out',      // 'out' = screen going black, 'in' = black clearing
  t: 0,
  exit: null,        // the exit object from zones.js we are travelling through

  start(exit) {
    if (this.active) return;
    this.active = true; this.phase = 'out'; this.t = 0; this.exit = exit;
  },

  update(dt, player) {
    this.t += dt;
    if (this.phase === 'out' && this.t >= FADE) {
      loadZone(this.exit.to);                                   // screen is fully black: swap the zone
      const s = this.exit.spawn;
      player.x = s.x * TILE + (TILE - player.w) / 2;            // put the player on the arrival tile
      player.y = s.y * TILE + (TILE - player.h) / 2;
      player.facing = this.exit.facing ?? 'down';
      player.moving = false; player.animTime = 0;
      this.phase = 'in'; this.t = 0;
    } else if (this.phase === 'in' && this.t >= FADE) {
      this.active = false;
    }
  },

  // 0 = clear, 1 = fully black
  get alpha() {
    if (!this.active) return 0;
    const k = Math.min(1, this.t / FADE);
    return this.phase === 'out' ? k : 1 - k;
  },
};