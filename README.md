# Terraria Server Web Panel

用于管理 Terraria Dedicated Server 的轻量级 Web 面板。项目是独立前端，基于 React、TypeScript、Vite 和 Tailwind CSS，并通过 Terraria Server API v1 与服务器通信。

## 功能

- 服务器状态、版本、端口、世界时间、种子和在线人数
- 玩家列表、广播消息、踢出与封禁，以及 banlist 查看与解封
- 实时控制台、结构化日志、断线重连与游标补偿，附命令审计记录
- 世界上传进度、切换进度、手动备份与删除
- 长任务历史（重启、切换世界、恢复备份）与进度跟踪
- 一键重启服务器（二次确认，保存世界后重启）
- 持久化服务器配置与低玩家上限二次确认
- 备份恢复、定时任务、连接守卫和事件通知
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

默认 API 地址位于 `src/api/client.ts`：

```ts
export const API_BASE_URL = 'https://terraria-api.tyrantblue.xyz'
```

面板请求会携带 `X-Client-Version`，并在启动时调用 `/api/meta` 检查 API 兼容性。可以在构建时使用 `VITE_APP_VERSION` 覆盖面板版本。

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

## License

This project is intended primarily for personal use.

Terraria is developed by Re-Logic. This project is independent and is not affiliated with or endorsed by Re-Logic.
