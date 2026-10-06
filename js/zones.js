// zones.js - ALL zone maps live here. To add a zone, copy a block and give it a new id.
// Every row of a zone must be the SAME length. Markers (P spawn, N npc, I item) become floor when parsed.
//
// Tiles shared by all zones:
//   #  wall (solid)        R  railing (solid)      .  open floor        p  path (walkable)
//   X  exit path           U  "up" path            S  stairs            D  store room door (solid)
//   L  lift (solid)        E/F escalators (solid, animated)             v  escalator well (solid)
// New in zone 3:
//   g  grass (walkable lawn)   K  storage room block (solid)   S on the bottom row = stairs down to zone 1
// New in zone 2:
//   B  pool rim (solid)    ~  water (solid)        M  men's restroom door (solid)   G  women's restroom door (solid)
//
// exits: key is "x,y" of the exit tile.
//   to      = zone to fade into        spawn  = tile where the player appears there (NOT an exit tile!)
//   facing  = direction the player looks on arrival     label = text shown for exits that don't lead anywhere yet
export const ZONES = {
  zone1: {
    name: 'Rooftop Entry',
    rows: [
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
    ],
    exits: {
      '0,5':  { to: 'zone2', spawn: { x: 28, y: 4 },  facing: 'left', label: 'Right path' },
      '0,13': { to: 'zone2', spawn: { x: 28, y: 13 }, facing: 'left', label: 'Left path' },
      '3,0':  { to: 'zone3', spawn: { x: 2, y: 16 },  facing: 'up', label: 'Up path (left)' },
      '17,0': { to: 'zone3', spawn: { x: 27, y: 16 }, facing: 'up', label: 'Up path (right)' },
    },
  },

  zone2: {
    name: 'Pool Zone',
    spawn: { x: 28, y: 4 },
    rows: [
    "##U###################MM######",
    "R.p....................pp....#",
    "R.p....................pp....#",
    "R.p..pppppppppppppppppppp....#",
    "R.p..pBBBBBBBBBBBBBBBBBBpppppX",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "R.p..pB~~~~~~~~~~~~~~~~Bp....#",
    "DpppppBBBBBBBBBBBBBBBBBBpppppX",
    "Dpppppppppppppppppppppppp....#",
    "R.....................ppp....#",
    "R.....................ppp....#",
    "######################GG######",
    ],
    exits: {
      '29,4':  { to: 'zone1', spawn: { x: 1, y: 5 },  facing: 'right', label: 'Right path' },
      '29,13': { to: 'zone1', spawn: { x: 1, y: 13 }, facing: 'right', label: 'Left path' },
      '2,0':   { label: 'Upper zone' },
    },
  },

  zone3: {
    name: 'Lawn Zone',
    spawn: { x: 14, y: 16 },
    rows: [
      "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "RppppppppppppppppppppppppppppR",
      "RDpBBBBBBBBBBBBBBBBBBBBBBBBppR",
      "RKpBggggggggggggggggggggggBpDR",
      "RKpBggggggggggggggggggggggBpKR",
      "XppBggggggggggggggggggggggBpKR",
      "R.pBggggggggggggggggggggggBpKR",
      "R.pBggggggggggggggggggggggBpKR",
      "R.pBggggggggggggggggggggggBp.R",
      "R.pBggggggggggggggggggggggBp.R",
      "RKpBggggggggggggggggggggggBp.R",
      "RKpBggggggggggggggggggggggBp.R",
      "RKpBggggggggggggggggggggggBp.R",
      "RDpBggggggggggggggggggggggBp.R",
      "XppBggggggggggggggggggggggBp.R",
      "R.pBggggggggggggggggggggggBp.R",
      "R.pBBggggggggggggggggggggBBp.R",
      "R.XXXSSSSSSSSSSSSSSSSSSSSXXX.R",
    ],
    exits: {
      // west paths to zone 4 (not built yet, so they only show a hint)
      '0,5':  { label: 'West path (upper)' },
      '0,14': { label: 'West path (lower)' },
      // bottom row: left path (x 2-4), stairs (x 5-24) and right path (x 25-27) lead down to zone 1.
      // The stairs and the stairs exits in zone 1 are generated below.
    },
  },
};

// ---- Zone 3 <-> zone 1 links -------------------------------------------------------------
// Left path: zone 3 (x 2-4, bottom row) -> zone 1 left up path (3,1). Right path: x 25-27 -> (17,1).
for (const x of [2, 3, 4])    ZONES.zone3.exits[x + ',17'] = { to: 'zone1', spawn: { x: 3,  y: 1 }, facing: 'down', label: 'Left path' };
for (const x of [25, 26, 27]) ZONES.zone3.exits[x + ',17'] = { to: 'zone1', spawn: { x: 17, y: 1 }, facing: 'down', label: 'Right path' };

// Stairs: zone 3 has 20 stair tiles (x 5-24); zone 1 has 12 (x 4-15 on the top row).
// We map position across the stairs proportionally, so you arrive roughly where you left.
for (let x = 5; x <= 24; x++)
  ZONES.zone3.exits[x + ',17'] = { to: 'zone1', spawn: { x: 5 + Math.round((x - 5) * 9 / 19), y: 1 }, facing: 'down', label: 'Stairs' };
for (let x = 4; x <= 15; x++) {
  const sx = Math.min(14, Math.max(5, x));                       // x of the arrival tile in zone 1 (5-14)
  ZONES.zone1.exits[x + ',0'] = { to: 'zone3', spawn: { x: 5 + Math.round((sx - 5) * 19 / 9), y: 16 }, facing: 'up', label: 'Stairs' };
}