export function decodeSnapshot(value) {
  try {
    const sample = typeof value === 'string' ? JSON.parse(value) : value;
    if (!sample || typeof sample !== 'object') return null;
    if (!Number.isFinite(sample.ts) || !Number.isFinite(sample.priceUsd) || sample.priceUsd <= 0 ||
        !Number.isFinite(sample.coinPerHashDay) || sample.coinPerHashDay <= 0) return null;
    return sample;
  } catch { return null; }
}
