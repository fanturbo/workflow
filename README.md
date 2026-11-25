# WorkFlow - 通用型个人工作管理系统

> 让工作有计划，让过程有记录，让成果有沉淀。

## 产品简介

WorkFlow 是一个面向普通职场人、项目负责人和独立工作者的工作管理 Web 应用，帮助用户管理日常工作、安排任务、记录实际工作内容，并对历史工作进行统计和复盘。

由三个核心部分构成：
1. **工作计划** - 明确接下来要做什么
2. **工作记录** - 记录实际做了什么
3. **工作复盘** - 了解过去做成了什么

## 技术栈

- **前端框架**: Vue 3 + TypeScript (strict 模式)
- **构建工具**: Vite 6
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **UI 组件库**: Naive UI
- **图表**: ECharts 5
- **日期处理**: Day.js
- **组合式工具**: VueUse
- **拖拽**: vuedraggable
- **数据存储**: Dexie (IndexedDB) - 单机 MVP，数据访问层已抽象，可替换为 API

## 功能特性

### V1.0 已实现

- ✅ 工作台 Dashboard（四大任务区块、概况统计、今日日志）
- ✅ 每日计划（日期切换、结束当天整理）
- ✅ 全部任务（列表/看板/日历三视图、筛选、搜索）
- ✅ 工作日志（快速/标准/详细三种记录模式、时间线、任务关联）
- ✅ 随记（随手记一句话或想法，不计入工作统计，可转任务或补全为工作记录）
- ✅ 工作复盘（7/14/30/365 天统计、趋势图、分类/项目/优先级分布、导出）
- ✅ 周期任务（新建任务弹窗内设置：每日/每周/每月/工作日/自定义频率、结束日期、提醒时间；设置页完整管理）
- ✅ 任务提醒（应用内通知 + 桌面通知 + 提示音，页面打开时生效；支持导出 .ics 交给系统日历兜底）
- ✅ 任务延期（保留历史记录、记录调整原因）
- ✅ 数据导入导出（JSON 备份、CSV 导出、Markdown 工作总结）
- ✅ 响应式适配（PC/平板/手机）
- ✅ 快捷键（N 新增任务、Cmd+K 全局搜索）
- ✅ 项目与分类管理
- ✅ 统一设计 Token 和组件风格

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 8

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

开发服务器启动后访问 http://localhost:5173

### 首次使用

应用首次启动时会自动初始化：
- 7 个默认工作分类（项目开发、问题处理、沟通协调、会议、文档整理、学习研究、其他）
- 1 个默认项目
- 演示任务和日志数据
- 工作台默认区块配置

可通过「数据管理」页面重置或清空数据。

## 项目结构

```
workflow/
├── src/
│   ├── assets/styles/       # 全局样式与设计 Token
│   ├── components/
│   │   ├── common/           # 通用组件（TaskItem, PriorityTag, Modal 等）
│   │   └── layout/           # 布局组件（Sidebar, Header, Shell）
│   ├── composables/          # 组合式函数
│   ├── constants/            # 常量与配置（优先级、状态、分类等）
│   ├── db/
│   │   ├── database.ts       # Dexie 数据库定义
│   │   ├── repositories/     # 数据访问层（接口 + 实现）
│   │   └── seed.ts           # 数据库初始化与演示数据
│   ├── router/               # 路由配置
│   ├── services/             # 业务逻辑层
│   ├── stores/               # Pinia 状态管理
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 工具函数（日期、校验、通用）
│   └── views/                # 页面视图
│       ├── Dashboard/        # 工作台
│       ├── DailyPlan/        # 每日计划
│       ├── Tasks/            # 全部任务
│       ├── WorkLog/           # 工作日志
│       ├── Review/           # 工作复盘
│       ├── Settings/         # 设置
│       ├── DataManagement/    # 数据管理
│       └── Profile/          # 个人信息
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── Dockerfile
└── docker-compose.yml
```

## 架构设计

### 分层架构

```
组件 (Vue Views)
  → Pinia Store (状态管理)
    → Service (业务逻辑)
      → Repository (数据访问)
        → Dexie/IndexedDB (存储)
```

数据访问层已抽象为 Repository 接口，后续替换为 REST API 后端时，只需实现新的 Repository 类，无需修改 Service 和 Store 层。

### 数据模型

- **Task** - 任务（优先级、状态、计划日期、截止日期、项目、分类、周期关联）
- **WorkLog** - 工作日志（快速/标准/详细三种模式）
- **WorkLogTask** - 工作日志-任务多对多关联
- **Project** - 项目
- **Category** - 工作分类
- **Recurrence** - 周期任务规则
- **TaskHistory** - 任务操作历史
- **UserSettings** - 用户设置与工作台配置

### 时间处理

所有时间统一存储为 UTC ISO 字符串，展示时按用户浏览器时区转换，避免跨时区日期错乱。

## Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 访问 http://localhost:8080
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `N` | 快速新增任务 |
| `Cmd/Ctrl + K` | 全局搜索 |
| `Cmd/Ctrl + Enter` | 保存表单 |
| `Esc` | 关闭弹窗 |

## 开发计划

### V1.0 已完成
- 个人工作管理完整闭环
- 响应式适配
- 数据备份恢复

### 未来规划
- 多用户 SaaS 支持
- 后端 API (NestJS + Prisma + PostgreSQL)
- 团队协作
- AI 辅助总结与安排
- 邮件集成与提醒

## License

MIT
