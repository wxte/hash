const MAX_AGE = 7 * 24 * 60 * 60_000;
let cached;
export function decodeFx(value, now = Date.now()) {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    if (!v || !Number.isFinite(v.usdCny) || v.usdCny <= 0 || v.usdCny > 100 || !Number.isFinite(v.asOf) || !Number.isFinite(v.fetchedAt) || v.asOf > now + 60_000 || v.fetchedAt > now + 60_000 || now - v.asOf > MAX_AGE || now - v.fetchedAt > MAX_AGE) return null;
    return { usdCny: v.usdCny, asOf: v.asOf, fetchedAt: v.fetchedAt, source: String(v.source || '').slice(0, 50), daily: Boolean(v.daily) };
  } catch { return null; }
}
async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  if (!response.ok) throw new Error(`汇率源 HTTP ${response.status}`);
  return response.json();
}
export async function fetchFx() {
  if (cached && Date.now() - cached.fetchedAt < 10 * 60_000) return cached;
  try {
    const data = await json('https://query1.finance.yahoo.com/v8/finance/chart/CNY=X?interval=1d&range=5d');
    const meta = data.chart?.result?.[0]?.meta;
    if (meta?.symbol !== 'CNY=X' || meta.currency !== 'CNY') throw new Error('汇率币种不匹配');
    const quote = decodeFx({ usdCny: meta.regularMarketPrice, asOf: meta.regularMarketTime * 1000, fetchedAt: Date.now(), source: 'Yahoo Finance', daily: false });
    if (!quote) throw new Error('汇率报价无效或过期');
    cached = quote;
    return quote;
  } catch {
    const data = await json('https://open.er-api.com/v6/latest/USD');
    if (data.result !== 'success' || data.base_code !== 'USD') throw new Error('备用汇率源无效');
    const quote = decodeFx({ usdCny: data.rates?.CNY, asOf: data.time_last_update_unix * 1000, fetchedAt: Date.now(), source: 'ExchangeRate-API', daily: true });
    if (!quote) throw new Error('备用汇率报价无效或过期');
    cached = quote;
    return quote;
  }
}
export async function resolveFx(stored, now = Date.now()) {
  const previous = decodeFx(stored, now);
  if (previous && now - previous.fetchedAt <= 20 * 60_000) return { ...previous, stale: false };
  try { return { ...await fetchFx(), stale: false }; }
  catch { return previous ? { ...previous, stale: true } : null; }
}
