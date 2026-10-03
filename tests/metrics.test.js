import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, DAY, MAX_GAP, calculateCoin } from '../lib/metrics.js';

test('time-weighted average uses covered intervals and reports coverage', () => {
  const now = 10 * DAY;
  const result = summarize([
    { ts: now - 20 * 60_000, grossUsdDay: 24, netUsdDay: 12 },
    { ts: now - 10 * 60_000, grossUsdDay: 48, netUsdDay: 24 },
  ], now);
  assert.equal(result.sampleCount, 2);
  assert.equal(result.coverageHours, 1 / 3);
  assert.equal(result.grossUsdDay, 36);
  assert.equal(result.netUsdDay, 18);
});

test('a long collection outage only counts the first capped interval after the last sample', () => {
  const now = 10 * DAY;
  const result = summarize([{ ts: now - 2 * 60 * 60_000, grossUsdDay: 99, netUsdDay: 50 }], now);
  assert.equal(result.sampleCount, 1);
  assert.equal(result.coverageHours, MAX_GAP / 3_600_000);
  assert.equal(result.grossUsdDay, 99);
});

test('invalid samples never enter the average', () => {
  const now = 10 * DAY;
  const result = summarize([
    { ts: now - 10 * 60_000, grossUsdDay: 24, netUsdDay: 10 },
    { ts: now - 5 * 60_000, grossUsdDay: Number.NaN, netUsdDay: 0 },
    { ts: now, grossUsdDay: Number.NaN, netUsdDay: 2 },
  ], now);
  assert.equal(result.sampleCount, 1);
  assert.equal(result.grossUsdDay, 24);
  assert.ok(MAX_GAP > 0);
});

test('per-card profit accounts for pool fee and electricity', () => {
  const result = calculateCoin({ coinPerHashDay: 1, priceUsd: 2, hashRate: 3, watts: 100, electricityUsdKwh: 0.1, poolFeePct: 1 });
  assert.equal(result.coinDay, 3);
  assert.equal(result.grossUsdDay, 6);
  assert.equal(result.netUsdDay, 6 * 0.99 - 0.24);
});
