# Life OS

个人生活操作系统。数据只存在你浏览器本地，无账号、无追踪。

**线上地址**：https://elaineshi26.github.io/Life-OS/

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

## 技术栈

- Vite + Preact + Signals
- 无后端，数据存 `localStorage`
- 生产产物压缩后约 24 KB

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

源码在 `src/`，`src/index.html` 是模板。

## 发布

```bash
./scripts/publish.sh
git add -A && git commit -m "..." && git push
```

脚本把构建产物同步到仓库根目录（`index.html` + `assets/`），GitHub Pages 用「分支 / 根目录」直接发布，约 1 分钟后生效。

## 数据

存在浏览器 `localStorage`，**绑定访问地址**。不同地址是独立数据仓，换地址前先用「导出」存 JSON。

旧版（v1 单文件）的数据会自动迁移到 v2，代码在 `src/store/migrate.js`。旧版本归档在 `legacy/v1-single-file.html`。
