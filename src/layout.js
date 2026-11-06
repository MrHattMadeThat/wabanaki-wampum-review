// Where everything sits. East is +x, north is -z, so the walk runs right to left on a map:
// from the bay at sunrise, up the river, over the portage, and west to the Tree of Peace at sunset.
// The same direction the Hiawatha Belt reads.

// [x, z] anchors. `water: true` stages float on the river or bay instead of standing on land; `flat: false`
// keeps the ground as it is (the cove is already gentle) instead of levelling a stage.
// `cam` and `look` are offsets from the anchor for the camera at that stop.
export const ANCHORS = {
  // a summer fishing camp on the beach, looking east over it to the bay and the sunrise
  dawn: { at: [270, 40], flat: false, cam: [-9, 2.9, 5.5], look: [4, 0.9, -4.5] },
  canoe: { at: [248, 10], cam: [5.5, 4.2, 7.5], look: [0, 1.5, 0] },
  repair: { at: [196, 23], cam: [6, 4.5, 8], look: [0, 0.6, -1] },
  camp: { at: [140, 32], cam: [0.9, 1.3, 2.4], look: [0, 1.0, 0] },
  messengers: { at: [100, -7], water: true, cam: [7, 5.5, 13], look: [0.5, 0.6, 0] },
  portage: { at: [46, 16], cam: [7, 4.5, 8], look: [0, 1.4, 0] },
  crossing: { at: [0, 4], cam: [9, 6, 10], look: [-20, 0, -6] },
  // the lakeshore where Hiawatha strung his shells; the camera is out over the water looking back at the shore
  story: { at: [-66, 41], flat: false, cam: [8.6, 2.3, 3.4], look: [-2.6, -0.1, 1.8] },
  fire: { at: [-108, -6], cam: [7, 5, 9], look: [0, 1, 0] },
  shells: { at: [-150, 14], cam: [1.5, 1.6, 2.1], look: [0.1, 0.62, 0] },
  belt: { at: [-190, -4], cam: [0, 2.15, 2.6], look: [0, 1.2, 0] },
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

// The cove where the path starts: the coast is a steep bank everywhere else, so this cuts a gentle beach
// for the dawn camp. `shore` is the x where the beach meets the water.
export const COVE = { at: [270, 40], r: 36, shore: 275 };

// Where the opening sunrise is watched from: low over the water just off the camp, looking out to sea.
export const DAWN_VIEW = { eye: [281, 1.5, 41], look: [600, 9, 10] };

export const WORLD = { minX: -360, maxX: 520, minZ: -190, maxZ: 190 };
