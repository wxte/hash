import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { getRedis } from './redis.js';
import { STORAGE_PREFIX } from './config.js';
import { emptyHistory, mergeHistory } from './history.js';

const PATH = 'hash/market-history.json';
const hasRedis = () => Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));

async function readBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('网站的历史存储尚未连接');
  try {
    const result = await get(PATH, { access: 'private', useCache: false });
    if (!result) return { data: emptyHistory(), etag: null };
    const data = await new Response(result.stream).json();
    if (data.schema !== 1 || !Array.isArray(data.prl) || !Array.isArray(data.qtc)) throw new Error('历史存储数据格式不支持');
    return { data, etag: result.blob.etag.replace(/^W\//, '') };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { data: emptyHistory(), etag: null };
    throw error;
  }
}

export async function readHistory() {
  if (!hasRedis()) return (await readBlob()).data;
  const redis = getRedis();
  const start = Date.now() - 26 * 60 * 60_000;
  const [prl, qtc, status, fx] = await Promise.all([
    redis.zrange(`${STORAGE_PREFIX}:prl`, start, '+inf', { byScore: true }),
    redis.zrange(`${STORAGE_PREFIX}:qtc`, start, '+inf', { byScore: true }),
    redis.get(`${STORAGE_PREFIX}:collection-status`),
    redis.get(`${STORAGE_PREFIX}:fx`),
  ]);
  return { schema: 1, prl, qtc, fx, collectionStatus: typeof status === 'string' ? JSON.parse(status) : status };
}

export async function saveCollection(update) {
  if (hasRedis()) {
    const redis = getRedis();
    const writes = ['prl', 'qtc'].filter((coin) => update[coin]).map((coin) => redis.zadd(`${STORAGE_PREFIX}:${coin}`, { score: update.ts, member: JSON.stringify({ ts: update.ts, ...update[coin] }) }));
    await Promise.all(writes);
    await Promise.all(['prl', 'qtc'].map((coin) => redis.zremrangebyscore(`${STORAGE_PREFIX}:${coin}`, 0, update.ts - 26 * 60 * 60_000)));
    if (update.fx) await redis.set(`${STORAGE_PREFIX}:fx`, update.fx, { ex: 604800 });
    await redis.set(`${STORAGE_PREFIX}:collection-status`, { ts: update.ts, errors: update.errors || {}, saved: { prl: Boolean(update.prl), qtc: Boolean(update.qtc) } }, { ex: 172800 });
    return;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, etag } = await readBlob();
    const merged = mergeHistory(data, update);
    try {
      await put(PATH, JSON.stringify(merged), {
        access: 'private', addRandomSuffix: false, contentType: 'application/json',
        cacheControlMaxAge: 60, ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      });
      return;
    } catch (error) {
      if (attempt < 2 && (error instanceof BlobPreconditionFailedError || /already exists/i.test(error.message))) continue;
      throw error;
    }
  }
}
