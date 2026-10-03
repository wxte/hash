// Reference presets, editable in the browser. All internal hashrates use H/s.
export const CARD_DEFAULTS = [
  { id: 'cmp30hx', name: 'CMP 30HX', prlHash: 1e12, qtcHash: 130e6, prlWatts: 75, qtcWatts: 75, prlNote: 'PRL 低算力参考' },
  { id: 'cmp40hx', name: 'CMP 40HX', prlHash: 40e12, qtcHash: 145e6, prlWatts: 100, qtcWatts: 100, prlNote: 'PRL 解锁参考值', qtcNote: 'QTC 同功耗估算' },
  { id: 'cmp50hx', name: 'CMP 50HX', prlHash: 70.87e12, qtcHash: 275e6, prlWatts: 170, qtcWatts: 170, prlNote: 'PRL 解锁参考值', qtcNote: 'QTC 同功耗估算' },
  { id: 'rtx3060', name: 'RTX 3060', prlHash: 45.05e12, qtcHash: 180e6, prlWatts: 120, qtcWatts: 120 },
  { id: 'rtx3060ti', name: 'RTX 3060 Ti', prlHash: 55e12, qtcHash: 247e6, prlWatts: 140, qtcWatts: 145 },
  { id: 'rtx4060', name: 'RTX 4060', prlHash: 60e12, qtcHash: 240e6, prlWatts: 110, qtcWatts: 114 },
  { id: 'rtx4060ti', name: 'RTX 4060 Ti', prlHash: 83e12, qtcHash: 300e6, prlWatts: 145, qtcWatts: 145, qtcNote: 'QTC 同功耗估算' },
  { id: 'rtx4070', name: 'RTX 4070', prlHash: 110e12, qtcHash: 390e6, prlWatts: 150, qtcWatts: 150 },
];
export const SETTING_DEFAULTS = {
  electricityCnyKwh: 0.6, prlPoolFeePct: 1, qtcPoolFeePct: 1,
};
export const STORAGE_PREFIX = 'hash:profit:v3';

export const PRODUCTION_FACTOR = 0.98 * 0.98;
