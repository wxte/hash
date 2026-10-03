import { resolveFx } from '../lib/fx.js';
import { readHistory } from '../lib/storage.js';
import { summarize, MAX_GAP } from '../lib/metrics.js';
import { CARD_DEFAULTS as cards, SETTING_DEFAULTS as defaults, PRODUCTION_FACTOR } from '../lib/config.js';
import { decodeSnapshot } from '../lib/snapshot.js';

const n = (v, fallback, max = Number.MAX_VALUE) => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : fallback;

export default async function handler(req, res) {
  try {
    const settings = {
      electricityCnyKwh: n(req.query?.electricityCnyKwh, defaults.electricityCnyKwh),
      prlPoolFeePct: defaults.prlPoolFeePct,
      qtcPoolFeePct: defaults.qtcPoolFeePct,
    };
    let cardOverrides = {};
    try { cardOverrides = JSON.parse(req.query?.cards ?? '{}'); } catch { cardOverrides = {}; }
    if (!cardOverrides || typeof cardOverrides !== 'object' || Array.isArray(cardOverrides)) cardOverrides = {};
    const effectiveCards = cards.map((card) => {
      const override = cardOverrides[card.id] ?? {};
      return {
        ...card,
        prlHash: n(override.prlHash, card.prlHash),
        qtcHash: n(override.qtcHash, card.qtcHash),
        prlWatts: n(override.prlWatts, card.prlWatts),
        qtcWatts: n(override.qtcWatts, card.qtcWatts),
      };
    });
    const now = Date.now();
    const history = await readHistory();
    const fx = await resolveFx(history.fx, now);
    const rate = fx?.usdCny ?? null;
    const collectionStatus = history.collectionStatus;
    const samples = { prl: history.prl.map(decodeSnapshot).filter(Boolean), qtc: history.qtc.map(decodeSnapshot).filter(Boolean) };
    const latest = (rows) => {
      const sample = rows.filter((s) => Number.isFinite(s.ts) && Number.isFinite(s.priceUsd) && Number.isFinite(s.coinPerHashDay)).sort((a, b) => b.ts - a.ts)[0] ?? null;
      return sample && sample.ts <= now && now - sample.ts <= MAX_GAP ? sample : null;
    };
    const current = { prl: latest(samples.prl), qtc: latest(samples.qtc) };
    const cardsOut = effectiveCards.map((card) => {
      const coins = {};
      for (const coin of ['prl', 'qtc']) {
        const hash = card[coin === 'prl' ? 'prlHash' : 'qtcHash'];
        const fee = coin === 'prl' ? settings.prlPoolFeePct : settings.qtcPoolFeePct;
        const point = current[coin];
        const electricity = card[`${coin}Watts`] / 1000 * 24 * settings.electricityCnyKwh;
        const grossUsd = (s) => s.coinPerHashDay * hash * PRODUCTION_FACTOR * s.priceUsd;
        // Integrate matched price/yield snapshots first, then convert at the latest FX.
        const averageUsd = summarize(samples[coin].map((s) => ({ ts: s.ts, grossUsdDay: grossUsd(s), netUsdDay: grossUsd(s) * (1 - fee / 100) })), now);
        const { grossUsdDay, netUsdDay, ...coverage } = averageUsd;
        const average = { ...coverage,
          grossCnyDay: rate && averageUsd.grossUsdDay != null ? averageUsd.grossUsdDay * rate : null,
          netCnyDay: rate && averageUsd.netUsdDay != null ? averageUsd.netUsdDay * rate - electricity : null,
        };
        coins[coin] = {
          current: point ? {
            priceUsd: point.priceUsd,
            priceCny: rate ? point.priceUsd * rate : null,
            coinPerHashDay: point.coinPerHashDay * PRODUCTION_FACTOR,
            coinDay: point.coinPerHashDay * hash * PRODUCTION_FACTOR,
            grossCnyDay: rate ? grossUsd(point) * rate : null,
            netCnyDay: rate ? grossUsd(point) * rate * (1 - fee / 100) - electricity : null,
            electricityCnyDay: electricity, observedAt: point.ts,
          } : null,
          average, sampleCount: average.sampleCount, coverageHours: average.coverageHours,
        };
      }
      return { ...card, coins };
    });
    const updatedAt = Math.max(...Object.values(samples).flat().map((s) => s.ts), 0) || null;
    const sources = Object.fromEntries(['prl', 'qtc'].map((coin) => [coin, current[coin] ? { priceSource: current[coin].priceSource, source: current[coin].source, sourceName: current[coin].sourceName || (coin === 'prl' ? 'PearlSonar' : 'QTCScan') } : null]));
    return res.setHeader('Cache-Control', 'no-store').status(200).json({ updatedAt, collectionStatus, settings, fx, sources, cards: cardsOut });
  } catch (error) {
    return res.status(503).json({ error: error?.message || '读取历史数据失败' });
  }
}
