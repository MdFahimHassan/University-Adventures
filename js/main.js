// main.js - creates everything and runs the game loop.
import { spawn, npcSpawn, items, getExitHint, getExit, zoneId, TILE } from './map.js';
import { transition } from './transition.js';
import { input } from './input.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { dialogue } from './dialogue.js';
import { quest } from './quest.js';
import { render } from './renderer.js';
import { intro } from './intro.js';

const game = {
  player: new Player(spawn.x, spawn.y),
  npc: new NPC(npcSpawn.x, npcSpawn.y),
  debug: false,
  showCredits: false,   // press C to toggle the credits screen
  hint: null,          // text shown when standing on an exit/stairs tile
};

function update(dt) {
  if (input.wasPressed('F3')) game.debug = !game.debug;
  if (input.wasPressed('KeyC')) game.showCredits = !game.showCredits;
  if (game.showCredits) return;                       // game is paused while credits are open

  // Opening cutscene: player is script-controlled. E or Space skips it.
  if (intro.active) {
    if (input.wasPressed('KeyE') || input.wasPressed('Space')) intro.skip(game.player);
    else intro.update(dt, game.player);
    return;                                          // nothing else runs during the intro
  }

  // Zone change: the fade runs, player can't move
  if (transition.active) { transition.update(dt, game.player); game.hint = null; return; }

  const npcHere = game.npc.zone === zoneId;          // the NPC lives in zone 1 only

  if (dialogue.active) {
    // while talking: E advances text, player can't move
    if (input.wasPressed('KeyE')) dialogue.advance();
  } else if (input.wasPressed('KeyE') && npcHere && game.npc.isNear(game.player)) {
    const t = quest.talk();
    dialogue.start(game.npc.name, t.lines, t.next);
  }
  game.player.update(dt, !dialogue.active);
  if (npcHere) game.npc.facePlayer(game.player);     // NPC turns to look at you when you're near
  const tx = Math.floor(game.player.cx / TILE), ty = Math.floor(game.player.cy / TILE);
  const exit = getExit(tx, ty);
  if (exit && exit.to) { transition.start(exit); return; }   // stepped on an exit tile -> fade to the next zone
  game.hint = getExitHint(tx, ty);

  // Pick up the ID card by walking over it (only once the quest asks for it)
  if (quest.state === 'find') {
    for (const it of items) {
      if (!it.collected && Math.hypot(game.player.cx - (it.x * 32 + 16), game.player.cy - (it.y * 32 + 16)) < 24) {
        it.collected = true;
        quest.state = 'return';
        dialogue.start('You', ['You found an ID card! Better take it back to the student.']);
      }
    }
  }
}

// Game loop with delta time: dt = seconds since last frame.
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // clamp so a lag spike can't teleport you through walls
  last = now;
  update(dt);
  render(game, now / 1000);
  input.endFrame();                                // clear "pressed this frame" keys
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);