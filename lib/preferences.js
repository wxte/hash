import { CARD_DEFAULTS } from './config.js';
export const PRESET_VERSION = 5;
const oldDefaults = {
  cmp30hx: { prlHash: 42e12, prlWatts: 75 },
  cmp40hx: { prlHash: 58e12, prlWatts: 120 },
  cmp50hx: { prlHash: 82e12, prlWatts: 185 },
  rtx3060: { prlHash: 52e12, prlWatts: 120 },
  rtx3060ti: { prlHash: 60e12, prlWatts: 145 },
};
const version4Defaults = {
  cmp30hx: { prlHash: 1e12, prlWatts: 75 },
  cmp40hx: { prlHash: 40e12, prlWatts: 150 },
  cmp50hx: { prlHash: 64.87e12, prlWatts: 210, qtcHash: 325e6 },
  rtx3060: { prlHash: 42.05e12, prlWatts: 99, qtcHash: 195e6 },
  rtx3060ti: { prlHash: 55e12, prlWatts: 140 },
  rtx4060: { prlHash: 57e12, qtcHash: 242e6 },
  rtx4060ti: { prlHash: 70e12, qtcHash: 338e6 },
};
// Migrate untouched defaults in sequence, retaining other custom values.
export function migratePresets(settings) {
  if (settings.presetVersion === PRESET_VERSION) return settings;
  if (settings.presetVersion !== 4) {
    for (const [id, prior] of Object.entries(oldDefaults)) {
      for (const field of ['prlHash', 'prlWatts']) {
        if (settings.cards?.[id]?.[field] === prior[field]) settings.cards[id][field] = version4Defaults[id][field];
      }
    }
  }
  for (const card of CARD_DEFAULTS) {
    for (const [field, prior] of Object.entries(version4Defaults[card.id] || {})) {
      if (settings.cards?.[card.id]?.[field] === prior) settings.cards[card.id][field] = card[field];
    }
  }
  settings.presetVersion = PRESET_VERSION;
  return settings;
}
