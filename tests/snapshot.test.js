import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSnapshot } from '../lib/snapshot.js';
import { summarize, DAY } from '../lib/metrics.js';

test('Redis string and automatic JSON deserialization both remain readable', () => {
  const sample = { ts: 1234, priceUsd: 159, coinPerHashDay: 4.4e-11 };
  assert.deepEqual(decodeSnapshot(JSON.stringify(sample)), sample);
  assert.deepEqual(decodeSnapshot(sample), sample);
});

test('missing, corrupt and zero-priced source records never become valid samples', () => {
  for (const bad of [null, 'bad json', {}, { ts: 1234, priceUsd: 0, coinPerHashDay: 1 }, { ts: 1234, priceUsd: 159, coinPerHashDay: null }]) {
    assert.equal(decodeSnapshot(bad), null);
  }
});

test('average pairs each price with the same snapshot yield instead of multiplying separate averages', () => {
  const now = 2 * DAY;
  const avg = summarize([
    { ts: now - 20 * 60_000, grossUsdDay: 10 * 3, netUsdDay: 20 },
    { ts: now - 10 * 60_000, grossUsdDay: 30 * 1, netUsdDay: 20 },
  ], now);
  assert.ok(Math.abs(avg.grossUsdDay - 30) < 1e-10);
  assert.notEqual(avg.grossUsdDay, ((10 + 30) / 2) * ((3 + 1) / 2));
});

test('24h boundary clips an earlier snapshot and never includes future observations', () => {
  const now = 2 * DAY;
  const avg = summarize([
    { ts: now - DAY - 5 * 60_000, grossUsdDay: 24, netUsdDay: 12 },
    { ts: now - DAY + 5 * 60_000, grossUsdDay: 48, netUsdDay: 24 },
    { ts: now + 1000, grossUsdDay: 999, netUsdDay: 999 },
  ], now);
  assert.equal(avg.sampleCount, 1);
  assert.equal(avg.coverageHours, 25 / 60);
  assert.ok(Math.abs(avg.grossUsdDay - 43.2) < 1e-10);
});
