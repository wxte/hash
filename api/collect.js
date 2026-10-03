import { saveCollection } from '../lib/storage.js';
import { collectMarket } from '../lib/sources.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CRON_SECRET;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const snapshot = await collectMarket();
    await saveCollection(snapshot);
    return res.status(200).json({ ok: true, timestamp: snapshot.ts, saved: { prl: Boolean(snapshot.prl), qtc: Boolean(snapshot.qtc) }, errors: snapshot.errors });
  } catch (error) {
    try { await saveCollection({ ts: Date.now(), errors: { all: error?.message || '采集失败' } }); } catch { /* the storage service may also be unavailable */ }
    return res.status(503).json({ error: error?.message || '采集失败；没有写入无效样本' });
  }
}
