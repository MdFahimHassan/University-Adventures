// zones.js - ALL zone maps live here. To add a zone, copy a block and give it a new id.
// Every row of a zone must be the SAME length. Markers (P spawn, N npc, I item) become floor when parsed.
//
// Tiles shared by all zones:
//   #  wall (solid)        R  railing (solid)      .  open floor        p  path (walkable)
//   X  exit path           U  "up" path            S  stairs            D  store room door (solid)
//   L  lift (solid)        E/F escalators (solid, animated)             v  escalator well (solid)
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
      '3,0':  { label: 'Up path (left)' },
      '17,0': { label: 'Up path (right)' },
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
};