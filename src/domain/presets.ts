/**
 * Room presets [W, D, H] metres (DL-36). Every preset passes all checks for NEO-E, N1 and N2 with the
 * default equipment (tests/unit/presets.test.ts). Sized from the planner's own limits: about 4.2 m wide
 * and 5.2 m deep for swing clearance, and a 2.85 m ceiling for the N1/N2 mount height above the mat.
 * Higher ceilings use the automatic sensor drop (packages.ts → autoMountDrop).
 */
export const ROOM_PRESETS = [
  { id: 'compact', dims: [4.3, 5.5, 2.9] },
  { id: 'standard', dims: [4.5, 6.0, 2.95] },
  { id: 'spacious', dims: [4.9, 6.7, 3.05] },
  { id: 'studio', dims: [5.5, 7.3, 3.3] },
] as const;
