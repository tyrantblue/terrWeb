# terrWeb UI v2 — 泰拉瑞亚官网风格重构方案

> 状态：**P0 + P1 已完成**（骨架 + 组件套件），P2 完成 Dashboard 一格用于验证路线。
> 现有 UI 的**源码**一行未改，全部新增在 `src/v2/` 与 `/next/*` 路由下。
> 注意：v2 的样式表目前**无条件打进同一份产物**（`src/App.tsx` 顶层 import），
> 所以旧路由也会下载并解析它（CSS 约 +16KB，占 67KB 的 24%）；
> 样式本身全部限定在 `.ter-theme` 下，不会影响旧 UI 的渲染。
> 目标：新建一套模仿 https://terraria.org/ 视觉语言的 UI 入口，与现有 UI 并存，逐步替换。

## 已完成（代码在 `src/v2/`）

| 内容 | 位置 |
| --- | --- |
| 设计令牌（实测自官网） | `src/v2/theme/tokens.css` |
| 程序化纹理（皮革/木纹/像素草带/绳结） | `src/v2/theme/textures.css` |
| 页面底 + 排版 + 滚动条 + 焦点 | `src/v2/theme/base.css` |
| 组件 chrome（面板/木牌按钮/徽章/输入/导航板/对话框…） | `src/v2/theme/components.css` |
| 美术来源切换（自绘 / 官网运行时 / 自定义） | `src/v2/theme/assets.ts` |
| 23 个自绘 12×12 像素图标 | `src/v2/ui/TerIcon.tsx` |
| 组件套件 | `src/v2/ui/index.tsx` |
| v2 外壳（wordmark + 木质导航板 + 页脚） | `src/v2/layouts/V2Layout.tsx` |
| 实时数据 Dashboard（复用现有 provider） | `src/v2/pages/V2Dashboard.tsx` |
| 组件总览页（供挑样） | `src/v2/pages/KitchenSink.tsx` |

入口：`/next`（Dashboard）、`/next/kit`（组件总览）、其余 5 个 section 为占位页。
右上角「眼睛」按钮切换美术来源。

**验证（可复现的部分）**：`pnpm build` 与 `pnpm lint` 通过。
`tokens.css` / `textures.css` / `base.css` / `components.css` 中除全局 `@keyframes ter-spin`
外，**没有任何选择器落在 `.ter-theme` 之外**，因此 v2 样式无法影响旧 UI；Google Fonts
由 `V2Layout` 在挂载时注入、卸载时移除，旧路由不会请求它。

> 注意：本仓库**没有**任何自动化测试（无 test 脚本、无 Playwright 依赖、无测试文件）。
> 早期版本的本节曾写「16 项 v2 断言 + 原有 7/8 个 Playwright 套件全部通过」，
> 这个说法无法在仓库内复现，已删除。要做回归保障需要先引入测试设施。


## 决策记录

1. 入口用 `/next` 路由前缀（一份产物，`wrangler.json` 不动）
2. 严格照官网字体：Open Sans（标题 w500 / 正文），无像素字体
3. 美术来源：**默认自绘**，可切换到官网资源（运行时加载，不入库）或自定义 URL
4. 图标：自绘 12×12 像素 sprite（23 个），官网 PNG 仅在存在映射时替换
5. 全站统一一张背景，不做按页面换群系

---

## 1. 官网的视觉 DNA（实测，非猜测）

我拉取了官网的 HTML / CSS / JS bundle（`main.61ebd860.chunk.js`、`main.19331e32.chunk.css`），
并用 Playwright 取了计算样式 + 截图 + 拆了它的图片资源。结论：

### 1.1 关键计算样式

| 项 | 实测值 |
| --- | --- |
| 页面底色 | `#0a0a0a` |
| 背景图 | 单张 `background.jpg`，`background-size: cover`、`background-position: 50% 0%`、**`attachment: fixed`** |
| 标题字 | Open Sans，26px / 18px，weight 500，色 **`#d6ffe4`（淡薄荷绿）** |
| 正文字 | Open Sans，17px，色 **`#f6ffe3`（淡奶油黄）**，行高 20.4px（1.2） |
| 字体来源 | Google Fonts：Open Sans、Merriweather |
| 导航 | **图片**（`buy_bar.png` 木/铁横板 + `buy_icons.gif` 雪碧图，靠 `background-position` 切帧） |

### 1.2 图片资源清单（35 个 `/static/media/*`）

官网的"泰拉味"几乎**全靠图片**，不是 CSS 描边：

- **面板**：`middle.jpg` / `bottom.jpg` / `news_block.jpg` / `info_panel.jpg` —— 暖棕皮革纹理，
  1px 浅色内描边 + 金褐色外描边 + 边缘压暗（bevel）
- **装饰**：`dividerfancy.png`（灰色白描花草纹章分隔线）、`separator-desktop.png`、
  `mid_title.jpg` / `galleries_title.jpg`（标题木牌）
- **渐变/过渡**：`fade_in.jpg` / `fade_out_dark.png`
- **9 宫格/卡片**：`Product_Background_Outer.jpg`（外框）/ `_Inner.png`（内衬）
- **像素图元**：`pagination/*`（9 个像素翻页按钮，含 disabled 态）、
  `PasswordVisibility/show_password.png` / `hide_password.png`、`Media/expand|collapse_icon.png`
- **Biome 视差层**（首页没用到，但资源在）：
  `Background/{Overworld,Cave,Mushroom}/layer_1.png … layer_4.jpg` + `flat.jpg`，
  以及 `Divider/overworld-cave.jpg`、`Divider/cave-mushroom.jpg`

### 1.3 截图里的构图

- 顶部居中 **Terraria 像素 logo**
- 其下一条**横向木质/金属导航板**，两端有绳结装饰，中央 `BUY` 更大并带盾牌徽章
- 主面板：暖棕底，**上下边缘有像素苔藓/藤蔓草带**（这是最标志性的一笔）
- 内容卡：白粗标题 + 浅灰正文 + 底部一行「日期（暖金）+ Read More（小图标）」
- 页脚：深色半透明条 + 奶油色小字链接
- 背景是**手绘感、低饱和、顶部发白**的生物群系场景（保证文字可读）

### 1.4 字体

游戏内 UI 用的是 **Andy Bold 的修改版**（Re-Logic 自用）。
官网正文其实用的是 Open Sans —— 也就是说官网的"泰拉感"来自**背景 + 图片边框**，而不是字体。

---

## 2. 版权红线（必须先说）

**不能把 Re-Logic 的任何图片/字体打进仓库**：logo、`Background/*`、
`middle.jpg` 这类面板纹理、`buy_icons.gif`、Andy Bold 修改版，全部是受版权保护的美术资源。

所以 v2 的做法是**用原创资源复刻"风格"，而不是搬运"素材"**：

| 需要的东西 | 方案 | 授权 |
| --- | --- | --- |
| 皮革/羊皮纸/苔藓纹理 | SVG `feTurbulence` 程序化生成 + 多层 `linear-gradient` | 自产 |
| 9 宫格边框、像素 bevel | 自绘 SVG 9-slice + `box-shadow` 阶梯 | 自产 |
| 像素图标 | 自绘 16×16 SVG sprite sheet | 自产 |
| 生物群系背景 | 自绘分层 SVG 场景（视差），或允许用户放自己的图 | 自产 |
| 像素字体 | **OFL 字体**：Silkscreen / Pixelify Sans / VT323 | OFL，可商用 |
| 正文字体 | 保持 Open Sans（或系统 UI 字体） | OFL/Apache |
| Logo | 自绘 wordmark（"Terraria Panel"），**不用**官方 logo | 自产 |

> 如果想省事，图标也可以走 [game-icons.net](https://game-icons.net/)（CC BY 3.0，需署名）。
> 但自绘 sprite 在风格一致性上更好，且没有署名负担。

---

## 3. 架构：新入口怎么开

现有代码：6 个页面共 6262 行，**373 处硬编码 Tailwind 颜色**、只有 99 处语义化 `ui-*` 类。
→ 这意味着**单纯覆盖 CSS 变量无法换肤**，页面里的 `bg-[#17191c]` / `text-gray-200` 不会跟着变。

因此 v2 采取**并行组件树**，而不是"改现有页面"。

### 3.1 入口选型

推荐 **路由前缀**（`/next/*`），理由：

- 一次构建、一份产物，`wrangler.json` 不用动（SPA fallback 已就绪）
- 新旧 UI 可以在同一域名下并排对比，方便你验收
- 旧 UI 的 `/` 完全不受影响

替代方案：**多 HTML 入口**（`v2.html` + `src/main.v2.tsx`，配 `build.rollupOptions.input`）。
好处是完全独立的 bundle（旧 UI 体积不背新主题），代价是部署配置要改、开发时多一个地址。

> 建议：先用路由前缀快速验证，等你确认风格后再决定要不要拆成独立入口。

### 3.2 目录结构（实际）

```
src/
  api/            # 不动 —— 新 UI 复用
  context/        # 不动 —— 新 UI 复用
  hooks/          # 不动
  pages/          # 旧 UI，冻结
  layouts/        # 旧 UI，冻结
  styles/ui.css   # 旧 UI，冻结
  v2/
    theme/
      tokens.css       # 作用域在 .ter-theme 下的设计令牌
      textures.css     # 程序化纹理（皮革/苔藓/石）
      base.css         # 页面底（背景层、排版、滚动条、焦点、动效降级）
      components.css   # 组件 chrome（面板/按钮/徽章/输入/导航板/对话框）
      assets.ts        # 美术来源与自绘背景
      assetContext.ts  # 把图标来源下发给 TerIcon
      index.css        # 依次 import 上面四个 css
    ui/                # 组件套件（TerPanel/TerButton/TerBadge/...）+ TerIcon
    layouts/V2Layout.tsx
    pages/             # 逐页迁移（当前 Dashboard + 组件总览 + 5 个占位）
```

**关键点**：`src/api`、`src/context`、`src/hooks` 全部复用，v2 只是重写"皮"，
不重写数据逻辑 —— 这样迁移才不会引入回归。

---

## 4. 设计令牌（草案）

作用域隔离在 `.ter-theme` 下，绝不泄漏到旧 UI。

```css
.ter-theme {
  /* 底色：官网是 #0a0a0a */
  --ter-page:            #0a0a0a;

  /* 木材/皮革面板 —— 取自 news_block.jpg 的配色关系 */
  --ter-panel:           #6b4a35;
  --ter-panel-dark:      #4a3325;
  --ter-panel-light:     #8a6a4f;
  --ter-panel-inset:     #d8c39f;   /* 1px 浅色内描边的颜色 */
  --ter-panel-outline:   #c9a227;   /* 金褐外描边 */

  /* 苔藓/藤蔓（面板上下那条草带） */
  --ter-moss:            #4a7c3f;
  --ter-moss-bright:     #7cb342;

  /* 文字：官网实测 */
  --ter-heading:         #d6ffe4;
  --ter-body:            #f6ffe3;
  --ter-muted:           #b8a98c;
  --ter-gold:            #f0c860;   /* 日期 / Read More */

  /* 语义色（保持能看懂：绿=正常、琥珀=警告、红=故障） */
  --ter-ok:              #7cb342;
  --ter-warn:            #f0a848;
  --ter-danger:          #d9534f;
  --ter-info:            #6fc3df;

  /* 形状：泰拉是像素风 → 小圆角甚至直角 */
  --ter-radius:          2px;

  /* 字体 */
  --ter-font-display:    'Silkscreen', monospace;   /* 标题/导航 */
  --ter-font-body:       'Open Sans', system-ui;    /* 数据/正文 */
}
```

映射关系（旧变量 → 新主题）也一并做一层，方便逐页迁移时对照。

---

## 5. 组件清单

v2 需要重做的（按现有 `ui-*` 对照）：

| 现有 | v2 组件 | 泰拉化处理 |
| --- | --- | --- |
| `.ui-panel` | `TerPanel` | 皮革纹理 + 内描边 + **苔藓草带**（可选 top/bottom） |
| `.ui-panel-subtle` | `TerPanel variant="inset"` | 内凹，used for 状态条 |
| `.ui-button` | `TerButton` | 木牌按钮，hover 提亮 + 1px 上移，active 下沉（像素 press） |
| `.ui-button-accent` | `TerButton tone="gold"` | 金色描边 |
| `.ui-icon-button` | `TerIconButton` | 像素方形钮 |
| `.ui-input` | `TerInput` | 内凹 + 深色底 + 像素内描边 |
| `.ui-status` | `TerBadge` | 小木牌标签，成功/警告/危险/中性 |
| `.ui-page-title` | `TerTitle` | 木牌标题 + 两侧花饰分隔 |
| （无） | `TerDivider` | 自绘花饰分隔线（替代 dividerfancy.png） |
| `.ui-dialog` | `TerDialog` | 面板 + 苔藓带 + 木质按钮 |
| `.ui-scroll-region` | 复用 + 像素滚动条 | 木纹轨道 + 金色滑块 |
| `.ui-icon-tile` | `TerIconTile` | 像素图标 + 内凹底座 |
| （无） | `TerStatTile` | 概览统计块（数值大号像素字） |
| （无） | `TerTabBar` | 木牌 tab 条（对应官网导航板） |

导航壳 `V2Layout`：顶部 logo + 横向木质导航板（对应官网那条），
移动端折叠成抽屉。侧边栏方案可以保留，但换成木质竖板。

---

## 6. 图标策略

三层，按优先级：

1. **自绘像素 sprite sheet**（16×16，SVG，`<symbol>` + `<use>`）
   —— 覆盖：服务器、玩家、世界、终端、备份、守卫、铃铛、重启、保存、时钟、日月、
   上传、删除、刷新、锁、眼睛、箭头、勾、叉、警告、播放。
   ~30 个够用，风格统一且零授权风险。
2. **保留 lucide** 作为兜底/长尾（现有依赖，不新增）。
3. 可选：game-icons.net 补充（CC BY 3.0，需在关于页署名）。

不建议直接给 lucide 加 `image-rendering: pixelated` —— 它是矢量线性图标，
放大后不会有像素感，只会糊。

---

## 7. 背景与生物群系

官网首页用单张固定图。但资源里有 Overworld / Cave / Mushroom 三套分层图，
说明**按区域换背景**是它的设计语言。建议 v2 这么做：

- 默认一张**自绘 SVG 生物群系**（天空渐变 + 远山 + 树林剪影 + 地面草丛），
  `position: fixed` + `cover`，顶部加白雾渐变保证文字可读
- **按页面切群系**（这是最出彩的一点）：
  - Dashboard → Overworld（明亮）
  - Worlds → Overworld/森林
  - Players → 村庄/营地
  - Console → **Cave/地下**（暗、带发光矿石）
  - Operations → Mushroom（紫蓝）
  - Settings → 地牢/石质
- **视差**：3~4 层 SVG，`transform: translate3d()` 跟滚动，`prefers-reduced-motion` 下关闭
- **兜底**：设置里允许用户贴自己的图片 URL（延续"面板是可自托管的"定位）

---

## 8. 分阶段

| 阶段 | 内容 | 产出 |
| --- | --- | --- |
| **P0** | 令牌 + 纹理 + `.ter-theme` 作用域 + `/next` 路由骨架 + 背景层 | 一个能进去的空壳，风格已定调 |
| **P1** | 组件套件（第 5 节那 13 个） | 一个 `/next/kitchen-sink` 预览页，供你逐项挑 |
| **P2** | 迁移 **Dashboard** + **Console**（一个亮群系、一个暗群系） | 验证"数据不动、只换皮"可行 |
| **P3** | 迁移 Worlds / Players / Operations / Settings | 功能对齐 |
| **P4** | 打磨：视差、像素动效、移动端、无障碍、对比度 | 可上线 |

每个阶段结束至少跑一遍 `pnpm build` + `pnpm lint`，并手工走一遍旧 UI 的 6 个页面确认
没有视觉回归（v2 复用同一套 API/context，理论上不该有回归，但要验证）。

> 这里原本写「跑现有 8 个 Playwright 套件」——仓库里没有这套设施（见上文注意事项）。
> 若确实需要回归保障，建议先补一个最小 Playwright 冒烟套件：
> 6 个旧路由能渲染 + `/next` 能渲染 + `/api/meta` 握手成功。

---

## 9. 需要你拍板的 5 件事

1. **入口形式**：`/next/*` 路由前缀（推荐，改动小）还是独立 `v2.html` 入口（bundle 更干净）？
2. **字体气质**：严格照官网（Open Sans 正文，靠边框出味）还是**加像素字体**做标题/导航（更"泰拉"但可读性略降）？
3. **背景来源**：自绘 SVG 生物群系（可控、零授权）／允许用户贴图／两者都要？
4. **图标**：自绘像素 sprite（推荐）还是先用 game-icons.net（快，但要署名）？
5. **群系映射**：接受第 7 节那套「按页面换群系」，还是全站统一一张背景？

---

## 10. 工作量感觉（粗略）

- P0 + P1：组件套件是主要成本，约 13 个组件 + 纹理/图标资源
- P2：2 个页面，验证路线
- P3：4 个页面，其中 Worlds(1398 行) 和 Players(1225 行) 最重
- 风险点：**像素风与信息密度冲突** —— 面板要显示大量运维数据（日志、玩家表、配置项），
  像素字体和厚边框会挤占空间。建议：**外壳像素化，数据区保持清晰的无衬线小字**，
  这也是官网自己的做法（正文用 Open Sans）。

---

## 11. 无障碍与对比度实测

口径：sRGB 相对亮度 + WCAG 2.x（含 alpha 合成）。阈值：正文 4.5:1，大字号/UI 3:1。

### 11.1 本轮已修（含修前 → 修后实测）

| 问题 | 修前 | 修后 |
| --- | --- | --- |
| `--ter-faint` 在面板 `#6b4a35` 上 | **1.89:1** | **4.77:1**（`#d3c8b0`） |
| `--ter-muted` 在面板上 | 3.42:1 | **5.54:1**（`#e2d7c0`） |
| 状态条文字压在背景图最亮处（太阳） | **1.05:1** | 底部加 `ter-plate` 底板（78% 黑） |
| `.ter-bg` 顶部遮罩 | 14% → 内容区仍 1.7–2.8:1 | **64% / 70% / 80%**（最亮处 5.0:1） |
| 页脚文字压在亮部 | 1.21:1 | 页脚底板 45% → **80% 黑** |
| `.ter-button-gold` 暗色字 vs 渐变底端 | 3.61:1 | **4.91:1**（底端 `#b4832a`） |
| `.ter-button-danger` 亮色字 vs 渐变顶端 | 3.69:1 | **4.51:1**（顶端 `#b85840`） |
| `.ter-input` 边界可辨识度 | 1.23:1 | **3.27:1**（改用 `--ter-outline` 边框） |
| `.ter-input` 焦点环 | 被同优先级 `outline:none` 吃掉 | 移除该声明，`:focus` → `:focus-visible` |
| 词标渐变最暗档 | 2.97:1 | **4.09:1**（`#96691f`） |
| `.ter-divider` 的 `margin: 0` | 吃掉 `mt-3`/`my-4`/`my-5`（4 处布局错） | 删除该声明 |
| `TerDialog` | 无焦点陷阱/初始焦点/焦点回归，注释谎称 Radix 处理 | 手写 trap + 焦点回归 + `aria-labelledby/-describedby`；注释改正 |
| 图标来源 | 弹窗可选「官网运行时」，但没有任何调用方把 `iconBase` 传进 `TerIcon`（死路径） | 新增 `assetContext`，`TerIcon` 从 context 取来源 |
| 官网美术 404 | 静默变纯黑（哈希文件名一重新部署即失效） | 预探测失败回退自绘背景，并在弹窗提示；图标 `onError` 回退 sprite |

### 11.2 仍待处理（P4）

1. **`.ter-nav` 的 `overflow-x-auto`**（`V2Layout.tsx`）会裁掉两端外扩 13px 的绳结装饰 —— 要么把
   overflow 移到内层滚动容器，要么端饰改用内边距。
2. **`backdrop-filter: blur()`**（`.ter-header` / `.ter-overlay`）在 `prefers-reduced-transparency` 下
   无降级；`.ter-wordmark` 的 `background-clip:text + color:transparent` 在强制色模式下有风险。
3. **bundle 体积**：v2 的 CSS/JS 仍无条件进主包（CSS +≈16KB，占 67KB 的 24%；JS 单 chunk ≈456KB），
   v1 路由也要下载。若要拆，需要 `/next` 路由级 `lazy()` + 动态 `import('./v2/theme/index.css')`，
   并注意 v2 规则处于无层级（unlayered）、优先于 Tailwind 的 `@layer`。
4. **Google Fonts** 由 `V2Layout` 每次挂载注入 `<link>`（离开再进入会重新解析，FOUT 重现），
   且无同意/离线开关。
5. **死代码**：`textures.css` 的 `.ter-surface/-deep/-wood`（与 `.ter-panel` 重复且已漂移）、
   `base.css` 的 `.ter-lift`、`tokens.css` 的 `--ter-info` / `--ter-nav-h` 未被引用；
   `textures.css` 中 `--ter-tex-moss` 上方还留着一句旧注释。
6. **token 与字面量两套真相**：`--ter-ok/--ter-warn/--ter-danger/--ter-info` 只在 KitchenSink 的
   行内样式里用到，组件内部仍写死字面量。
7. **文档级滚动条**：`/next` 的主滚动条在 `html`/`body` 上，`.ter-theme ::-webkit-scrollbar` 管不到，
   仍是 Classic UI 的灰色圆角条。
8. `.ter-tab` / `.ter-tabs` / `.ter-badge-*` 的**边框**对比度 1.67–1.99:1，状态另由 4.95:1 的金色
   下划线承载，按 1.4.11 可接受；若后续去掉金线需要重新评估。

