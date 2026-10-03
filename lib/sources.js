const number = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replaceAll(',', '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const withTimeout = (url) => fetch(url, { headers: { 'User-Agent': 'PRL-QTC-Profit/2.0' }, signal: AbortSignal.timeout(12_000), cache: 'no-store' });

async function json(url) {
  const response = await withTimeout(url);
  if (!response.ok) throw new Error(`数据源 HTTP ${response.status}`);
  return response.json();
}

async function coinPrice(symbol, coingeckoId, safeMarket) {
  try {
    const data = await json(`https://safe.trade/api/v2/peatio/public/markets/${safeMarket}/tickers.json`);
    const last = number(data?.ticker?.last ?? data?.last ?? data?.[safeMarket]?.last);
    if (last > 0) return { usd: last, source: 'SafeTrade' };
  } catch { /* try the public CoinGecko fallback */ }
  const data = await json(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_last_updated_at=true`);
  const price = number(data?.[coingeckoId]?.usd);
  const updated = number(data?.[coingeckoId]?.last_updated_at);
  if (!updated || Date.now() - updated * 1000 > 30 * 60_000) throw new Error(`${symbol} 价格源超过 30 分钟未更新`);
  if (!(price > 0)) throw new Error(`${symbol} 价格不可用`);
  return { usd: price, source: 'CoinGecko' };
}

async function prlSonarYield() {
  const response = await withTimeout('https://www.pearlsonar.com/pools');
  if (!response.ok) throw new Error(`PRL 产出源 HTTP ${response.status}`);
  const html = await response.text();
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replaceAll('&nbsp;', ' ').replace(/\s+/g, ' ');
  const hashMatch = text.match(/Network hashrate\s+([\d,.]+)\s*(EH\/s|PH\/s|TH\/s|GH\/s|MH\/s|H\/s)/i);
  const emissionMatch = text.match(/Emission\s*\(24h\)\s+([\d,.]+)\s+PRL/i);
  if (!hashMatch || !emissionMatch) throw new Error('PRL 页面格式无法识别');
  const multiplier = { 'eh/s': 1e18, 'ph/s': 1e15, 'th/s': 1e12, 'gh/s': 1e9, 'mh/s': 1e6, 'h/s': 1 }[hashMatch[2].toLowerCase()];
  const hashrate = number(hashMatch[1]) * multiplier;
  const emission = number(emissionMatch[1]);
  if (!(hashrate > 0 && emission > 0)) throw new Error('PRL 产出/算力无效');
  return { coinPerHashDay: emission / hashrate, source: 'PearlSonar 24h emission/network hashrate', sourceName: 'PearlSonar' };
}

async function prlYield() {
  try { return await prlSonarYield(); }
  catch {
    const data = await json('https://pearlchain.live/api/explorer/stats');
    const hashrate = number(data.networkHashPs), reward = number(data.blockRewardPearl), blockSecs = number(data.avgBlockSecs), tipTime = number(data.tipTime);
    if (!(hashrate > 0 && reward > 0 && blockSecs > 0 && tipTime > 0) || Date.now() - tipTime * 1000 > 30 * 60_000) throw new Error('PRL 主源不可用，备用浏览器数据无效或过期');
    return { coinPerHashDay: reward * 86400 / blockSecs / hashrate, source: 'Pearlchain recent block reward × 86400/average block seconds/network hashrate (estimate)', sourceName: 'Pearlchain' };
  }
}

async function qtcYield() {
  const data = await json('https://qtcscan.com/explorer-data.json');
  if (data.schema !== 1) throw new Error('QTCScan 数据版本不支持');
  const updated = number(data.updated_at);
  if (!updated || Date.now() - updated * 1000 > 30 * 60_000) throw new Error('QTCScan 超过 30 分钟未更新');
  const blocks = number(data.windows?.['24h']?.blocks);
  const hashrate = number(data.windows?.['24h']?.hashrate);
  const reward = number(data.reward);
  if (!(blocks > 0 && hashrate > 0 && reward > 0)) throw new Error('QTCScan 缺少有效的 24h 区块、算力或区块奖励');
  return reward * blocks / hashrate;
}

export async function collectMarket() {
  const jobs = await Promise.allSettled([
    Promise.all([coinPrice('PRL', 'pearl-2', 'prl_usdt'), prlYield()]),
    Promise.all([coinPrice('QTC', 'quantus', 'quantus_usdt'), qtcYield()]),
  ]);
  const result = { ts: Date.now(), prl: null, qtc: null, errors: {} };
  if (jobs[0].status === 'fulfilled') {
    const [price, yieldData] = jobs[0].value;
    result.prl = { priceUsd: price.usd, priceSource: price.source, ...yieldData };
  } else result.errors.prl = jobs[0].reason?.message ?? 'PRL 数据源失败';
  if (jobs[1].status === 'fulfilled') {
    const [price, coinPerHashDay] = jobs[1].value;
    result.qtc = { priceUsd: price.usd, priceSource: price.source, coinPerHashDay, source: 'QTCScan 24h blocks × reward/network hashrate', sourceName: 'QTCScan' };
  } else result.errors.qtc = jobs[1].reason?.message ?? 'QTC 数据源失败';
  if (!result.prl && !result.qtc) throw new Error(`两种币的数据都获取失败（PRL: ${result.errors.prl}；QTC: ${result.errors.qtc}）`);
  return result;
}
