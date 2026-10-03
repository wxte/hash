import { decodeFx } from './fx.js';
import { decodeSnapshot } from './snapshot.js';

export function validateCollection(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || !Number.isFinite(body.ts) || body.ts < now - 5 * 60_000 || body.ts > now + 60_000) throw new Error('采集时间无效或快照已过期');
  const update = { ts: body.ts, errors: {}, prl: null, qtc: null };
  for (const coin of ['prl', 'qtc']) {
    if (body[coin] != null) {
      const snapshot = decodeSnapshot({ ...body[coin], ts: body.ts });
      if (!snapshot) throw new Error(`${coin.toUpperCase()} 快照无效`);
      update[coin] = {
        priceUsd: snapshot.priceUsd, coinPerHashDay: snapshot.coinPerHashDay,
        priceSource: String(snapshot.priceSource || '采集器').slice(0,50),
        source: String(snapshot.source || '全网估算').slice(0,200),
        sourceName: String(snapshot.sourceName || (coin === 'prl' ? 'PRL 浏览器' : 'QTCScan')).slice(0,50),
      };
    }
    if (typeof body.errors?.[coin] === 'string') update.errors[coin] = body.errors[coin].slice(0,500);
  }
  if (body.fx != null) {
    update.fx = decodeFx(body.fx, now);
    if (!update.fx) throw new Error('汇率快照无效');
  }
  if (typeof body.errors?.fx === 'string') update.errors.fx = body.errors.fx.slice(0,500);
  if (typeof body.errors?.all === 'string') update.errors.all = body.errors.all.slice(0,1000);
  if (!update.prl && !update.qtc && !Object.keys(update.errors).length) throw new Error('快照没有有效数据或错误状态');
  return update;
}
