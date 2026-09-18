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
| chrome 图引用（面板三段/草带/木牌/导航/分隔线，全部运行时拉取） | `src/v2/theme/textures.css` |
| 页面底 + 排版 + 滚动条 + 焦点 | `src/v2/theme/base.css` |
| 组件 chrome（面板/木牌按钮/徽章/输入/导航板/对话框…） | `src/v2/theme/components.css` |
| 美术来源注册表（官网 chrome / pixelarticons / 自定义镜像） | `src/v2/theme/assets.ts` |
| 图标：引用远端 SVG，用 CSS mask 染色 | `src/v2/ui/TerIcon.tsx` |
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
3. 美术来源：**全部运行时引用** —— 面板/背景/logo 走官网，图标走 pixelarticons；两者都可换成自定义镜像
4. 图标：引用 pixelarticons（MIT），CSS mask 染色；**不再自绘**
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

## 2. 美术策略：全部引用，不自绘

**当前策略（已按反馈调整）**：不再自绘任何像素，所有美术都在**运行时引用**；
仓库里不存放、不打包任何图片。

| 用途 | 来源 | 授权/说明 |
| --- | --- | --- |
| 背景 / 面板三件套 / 像素草带 / 标题木牌 / 导航按钮 / logo | **terraria.org** `/static/media/*` | Re-Logic 官方美术，浏览器直接拉取，仓库不分发 |
| 图标（27 个） | **pixelarticons** via jsDelivr | MIT，`fill="currentColor"` → 用 CSS mask 染成主题金色 |
| 字体 | Google Fonts：Open Sans / Merriweather | OFL，与官网一致 |
| 面板分割线 | terraria.org `dividerfancy.png` | 官方 |

**已知风险**：官网文件名带内容哈希（`fade_in.84ea52c8.jpg`），
Re-Logic 每次重新部署都会失效。所以 `chromeBase` 可配置，
指到本地镜像即可摆脱依赖（设置里可改）。

**早期版本曾用 SVG `feTurbulence` 自绘纹理 + 自绘 12×12 像素图标，
已全部删除。**

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
      textures.css     # chrome 图引用（面板三段/草带/木牌/导航/分隔线）
      base.css         # 页面底（背景层、排版、滚动条、焦点、动效降级）
      components.css   # 组件 chrome（面板/按钮/徽章/输入/导航板/对话框）
      assets.ts        # 美术来源注册表（官网 chrome / pixelarticons / 自定义）
      assetContext.ts  # 把美术来源下发给 TerIcon
      index.css        # 依次 import 上面四个 css
    ui/                # 组件套件（TerPanel/TerButton/TerBadge/...）+ TerIcon
    layouts/V2Layout.tsx
    pages/             # 逐页迁移（当前 Dashboard + 组件总览 + 5 个占位）
```

**关键点**：`src/api`、`src/context`、`src/hooks` 全部复用，v2 只是重写"皮"，
不重写数据逻辑 —— 这样迁移才不会引入回归。

---

## 4. 设计令牌（草案）

> **本节是 P0 的初稿，已被 §2 的现行策略取代。** 实际令牌见 `src/v2/theme/tokens.css`：
> 没有像素字体（决策 2），面板不再自绘纹理，令牌只覆盖页面底/滚动条/文字/语义色/圆角/字体。
> 下面保留仅为记录当初的配色推导。

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

v2 的组件（按现有 `ui-*` 对照）。**美术来源已按 §2 改为运行时引用**，
所以"处理"一列现在指的是引用哪张官方图，而不是自绘什么：

| 现有 | v2 组件 | 实现 |
| --- | --- | --- |
| `.ui-panel` | `TerPanel` | `fade_in` + `middle`(平铺) + `fade_out_dark` 三段 + 像素草带 |
| `.ui-panel-subtle` | `TerPanel inset` | 半透明深色内凹（状态条、空状态） |
| `.ui-button` | `TerButton` | 官方 `title.jpg` 木牌，hover 提亮 / active 下沉 |
| `.ui-button-accent` | `TerButton variant="gold"` | 同一张图，`filter: saturate + brightness` |
| `.ui-icon-button` | `TerIconButton` | 同一张木牌，正方形 |
| `.ui-input` | `TerInput` | 深色内凹 + `--ter-outline` 边框 |
| `.ui-status` | `TerBadge` | 半透明小标签，五档语义色 |
| `.ui-page-title` | `TerTitlePlate` | 官方 `title.jpg` 木牌 |
| （无） | `TerSectionHeading` + `.ter-divider` | 官方 `dividerfancy.png` |
| `.ui-dialog` | `TerDialog` | 面板 + 手写焦点陷阱（v2 未使用 Radix） |
| `.ui-scroll-region` | 复用 + 像素滚动条 | 木纹轨道 + 金色滑块 |
| `.ui-icon-tile` | `.ter-icontile` | 引用图标 + 内凹底座 |
| （无） | `TerStat` | 概览统计块（三段面板 + 大号数值） |
| （无） | `TerTabs` | 木牌 tab 条（`role="group"`，不是 ARIA tabs） |

导航壳 `V2Layout`：官方 logo + 横向导航板，active 项用 `buy_bar.png` 做 nine-slice 边框。

---

## 6. 图标策略（现行）

**引用 [pixelarticons](https://github.com/halfmage/pixelarticons)（MIT），不自绘**：

- 27 个名称 → 文件 stem 的映射在 `src/v2/theme/assets.ts` 的 `ICON_STEMS`；
- 模板默认 `https://cdn.jsdelivr.net/gh/halfmage/pixelarticons@2.4.1/svg/{name}.svg`
  （**固定版本号**，不用 `@master`：图标是每次渲染拉取的，跟着分支走会无声变更或失效）；
- 远端 SVG 是 `fill="currentColor"` 的单色图形，`<img>` 无法继承 `currentColor`，
  所以 `TerIcon` 用 **CSS mask** 画出来，颜色取元素自身的 `background-color`
  （默认主题金色），一次引用即可染色，无需下载/内联/逐文件改色；
- 模板里没有 `{name}`（或自定义值为空）时，`iconUrl()` 返回空串，`TerIcon`
  只保留尺寸不绘制 —— 不会退化成一块实心方块；
- lucide 仍留给 Classic UI 使用，v2 不混用。

已实测：27 个 stem 在 `@2.4.1` 与 jsDelivr 上全部 200，且 jsDelivr 返回
`access-control-allow-origin: *`（mask 跨域可用）与一周的 `max-age`。

---

## 7. 背景（现行）

**当前实现**：单张官方 `background.ea292d81.jpg`，`position: fixed` + `cover` +
`background-position: 50% 0%`（与官网一致），上面压一层 70%→74%→82% 的黑色遮罩
（见 §11 的实测：不加遮罩时文字只有 1.1–1.6:1）。

背景图很亮，这是全站唯一需要"牺牲画面换可读性"的地方；遮罩数值就是按
"最深色的小字（`--ter-faint`）在背景最亮处也要 ≥4.5:1"反推出来的。

**尚未实现（想法保留）**：官网资源里还有 Overworld / Cave / Mushroom 三套分层图，
可以按页面切群系并做视差（Dashboard → Overworld、Console → Cave、Operations → Mushroom…）。
要做的话注意：

- 视差要在 `prefers-reduced-motion` 下关闭（`base.css` 已有全局降级）；
- 换群系必须重新核对遮罩：不同背景的亮度差很多，Cave 可能需要更轻的遮罩；
- 兜底已具备：设置里可以把 `chromeBase` 换成自建镜像（延续"面板可自托管"的定位）。

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

## 9. 仍需拍板

1. **入口形式**：`/next/*` 路由前缀（当前实现）还是独立 `v2.html` 入口（bundle 更干净）？
2. **群系映射**：要不要做「按页面换群系」（§7 只列了思路，当前全站一张官方背景）？
3. ~~美术来源~~ → 已定：全部运行时引用，默认官网 chrome + pixelarticons（§2、§6）。
4. ~~图标~~ → 已定：pixelarticons（MIT），CSS mask 染色（§6）。
5. **长期依赖**：官网文件名带内容哈希，Re-Logic 重新部署即失效。
   是否要把这 10 张图镜像到自己的域名（设置里已支持填 base URL）？

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

### 11.1 已修（含修前 → 修后实测）

第三轮把美术换成"运行时引用官网"之后，前一轮的两处修复被**重新引入**（分隔线 margin、
输入框 `outline: none`），已再次修掉。

| 问题 | 修前 | 修后 |
| --- | --- | --- |
| `.ter-divider { margin: 0 }`（重写时回来了） | 吃掉 `mt-3`/`my-4`/`my-5`（4 处布局错） | 删除该声明 |
| `.ter-input { outline: none }`（同上） | 金色焦点环被同优先级规则吞掉 | 移除该声明，`:focus` → `:focus-visible` |
| `.ter-bg` 顶部遮罩 | 64%（实测 faint 仅 4.06:1） | **70% / 74% / 82%**（faint 5.2:1、muted 6.0:1） |
| 美术来源选「custom」 | 把 base 清成 `''` → 变成同源请求 `/background….jpg`，全部图片消失，刷新后又静默回到官网 | 新增 `chromeSource`/`iconSource` 显式字段；选 custom 不改 URL，空值一律回退默认 |
| 图标模板 | `@master`（跟随分支，可能无声变更或 404） | 固定 `@2.4.1` |
| 图标模板缺 `{name}` | `url("")` → 所有图标不可见 | `iconUrl()` 返回空串，`TerIcon` 保留尺寸但不绘制 |
| 面板表面栈 | `.ter-panel` / `.ter-stat` / `.ter-dialog` 三份重复 + 未使用的 `.ter-surface-panel` | 合并为一条共享规则 |
| 死代码 | `ter-body-root` 空类副作用、`--ter-separator`、`--ter-inset`/`--ter-info`/`--ter-nav-h`、硬编码 `2px` 圆角 | 全部删除；圆角改用 `--ter-radius` |

**实测结论（用 pillow 解码真实远端图，sRGB 相对亮度 + WCAG）**

| 素材 | mean | p50 | p90 | p99 |
| --- | --- | --- | --- | --- |
| `title.jpg`（按钮/标题木牌） | 0.075 | 0.066 | 0.077 | 0.631 |
| `middle.jpg` / `fade_in.jpg` / `fade_out_dark.png`（面板） | 0.059–0.066 | — | ~0.07 | ~0.08 |
| `buy_bar.png`（导航） | 0.127 | 0.057 | 0.242 | 0.868 |
| `background.jpg`（全屏背景） | 0.448 | 0.421 | 0.841 | 0.979 |

- 官方 chrome 图**都很暗**，所以亮色文字（`#f6ffe3` / `#ffffd8`）在按钮和面板上是
  **6.4–8.1:1**，比上一版自绘渐变更安全（上一版 gold 按钮只有 3.61:1）。
- 背景图**很亮**（top 28% 均值 0.579、p99 0.995），所以遮罩必须够重：不加遮罩时
  文字只有 1.1–1.6:1。这是全站唯一需要"牺牲画面换可读性"的地方。
- 已核验：10 张官网图 + 27 个 pixelarticons 文件全部 200；
  jsDelivr 返回 `access-control-allow-origin: *`（CSS mask 跨域可用）与 `max-age=604800`。

### 11.2 仍待处理（P4）

1. **外部依赖是当前最大的运营风险**：官网文件名带内容哈希，Re-Logic 重新部署即失效，
   失败时只是退化成纯色（面板保留 `#5a3d2a`），但整站会失去"泰拉味"。
   另外站点图标也改成引用 `terraria.org/favicon.ico` + `apple-touch-icon.png`
   （写在 `index.html`，所以 **Classic UI 也会请求它**），本地 favicon 已删除。
   建议把这 10 张图 + 图标镜像到自己的域名（设置里已支持填 `chromeBase`）。
2. **27 个图标 = 27 个 SVG 请求**（jsDelivr 有 7 天缓存，首屏仍会弹出式加载）；
   若要更稳可换成本地图标 sprite。
3. **`/next` 会向 terraria.org / jsDelivr / Google Fonts 发请求**，无用户同意开关；
   Google Fonts 的 `<link>` 每次挂载注入（离开再进入 FOUT 重现）。
4. **bundle 体积**：v2 的 CSS/JS 无条件进主包（CSS 64KB、JS 447KB），v1 路由也要下载。
   若要拆需要 `/next` 路由级 `lazy()` + 动态 `import('./v2/theme/index.css')`，
   并注意 v2 规则处于无层级（unlayered）、优先于 Tailwind 的 `@layer`。
5. **`backdrop-filter: blur()`** 在 `prefers-reduced-transparency` 下无降级；
   强制色模式下需复查。（本轮 `.ter-header` 已改为不透明，只剩 `.ter-overlay` 一处。）
6. **`.ter-lift` / `.ter-h4`** 仍未被引用；`--ter-ok/--ter-warn/--ter-danger` 只在
   KitchenSink 的行内样式里用到，组件内部仍写死字面量。
7. **文档级滚动条**：`/next` 的主滚动条在 `html`/`body` 上，`.ter-theme ::-webkit-scrollbar`
   管不到，仍是 Classic UI 的灰色圆角条。
8. `.ter-tab` / `.ter-tabs` / `.ter-badge-*` 的**边框**对比度 1.67–1.99:1，状态另由文字与
   金色边框承载，按 1.4.11 可接受；若后续改掉这些信号需要重新评估。
9. **滚动收缩头部未做浏览器验证**：`compact` 在 `scrollY > 48` 切换，同时改
   `flex-direction`（不可过渡）、padding 与 logo 高度（可过渡）。逻辑上内容高度是逐帧重排的，
   但窄屏（≤360px）下 6 个导航项 + 收缩后的 logo 是否会换行/抖动，需要真机看一眼。
10. **`.ter-moss-top { margin-top: 3px }` 是同类陷阱**：无层级规则会压过 Tailwind 的 `mt-*`。
    当前没有调用点同时用 `mt-*` + `ter-moss-top`，但以后加就会静默失效
    （`.ter-divider` 已经踩过一次）。
11. **`border-image` 忽略 `border-radius`**：`.ter-tab-active` 的圆角实际不生效（2px，可忽略）。
12. **头部纹理**用 `--ter-panel-middle` 拉伸到 `100% 100%`，在 140px 与 52px 两种高度下
    木纹比例不同；若要更稳可以改为固定高度的 `background-size: 100% 236px`。

