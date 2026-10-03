当前网站：https://doudou-hash.vercel.app/ ，仓库：https://github.com/wxte/hash

# PRL vs Quantus 挖矿收益对比

轻量中文单页网站，对比 CMP 30HX / 40HX / 50HX、RTX 3060 / 3060 Ti / 4060 / 4060 Ti 的实时收益和过去 24 小时平均收益。算力、两种币各自的功耗、电价可调整，汇率自动更新；矿池费固定为 1%，设置保存在当前浏览器。

原 ChatGPT 对话中的 ZIP 未提供到本工作区，此版本按原功能描述重建。

## 计算方式

- PRL 优先 PearlSonar 24h emission ÷ network hashrate。主源不可访问时使用 [Pearlchain 公共 API](https://pearlchain.live/api-docs) 的当前奖励 × 86400 ÷ 近期平均出块秒数 ÷ 全网算力；备用源是近期区块速率推算，可能与实际 24h 发行量存在差异，页面显示实际使用的数据源。输入算力为 TH/s。
- Quantus（本页沿用 QTC 标签）单位日产出 = QTCScan 24h 区块数 × 当前区块奖励 ÷ 24h 全网算力。输入算力为 MH/s。这是全网估算，不是矿池实际到账。
- 价格优先 SafeTrade 的 PRL/USDT、QUANTUS/USDT，失败则使用 CoinGecko 的 `pearl-2` / `quantus` 美元价。USDT 报价按 1 USD 换算。CoinGecko 或 QTCScan 超过 30 分钟未更新会跳过，不当作新行情。
- 每个成功快照保存采集时间、价格、每 H/s 日产出及数据源。默认存储去重到每个 10 分钟时段一条，每币保留最近 26 小时。
- 折减后日产 = 单位日产出 × 显卡算力 × 0.98（内核）× 0.98（网络波动），合计保留 96.04%。
- 毛收益/天（元）= 折减后日产 × 同一快照美元价格 × 最新 USD/CNY 汇率。
- 净收益/天（元）= 毛收益 × 0.99 − 功耗 W ÷ 1000 × 24 × 电价（元/度）。内核与网络损失不再重复扣。
- 24h 平均：在过去 24 小时窗口内，快照收益率持续到下一条快照，最长延续 20 分钟，按覆盖时间加权；更长缺口排除，不补零。先算每个时刻的“价格 × 产出”，再平均。
- 实时栏是最近 20 分钟内的有效样本。过期样本仍可参与历史均值，但实时栏显示不可用。
- 样本数与实际覆盖时长按币分别显示。初次上线需要累积，未满 24h 会标注“积累中”。平均数字表示有效覆盖时段的平均日产收益率，不代表已经实际赚到的金额。
- 修改算力、电价后，历史平均会按当前设置重新计算。默认算力/功耗是可编辑参考预设；汇率优先 Yahoo Finance 最新 USD/CNY 市场报价，每约 10 分钟抓取并持久化；备用 ExchangeRate-API 是每日参考汇率，页面标明来源和报价时间。周末/休市时使用最新可用报价，不伪装成交实时更新。汇率失败保留上次有效值并提示，超过 7 天不再使用；首次无有效汇率时人民币收益显示不可用。过去 24h 的美元收益均值按当前最新汇率换算，不是历史汇率逐点换算。

采集脚本在 GitHub 运行；PRL 主数据站可能对云服务器返回 403，因此配置 Pearlchain 公开 JSON 备用源；不需要在 Actions 安装 npm 依赖。失败币种不写入历史，工作流会报告失败，便于发现部分数据源异常。

## 存储与后台采集

默认使用网站专用 **Vercel Private Blob** 保存一个小型 JSON 历史文件；ETag 条件写入防止并发覆盖，首次采集自动初始化，不需要建表。也支持专用 Upstash Redis（设置 Redis 变量后会优先使用 Redis）。

Vercel Hobby 原生 Cron 不支持每 10 分钟。因此本版本用 GitHub Actions 每小时的 03 / 13 / 23 / 33 / 43 / 53 分钟获取行情，再向受密钥保护的采集接口提交快照；网页无人访问也会保存数据。GitHub 定时任务可能排队或漏跑，覆盖时长会如实反映；公共仓库长期无活动时需重新启用工作流。参考 [Vercel Cron 限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)、[GitHub schedule 说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## 从零部署：不需要本地装开发软件

### 1. 上传到 GitHub

1. 登录 GitHub，创建仓库。
2. 解压 ZIP，确认 `index.html`、`package.json`、`api`、`lib` 等在项目根目录。
3. 上传全部源文件，尤其是 `.github/workflows/collect.yml` 和 `.github/scripts/collect.mjs`。不要上传 `.env.local`、`.vercel`、`node_modules`。
4. 确认仓库默认分支是 `main`，点击 **Actions**，允许工作流运行。

### 2. 创建 Vercel 项目

1. 登录 [Vercel](https://vercel.com/)，点击 **Add New → Project**。
2. 选择刚才的 GitHub 仓库，点击 **Import**。
3. **Framework Preset** 选择 **Other**，**Root Directory** 留在仓库根目录。Build Command / Output Directory 不启用自定义值。
4. 点击 **Deploy**。首次部署没有存储时网页会提示尚未连接；下面完成存储后重新部署。

### 3. 创建网站专用存储

1. 打开该 Vercel 项目，进入 **Storage**，点击 **Create Database / Connect Store**。
2. 选择 **Blob**，创建新存储，Access 选择 **Private**，名称可用 `hash-history`。
3. 连接到网站项目，选择 Production、Preview、Development。Vercel 自动添加 `BLOB_READ_WRITE_TOKEN`，不要把它放到网页或 GitHub 源码。
4. 无需 SQL、导入或初始化命令，首次成功采集自动创建历史文件。新部署不会清空历史；删除存储会清空历史。

### 4. 配置采集密钥

1. 在 Vercel 项目 **Settings → Environment Variables** 添加 `CRON_SECRET`，填入一串至少 32 个字符的随机密码。
2. 勾选 Production（本地/预览采集也需要则一并选相应环境），保存。
3. 进入 **Deployments**，对生产部署选择 **Redeploy**，让存储及密钥生效。
4. 复制生产网址，例如 `https://your-site.vercel.app`，不要复制仅管理员可看的预览网址。
5. 在 GitHub 仓库 **Settings → Secrets and variables → Actions → New repository secret** 添加：
   - `SITE_URL`：生产网址，不带末尾 `/`。
   - `COLLECT_SECRET`：与 Vercel 的 `CRON_SECRET` 完全一致。

### 5. 第一次采集与日常使用

1. GitHub 仓库 **Actions → Collect mining market snapshots → Run workflow → Run workflow**。
2. 等本次任务出现绿色勾。若失败，点进任务查看原因，先检查两个 Secret、Vercel 环境变量和是否重新部署。
3. 打开网站点击右上角刷新。会看到实际行情、显卡实时毛/净收益、平均毛/净收益和样本数。
4. 平均从第一次有效采集开始积累，约一天后才可能覆盖完整 24h；有断档时覆盖可能不足 24h。
5. 之后只需网页上输入电价、显卡实测算力和两种币各自的功耗。电价单位是 **元/度**，例如电费 0.6 元/度直接输入 `0.6`；币价和毛/净收益全部以人民币显示。旧浏览器保存的美元电价会按当时保存的汇率转换一次，保留原电费金额。
6. 改源代码并提交到 `main`，成功连接仓库的 Vercel 项目会自动重新部署。换生产域名时同步修改 GitHub 的 `SITE_URL`。

## 环境变量汇总

| 服务 | 变量 | 是否需要 | 说明 |
| --- | --- | --- | --- |
| Vercel | `BLOB_READ_WRITE_TOKEN` | 默认需要 | 连接 Private Blob 后自动生成 |
| Vercel | `CRON_SECRET` | 需要 | 采集接口密钥，不加 `NEXT_PUBLIC_` 前缀 |
| GitHub Actions | `SITE_URL` | 需要 | 公共生产网址 |
| GitHub Actions | `COLLECT_SECRET` | 需要 | 与 `CRON_SECRET` 相同 |
| Vercel | `UPSTASH_REDIS_REST_URL` | 可选 | 专用 Redis 的 REST URL |
| Vercel | `UPSTASH_REDIS_REST_TOKEN` | 可选 | 专用 Redis 的 REST Token；与 URL 一起配置时优先使用 Redis |

也兼容原 Vercel KV 的 `KV_REST_API_URL` / `KV_REST_API_TOKEN`。切换存储不会自动迁移旧历史。

## Vercel Pro 用户

如果需要用 Vercel 原生定时器，可将 `vercel.json` 中 `crons` 改为 `[{ "path": "/api/collect", "schedule": "*/10 * * * *" }]`，保留函数配置并禁用 GitHub 定时工作流，避免重复采集。原生 Cron 会自动携带 `CRON_SECRET`。

## 本地开发与验证

安装 Node.js 24 和 npm。执行 `npm ci`，复制 `.env.example` 为 `.env.local` 并填环境变量；执行 `npm test` 验证积分、窗口边界、断档、同一时刻价格/产出的配对、无效记录和重复采集等逻辑。`npm run dev` 在 http://127.0.0.1:3000 启动本地页面与接口预览，普通静态预览不会运行 `/api`。

接口：`GET /api/stats` 读取并计算；`GET /api/collect` 在服务器获取行情；`POST /api/collect` 接受定时任务提供的有效快照。两者都必须带 `Authorization: Bearer <CRON_SECRET>`。

## PRL 默认参数依据（2026-10-03 修正）

| 显卡 | PRL TH/s | 参考功耗 W | 参数依据与条件 |
| --- | ---: | ---: | --- |
| CMP 30HX | 1 | 75 | Kryptex 列示约 1 TH/s；功耗暂作参考预设，按实测填写。未发现 RGminer 解锁名单支持 30HX。 |
| CMP 40HX | 40 | 150 | RGminer 早期发布表，解锁及相应驱动/矿工条件；不是未解锁保证值。 |
| CMP 50HX | 64.87 | 210 | RGminer 早期发布表，解锁及相应驱动/矿工条件；采用保守预设。 |
| RTX 3060 | 42.05 | 99 | Hashrate.no SRBMiner 2026-08-24，Samsung 12GB，1560 MHz 核心、5001 MHz 显存。 |
| RTX 3060 Ti | 55 | 140 | Vminer 矿池样本表的 SRBMiner 3.6.8 参考值；具体显存/设置会变化。 |
| RTX 4060 | 57 | 110 | 保留原参考预设。 |
| RTX 4060 Ti | 70 | 145 | 保留原参考预设。 |

资料：[30HX](https://www.kryptex.com/en/hardware/nvidia-cmp-30hx)、[RGminer 发布记录](https://github.com/Printscan/rgminer/releases)、[CMP 解锁说明](https://github.com/Printscan/rgminer/releases/tag/v1.0.2)、[3060](https://www.hashrate.no/gpus/3060/PRL)、[3060 Ti 矿池样本](https://www.vminers.com/en/gpu-hashrate/)。新版本矿工的优化/超频数据可能更高，但不能当作所有矿机均能达到的算力。

浏览器旧缓存中仍等于旧默认的 PRL 算力和功耗会自动更新；其他自定义数值、电价、QTC 参数保持。某个自定义值恰好等于旧默认时无法区分，也会迁移，请按实测再填写。
