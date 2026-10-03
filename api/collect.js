import { saveCollection } from '../lib/storage.js';
import { collectMarket } from '../lib/sources.js';
import { validateCollection } from '../lib/collection.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CRON_SECRET;
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || supplied !== secret) return res.status(401).json({ error: 'Unauthorized' });
  let suppliedSnapshot;
  if (req.method === 'POST') {
    try { suppliedSnapshot = validateCollection(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  try {
    const snapshot = suppliedSnapshot || await collectMarket();
    await saveCollection(snapshot);
    const ok = Boolean(snapshot.prl || snapshot.qtc);
    return res.status(ok ? 200 : 503).json({ ok, timestamp: snapshot.ts, saved: { prl: Boolean(snapshot.prl), qtc: Boolean(snapshot.qtc) }, errors: snapshot.errors });
  } catch (error) {
    try { await saveCollection({ ts: Date.now(), errors: { all: error?.message || '采集失败' } }); } catch { /* the storage service may also be unavailable */ }
    return res.status(503).json({ error: error?.message || '采集失败；没有写入无效样本' });
  }
}
