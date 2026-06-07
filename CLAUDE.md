# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此代码库中工作时提供指引。

## 项目：记账喵 (CountCat)

一款轻量级个人财务记账 Web 应用。前端 V1 MVP 形态——无后端，所有数据存储在浏览器本地（IndexedDB）。产品需求文档参见 [001.产品PRD（产品经理）/个人财务管家PRD.md](001.产品PRD（产品经理）/个人财务管家PRD.md)，是功能范围、数据模型和版本规划（当前 V1.0.1）的权威来源。

## 常用命令

所有命令都在 `frontend/` 目录下执行。

```bash
cd frontend
npm install            # 安装依赖
npm run dev            # 启动 Vite 开发服务器，地址 http://localhost:3000（host 0.0.0.0）
npm run build          # 生产构建，输出到 frontend/dist
npm run preview        # 预览生产构建产物
```

本项目未配置测试、代码检查（lint）和格式化工具。代码质量由 Vite + 编辑器保证。

## 技术栈

- **Vue 3**：使用 Composition API + `<script setup>`（无 TypeScript，所有文件为 `.js` 和 `.vue`）
- **Pinia**：状态管理；**Vue Router 4**：路由
- **Vite 6**：开发与构建工具
- **Tailwind CSS 3**：自定义暖色/奶油色调色板（参见 [frontend/tailwind.config.js](frontend/tailwind.config.js)）——`cream`、`sand`、`bark`、`coral`、`mint`、`peach`、`honey` 等是设计 token
- **ECharts 5**（按需引入：`PieChart`、`BarChart`、Canvas 渲染器）：用于统计图表
- **Dexie 4**（IndexedDB 封装）：用于本地持久化
- **dayjs**：日期处理
- **Web Crypto API**：用于 SHA-256 密码哈希（无后端鉴权）
- 自定义字体通过 Google Fonts 加载：DM Serif Display、DM Sans、JetBrains Mono（在 [frontend/index.html](frontend/index.html) 中声明）

## 架构

```
frontend/
├── index.html                  # Google Fonts 预连接，根元素 #app
├── vite.config.js              # Vue 插件，端口 3000，host 0.0.0.0
├── tailwind.config.js          # 自定义颜色/字体 token
├── postcss.config.js
└── src/
    ├── main.js                 # createApp + Pinia + router + 全局 CSS
    ├── App.vue                 # 布局外壳：router-view、FAB、TabBar、弹层、Toast
    ├── assets/css/main.css     # Tailwind 指令层 + 组件类（sheet、num-key、category-chip、动画）
    ├── router/
    │   └── index.js            # 路由表 + 鉴权守卫；视图按需懒加载
    ├── stores/
    │   ├── auth.js             # Pinia：登录/注册/登出，sessionStorage 会话
    │   └── records.js          # Pinia：记录列表、月度统计、今日支出、CRUD 封装
    ├── utils/
    │   ├── db.js               # Dexie schema（v2：users + records）、Record 模型、所有数据库操作
    │   └── categories.js       # EXPENSE_CATEGORIES / INCOME_CATEGORIES 树 + 查找辅助函数
    ├── components/             # 复用组件：AddRecordSheet、EditRecordSheet、BottomSheet、TabBar、Toast、RecordItem
    └── views/                  # 页面级组件：Auth、Home、Bills、Stats
```

### 数据流

`views/components` → `stores/*` → `utils/db.js`（Dexie/IndexedDB）→ 通过 store 返回响应式状态。Store 是唯一与 `db.js` 交互的地方——不要在 views/components 中直接 import Dexie。

### 鉴权

- `stores/auth.js` 在 `sessionStorage` 中读写 `countcat_session`（会话级，关闭浏览器即清除）。
- `router/index.js` 中配置全局 `beforeEach` 守卫：未登录访问 `meta.requiresAuth` 路由跳转 `/`；已登录访问 `/` 跳转 `/home`。
- `utils/db.js#hashPassword` 使用 Web Crypto 的 `SubtleCrypto.digest('SHA-256', ...)`，对不支持的环境提供降级的 XOR 方案（会打印 warning）。
- 每条记录都携带 `userId`；`db.js` 中所有查询都按 `userId` 过滤。新用户首次登录会通过 `seedDemoData(userId)` 一次性注入演示数据。

### 数据模型

由 [frontend/src/utils/db.js](frontend/src/utils/db.js) 中的 `Record` 类定义：

| 字段 | 说明 |
|---|---|
| `id` | Dexie 自增 id |
| `userId` | 外键关联 `users` 表；**插入时必须传入** |
| `amount` | 数字，保留 2 位小数 |
| `type` | `'expense'` \| `'income'` |
| `categoryId` / `subCategoryId` | 来自 `utils/categories.js` 的字符串 ID |
| `note` | ≤50 字（在 `AddRecordSheet.vue#inputDigit` 中限制长度，数据库层不强制） |
| `recordDate` | `YYYY-MM-DD` 格式字符串 |
| `createdAt` / `updatedAt` | ISO 时间戳 |
| `isDeleted` | 软删除标记；所有 `getRecords` 调用都会过滤掉已软删除的记录 |

删除操作始终使用 `softDeleteRecord`——禁止在应用代码中直接调用 `db.records.delete()`。PRD 提到未来会支持 30 天恢复窗口（尚未实现）。

### 分类

`utils/categories.js` 导出两棵树（`EXPENSE_CATEGORIES`、`INCOME_CATEGORIES`）。每个节点包含 `id`、`name`、`icon`（emoji）、`color`（十六进制色值）和 `children` 数组。子分类为可选——只选父分类也可以保存记录。请使用 `getCategoryName(record)` 和 `getCategoryIcon(record)`，不要直接索引到树中，这样在 ID 缺失时能优雅地兜底。

### 路由与视图

| 路径 | 视图 | 鉴权 |
|---|---|---|
| `/` | [frontend/src/views/Auth.vue](frontend/src/views/Auth.vue) | 公开（登录/注册 Tab） |
| `/home` | [frontend/src/views/Home.vue](frontend/src/views/Home.vue) | 需要登录 |
| `/bills` | [frontend/src/views/Bills.vue](frontend/src/views/Bills.vue) | 需要登录 |
| `/stats` | [frontend/src/views/Stats.vue](frontend/src/views/Stats.vue) | 需要登录 |

`App.vue` 是一个常驻外壳：始终渲染 FAB（`+` 按钮）、`TabBar` 以及 `AddRecordSheet` / `EditRecordSheet` / `Toast` 弹层——视图只在 `<router-view>` 内渲染。编辑弹层由任意视图 emit `editRecord` 事件触发；`editingRecord` ref 由 `App.vue` 持有。

### 组件模式

- **底部弹层**（[frontend/src/components/BottomSheet.vue](frontend/src/components/BottomSheet.vue)）是通用包装器，使用 [main.css](frontend/src/assets/css/main.css) 中的 `.sheet-overlay` / `.sheet-panel` 类。`AddRecordSheet` 和 `EditRecordSheet` 都基于它。
- **新增 vs 编辑记录**——两个弹层高度重复；修改时记得同步另一个。`AddRecordSheet` 内置自定义数字键盘（不调起系统键盘）。
- **左滑删除**位于 `Bills.vue` 中（每行 touch 处理，修改 `record._slideX`）。是纯表现层逻辑，未抽成可复用组件。
- **ECharts** —— `Stats.vue` 在 `onMounted` 中初始化图表，watch `stats` 触发重绘，并手动处理窗口 resize。不要 import 完整的 `echarts` 包——保持按需引入。

### 样式约定

- 优先使用 Tailwind 工具类。对于重复模式（弹层、num-key、category-chip、slide-record、Toast 动画、带 stagger 延迟的 `fade-in-up`），请使用 [main.css](frontend/src/assets/css/main.css) 中定义的组件类。
- 自定义调色板颜色直接以 `bg-cream`、`text-bark`、`text-coral` 等方式引用——它们是 `tailwind.config.js` 中定义的 token，不是写死的十六进制色值。
- 字体家族：`font-display`（DM Serif Display）用于标题，`font-mono`（JetBrains Mono）用于金额/数字，正文默认 DM Sans。
- 移动端优先；布局假设手机宽度，固定底部 Tab 栏。安全区适配通过 `env(safe-area-inset-bottom)` 处理。

## 修改前需要了解的事项

- **没有测试、lint、格式化工具**——Vite 是唯一的构建步骤。请保持与周边文件一致的代码风格。
- **不要新增后端**——PRD 明确将 V1 限定为纯本地存储，并将此作为隐私需求。
- **不要破坏多用户隔离**——每条记录查询都必须保持按用户过滤（参见 `getRecords({ userId, ... })`）。
- **ECharts 是按需引入的**——新增图表类型时，记得在 `Stats.vue` 的 `echarts.use([...])` 调用中注册。
- **PRD 是范围问题的权威依据**。新增功能前请查阅 [001.产品PRD（产品经理）/个人财务管家PRD.md](001.产品PRD（产品经理）/个人财务管家PRD.md)；V1.1（预算、环比对比、月度报告）、V1.2（周期记账、账单导入、OCR）和 V2.0（多账本）已规划但尚未实现。
- **`dist/`** 是 Vite 构建产物，可安全删除后重新生成。
