import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyHistory, mergeHistory } from '../lib/history.js';
const valid = { priceUsd: 150, coinPerHashDay: 4e-11 };

test('one coin failing leaves its previous history intact and never appends zero', () => {
  const first = mergeHistory(emptyHistory(), { ts: 1_800_000, prl: valid, qtc: valid });
  const second = mergeHistory(first, { ts: 2_400_000, prl: valid, errors: { qtc: 'timeout' } });
  assert.equal(second.prl.length, 2);
  assert.equal(second.qtc.length, 1);
  assert.equal(second.qtc[0].priceUsd, 150);
  assert.equal(second.collectionStatus.saved.qtc, false);
});

test('a retry in the same ten-minute slot cannot inflate sample count', () => {
  const first = mergeHistory(emptyHistory(), { ts: 1_800_000, qtc: valid });
  const second = mergeHistory(first, { ts: 1_810_000, qtc: { ...valid, priceUsd: 160 } });
  assert.equal(second.qtc.length, 1);
  assert.equal(second.qtc[0].priceUsd, 160);
});

test('a delayed collector cannot overwrite newer history or status', () => {
  const newer = mergeHistory(emptyHistory(), { ts: 2_400_000, qtc: { ...valid, priceUsd: 160 } });
  const delayed = mergeHistory(newer, { ts: 1_800_000, qtc: valid });
  assert.equal(delayed.qtc.length, 2);
  assert.equal(delayed.collectionStatus.ts, 2_400_000);
  const sameSlot = mergeHistory(delayed, { ts: 2_410_000, qtc: { ...valid, priceUsd: 170 } });
  const older = mergeHistory(sameSlot, { ts: 2_405_000, qtc: valid });
  assert.equal(older.qtc.at(-1).priceUsd, 170);
});
