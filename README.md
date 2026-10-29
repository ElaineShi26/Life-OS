# Life OS

个人生活操作系统。目标、任务、记录存在自己的云端数据库，换任何设备打开都是同一份。

**线上地址**：https://life-os-74b.pages.dev
**备用**：https://elaineshi26.github.io/Life-OS/（纯本地模式，无同步）

## 五个板块

| | 板块 | 层级 | 回答的问题 |
|---|---|---|---|
| 01 | 目标 | 战略 | 一年要什么（目标 · 项目 · 里程碑 · 关键决策 · 数值曲线） |
| 02 | 周计划 | 战术 | 这周推什么（三个重点 · 七天） |
| 03 | 执行 | 行动 | 今天做什么（可挂项目的任务） |
| 04 | 记录 | 事实 | 发生了什么（时间线 · 今日状态打卡） |
| 05 | 复盘 | 反思 | 学到什么（周复盘） |

## 数据模型

三层结构，进度自动汇总：

```
goal 年度目标
  └ project 项目（带权重）
      ├ milestone 里程碑
      ├ decision 关键决策
      └ task 任务
```

目标分两种：

- **成果型**：有终点，进度 = 项目的加权平均
- **数值型**：拉曲线（体重、存款），进度 = (当前值 − 起始值) / (目标值 − 起始值)

每个目标顶部是**双轨进度**：实际进度 vs 年内时间进度。两者对齐才算在正轨上，光看进度条会骗人。

## 架构

```
浏览器 (Vite + Preact)
   │  cookie 会话（90 天）
   ├── /api/auth/github    跳转 GitHub 授权
   ├── /api/auth/callback  换 token、建会话
   ├── /api/auth/me        当前用户
   ├── /api/auth/logout
   └── /api/state          GET 拉整库 / PUT 写整库
          │
          ▼
Cloudflare Pages Functions → D1 (SQLite)
```

- 登录：GitHub OAuth，只有本人能进
- 存储：一个用户一行 state，整库同步（后写覆盖）
- 离线：本地始终写一份 `localStorage`，断网不丢数据
- 没有后端时（本地 dev / 纯静态托管）自动降级为纯本地模式

## 本地开发

```bash
npm install
npm run dev              # http://localhost:5173（无后端，本地模式）
npx wrangler pages dev dist   # 带 Functions + D1 的完整本地环境
```

源码在 `src/`，`src/index.html` 是模板，后端在 `functions/`。

## 发布

```bash
npm run build
npx wrangler pages deploy dist --project-name life-os --branch main
```

## 数据库

```bash
npx wrangler d1 execute life-os --remote --file=schema.sql    # 建表
npx wrangler d1 execute life-os --remote --command "SELECT ..."  # 查询
```

表：`users` / `sessions` / `states`。

## 环境变量

在 Cloudflare Pages 项目里配（`wrangler pages secret put`）：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

GitHub OAuth App 的回调地址必须精确匹配：`https://<domain>/api/auth/callback`。

## 数据迁移

旧版（v1 单文件）→ v2 → 云端，路径都在 `src/store/migrate.js`。首次登录时如果云端为空而本地有数据，会自动推上去。
