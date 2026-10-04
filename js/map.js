// map.js - the text grid, parsed into a 2D array. EDIT THE MAP HERE.
// ZONE 1: the rooftop entry zone (escalators, lifts, stairs, store room doors).
export const TILE = 32;

// Legend (walkable = you can stand on it, solid = blocks the player)
//   #  wall                      (solid)
//   R  railing                   (solid)
//   .  open stone floor          (walkable)
//   p  path                      (walkable)   <- lowercase p. Uppercase P is the spawn marker!
//   S  stairs up to other zone   (walkable, transition coming later)
//   X  west exit path            (walkable, transition coming later)
//   U  north "up" path           (walkable, transition coming later)
//   L  lift                      (solid for now, interactable later)
//   D  store room door           (solid for now, interactable later)
//   E  escalator E1 = ARRIVAL, steps move WEST (solid, animated). The intro cutscene rides it.
//   F  escalator E2 = going down, steps move EAST (solid, animated)
//   (the east end of each escalator is the hatch where steps come out of / go into the floor)
//   v  escalator well / drop     (solid)
// Markers (replaced by floor when parsed): P player spawn (where the intro ends), N npc spawn, I item (ID card)
// Every row MUST be exactly 30 characters, and there must be 18 rows.
const MAP_TEXT = [
"#..USSSSSSSSSSSS.U#DD########R",
"#..pSppppppppppS.ppppp.......R",
"#..ppppppppppppppppppppppppp.R",
"#......pp...............pp...R",
"#......pp...............pp...R",
"Xpppppppp...............pp...R",
"#..ppppppppppppppppppppppppp.R",
"#LLppppppRRRRRRRRRRRRRRRpp...R",
"#......pp...PEEEEEvvvvvRpp...R",
"#.....NppRRRRvvvvvvvvvvRpp...R",
"#......pp....FFFFFvvvvvRpp...R",
"#LLppppppRRRRRRRRRRRRRRRpp...R",
"#..ppppppppppppppppppppppppp.R",
"Xpppppp......................R",
"#............................R",
"#.........................I..R",
"#............................R",
"RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
];

export const cols = MAP_TEXT[0].length;
export const rows = MAP_TEXT.length;
export const widthPx = cols * TILE;
export const heightPx = rows * TILE;

export const grid = [];      // grid[y][x] = a single tile character
export let spawn = { x: 1, y: 1 };
export let npcSpawn = { x: 2, y: 2 };
export const items = [];     // [{x, y, collected}] in tile coordinates

// Parse the text: P/N/I are "markers", so we store the floor under them.
for (let y = 0; y < rows; y++) {
  grid[y] = [];
  for (let x = 0; x < cols; x++) {
    let ch = MAP_TEXT[y][x];
    if (ch === 'P') { spawn = { x, y }; ch = '.'; }
    else if (ch === 'N') { npcSpawn = { x, y }; ch = '.'; }
    else if (ch === 'I') { items.push({ x, y, collected: false }); ch = '.'; }
    grid[y][x] = ch;
  }
}

export function getTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return '#'; // outside = wall
  return grid[ty][tx];
}
export const isSolid = (tx, ty) => '#RLDvEF'.includes(getTile(tx, ty));

// Exits to other zones. Not wired up yet - for now we just show a hint.
// Key = "x,y" of the tile. Add the real zone names here when those zones exist.
const EXIT_LABELS = {
  '0,5': 'Right path',
  '0,13': 'Left path',
  '3,0': 'Up path (left)',
  '17,0': 'Up path (right)',
};
export function getExitHint(tx, ty) {
  const label = EXIT_LABELS[tx + ',' + ty];
  if (label) return label + ' - leads to another zone (coming soon)';
  if (getTile(tx, ty) === 'S') return 'Stairs - lead up to the lawn (coming soon)';
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