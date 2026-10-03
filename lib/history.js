import { decodeFx } from './fx.js';
import { decodeSnapshot } from './snapshot.js';
const RETENTION = 26 * 60 * 60_000;
const SLOT = 10 * 60_000;
export const emptyHistory = () => ({ schema: 1, prl: [], qtc: [], fx: null, collectionStatus: null });

export function mergeHistory(history, update) {
  const now = Math.max(update.ts, history?.collectionStatus?.ts || 0);
  const result = emptyHistory();
  for (const coin of ['prl', 'qtc']) {
    const slots = new Map();
    for (const row of history?.[coin] || []) {
      const s = decodeSnapshot(row);
      if (s && s.ts > now - RETENTION && s.ts <= now) slots.set(Math.floor(s.ts / SLOT), s);
    }
    const incoming = update[coin] && decodeSnapshot({ ...update[coin], ts: update.ts });
    const slot = Math.floor(update.ts / SLOT);
    if (incoming && incoming.ts > now - RETENTION && (!slots.has(slot) || incoming.ts >= slots.get(slot).ts)) slots.set(slot, incoming);
    result[coin] = [...slots.values()].sort((a, b) => a.ts - b.ts);
  }
  const oldFx = decodeFx(history?.fx), newFx = decodeFx(update.fx);
  result.fx = newFx && (!oldFx || newFx.fetchedAt >= oldFx.fetchedAt) ? newFx : oldFx;
  result.collectionStatus = update.ts >= (history?.collectionStatus?.ts || 0) ? { ts: update.ts, errors: update.errors || {}, saved: { prl: Boolean(update.prl), qtc: Boolean(update.qtc) } } : history.collectionStatus;
  return result;
}
