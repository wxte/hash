// Reference presets, editable in the browser. All internal hashrates use H/s.
export const CARD_DEFAULTS = [
  { id: 'cmp30hx', name: 'CMP 30HX', prlHash: 42e12, qtcHash: 130e6, prlWatts: 75, qtcWatts: 75 },
  { id: 'cmp40hx', name: 'CMP 40HX', prlHash: 58e12, qtcHash: 175e6, prlWatts: 120, qtcWatts: 120 },
  { id: 'cmp50hx', name: 'CMP 50HX', prlHash: 82e12, qtcHash: 325e6, prlWatts: 185, qtcWatts: 185 },
  { id: 'rtx3060', name: 'RTX 3060', prlHash: 52e12, qtcHash: 195e6, prlWatts: 120, qtcWatts: 120 },
  { id: 'rtx3060ti', name: 'RTX 3060 Ti', prlHash: 60e12, qtcHash: 247e6, prlWatts: 145, qtcWatts: 145 },
  { id: 'rtx4060', name: 'RTX 4060', prlHash: 57e12, qtcHash: 242e6, prlWatts: 110, qtcWatts: 114 },
  { id: 'rtx4060ti', name: 'RTX 4060 Ti', prlHash: 70e12, qtcHash: 338e6, prlWatts: 145, qtcWatts: 159 },
];
export const SETTING_DEFAULTS = {
  electricityUsdKwh: 0.08, usdCny: 7.2, prlPoolFeePct: 1, qtcPoolFeePct: 1, minerFeePct: 0,
};
export const STORAGE_PREFIX = 'hash:profit:v3';
