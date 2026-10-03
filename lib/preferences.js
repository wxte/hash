import { CARD_DEFAULTS } from './config.js';
export const PRESET_VERSION = 4;
const oldDefaults = {
  cmp30hx: { prlHash: 42e12, prlWatts: 75 },
  cmp40hx: { prlHash: 58e12, prlWatts: 120 },
  cmp50hx: { prlHash: 82e12, prlWatts: 185 },
  rtx3060: { prlHash: 52e12, prlWatts: 120 },
  rtx3060ti: { prlHash: 60e12, prlWatts: 145 },
};
// Repair old untouched presets while retaining values the visitor edited.
export function migratePresets(settings) {
  if (settings.presetVersion !== PRESET_VERSION) {
    for (const card of CARD_DEFAULTS) {
      const prior = oldDefaults[card.id];
      if (!prior) continue;
      for (const field of ['prlHash', 'prlWatts']) {
        if (settings.cards?.[card.id]?.[field] === prior[field]) settings.cards[card.id][field] = card[field];
      }
    }
  }
  settings.presetVersion = PRESET_VERSION;
  return settings;
}
