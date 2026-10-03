import { readHistory } from '../lib/storage.js';
import { summarize, MAX_GAP } from '../lib/metrics.js';
import { CARD_DEFAULTS as cards, SETTING_DEFAULTS as defaults } from '../lib/config.js';
import { decodeSnapshot } from '../lib/snapshot.js';

const n = (v, fallback, max = Number.MAX_VALUE) => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : fallback;

export default async function handler(req, res) {
  try {
    const settings = {
      electricityUsdKwh: n(req.query?.electricityUsdKwh, defaults.electricityUsdKwh),
      usdCny: n(req.query?.usdCny, defaults.usdCny) || defaults.usdCny,
      prlPoolFeePct: n(req.query?.prlPoolFeePct, defaults.prlPoolFeePct, 100),
      qtcPoolFeePct: n(req.query?.qtcPoolFeePct, defaults.qtcPoolFeePct, 100),
      minerFeePct: n(req.query?.minerFeePct, defaults.minerFeePct, 100),
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
        const currentGross = point ? point.coinPerHashDay * hash * point.priceUsd : null;
        const electricity = card[`${coin}Watts`] / 1000 * 24 * settings.electricityUsdKwh;
        const currentNet = currentGross == null ? null : currentGross * (1 - fee / 100) * (1 - settings.minerFeePct / 100) - electricity;
        const perCardSamples = samples[coin].map((s) => ({ ts: s.ts, grossUsdDay: s.coinPerHashDay * hash * s.priceUsd, netUsdDay: s.coinPerHashDay * hash * s.priceUsd * (1 - fee / 100) * (1 - settings.minerFeePct / 100) - electricity }));
        const average = summarize(perCardSamples, now);
        coins[coin] = {
          current: point ? { priceUsd: point.priceUsd, coinPerHashDay: point.coinPerHashDay, coinDay: point.coinPerHashDay * hash, grossUsdDay: currentGross, netUsdDay: currentNet, electricityUsdDay: electricity, observedAt: point.ts } : null,
          average,
          sampleCount: average.sampleCount,
          coverageHours: average.coverageHours,
        };
      }
      return { ...card, coins };
    });
    const updatedAt = Math.max(...Object.values(samples).flat().map((s) => s.ts), 0) || null;
    return res.setHeader('Cache-Control', 'no-store').status(200).json({ updatedAt, collectionStatus, settings, sources: { prl: current.prl ? { priceSource: current.prl.priceSource, source: current.prl.source } : null, qtc: current.qtc ? { priceSource: current.qtc.priceSource, source: current.qtc.source } : null }, cards: cardsOut });
  } catch (error) {
    return res.status(503).json({ error: error?.message || '读取历史数据失败' });
  }
}
