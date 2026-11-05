// Where everything sits. East is +x, north is -z, so the walk runs right to left on a map:
// from the bay at sunrise, up the river, over the portage, and west to the Tree of Peace at sunset.
// The same direction the Hiawatha Belt reads.

// [x, z] anchors. `water: true` stages float on the river or bay instead of standing on land.
// `cam` and `look` are offsets from the anchor for the camera at that stop.
export const ANCHORS = {
  dawn: { at: [322, 2], water: true, cam: [-7.5, 2.4, 4], look: [8, 1.2, -1] },
  canoe: { at: [248, 10], cam: [5.5, 4.2, 7.5], look: [0, 1.5, 0] },
  repair: { at: [196, 23], cam: [6, 4.5, 8], look: [0, 0.6, -1] },
  camp: { at: [140, 32], cam: [5, 3.6, 6.5], look: [0.4, 0.7, 0.3] },
  messengers: { at: [100, -7], water: true, cam: [7, 5.5, 13], look: [0.5, 0.6, 0] },
  portage: { at: [46, 16], cam: [7, 4.5, 8], look: [0, 1.4, 0] },
  crossing: { at: [0, 4], cam: [9, 6, 10], look: [-20, 0, -6] },
  story: { at: [-58, 22], cam: [8, 6, 10], look: [0, 0.8, 0] },
  fire: { at: [-108, -6], cam: [7, 5, 9], look: [0, 1, 0] },
  shells: { at: [-150, 14], cam: [1.5, 1.6, 2.1], look: [0.1, 0.62, 0] },
  belt: { at: [-190, -4], cam: [0, 3.2, 3.6], look: [0, 1.1, 0] },
  council: { at: [-226, 14], cam: [7, 5, 9], look: [0, 1, 0] },
  tree: { at: [-266, 0], cam: [19, 6, 27], look: [0, 9.5, 0] },
};

// The river, from the bay to where it runs out at the portage.
export const RIVER = [
  [330, -4], [292, -6], [262, -16], [226, -6], [196, 8], [168, 14], [138, 4], [104, -8], [72, -2], [44, 2],
];
export const RIVER_WIDTH = [16, 7];

// The lake in the west (Hiawatha strung his shells by a lake).
export const LAKE = { at: [-70, 70], r: 30 };

// Bay: everything east of this x is open water.
export const BAY_X = 268;

export const WORLD = { minX: -360, maxX: 520, minZ: -190, maxZ: 190 };
