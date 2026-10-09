// zones.js - ALL zone maps live here. To add a zone, copy a block and give it a new id.
// Every row of a zone must be the SAME length. Markers (P spawn, N npc, I item) become floor when parsed.
//
// Tiles shared by all zones:
//   #  wall (solid)        R  railing (solid)      .  open floor (grey stone paving, see floor.js)
//   a  blue recycling bin (solid)   o  red non-recyclable bin (solid)  - zone 1, side by side above the left end of the escalator rail
//   p  old "path" tile (walkable). Zone 1 no longer uses it; in other zones it now just looks like the stone floor
//   X  exit path           U  "up" path            S  stairs            D  store room door (solid)
//   L  lift (solid)        E/F escalators (solid, animated)             v  escalator well (solid)
//   W  raised glass skylight (solid, see-through to the floor below)
// New in zone 4:
//   C  concrete bench (solid)   T  tree in a grey planter box (solid)   b  bush (WALKABLE - you can walk into it)
// Planted areas with a pale guard rail (all solid; the rail is drawn automatically on every edge that faces open floor):
//   H  clipped hedge    Y  bush mound    Z  tree     (mix them freely, e.g. HHYHZHHY)
// Gymnasium (zone 1, left wall, rows 24-27):
//   J  gym sliding glass door (solid)   Q  wall with the usage-rules poster + wooden cabinet (solid)   r  red gym mat (walkable, 3 tiles between the two doors)
//   H  dense hedge (SOLID - a bush you can NOT walk through; used for the hedge lanes in zone 1)
// New in zone 3:
//   g  grass (walkable lawn)   K  storage room block (solid)   S on the bottom row = stairs down to zone 1
// New in zone 2:
//   B  pool rim (solid)    ~  water (solid)        M  men's restroom door (solid)   G  women's restroom door (solid)
//
// exits: key is "x,y" of the exit tile.
//   to      = zone to fade into        spawn  = tile where the player appears there (NOT an exit tile!)
//   facing  = direction the player looks on arrival     label = text shown for exits that don't lead anywhere yet
export const ZONES = {
  // Zone 1 is 38 tiles wide and 30 tall.
  // NOTE: all the stone paths (p) were removed from this zone - it is now one open stone floor. Exits (X / U / S) are unchanged.
  // The path notes below (x 7-8 path, x 27-28 walkway, 'path p' gaps...) still describe WHERE those lanes were, but they are plain floor now.
  //   - rows 9-20 (middle): the glass skylight (x 21-26) and the fenced bush bed (x 29-37) have the same height,
  //     so they sit side by side in the vertical middle of the map
  //   - rows 13-17 (left): escalator + lifts + the student. Exits to the pool zone are at x 0, rows 11 and 19
  //   - x 7-8: a stone path runs from the top paths down to the escalator landing
  //   - x 27-28: 2-tile walkway that runs the full height, between the glass and the right section
  //   - top sitting area (rows 1-7) and bottom sitting area (rows 22-28): a bench ring C around two trees T,
  //     walled off on the left by a 2-wide, 5-row hedge lane H. You enter through the 2-row gap (path p)
  //     between the hedge lane and the bush bed's railing (top: rows 6-7, bottom: rows 22-23)
  //   - x 22-26, rows 0-5: a small mixed hedge (H/Y/Z) right of the storage room. It has no rail on top, so it looks like
  //     it keeps going into the upper zone. The 2-wide path beside it (x 27-28, rows 0-7) will lead up to that zone
  //   - rows 21-23 on the left: open south area (the lost ID card lives here, at x 14, row 22)
  //   - rows 24-28, x 1-26: the long mixed hedge strip (H / Y / Z). The 2-wide walkway (x 27-28) runs along its right end
  //   - gymnasium: on the left wall (x 0, rows 24-27) with a 2-wide path (x 1-2, rows 24-28; the red mat covers x 1, rows 24-26, between the two doors) cut through
  //     the hedge strip. The opening at (0,28) will later connect to the pool zone
  //   - rows 8-21, x 29-36: the planted bed (same H / Y / Z mix), wall on x 37
  zone1: {
    name: 'Rooftop Entry',
    rows: [
    "#..USSSSSSSSSSSS.U#DD#YYHZHUURRRRRRRRR",
    "#...S..........S......YZHYH..HH......R",
    "#.....................YYHHZ..HH..CCC.R",
    "#.....................YHHHY..HH..CTC.R",
    "#.....................HZHYZ..HH..CTC.R",
    "#.....................YYHYH..HH..CCC.R",
    "#....................................R",
    "#....................................R",
    "#............................HHYHYYHZ#",
    "#....................WWWWWW..YZHZHYHH#",
    "#....................WWWWWW..YHHHYHYH#",
    "X....................WWWWWW..HHZHHHZH#",
    "#........ao..........WWWWWW..HHHHHYHY#",
    "#LL......RRRRRRRRR...WWWWWW..ZYHZHHHH#",
    "#.........PEEEEEvvR..WWWWWW..YHYHHZHY#",
    "#.....N..RRvvvvvvvR..WWWWWW..HHHHYHYH#",
    "#..........FFFFFvvR..WWWWWW..ZYHHHHHH#",
    "#LL......RRRRRRRRR...WWWWWW..HHZHHHHH#",
    "#....................WWWWWW..HHYYHHYH#",
    "X....................WWWWWW..ZYYYHYZH#",
    "#....................WWWWWW..HYHHHHHY#",
    "#............................HHHYYHYH#",
    "#.............I......................R",
    "#....................................R",
    "Jr.HHYYHHYHYHZYHYYHHZHHYHZY..HH..CCC.R",
    "Qr.HHHHHHHZHHYYHHYHYHHZHYYY..HH..CTC.R",
    "Jr.HZHHHHHHHZHYHHZYHHYHHHYH..HH..CTC.R",
    "#..YYHHYYZYHHYHYYYYYYHYYHHY..HH..CCC.R",
    "X..HHHHHHYYHHHYHHYHHYYZYHZY..HH......R",
    "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    ],
    exits: {
      '0,11': { to: 'zone2', spawn: { x: 28, y: 4 },  facing: 'left', label: 'Right path' },
      '0,19': { to: 'zone2', spawn: { x: 28, y: 13 }, facing: 'left', label: 'Left path' },
      '3,0':  { to: 'zone3', spawn: { x: 2, y: 16 },  facing: 'up', label: 'Up path (left)' },
      '17,0': { to: 'zone3', spawn: { x: 27, y: 16 }, facing: 'up', label: 'Up path (right)' },
      // 2-wide path at the top right: will lead to the upper zone (no 'to' yet = just shows a hint)
      '27,0': { label: 'Upper zone path' },
      '28,0': { label: 'Upper zone path' },
      // bottom-left opening beside the gym: will link to the pool zone later (no 'to' yet = just shows a hint)
      '0,28': { label: 'Pool zone path' },
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
      '29,4':  { to: 'zone1', spawn: { x: 1, y: 11 }, facing: 'right', label: 'Right path' },
      '29,13': { to: 'zone1', spawn: { x: 1, y: 19 }, facing: 'right', label: 'Left path' },
      '2,0':   { to: 'zone4', spawn: { x: 2, y: 16 }, facing: 'up', label: 'Upper zone' },
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
      // west paths lead to zone 4
      '0,5':  { to: 'zone4', spawn: { x: 28, y: 2 },  facing: 'left', label: 'West path (upper)' },
      '0,14': { to: 'zone4', spawn: { x: 28, y: 14 }, facing: 'left', label: 'West path (lower)' },
      // bottom row: left path (x 2-4), stairs (x 5-24) and right path (x 25-27) lead down to zone 1.
      // The stairs and the stairs exits in zone 1 are generated below.
    },
  },
};

// Zone 4 sits to the upper left. r = row 2 exit, L = row 14 exit (they match zone 3's west exits).
ZONES.zone4 = {
  name: 'Garden Zone',
  spawn: { x: 2, y: 16 },
  rows: [
    "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    "RppppppppppppppppppppppppppppR",
    "RppppppppppppppppppppppppppppX",
    "RppCCCCCCpbbbbbbbbbbbbbbbbbbbR",
    "RppCTTTTCpbbbbbbbbbbbbbbbbbbbR",
    "RppCCCCCCpbbbbbbbbbbbbbbbbbbbR",
    "RppppppppppppppppppppppppppppR",
    "RpbbbbbbbbbbbbbbbbbbbbbbbbbbpR",
    "RpbbbbbbbbbbbbbbbbbbbbbbbbbbpR",
    "RpppppppppppppppppppppppppbbpR",
    "RppCCCCCCpbbbbbbbbbbbbbbbpbbpR",
    "RppCTTTTCpbbbbbbbbbbbbbbbpbbpR",
    "RppCCCCCCpbbbbbbbbbbbbbbbpbbpR",
    "RpppppppppppppppppppppppppbbpR",
    "RpppbbbbbpbbbbbbbbbbbbbbbbbbpX",
    "RpppbbbbbpbbbbbbbbbbbbbbbbbbpR",
    "RpppbbbbbppppppppppppppppppppR",
    "##XX##########################",
  ],
  exits: {
    '29,2':  { to: 'zone3', spawn: { x: 1, y: 5 },  facing: 'right', label: 'r path' },
    '29,14': { to: 'zone3', spawn: { x: 1, y: 14 }, facing: 'right', label: 'L path' },
    '2,17':  { to: 'zone2', spawn: { x: 2, y: 1 },  facing: 'down',  label: 'Down to the pool' },
    '3,17':  { to: 'zone2', spawn: { x: 3, y: 1 },  facing: 'down',  label: 'Down to the pool' },
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