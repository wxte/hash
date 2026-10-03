// Reference presets, editable in the browser. All internal hashrates use H/s.
export const CARD_DEFAULTS = [
  { id: 'cmp30hx', name: 'CMP 30HX', prlHash: 1e12, qtcHash: 130e6, prlWatts: 75, qtcWatts: 75, prlNote: 'PRL 低算力参考' },
  { id: 'cmp40hx', name: 'CMP 40HX', prlHash: 40e12, qtcHash: 175e6, prlWatts: 150, qtcWatts: 120, prlNote: 'PRL 解锁参考值' },
  { id: 'cmp50hx', name: 'CMP 50HX', prlHash: 64.87e12, qtcHash: 325e6, prlWatts: 210, qtcWatts: 185, prlNote: 'PRL 解锁参考值' },
  { id: 'rtx3060', name: 'RTX 3060', prlHash: 42.05e12, qtcHash: 195e6, prlWatts: 99, qtcWatts: 120 },
  { id: 'rtx3060ti', name: 'RTX 3060 Ti', prlHash: 55e12, qtcHash: 247e6, prlWatts: 140, qtcWatts: 145 },
  { id: 'rtx4060', name: 'RTX 4060', prlHash: 57e12, qtcHash: 242e6, prlWatts: 110, qtcWatts: 114 },
  { id: 'rtx4060ti', name: 'RTX 4060 Ti', prlHash: 70e12, qtcHash: 338e6, prlWatts: 145, qtcWatts: 159 },
];
export const SETTING_DEFAULTS = {
  electricityCnyKwh: 0.6, prlPoolFeePct: 1, qtcPoolFeePct: 1,
};
export const STORAGE_PREFIX = 'hash:profit:v3';

export const PRODUCTION_FACTOR = 0.98 * 0.98;
