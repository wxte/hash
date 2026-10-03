import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFx } from '../lib/fx.js';
import { mergeHistory } from '../lib/history.js';
import { PRODUCTION_FACTOR } from '../lib/config.js';
const now = Date.now();
const fx = { usdCny: 7, asOf: now, fetchedAt: now, source: 'test' };
test('invalid and expired FX never becomes zero, valid holiday quote is retained', () => {
  for (const value of [null, { ...fx, usdCny: 0 }, { ...fx, usdCny: Infinity }, { ...fx, asOf: now - 8 * 86400000 }, { ...fx, asOf: now + 120000 }]) assert.equal(decodeFx(value, now), null);
  assert.equal(decodeFx({ ...fx, asOf: now - 2 * 86400000 }, now).usdCny, 7);
});
test('FX source outage and delayed collection preserve last successful quote', () => {
  const first = mergeHistory({}, { ts: now, fx });
  const failed = mergeHistory(first, { ts: now + 1000, errors: { fx: 'timeout' } });
  assert.equal(failed.fx.usdCny, 7);
  const delayed = mergeHistory(failed, { ts: now - 1000, fx: { ...fx, usdCny: 6, fetchedAt: now - 1000 } });
  assert.equal(delayed.fx.usdCny, 7);
});
test('production independently deducts kernel and network losses', () => {
  assert.equal(PRODUCTION_FACTOR, 0.9603999999999999);
  const grossCny = 10 * PRODUCTION_FACTOR * 2 * 7;
  const netCny = grossCny * 0.99 - 100 / 1000 * 24 * 0.6;
  assert.ok(Math.abs(netCny - 131.67144) < 1e-8);
});
