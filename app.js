import { CARD_DEFAULTS, SETTING_DEFAULTS } from './lib/config.js';
import { migratePresets, PRESET_VERSION } from './lib/preferences.js';
const defaults = { ...SETTING_DEFAULTS, presetVersion: PRESET_VERSION, cards: Object.fromEntries(CARD_DEFAULTS.map((card) => [card.id, card])) };
const KEY = 'prl-qtc-settings-v3';
let settings = loadSettings();
let timer;
const $ = (id) => document.getElementById(id);
const fmt = (x, digits = 3) => x == null || !Number.isFinite(x) ? '—' : new Intl.NumberFormat('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x);
const cny = (x) => x == null ? '—' : `¥${fmt(x, 3)}`;
const numInput = (value, label) => `<input type="number" min="0" step="any" aria-label="${label}" value="${value}">`;
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const result = structuredClone(defaults);
    const valid = (value, fallback, max = Number.MAX_VALUE) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;
    result.electricityCnyKwh = valid(saved?.electricityCnyKwh, result.electricityCnyKwh);
    if (saved?.electricityCnyKwh == null && typeof saved?.electricityUsdKwh === 'number' && Number.isFinite(saved.electricityUsdKwh) && saved.electricityUsdKwh >= 0 && typeof saved?.usdCny === 'number' && Number.isFinite(saved.usdCny) && saved.usdCny > 0) result.electricityCnyKwh = saved.electricityUsdKwh * saved.usdCny;
    for (const card of CARD_DEFAULTS) for (const key of ['prlHash', 'qtcHash', 'prlWatts', 'qtcWatts']) result.cards[card.id][key] = valid(saved?.cards?.[card.id]?.[key], card[key]);
    result.presetVersion = saved?.presetVersion;
    migratePresets(result);
    try { localStorage.setItem(KEY, JSON.stringify(result)); } catch { /* settings still work for this visit */ }
    return result;
  } catch { return structuredClone(defaults); }
}
function saveSettings() { localStorage.setItem(KEY, JSON.stringify(settings)); }
function showToast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('show'), 2200); }
function fillSettings() {
  $('electricity').value = Number(settings.electricityCnyKwh.toFixed(6));
}
function ago(ts) { if (!ts) return '暂无样本'; const m = Math.max(0, Math.floor((Date.now() - ts) / 60000)); return m < 1 ? '刚刚' : `${m} 分钟前`; }
function coverageText(data) {
  const duration = data.coverageHours >= 1 ? `${fmt(data.coverageHours, 1)} 小时` : data.coverageHours >= 1 / 60 ? `${Math.floor(data.coverageHours * 60)} 分钟` : '不到 1 分钟';
  return data.sampleCount ? `${data.sampleCount} 个有效样本 · 覆盖 ${duration}${data.coverageHours < 23.5 ? ' · 积累中' : ''}` : '尚无有效历史样本';
}

function renderSummary(data) {
  $('coin-summary').innerHTML = ['prl', 'qtc'].map((coin) => {
    const title = coin === 'prl' ? 'PRL' : 'Quantus / QTC';
    const baseline = data.cards.find((c) => c.id === 'cmp50hx')?.coins[coin];
    const current = baseline?.current;
    const avg = baseline?.average?.sampleCount ? baseline.average : null;
    const source = data.sources[coin];
    const unitOutput = current ? current.coinPerHashDay * (coin === 'prl' ? 1e12 : 1e6) : null;
    return `<article class="coin-card"><div class="coin-top"><div><div class="coin-title">${title}</div><div class="coin-sub">${source ? escapeHtml(source.sourceName) + ' 全网估算' : '等待数据'}</div></div><div class="coin-price">${current ? '$' + fmt(current.priceUsd, 3) : '—'}<small>USD · ${escapeHtml(source?.priceSource || '等待价格样本')}${current ? ' · ' + ago(current.observedAt) : ''}</small></div></div><div class="unit-output">每 ${coin === 'prl' ? 'TH/s' : 'MH/s'} 折减后日产 <b>${fmt(unitOutput, 7)}</b> ${coin.toUpperCase()}</div><div class="coverage">${avg ? coverageText(avg) : '尚无有效历史样本'}</div></article>`;
    }).join('');
}
function profitCell(item, coin, avg) {
  if (!item) return '<span class="bad">数据暂不可用</span>';
  return `<span class="profit-main ${avg ? 'avg-val' : ''}">毛 ${cny(item.grossCnyDay)} <span class="profit-sub">净 ${cny(item.netCnyDay)}</span></span>`;
}
function renderCards(data) {
  const rows = data.cards.map((card) => {
    const p = card.coins.prl, q = card.coins.qtc;
    const pNet = p.current?.netCnyDay, qNet = q.current?.netCnyDay;
    const winner = pNet == null || qNet == null ? '<span class="winner loss">缺少对比数据</span>' : Math.abs(pNet - qNet) < 0.000001 ? '<span class="winner">收益相同</span>' : pNet > qNet ? '<span class="winner prl">PRL 较高</span>' : '<span class="winner">QTC 较高</span>';
    const params = settings.cards[card.id];
    return `<tr><td><div class="gpu-name">${card.name}</div>${card.prlNote ? `<div class="profit-sub">${card.prlNote}</div>` : ''}<div class="gpu-spec"><label>PRL ${numInput(params.prlHash / 1e12, `${card.name} PRL算力`)} TH/s · ${numInput(params.prlWatts, `${card.name} PRL功耗`)} W</label><label>QTC ${numInput(params.qtcHash / 1e6, `${card.name} QTC算力`)} MH/s · ${numInput(params.qtcWatts, `${card.name} QTC功耗`)} W</label></div></td><td>${profitCell(p.current, 'prl', false)}</td><td>${profitCell(p.average.sampleCount ? p.average : null, 'prl', true)}<span class="profit-sub">${coverageText(p.average)}</span></td><td>${profitCell(q.current, 'qtc', false)}</td><td>${profitCell(q.average.sampleCount ? q.average : null, 'qtc', true)}<span class="profit-sub">${coverageText(q.average)}</span></td><td>${winner}</td></tr>`;
  }).join('');
  $('cards').innerHTML = rows || '<tr><td colspan="6" class="empty">等待第一笔成功采集。请完成定时采集部署后稍等几分钟。</td></tr>';
  document.querySelectorAll('#cards tr').forEach((row, index) => {
    const card = data.cards[index];
    row.querySelectorAll('input').forEach((input, i) => input.addEventListener('change', () => {
      const vals = [...row.querySelectorAll('input')].map((el) => Number(el.value));
      if (vals.some((v) => !Number.isFinite(v) || v < 0)) return showToast('请输入有效的非负数字');
      settings.cards[card.id] = { prlHash: vals[0] * 1e12, prlWatts: vals[1], qtcHash: vals[2] * 1e6, qtcWatts: vals[3] };
      saveSettings(); loadData(); showToast('显卡参数已保存');
    }));
  });
}
async function loadData() {
  const query = new URLSearchParams({ electricityCnyKwh: settings.electricityCnyKwh, cards: JSON.stringify(settings.cards) });
  $('refresh-label').textContent = '正在读取 / 采集…'; $('refresh').disabled = true;
  try {
    const response = await fetch(`/api/stats?${query}`, { cache: 'no-store' });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '读取失败');
    renderSummary(data); renderCards(data);
    $('fx').textContent = data.fx ? `1 USD = ${fmt(data.fx.usdCny, 4)} 元` : '汇率暂不可用';
    $('fx-time').textContent = data.fx ? `${data.fx.source}${data.fx.daily ? ' · 每日参考汇率' : ' · 最新市场报价'}${data.fx.stale ? ' · 暂用上次成功值' : ''} · ${new Date(data.fx.asOf).toLocaleString('zh-CN')}` : '等待有效汇率，人民币收益暂不计算';
    $('fx-attribution').hidden = !data.fx?.daily;
    const errors = data.collectionStatus?.errors || {};
    const recent = !Object.keys(errors).length && data.cards.every((card) => card.coins.prl.current && card.coins.qtc.current);
    $('status-pill').textContent = recent ? '数据正常' : Object.keys(errors).length ? '采集异常' : data.updatedAt ? '采集延迟' : '等待采集'; $('status-pill').className = `status-pill ${recent ? 'good' : ''}`;
    $('updated').textContent = data.updatedAt ? `最近成功采集：${new Date(data.updatedAt).toLocaleString('zh-CN')}` : '尚无成功采集记录';
    const errorHint = Object.entries({ ...errors, ...(data.refreshError ? { refresh: data.refreshError } : {}), ...(!data.fx ? { fx: '汇率不可用' } : data.fx.stale ? { fx: '汇率采集延迟，沿用上次有效报价' } : {}) }).map(([coin, message]) => `${coin.toUpperCase()}：${message}`).join('；');
    $('refresh-label').textContent = data.refreshing ? '后台补采中，稍后自动更新' : data.updatedAt ? `更新于 ${ago(data.updatedAt)}` : '等待首次采集';
    $('data-notice').hidden = !errorHint; $('data-notice').textContent = errorHint ? `采集异常：${errorHint}。失败样本未计入平均。` : '';
  } catch (error) {
    $('status-pill').textContent = '读取失败'; $('status-pill').className = 'status-pill'; $('refresh-label').textContent = '暂时无法连接';
    $('cards').innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}，稍后可点击刷新重试。</td></tr>`;
  } finally { $('refresh').disabled = false; }
}
fillSettings();
$('electricity').addEventListener('change', () => { const value = Number($('electricity').value); if (!Number.isFinite(value) || value < 0) return showToast('请填写有效电价'); settings.electricityCnyKwh = value; saveSettings(); loadData(); });
$('reset-settings').addEventListener('click', () => { settings = structuredClone(defaults); saveSettings(); fillSettings(); loadData(); showToast('已恢复默认设置'); });
$('refresh').addEventListener('click', loadData);
loadData(); setInterval(loadData, 60_000);
