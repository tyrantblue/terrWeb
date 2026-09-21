# Terraria Server Web Panel

用于管理 Terraria Dedicated Server 的轻量级 Web 面板。项目是独立前端，基于 React、TypeScript、Vite 和 Tailwind CSS，并通过 Terraria Server API v1 与服务器通信。

## 功能

- 服务器状态、版本、端口、世界时间、种子和在线人数
- 玩家列表、广播消息、踢出与封禁，以及 banlist 查看与解封
- 实时控制台、结构化日志、断线重连与游标补偿，附命令审计记录
- 世界上传进度、切换进度、手动备份与删除
- 长任务历史（重启、切换世界、恢复备份）与进度跟踪
- 一键重启服务器（二次确认，保存世界后重启）
- 资源与在线人数趋势（API 2.0.0+ 的 `GET /api/v1/metrics`）：CPU / 内存 /
  在线人数曲线与磁盘可用进度条，支持 1h / 6h / 24h 窗口；字段为 `null`
  时曲线断开并提示，不会画成 0
- 世界列表显示尺寸、难度与创建时间（API 2.0.0+ 的 `world.metadata`），
  损坏或过旧的 `.wld` 显示为「未知」且不影响切换/备份/删除
- 持久化服务器配置与低玩家上限二次确认
- 备份恢复、定时任务、连接守卫和事件通知
- 控制台心跳（后端 1.4.2+）：日志管道停更时在 Dashboard 与 Scheduler 上红色告警，
  Dashboard 同时读取 `GET /api/v1/server` 的 `log_stalled` / `log_age`；
  对应 webhook 事件在 2.0.0 起改名为 `log_stalled`（旧名 `console_stalled` 仍兼容），
  在 Notifications 页按 error 级展示
- API 版本握手与兼容性提示

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router
- Radix UI
- Lucide React
- Cloudflare Workers Static Assets

## 开发环境

建议使用 Node.js 22+ 与 pnpm 11+。

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

本地预览：

```bash
pnpm preview
```

## API 配置

后端地址通过 `VITE_API_BASE_URL` 配置：

| 值 | 含义 |
| --- | --- |
| `/`（默认） | **同源**：请求打到面板自己的源，由同源反代把 `/api/*` 转给后端 |
| `https://api.example.com` | 后端在另一个源（两端协议须一致，且后端要允许 CORS） |
| 不设置 | 同样默认同源（`window.location.origin`） |

| 文件 | 用途 |
| --- | --- |
| `.env.production` | 生产构建（`pnpm build` / `pnpm run deploy`）使用的后端地址，默认 `/` |
| `.env.example` | 变量说明；复制为 `.env.local` 可覆盖本地开发地址 |
| `src/api/client.ts` | 解析逻辑与兜底默认值 `DEFAULT_API_BASE_URL` |

**推荐部署方式**：面板静态文件 + `/api` 反代挂在**同一个域名/端口**后面（后端仓库
`docker-compose.yml` 里的 `terraria-panel` 服务就是这个）。请求走相对路径，既没有
Mixed Content，也不需要 CORS。

```bash
# .env.production —— 同源部署（推荐）
VITE_API_BASE_URL=/

# 单独部署到别的源（例如 Cloudflare Workers）时必须写死后端域名，
# 否则 `/` 会让面板去请求自己源下的 /api/* 而 404：
VITE_API_BASE_URL=https://terraria-api.tyrantblue.xyz
```

注意：Vite 在**构建时**把 `VITE_*` 变量内联进产物，所以改地址必须重新构建并重新部署，改完 `.env` 不会影响已经发布的 bundle。值不要带结尾斜杠（代码会自行去掉）。

面板请求会携带 `X-Client-Version`，并在启动时调用 `/api/meta` 检查 API 兼容性。可以在构建时使用 `VITE_APP_VERSION` 覆盖面板版本。

> 面板是纯 SPA，API 请求由**浏览器**直接发出。面板走 HTTPS 却直接调
> `http://IP:8080` 会被浏览器以 Mixed Content 拦掉（给裸 IP 配有效证书也走不通），
> 所以跨源时两端必须同为 HTTPS；更省事的做法就是上面的同源反代。

后端实现、部署、环境变量和接口契约由独立后端仓库维护，本仓库不再复制后端说明：

- [后端仓库](https://github.com/tyrantblue/terraria-server)
- [API 文档](https://terraria-api.tyrantblue.xyz/docs)
- [OpenAPI 契约](https://terraria-api.tyrantblue.xyz/openapi.json)
- [API 变更记录](https://github.com/tyrantblue/terraria-server/blob/main/docs/api/CHANGELOG.md)
- [前端迁移指南](https://github.com/tyrantblue/terraria-server/blob/main/docs/api/frontend-migration.md)

接口类型或行为有疑问时，以 OpenAPI 契约和后端仓库文档为准。

## 页面结构

| 页面 | 用途 |
| --- | --- |
| Dashboard | 服务器概览、保存世界、时间控制和重启 |
| Worlds | 世界上传、切换、备份和删除 |
| Players | 在线玩家、连接地址、踢出、封禁、解封和广播 |
| Console | 实时日志、允许的服务器命令和命令审计 |
| Operations | 长任务历史、备份恢复、定时任务、连接守卫和通知 |
| Settings | 持久化服务器配置 |

## 部署

项目包含 Cloudflare Wrangler 配置。部署命令会先执行生产构建：

```bash
pnpm build && pnpm exec wrangler deploy
# 等价写法：pnpm run deploy
```

注意：`deploy` 与 pnpm 内置的 `pnpm deploy <target>` 同名，直接执行 `pnpm deploy`
会报 `ERR_PNPM_INVALID_DEPLOY_TARGET`，必须走 `pnpm run deploy` 或直接调用 wrangler。

部署需要 `CLOUDFLARE_API_TOKEN`（Account → Workers Scripts → Edit）与
`CLOUDFLARE_ACCOUNT_ID`。

也可以将 `pnpm build` 生成的 `dist/` 部署到任意静态托管平台。SPA 托管需要把未知路径回退到 `index.html`。

## 安全

该面板可以发送服务器命令、修改配置、恢复备份和管理连接守卫。生产环境应在 API 与面板前配置身份认证和访问控制，例如 Cloudflare Access、VPN 或受限反向代理。

不要把具备管理能力的 API 无保护地暴露到公网。

## 验证

```bash
pnpm build
pnpm lint
```

本仓库目前**没有自动化测试**：`package.json` 里没有 `test` 脚本，没有
Playwright / Vitest 依赖，也没有任何测试文件或 CI workflow。因此
提交信息或文档里出现的「N 项 Playwright 检查通过」这类数字**在仓库内无法复现**，
既不能回归，也无法在 CI 里守住。

如果需要回归保障，建议把那个 harness 一并提交（最小可跑的内容：
6 个路由能渲染、`/next` 这类未知路径重定向回 Dashboard、`/api/meta` 握手成功、
以及 `/api/v1/metrics` 的 null / 空 buffer / 能力缺失三条分支）。

## License

This project is intended primarily for personal use.

Terraria is developed by Re-Logic. This project is independent and is not affiliated with or endorsed by Re-Logic.
