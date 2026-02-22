# 前端 Web 项目开发准则

## 核心准则：清洁、规范、专业 (Clean & Professional)

- **导入管理**：严禁保留未使用的模块、变量、组件或函数导入。保持 Import 列表精简。
- **命名规范**：
  - **文件命名**：所有文件（Vue, TS, CSS）必须采用小写字母并以连字符（-）分隔（kebab-case）。
  - **禁止冗余**：文件夹名已包含含义时，文件名不应重复（如 `stores/user.ts` 而非 `stores/user-store.ts`）。
- **语言与注释 (Mandatory Comments)**：
  - **中文化核心准则 (Chinese First)**：项目开发以**简体中文**为第一语言，确保团队协作与后期维护的高效性。
    - **界面语言**：所有 UI 提示、按钮、文本、表单占位符等必须优先使用简体中文。
    - **注释语言**：所有代码注释（包括单行、多行、JSDoc）必须使用**简体中文**编写。
    - **日志语言**：所有业务日志（`logger.info/error`）、调试信息（`console.log`）的描述性文本必须使用**简体中文**。
  - **全覆盖规则**：严禁出现缺少注释的文件或逻辑段。
    - **文件描述**：Vue 文件或 TS 模块顶部必须标注其主要功能。_（仅含 `<template>` 的极简文件或无逻辑的布局文件除外）_
    - **导出项注释**：Composables、Utils、Stores 导出的每一项必须有 JSDoc 描述。
    - **模版逻辑注释**：复杂的 `v-if` 指令或 `computed` 计算属性必须在代码旁添加说明。
- **项目整洁度**：随时清理不再使用的调试信息、废弃代码及过时注释。

## 项目特定规范

### 1. 项目结构

```text
src/
├── components/          # 可复用组件 (通用及业务 widgets)
├── views/              # 页面视图 (按业务模块划分)
├── layouts/            # 布局组件
├── router/             # 路由配置
├── stores/             # Pinia 状态管理
├── api/                # API 调用层
│   ├── core/           # 请求基类与配置
│   ├── modules/        # 业务请求模块
│   └── types/          # 请求/响应类型定义 (按模块聚合)
├── core/               # 核心工具、配置、常量
├── assets/             # 样式、图片等静态资源
└── types/              # 全局通用类型 (如 Theme, Config 等非接口类型)
```

### 2. API 调用规范

- **文件夹拆分**：请求参数 (Params) 与返回模型 (Models) 必须分别存放在 `src/api/types/params/` 和 `src/api/types/models/` 目录下。
- **模块对齐**：请求模块 `api/modules/user.ts` 的类型应分别从 `api/types/params/user.ts` 和 `api/types/models/user.ts` 导入。
- **对象封装**：API 调用必须以对象形式导出，如 `authApi`。
- **强制类型化**：严禁在 API 函数中使用 `any`。必须显式定义请求参数与响应数据的类型。
- **错误处理**：统一在拦截器处理，页面端只需关注业务逻辑。

### 3. 状态管理 (Pinia)

- 遵循 Pinia 模块化规范
- Store 命名采用 kebab-case，且不应重复 `store` 后缀（文件夹名已包含含义）：`user.ts`
- 在 `src/stores/index.ts` 中导出所有 Store

### 4. 路由配置

- 路由懒加载所有页面组件
- 路由名称采用 kebab-case
- 在 router 中配置滚动行为

### 5. TypeScript 配置

- 严格模式：`strict: true`
- 必须定义 Props 和 Emits 的类型
- API 响应必须定义类型接口

---

## 额外准则：结构与规范

### 1. 结构简化原则

- **禁止滥用 `any`**：尽量避免使用 `any`，优先使用具体接口或 `unknown`。
- **显式定义**：Props 和 Emits 必须使用类型定义。

## 3. 组件设计原则

- **目录约定**：封装的业务组件或高频组件应置于所属目录的 **`widgets/`** 文件夹下。
- **数据自治 (Data Autonomy)**：封装组件时，数据应尽可能由组件自身内部管理或直接从 Store 获取，减少对外部环境的依赖。
- **禁止过度透传**：严禁在父组件中获取所有数据后通过 Props 进行多层、大批量的属性传递。除非该数据确实是多个同级组件共享的动态上下文。

## 4. 命名规范 (Naming Conventions)

- **文件命名**：项目内**所有**文件（包括 Vue 组件、TS 工具类、样式文件等）
  必须采用**小写字母**，并以**连字符（-）**分隔（kebab-case）。
  - **原则**：**禁止在文件名中重复文件夹名称（模块名）**。如果文件夹名称已经表达了其类型或功能，文件名应保持简洁（避免冗余命名）。
    - ✅ 正确：`src/stores/user.ts`
    - ❌ 错误：`src/stores/user-store.ts`
- **入口文件**：各文件夹的主要入口文件必须使用 `index.vue` 或 `index.ts`。
- **组件使用**：在 Vue 模板中引用组件时，必须使用**小写字母**并以**连字符（-）**分隔（kebab-case），
  严禁在大写字母形式（PascalCase）使用组件。
  - ✅ 正确：`<auth-form>`, `<profile-hero>`
  - ❌ 错误：`<AuthForm>`, `<ProfileHero>`

## 5. Vue 单文件组件 (SFC) 规范

- **顺序**：遵循 `<template>` -> `<script setup>` -> `<style>` 的顺序。
- **空标签限制**：如果该部分内容为空，则无需编写该标签。严禁在文件中保留空的 `<script setup>` 或 `<style>` 块。

## 6. 样式开发规范

- **Tailwind 优先**：优先使用 Tailwind CSS 类名，避免编写复杂的原生 CSS。
- **Important 修饰符**：Tailwind CSS 4.0+ 中，important 修饰符应使用后缀形式 `classname!`，
  而非前缀形式 `!classname`
  - ❌ 错误：`!text-xs !h-14 !px-12`
  - ✅ 正确：`text-xs! h-14! px-12!`
- **视觉身份 (Cinematic Design)**：
  - **色彩体系**：本项目采用 Ozon 品牌视觉。
    - **品牌主色**：Ozon Blue `#005bff`（用于按钮、文字强调、图标等）。
    - **品牌辅色**：Ozon Pink `#f91155`（用于高亮警告、促销等次要强调）。
    - **背景色**：浅色模式使用 `white` 或 `slate-50` 增强层级感；深色模式使用 `slate-950` / `black`。
    - **文字色**：主要文字采用 `slate-800` / `white`，辅助文字 `slate-500` / `slate-400`。
  - **质感**：广泛使用 `backdrop-blur-3xl` 和 `bg-white/70` (Light) 或 `bg-slate-900/40` (Dark) 的磨砂玻璃效果。
- **三态主题适配 (Light/Dark/System)**：
  - **强制要求**：所有 UI 开发必须同时考虑 **日间 (Light)**、**夜间 (Dark)** 和 **系统 (System)** 切换逻辑。
  - **组件变体**：必须完整使用 `dark:` 变体对所有颜色、边框、投影进行差异化处理。
  - **实时响应**：组件必须能够监听并实时响应系统主题色调的变化，严禁在手动切换后丢失系统联动。
  - **可读性标准**：浅色模式下严禁使用对比度不足的灰色文字；深色模式下应优化背景深度（使用 `zinc-950` 或 `black`）。
- **布局与响应式 (Layout & Responsive)**：
  - **禁止固定最宽限制**：严禁对页面或顶级容器设置 `max-width`（如 `max-w-7xl` 等）。所有页面应采用全屏流式布局，以充分利用超宽显示器的空间。
  - **桌面端优先 (Desktop Only)**：本项目为专为桌面端（Electron）设计的生产力工具，**严禁进行移动端适配**。所有界面应基于标准桌面分辨率（1366x768 及以上）进行精细化布局，无需考虑 `sm:` 或 `md:` 等小屏幕断点。

## 7. 组件开发规范 (Component Development)

- **原子化封装 (Atomic Encapsulation)**：由于本项目禁用 UI 库，所有基础交互元素（如 `Button`, `Input`, `Dialog`, `Toast`）必须在 `src/components/` 下封装为独立组件。严禁在视图文件中直接编写大量原生 Tailwind 语法的 UI 样式。
- **原生 HTML + Tailwind CSS**：所有 UI 组件应基于原生 HTML 结合 Tailwind CSS 4 进行艺术化定制开发，以确保符合“电影感（Cinematic）”的视觉风格。
- **图标使用**：
  - **优先使用 Remix Icon**：项目已集成 `remixicon`，应优先使用其图标库
  - 使用方式：`<i class="ri-home-line"></i>` 或 `<i class="ri-home-fill"></i>`
  - 严禁引入 `@element-plus/icons-vue`

## 8. 组件设计高级原则

- **高内聚自治**：组件应包含自身的动画逻辑（如 `transition`）和状态，确保在不同页面引用时表现一致。
- **配置驱动**：对于复杂的组件（如视频播放器、评论列表），应使用配置对象（Config Object）作为 Props，而非零散传递数十个单独属性。
- **插槽优先**：利用 Vue 插槽实现高度灵活的布局，特别是对于带有装饰背景的容器组件。

## 9. API 与接口定义规范 (API & Type Definitions)

- **文件组织规范**：
  - **模块化对齐**：API 请求文件 (`src/api/`) 与接口类型文件 (`src/types/api/`) 的命名必须严格对应（如 `src/api/movie.ts` 对应 `src/types/api/movie.ts`）。
  - **请求对象化**：API 模块必须采用 `const xxxApi = { ... }` 这种对象聚合的形式定义并导出。严禁使用分散的具名导出。
  - **接口聚合**：严禁在视图组件（Views）中直接定义 `interface` 用于 API 数据。所有跨组件复用的数据结构必须归档至 `src/types/`。
- **类型同步**：
  - **命名统一**：所有 API 类型前缀或后缀应体现其用途（如 `LoginParams`, `MovieItem`）。
- **请求封装**：统一使用请求工具类，严禁在业务逻辑中直接使用原始 Fetch 或外部库的未封装调用。

## 10. 语言与注释规范 (Language & Comments)

- **UI 语言**：本项目主要面向中文用户，所有 UI 界面的主要文字、提示信息、按钮标签等**优先使用简体中文**。
  - **视觉辅助**：可以使用 `中文 / ENGLISH` 的形式作为装饰性标题，提升设计感与国际化氛围。
- **代码注释**：代码注释**优先使用简体中文**编写，以方便团队成员理解复杂的业务逻辑。
- **控制台日志**：日志输出建议包含中文描述，方便调试定位。

## 11. 日期处理规范 (Date Handling)

- **统一工具库**：日期解析、格式化和操作必须统一使用 `dayjs` 库。
- **禁止原生对象**：严禁直接使用原生的 `Date` 对象进行复杂的解析、格式化或跨时区操作。
- **规范要求**：
  - 所有的日期显示格式化必须通过 `dayjs().format()`。
  - 所有的日期解析（尤其是字符串解析）必须通过 `dayjs()`。
  - 严禁在业务逻辑中进行手动的日期加减计算，应使用 `dayjs().add()` 或 `dayjs().subtract()`。

---

_简化不是为了少写代码，而是为了提高代码的可读性和渲染效率。_
