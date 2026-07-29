# Appsmith 项目 Code Wiki

> 本文档基于仓库代码结构自动生成，涵盖项目整体架构、模块职责、关键类与函数说明、依赖关系及运行方式。

---

## 1. 项目概述

**Appsmith** 是一个开源的低代码（Low-Code）平台，用于快速构建企业级内部应用，如仪表盘、管理后台、CRM 工具、IT 自动化流程等。项目采用 **React + Spring Boot** 技术栈，前后端分离，支持通过拖拽 UI 组件、绑定数据源、编写 JavaScript 逻辑来构建应用。

- **官方仓库**: https://github.com/appsmithorg/appsmith
- **许可证**: Apache License 2.0
- **主要技术栈**: React 17、TypeScript、Redux-Saga、Spring Boot 3.5、MongoDB、Redis

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (Client)                          │
│  React 17 + TypeScript + Redux + Redux-Saga + Web Workers       │
│  ├─ appsmith/client (主应用)                                    │
│  ├─ packages/ast          (AST 解析工具包)                       │
│  ├─ packages/dsl          (DSL 处理工具包)                       │
│  ├─ packages/eslint-plugin (自定义 ESLint 规则)                  │
│  ├─ packages/icons         (图标库)                             │
│  ├─ packages/rts           (Real-Time Server, Node.js)          │
│  ├─ packages/storybook     (组件文档与设计系统)                   │
│  └─ packages/utils         (公共工具库)                         │
├─────────────────────────────────────────────────────────────────┤
│                         后端层 (Server)                          │
│  Spring Boot 3.5 + WebFlux (Reactive) + Java 25                 │
│  ├─ appsmith-server        (主服务与 REST API)                   │
│  ├─ appsmith-interfaces    (插件接口与共享模型)                   │
│  ├─ appsmith-plugins       (数据源插件集合)                       │
│  ├─ appsmith-git           (Git 集成模块)                        │
│  └─ reactive-caching       (响应式缓存抽象)                      │
├─────────────────────────────────────────────────────────────────┤
│                         数据层 (Data)                            │
│  MongoDB (主数据库, Document Store) + Redis (缓存/会话/限流)      │
├─────────────────────────────────────────────────────────────────┤
│                         部署层 (Deploy)                          │
│  Docker / Docker Compose / Helm / Kubernetes / AWS AMI          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构

```
/workspace/
├── app/
│   ├── client/               # React 前端应用
│   │   ├── packages/         # Yarn Workspace 子包
│   │   ├── src/              # 主应用源码
│   │   ├── cypress/          # Cypress E2E 测试
│   │   ├── playwright/       # Playwright E2E 测试
│   │   └── public/           # 静态资源
│   └── server/               # Java 后端服务
│       ├── appsmith-server/  # 主服务
│       ├── appsmith-plugins/ # 插件模块
│       ├── appsmith-interfaces/ # 接口与模型
│       ├── appsmith-git/     # Git 集成
│       └── reactive-caching/ # 响应式缓存
├── deploy/                   # 部署脚本与配置
│   ├── docker/               # Docker 镜像构建
│   ├── helm/                 # Kubernetes Helm Chart
│   ├── ansible/              # Ansible Playbook
│   ├── aws/                  # AWS 部署
│   └── digital_ocean/        # DigitalOcean 部署
├── .github/                  # GitHub Actions CI/CD
├── contributions/            # 贡献指南与开发文档
└── scripts/                  # 辅助脚本
```

---

## 4. 前端模块 (app/client)

### 4.1 技术栈与运行环境

| 项目 | 版本/说明 |
|------|----------|
| Node.js | `^24.14.1` |
| Yarn | `3.5.1` (Plug'n'Play) |
| React | `^17.0.2` |
| TypeScript | `^5.5.4` |
| Redux | `^4.0.1` |
| Redux-Saga | `^1.1.3` |
| Webpack | `5.x` (CRA 衍生配置) |
| 测试框架 | Jest + Cypress + Playwright |

### 4.2 Workspace 子包

| 包名 | 路径 | 职责 |
|------|------|------|
| `@shared/ast` | `packages/ast` | 抽象语法树解析工具，用于 JS/表达式解析 |
| `@shared/dsl` | `packages/dsl` | DSL (Domain Specific Language) 处理与转换 |
| `@appsmith/eslint-plugin` | `packages/eslint-plugin` | 自定义 ESLint 规则 |
| `appsmith-icons` | `packages/icons` | 图标库 |
| `@appsmith/rts` | `packages/rts` | Real-Time Server，基于 Node.js + Socket，支持协作编辑与实时通信 |
| `@design-system/storybook` | `packages/storybook` | 设计系统与组件文档 |
| `@appsmith/utils` | `packages/utils` | 公共工具函数 |

### 4.3 核心源码目录 (`src/`)

| 目录 | 职责说明 |
|------|----------|
| `actions/` | Redux Actions，按功能域划分（如 `applicationActions`、`gitSyncActions`） |
| `api/` | 后端 API 调用封装（Axios） |
| `components/` | 通用 React 组件，包括表单控件、属性面板控件等 |
| `constants/` | 常量定义（颜色、路由、验证规则等） |
| `entities/` | TypeScript 类型定义与实体接口 |
| `git/` | Git 同步相关的 hooks、sagas、requests、store slice |
| `hooks/` | 自定义 React Hooks |
| `layoutSystems/` | 画布布局系统工厂与 HOC |
| `navigation/` | 编辑器导航与焦点管理 |
| `pages/` | 页面级组件与路由工具 |
| `reducers/` | Redux Reducers（在 `ee/` 与 `ce/` 目录下） |
| `sagas/` | Redux-Saga 副作用处理逻辑，核心业务逻辑编排 |
| `selectors/` | Reselect 选择器，用于从 Redux State 派生数据 |
| `utils/` | 工具函数库（绑定解析、控件工厂、画布结构、评估辅助等） |
| `widgets/` | Widget 基类、注册表、高阶组件与懒加载逻辑 |
| `WidgetQueryGenerators/` | 控件查询生成器抽象 |
| `PluginActionEditor/` | 插件动作编辑器上下文与组件 |

### 4.4 关键文件说明

| 文件 | 说明 |
|------|------|
| `src/index.tsx` | 前端入口文件。初始化 Redux Store、Saga、主题、全局样式，渲染 `AppRouter` |
| `src/store.ts` | Redux Store 配置，集成 `redux-batch`、`redux-saga`、Sentry Redux Enhancer、自定义 Middleware |
| `src/ce/AppRouter.tsx` / `src/ee/AppRouter.tsx` | 社区版与企业版路由配置入口 |
| `src/widgets/registry.ts` | Widget 注册表，维护所有可用控件 |
| `src/sagas/EvaluationsSaga.ts` | 核心评估 Saga，处理数据绑定、表达式求值与依赖追踪 |
| `src/utils/AppUtils.ts` | 应用初始化逻辑（Feature Flag、主题、用户会话等） |

### 4.5 前端状态管理架构

```
┌──────────────────────────────────────┐
│           React Components            │
│    (Widgets / Editors / PropertyPane)│
└──────────────┬───────────────────────┘
               │ dispatch
               ▼
┌──────────────────────────────────────┐
│           Redux Actions               │
│  (actions/xxxActions.ts)              │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Redux-Saga (Side Effects)     │
│  (sagas/*.ts)  API 调用 / 复杂业务编排 │
└──────────────┬───────────────────────┘
               │ put
               ▼
┌──────────────────────────────────────┐
│         Redux Reducers                │
│  (ee/reducers, ce/reducers)           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Redux Store (State)           │
│  entities / ui / canvas / evaluations │
└──────────────────────────────────────┘
```

---

## 5. 后端模块 (app/server)

### 5.1 技术栈与运行环境

| 项目 | 版本/说明 |
|------|----------|
| Java | OpenJDK 25 |
| Maven | 3.9+ (推荐 3.9.12) |
| Spring Boot | `3.5.14` |
| Spring WebFlux | 响应式 Web 框架 |
| MongoDB | 主数据库 (Spring Data MongoDB Reactive) |
| Redis | 缓存、Session、消息队列、限流 |
| PF4J | 插件框架 (`3.15.0`) |

### 5.2 Maven 模块结构

| 模块 | Artifact | 职责 |
|------|----------|------|
| `reactive-caching` | `reactiveCaching` | 响应式缓存抽象与实现 |
| `appsmith-interfaces` | `interfaces` | 插件接口、共享 DTO、异常定义 |
| `appsmith-plugins` | `appsmith-plugins` | 各类数据源插件（REST API、PostgreSQL、MongoDB、S3、GraphQL 等） |
| `appsmith-server` | `server` | 主服务，包含 REST Controller、Service、Repository、配置 |
| `appsmith-git` | `appsmith-git` | Git 版本控制集成逻辑 |

### 5.3 核心包结构 (`appsmith-server`)

| 包名 | 职责 |
|------|------|
| `controllers/` | REST API Controller，处理 HTTP 请求 |
| `services/` / `services/ce/` | 业务逻辑层，社区版(CE)与企业版(EE)分离 |
| `repositories/` | Spring Data MongoDB Reactive 数据访问层 |
| `domains/` | MongoDB 文档实体（如 `Application`、`NewAction`、`Datasource`） |
| `dtos/` | 数据传输对象（Request/Response DTO） |
| `configurations/` | Spring 配置类（Mongo、Redis、Security、Email 等） |
| `helpers/` | 工具类与辅助逻辑 |
| `migrations/` | Mongock 数据库迁移脚本 |
| `git/` | Git 操作中心服务与工具 |
| `exceptions/` | 全局异常处理与自定义异常 |
| `filters/` | WebFlux Filter（限流、MDC、条件过滤等） |
| `aspect/` | AOP 切面（Feature Flag 路由、Git 路由等） |
| `ratelimiting/` | 基于 Bucket4j 的限流服务 |
| `featureflags/` | Feature Flag 缓存与身份特征管理 |

### 5.4 关键类与函数

| 类/文件 | 说明 |
|---------|------|
| `ServerApplication.java` | Spring Boot 主类，`@SpringBootApplication`，启动时打印构建版本与 Commit SHA |
| `ApplicationController.java` | 应用 CRUD、发布、导入导出、模板等 API |
| `ActionController.java` | 动作（Query/API）执行与管理 API |
| `DatasourceController.java` | 数据源配置与测试 API |
| `ConsolidatedAPIController.java` | 聚合 API，用于编辑器初始化时批量加载数据 |
| `UpdateLayoutServiceCEImpl.java` | 核心布局更新服务，处理 DSL 变更后的布局重计算 |
| `EvaluationsSaga.ts` (前端) | 核心数据求值 Saga，管理依赖图与动态绑定 |
| `WidgetBlueprintSagas.ts` | 控件蓝图 Saga，处理控件拖放时的默认配置生成 |

### 5.5 插件系统 (PF4J)

后端采用 **PF4J** 插件框架实现数据源插件化。每个插件独立打包为 JAR，在运行时动态加载。

- 插件接口定义在 `appsmith-interfaces`
- 插件实现集中在 `appsmith-plugins`
- 运行时通过 `PluginConfiguration` 与 `PluginExecutorHelper` 管理与调度

---

## 6. 数据库与缓存

### 6.1 MongoDB

- **驱动**: Spring Data MongoDB Reactive + Mongock (迁移)
- **关键集合/文档**:
  - `application` - 应用元数据
  - `newPage` / `newAction` - 页面与动作定义
  - `datasource` - 数据源配置（加密存储凭据）
  - `workspace` / `user` - 组织与用户
  - `config` - 系统配置与序列号
- **副本集**: 生产与本地开发均要求 MongoDB 以副本集模式运行（用于事务支持）

### 6.2 Redis

- **用途**:
  - Spring Session 存储（分布式会话）
  - 缓存（应用模板、Feature Flag、用户数据）
  - 限流计数器（Bucket4j）
  - Git 操作锁与元数据缓存
  - RTS 实时协作消息通道

---

## 7. 依赖关系

### 7.1 前端核心依赖

```
React
├── react-dom
├── react-router-dom (v5)
├── react-redux + redux
├── redux-saga
├── styled-components (主题)
├── @blueprintjs/* (基础 UI 组件)
├── @appsmith/ads / @appsmith/wds (设计系统)
├── codemirror (代码编辑器)
├── echarts / fusioncharts (图表)
└── 各类控件库 (tinymce, uppy, react-table 等)
```

### 7.2 后端核心依赖

```
Spring Boot 3.5.14
├── spring-boot-starter-webflux (Reactor Netty)
├── spring-boot-starter-data-mongodb-reactive
├── spring-boot-starter-data-redis-reactive
├── spring-boot-starter-security
├── spring-security-oauth2-client / oauth2-jose
├── spring-session-data-redis
├── spring-boot-starter-mail
├── spring-boot-starter-actuator + micrometer (Prometheus/OTel)
├── mongock (数据库迁移)
├── pf4j / pf4j-spring (插件框架)
├── bucket4j-redis (限流)
├── modelmapper (DTO 映射)
├── sentry-spring-boot-starter (错误监控)
└── testcontainers + junit-jupiter (测试)
```

### 7.3 跨层依赖

```
Frontend (React)
    │ HTTP/WebSocket
    ▼
Backend (Spring Boot)
    │ Reactive MongoDB Driver
    ▼
MongoDB (Documents)
    
Backend ◄──► Redis (Cache/Session/Message Bus)

Backend ◄──► PF4J Plugins (DB Connectors / REST / S3 / GraphQL ...)

Frontend ◄──► RTS (Node.js WebSocket Server for Real-time Collaboration)
```

---

## 8. 项目运行方式

### 8.1 快速启动（Docker Compose - 推荐用于体验）

```bash
cd deploy/docker
docker-compose up -d
# 访问 http://localhost:8080
```

### 8.2 本地开发 - 前端

```bash
cd app/client

# 1. 安装依赖
yarn install

# 2. 生成本地 HTTPS 证书 (仅需一次)
cd docker && mkcert -install && mkcert "*.appsmith.com" && cd ../..
echo "127.0.0.1 dev.appsmith.com" | sudo tee -a /etc/hosts

# 3. 启动前端开发服务器
yarn start
# 访问 https://dev.appsmith.com
```

**注意**: 前端默认会代理到 `https://release.app.appsmith.com` 的 staging 后端。如需使用本地后端，先启动后端服务，再运行 `./start-https.sh`。

### 8.3 本地开发 - 后端

**前置条件**: MongoDB (副本集)、Redis、Java 25、Maven 3.9+

```bash
cd app/server

# 1. 编译生成辅助类
mvn clean compile

# 2. 创建环境配置
cp envs/dev.env.example .env
# 编辑 .env，确保 APPSMITH_DB_URL 与 APPSMITH_REDIS_URI 指向本地实例

# 3. 构建完整 JAR
./build.sh -Dmaven.test.skip

# 4. 启动 RTS (Real-Time Server)
cd ../client/packages/rts
cp .env.example .env
./start-server.sh

# 5. 启动 Java 后端 (新终端)
./app/server/scripts/start-dev-server.sh
# 默认端口 8080，验证: http://localhost:8080/api/v1/users/me
```

### 8.4 环境变量要点

| 变量 | 说明 |
|------|------|
| `APPSMITH_DB_URL` | MongoDB 连接串，需包含 replicaSet 名称 |
| `APPSMITH_REDIS_URI` | Redis 连接地址 |
| `APPSMITH_ENCRYPTION_PASSWORD` / `SALT` | 数据源凭据加密密钥 |
| `APPSMITH_GIT_ROOT` | Git 存储根目录（持久化版本控制数据） |
| `APPSMITH_MAIL_ENABLED` | 是否启用邮件服务 |

---

## 9. 测试体系

### 9.1 前端测试

| 类型 | 工具 | 命令 |
|------|------|------|
| 单元测试 | Jest | `yarn test:unit` |
| E2E 测试 | Cypress | `npx cypress open` / `npx cypress run` |
| E2E 测试 | Playwright | `yarn test:pw` |
| 组件测试 | Storybook | `yarn storybook` |

### 9.2 后端测试

| 类型 | 工具 | 命令 |
|------|------|------|
| 单元/集成测试 | JUnit 5 + Mockito + Reactor Test | `mvn clean package` |
| 集成测试 | Testcontainers + Embedded Mongo | `mvn failsafe:integration-test` |
| 基准测试 | JMH | 集成在 Maven 构建中 |

### 9.3 CI/CD 流水线 (GitHub Actions)

主要 Workflow 包括：

- **构建**: `build-client-server.yml`、`server-build.yml`、`rts-build.yml`
- **代码质量**: `client-lint.yml`、`client-prettier.yml`、`server-spotless.yml`、`quality-checks.yml`
- **测试**: `client-unit-tests.yml`、`ci-test-playwright.yml`、`pr-cypress.yml`、`server-integration-tests.yml`
- **部署预览**: `deploy_preview.yml`、`build-docker-image.yml`
- **Helm**: `helm-release.yml`、`helm-unittest.yml`
- **安全**: `test-vulnerabilities-data.yml`

---

## 10. 部署架构

### 10.1 Docker 单机部署

使用单容器 supervisord 管理多进程：
- Caddy (反向代理 + SSL)
- MongoDB
- Redis
- Java Backend
- Node.js RTS
- Nginx (前端静态资源)

### 10.2 Kubernetes (Helm)

位于 `deploy/helm/`，支持：
- Ingress / HPA / PDB
- 持久化卷 (PV/PVC)
- 外部 Secret / TLS
- KEDA ScaledObject

### 10.3 云部署

- **AWS**: AMI 镜像 (`deploy/aws_ami/`)
- **DigitalOcean**: Droplet 镜像 (`deploy/digital_ocean/`)
- **Heroku**: 容器部署 (`deploy/heroku/`)

---

## 11. 安全与合规

- **SSRF 防护**: 内置 `RestrictedHostFilter`，测试环境可通过 `appsmith.test.bypass.ssrf` 禁用
- **数据源加密**: 使用 AES 加密存储数据库密码与 Token
- **OAuth2**: 支持 Google、GitHub 等第三方登录
- **Rate Limiting**: 基于 Bucket4j + Redis 的登录限流
- **SSRF Host Filter**: WebClient 请求时过滤内网与敏感地址

---

## 12. 贡献与开发规范

- **代码风格**
  - 前端: ESLint + Prettier
  - 后端: Spotless + Palantir Java Format
- **提交规范**: Semantic PR (由 `.github/semantic.yml` 约束)
- **分支模型**: `release` 为主发布分支，功能分支合并后进入 `release`
- **开发文档**: `contributions/ClientSetup.md`、`contributions/ServerSetup.md`

---

## 13. 常用命令速查

```bash
# 前端
yarn start                    # 启动开发服务器
yarn build                    # 生产构建
yarn test:unit                # Jest 单元测试
yarn test:pw                  # Playwright E2E 测试
yarn lint                     # ESLint 检查
yarn storybook                # 启动 Storybook

# 后端
mvn clean compile             # 编译生成辅助类
./build.sh -DskipTests        # 打包 JAR 与插件
./scripts/start-dev-server.sh # 启动开发服务器
mvn clean package             # 运行全部测试并打包

# Docker
docker-compose up -d          # 启动完整环境
```

---

> 本文档为项目结构化的速查手册，详细开发指南请参阅 `contributions/` 目录下的官方文档。
