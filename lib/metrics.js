export const DAY = 24 * 60 * 60 * 1000;
export const MAX_GAP = 20 * 60 * 1000;

// Samples are rates per day. Integrate each valid sample only until the next
// observation (or 20 minutes), so outages never masquerade as known data.
export function summarize(samples, now = Date.now()) {
  const start = now - DAY;
  const ordered = samples
    .filter((s) => Number.isFinite(s.ts) && s.ts <= now && Number.isFinite(s.grossUsdDay) && Number.isFinite(s.netUsdDay))
    .sort((a, b) => a.ts - b.ts);
  let grossIntegral = 0;
  let netIntegral = 0;
  let covered = 0;
  const used = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const sample = ordered[i];
    const nextTs = ordered[i + 1]?.ts ?? now;
    const from = Math.max(start, sample.ts);
    const to = Math.min(now, nextTs, sample.ts + MAX_GAP);
    if (to <= from) continue;
    const hours = (to - from) / 3_600_000;
    grossIntegral += sample.grossUsdDay * hours / 24;
    netIntegral += sample.netUsdDay * hours / 24;
    covered += to - from;
    used.push(sample);
  }
  const coverageHours = covered / 3_600_000;
  return {
    sampleCount: ordered.filter((s) => s.ts >= start).length,
    coverageHours,
    grossUsdDay: coverageHours ? grossIntegral / (coverageHours / 24) : null,
    netUsdDay: coverageHours ? netIntegral / (coverageHours / 24) : null,
    from: used[0]?.ts ?? null,
    to: used.at(-1)?.ts ?? null,
  };
}

export function calculateCoin({ coinPerHashDay, priceUsd, hashRate, watts, electricityUsdKwh, poolFeePct = 0, minerFeePct = 0 }) {
  const coinDay = coinPerHashDay * hashRate;
  const grossUsdDay = coinDay * priceUsd;
  const afterFees = grossUsdDay * (1 - poolFeePct / 100) * (1 - minerFeePct / 100);
  const electricity = watts / 1000 * 24 * electricityUsdKwh;
  return { coinDay, grossUsdDay, netUsdDay: afterFees - electricity, electricityUsdDay: electricity };
}
