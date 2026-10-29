# dsh-mobile-sidebar-drawer

移动端左侧边栏抽屉插件，只保留 `dsh-web-mobile` 里的「侧边栏抽屉」这一项能力。

在窄屏 + 触屏设备（`(max-width: 1023px) and (pointer: coarse)`）上，侧边栏列离开
网格流、变成覆盖在会话之上的抽屉：

- 头部标题旁出现「打开侧边栏」按钮；
- 首页 / 空白态、以及侧边栏面板占满主区时，改用左上角悬浮按钮；
- 抽屉打开时主区压一层半透明遮罩，点遮罩关闭；
- `Esc` 关闭（有 `aria-modal` 弹窗打开时让位给弹窗）；
- 点抽屉里的会话行 / 面板行 / 新建会话等导航目标后自动收起，让出整屏；
- 桌面宽度、鼠标指针、无指针环境完全不启用（CSS 精确取反，含无 pointer 的无头环境）。

## 与 dsh-web-mobile 的关系

结构与做法照搬 `dsh-web-mobile` 的抽屉实现，只取这一条链路：

| 本项目 | dsh-web-mobile 对应 |
| --- | --- |
| `client.js` 的抽屉 CSS | `src/client/styles/layout.css.ts`（列抽屉）、`base.css.ts`（遮罩 / 悬浮按钮） |
| `DrawerToggle` | `src/client/components/MobileNavToggle.tsx`（只保留 toggle，去掉 files 按钮） |
| `DrawerOverlay` | `src/client/effects/overlay-backdrop-fab.ts` |
| Esc / 导航点击关闭 | `src/client/effects/drawer-close.ts` |
| 帧标记 + 断点判定 | `src/client/effects/phone-chrome.ts` + `platform/breakpoints.ts` |

**未包含**（都属于 dsh-web-mobile 的其它特性，不是抽屉本身）：边缘滑动手势
（`sidebar-swipe.ts`，1500+ 行）、状态栏 / 视口 meta、键盘与菜单兼容、文件面板、
会话删除菜单、统计行等。

## 安装

```bash
# 在 DSH 会话里用 plugin_manager
plugin_manager { action: "install_bundle", target: "/root/dsh-mobile-sidebar-drawer" }
```

装好后插件行 id 为 `dsh-mobile-sidebar-drawer`，可在「插件」页看到标题
「移动端侧边栏抽屉 / Mobile sidebar drawer」与自带图标。

## 结构

```
package.json          dsh.bundle.patch + dsh.client（web，immediately）
cordis.patch.yml     插入一行插件（host 半是空 apply）
index.js             host 半：export function apply() {}
client.js            browser 半：样式、帧状态 store、头部按钮、遮罩/悬浮按钮、关闭逻辑
locale/{en,zh}.json  插件页标题与描述
icon.svg             插件图标
```

## 实现要点

- **宿主是唯一状态源**：抽屉开合读 `data-sidebar-collapsed`，点击只调用
  `ctx.layout.toggleSidebar()`，不自己维护开合状态。
- **`transform: none` 而非 `translateX(0)`**：单位变换仍会让抽屉成为 fixed
  子元素的包含块，宿主的设置弹层是从侧边栏 DOM portal 出去的，会被 280px 抽屉裁掉。
- **关闭态选择器对齐宿主特异性**：宿主的窄屏分支用 `!important` 钉了列的宽度和
  变换，关闭规则必须同样带 `!important`，否则抽屉会留下一条可见的窄条。
- **点击关闭延后一拍**：在 pointerdown 阶段收起会让浏览器不再派发 click，被点的行
  自身的 onClick 就不会执行；所以先放行点击，再在 `setTimeout(0)` 里收起。
- **桌面分支不渲染，而不只是不显示**：遮罩 / 悬浮按钮 / 头部按钮都按
  `(max-width: 1023px) and (pointer: coarse)` 判定后才挂到 DOM，桌面窗口里连节点都
  不存在，不会被后续宿主规则重新显示出来。
- **面板页让位**：侧边栏面板（插件、自动化任务、统计等）会占满主区、不渲染会话头部，
  悬浮按钮是那里唯一的控件；它正好压在面板自己的标题上，所以给面板标题加
  `calc(56px - clamp(24px, 4vw, 48px))` 的左内缩（与 dsh-web-mobile 同口径），
  不动按钮本身，各面板保持自己的排版。
- **流式输出不唤醒**：`MutationObserver` 丢掉 `[data-chat-flow]` 子树里的记录，
  长会话逐 token 重绘不会反复触发抽屉状态同步。
- **弹层抬到抽屉之上（popover band）**：宿主把菜单 portal 到 `<body>`，`z-index:1100`，
  而抽屉列是 1300、遮罩 1250——所以从抽屉里打开的菜单会画在抽屉**下面**，
  点不到任何一行。抽屉打开时把 `[role="menu"]` 抬到 1400；同样形状的模态框
  （重命名工作区、设置等）挂在 `body > div{z-index:1000}` 包装层里，抬那个包装层
  （抬 dialog 本身没用，它只在自己的根里排序）。两条规则都用
  `body:has([data-mobile-drawer="frame"]:not([data-sidebar-collapsed]))` 门控，
  抽屉关着或桌面端完全回到宿主的层序。
- **样式表只留一份并置尾**：原地热重载时先删同 id 旧表，再 append，最后再
  append 一次保证排在 `<head>` 末尾（宿主的规则也带 `!important`）。

## 已验证（390×844 触屏模拟 + 1440×900 桌面）

| 检查项 | 结果 |
| --- | --- |
| 关闭态抽屉列 | `left=-308`、`width=280`、`position:absolute`、`z=1300` |
| 悬浮按钮打开 | 列 `left=0`、`transform:none`、遮罩 `390×844` `rgba(0,0,0,.45)` |
| 点遮罩关闭 | `data-sidebar-collapsed` 复位、遮罩移除 |
| 会话头部按钮 | 宽 28px、可命中（`elementFromPoint` 落在按钮内），位于头部第一个位置 |
| 点会话行导航 | 抽屉收起、遮罩移除、会话头部出现、悬浮按钮消失 |
| 点「新建会话」 | 抽屉收起、回到首页相位 |
| 点侧边栏面板行 | 抽屉收起、悬浮按钮接管 |
| `Esc` 关闭 | 收起且遮罩移除 |
| 面板标题让位 | 插件页标题 88px、自动化任务 56px、统计 56px，均不再被按钮压住，无横向溢出 |
| 头像菜单 | z 1100→1400，`Settings / Feedback / Sign out` 三行逐行 `elementFromPoint` 全部命中自身 |
| 工作区 ⋯ 菜单 | z 1100→1400，`Rename / Delete workspace` 两行全部可达 |
| 会话 ⋯ 菜单 | z 1100→1400，`Pin / Rename / Fork / Archive / Copy ID` 全部可达 |
| 菜单打开的模态框 | 包装层 `body > div` 1000→1400，设置弹层铺满 390×844 且命中自身 |
| 门控 | 抽屉关着时会话头部菜单仍是宿主的 z=100；桌面 1440px 菜单仍是 z=1100 |
| 桌面 1440px | 抽屉列回到 `position:static`，按钮/遮罩节点不存在 |
| 主题 | 浅色抽屉 `#f9fafb`、深色 `#1b1b1c`（跟随宿主令牌），控制台无报错 |
| 插件页条目 | 标题「Mobile sidebar drawer / 移动端侧边栏抽屉」、自带图标正常渲染 |

