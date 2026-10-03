import { collectMarket } from '../../lib/sources.js';
const { SITE_URL, COLLECT_SECRET } = process.env;
if (!SITE_URL || !COLLECT_SECRET) throw new Error('请配置 SITE_URL 和 COLLECT_SECRET');
const url = new URL('/api/collect', SITE_URL);
if (url.protocol !== 'https:') throw new Error('SITE_URL 必须是 HTTPS 生产网址');
let snapshot;
try { snapshot = await collectMarket(); }
catch (error) { snapshot = { ts: Date.now(), errors: { all: error.message } }; }
console.log(JSON.stringify({ collected: { prl: Boolean(snapshot.prl), qtc: Boolean(snapshot.qtc) }, errors: snapshot.errors }));
const response = await fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${COLLECT_SECRET}` },
  body: JSON.stringify(snapshot), signal: AbortSignal.timeout(65_000),
});
const result = await response.json();
console.log(JSON.stringify(result));
if (!response.ok || !result.saved?.prl || !result.saved?.qtc) process.exitCode = 1;
