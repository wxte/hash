import { acquireCollectionLease, saveCollection, readHistory } from './storage.js';
import { collectMarket } from './sources.js';
import { decodeSnapshot } from './snapshot.js';
let pending;
const INTERVAL = 10 * 60_000;
export async function ensureFreshHistory(history) {
  const now = Date.now();
  const outdated = ['prl', 'qtc'].some((coin) => {
    const latest = Math.max(0, ...(history[coin] || []).map(decodeSnapshot).filter((s) => s && s.ts <= now).map((s) => s.ts));
    return now - latest >= INTERVAL;
  });
  if (!outdated || now - (history.collectionStatus?.ts || 0) < 90_000) return { history, refreshing: false };
  if (pending) return pending;
  pending = (async () => {
    try {
      if (!await acquireCollectionLease(now)) return { history: await readHistory(), refreshing: true };
      console.log('[market-refresh] collecting stale market snapshots');
      let update;
      try { update = await collectMarket(); }
      catch (error) { update = { ts: Date.now(), errors: { all: error.message } }; }
      await saveCollection(update);
      console.log('[market-refresh] complete', { prl: Boolean(update.prl), qtc: Boolean(update.qtc), errors: update.errors });
      return { history: await readHistory(), refreshing: false };
    } catch (error) {
      console.error('[market-refresh] failed', error.message);
      return { history, refreshing: false, refreshError: error.message };
    }
  })();
  try { return await pending; } finally { pending = null; }
}
