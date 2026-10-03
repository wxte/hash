import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCollection } from '../lib/collection.js';
const now = 10_000_000;
test('authenticated snapshot input rejects invalid values and old timestamps', () => {
  for (const body of [null, {}, {ts:now,qtc:{priceUsd:0,coinPerHashDay:1}}, {ts:now-600_000,qtc:{priceUsd:1,coinPerHashDay:1}}, {ts:now+120_000,qtc:{priceUsd:1,coinPerHashDay:1}}]) assert.throws(()=>validateCollection(body,now));
});
test('partial success and complete failure statuses never create zero samples', () => {
  const update=validateCollection({ts:now, qtc:{priceUsd:150,coinPerHashDay:1e-11},errors:{prl:'timeout'}},now);
  assert.equal(update.prl,null);
  assert.equal(update.qtc.priceUsd,150);
  const failed=validateCollection({ts:now,errors:{all:'timeout'}},now);
  assert.equal(failed.prl,null);
  assert.equal(failed.qtc,null);
});
