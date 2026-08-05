# Appsmith Code Wiki

> 本文档基于当前仓库源码、构建文件、部署脚本和开发指南整理。它描述仓库内的 Community Edition（CE）代码及其为 Enterprise Edition（EE）保留的扩展边界，不等同于线上部署文档或完整的产品 API 参考。

## 1. 项目概览

Appsmith 是一个开源低代码平台，用于构建内部工具、管理后台、仪表盘和自动化应用。一个 Appsmith 应用通常由以下资源组成：

- 页面（Page）和布局（Layout）：决定 UI 结构、组件位置和展示方式。
- Widget：可配置的输入、展示、容器和交互组件。
- Action / NewAction：连接数据源并执行查询、API 请求或 JavaScript 的可执行实体。
- JSObject / JSCollection：在客户端评估引擎中执行的 JavaScript 逻辑。
- Datasource：数据库、REST、GraphQL、第三方 SaaS 或 AI 服务的连接配置。
- Application / Workspace / User：应用、组织工作区和身份权限模型。
- Git artifact：将应用资源导出为文件，并通过 Git 分支、提交、拉取和合并进行版本管理。

仓库采用前后端分离、单仓库多模块布局：

| 层次 | 主要技术 | 代码位置 | 责任 |
| --- | --- | --- | --- |
| Web Client | React 17、TypeScript、Redux、Redux-Saga、Webpack | app/client/src | 编辑器、应用查看器、认证界面、实体状态、表达式评估和 API 调用 |
| Shared Client Packages | TypeScript、Rollup | app/client/packages | AST/DSL、公共工具、设计系统、图标和实时服务 |
| Java Backend | Java 25、Spring Boot、Spring WebFlux、Reactive MongoDB | app/server/appsmith-server | HTTP API、业务服务、权限、迁移、导入导出、应用发布和插件编排 |
| Plugin Runtime | PF4J、Java | app/server/appsmith-plugins | 具体数据源连接、校验、Schema 获取和 Action 执行 |
| Git Library | JGit、SSH | app/server/appsmith-git | 本地 Git 仓库、文件格式、分支和远端同步 |
| Realtime Server（RTS） | Node.js、Express、MongoDB Change Streams | app/client/packages/rts | 实时协作、版本更新通知和控制面工具 |
| Infrastructure | Docker、Supervisor、Caddy、Helm | deploy、Dockerfile、scripts | 镜像打包、进程编排、TLS、健康检查和 Kubernetes 部署 |

## 2. 仓库结构

~~~text
.
├── app
│   ├── client
│   │   ├── src                       # React 应用主体
│   │   ├── packages                  # Yarn workspaces：RTS、AST、DSL、utils、设计系统等
│   │   ├── cypress                   # Cypress E2E 和回归测试
│   │   ├── config                    # Webpack、环境和路径配置
│   │   ├── scripts                   # 本地启动、构建和开发工具
│   │   └── build.sh                  # 客户端生产构建
│   ├── server
│   │   ├── appsmith-server            # Spring Boot 主应用
│   │   ├── appsmith-interfaces        # 插件与服务共享的模型、接口、DTO
│   │   ├── appsmith-plugins            # 各数据源/AI 集成的 PF4J 插件
│   │   ├── appsmith-git                # Git 文件和仓库操作库
│   │   ├── reactive-caching            # Redis 分布式缓存与锁
│   │   ├── envs                        # 开发环境变量模板
│   │   ├── scripts                     # 后端启动与辅助脚本
│   │   ├── mongo-seed                  # Mongo 初始数据
│   │   ├── pom.xml                     # Maven reactor 根工程
│   │   └── build.sh                    # 后端打包及 dist 组装
│   └── util                            # 跨平台脚本辅助函数
├── deploy
│   ├── docker                          # 镜像根文件系统、Supervisor 和运行脚本
│   ├── helm                           # Kubernetes Helm chart
│   ├── ansible、aws、packer、heroku    # 其他部署/镜像入口
│   └── digital_ocean、aws_ami          # 云平台部署说明
├── scripts                             # 根级构建、预览、健康检查脚本
├── static                              # Logo、图片、动画等静态资源
├── contributions                       # 客户端、服务端和 Widget 开发指南
├── Dockerfile                          # 组装已构建 artifact 的最终镜像
└── README.md                           # 项目定位和安装入口
~~~

appsmith-server 是大型业务模块，当前包含约 1,250 个 Java 源文件；app/client/src 进一步按页面、实体、Saga、Widget、布局和评估引擎拆分。本文以稳定的架构边界和高频主链路为核心，不逐个展开所有 Widget、DTO、枚举和测试文件。

## 3. 整体架构

~~~mermaid
flowchart LR
    Browser[浏览器 / App IDE / App Viewer]
    Client[React Client\nRedux + Saga + Evaluation Worker]
    RTS[RTS\nNode + Express]
    API[Spring WebFlux\nControllers]
    Service[Domain Services\nACL / Solutions / Import / Publish]
    Repo[Reactive Repositories]
    Mongo[(MongoDB\n应用和配置数据)]
    Redis[(Redis\n缓存、锁、消息/会话辅助)]
    Plugin[PF4J Plugin Runtime]
    Datasource[(外部数据源\nDB / REST / SaaS / AI)]
    Git[appsmith-git\nJGit + Git storage]
    Remote[(远端 Git 仓库)]

    Browser --> Client
    Client -->|HTTP /api/v1| API
    Client -->|/rts-api/v1| RTS
    RTS --> Mongo
    API --> Service
    Service --> Repo
    Repo --> Mongo
    Service --> Redis
    Service --> Plugin
    Plugin --> Datasource
    Service --> Git
    Git --> Remote
    Client -. WebSocket/实时通知 .-> RTS
~~~

### 3.1 运行时进程

生产 Docker 镜像使用 Supervisor 管理多个进程，入口是 deploy/docker/fs/opt/appsmith/entrypoint.sh，最终执行 supervisord：

- backend：运行 server-*.jar，默认 HTTP 端口为 8080。
- rts：运行 RTS bundle，默认监听 127.0.0.1:8091。
- editor：提供客户端静态构建产物。
- caddy：负责反向代理、HTTPS、静态资源和自定义域名路由。
- 视配置还会启动嵌入式 MongoDB、Redis 和 PostgreSQL mock DB。

run-java.sh 在启动 Java 服务前等待 RTS 的 /rts-api/v1/health-check，因此 RTS 是后端正常启动和协作功能的前置依赖。容器健康检查位于 deploy/docker/fs/opt/appsmith/healthcheck.sh，会检查 Supervisor 中的 editor、rts、backend 及相关基础设施。

### 3.2 CE/EE 扩展模式

服务端和客户端都存在同名的基础实现与 ce / ee 目录。常见形态是：

~~~text
Base interface/service
  -> CE interface/implementation
  -> default implementation used by CE
  -> EE module can override or extend the CE behavior
~~~

例如 ActionController 继承 controllers.ce.ActionControllerCE，服务实现常由 CE 版本提供默认行为。客户端从 ee/AppRouter.tsx、ee/reducers、ee/sagas 等入口导出当前发行版实现。修改公共接口时需要同时检查 CE、EE 镜像路径，避免只修复一个版本。

## 4. 前端架构

### 4.1 启动与路由

入口文件是 app/client/src/index.tsx：

1. 预加载路由 chunk，初始化 Evaluation Worker，并通过导入 widgets 注册 Widget loader。
2. 创建 Redux store，启动 rootSaga，执行 appInitializer()。
3. 异步加载 instrumentation，接入 Faro/Sentry 等错误和遥测能力。
4. 通过 Provider、ThemeProvider、全局样式和错误边界挂载 AppRouter。

路由实现位于 app/client/src/ce/AppRouter.tsx 和 app/client/src/ee/AppRouter.tsx：

| 路由职责 | Loader/页面 | 代码位置 |
| --- | --- | --- |
| 首页/落地页 | LandingScreen | app/client/src/LandingScreen.tsx |
| 登录、注册、用户认证 | UserAuth、Users、Setup | app/client/src/pages/UserAuth、pages/users、pages/setup |
| Workspace 与应用列表 | WorkspaceLoader、ApplicationListLoader | app/client/src/pages/workspace、pages/Applications |
| 应用编辑器 | AppIDE | app/client/src/pages/AppIDE |
| 应用查看器 | AppViewerLoader | app/client/src/pages/AppViewer |
| 模板 | TemplatesListLoader | app/client/src/pages/Templates |
| 管理设置 | SettingsLoader | app/client/src/pages/AdminSettings |
| Custom Widget Builder | CustomWidgetBuilderLoader | app/client/src/pages/Editor/CustomWidgetBuilder |

路由顺序有语义：静态 URL 和通配路径必须放在更具体的 Builder/Viewer 路由之后；修改顺序时还要同步检查 getUpdatedRoute 相关逻辑和路由测试。

### 4.2 状态管理

app/client/src/store.ts 组装 Redux store：

- ee/reducers：组合实体、评估、Lint 和 UI reducers。
- ee/sagas：组合业务 Saga；runSagaMiddleware() 只在应用启动时调用，单元测试通过 testStore 避免自动启动 Saga。
- packageMiddleware：处理包级行为。
- routeParamsMiddleware：把路由参数注入 Action 流程。
- reduxBatch：批量派发减少重复渲染。
- Sentry Redux enhancer：过滤高频大 payload（如评估树）后再上报。

Reducer 大致分为三类：

| 分类 | 典型目录 | 职责 |
| --- | --- | --- |
| Entity | app/client/src/reducers/entityReducers | Application、Page、Datasource、Plugin、Widget 等服务端实体的客户端投影 |
| Evaluation | app/client/src/reducers/evaluationReducers | DataTree、依赖图、首次评估、触发器和加载状态 |
| UI | app/client/src/reducers/uiReducers | 编辑器面板、选中状态、主题、导航、导入导出、Git 和调试器状态 |

### 4.3 Saga 与 API 层

app/client/src/sagas 是客户端主要业务编排层：

- InitSagas、ApplicationSagas、PageSagas：应用初始化、页面加载和保存。
- ApiPaneSagas、DatasourcesSagas、PluginSagas：Action 编辑器、数据源和插件元数据。
- EvaluationsSaga、PostEvaluationSagas、LintingSagas：表达式评估、结果回写和静态检查。
- sagas/ActionExecution：插件 Action 和客户端内建 Action（弹窗、导航、下载、存储、重置 Widget 等）。
- CanvasSagas、WidgetOperationSagas、WidgetSelectionSagas：拖拽、布局、复制/粘贴、删除和选择。
- git/sagas 与 git-artifact-helpers/application/sagas：连接 Git、分支、提交、拉取、合并及应用资源导入。
- WebsocketSagas：处理实时通知和版本更新提示。

API 访问集中在 app/client/src/api：基础请求能力位于 Api.ts、api/core 和 api/interceptors，领域 API 按 ActionAPI、PageApi、PluginApi、GitSyncAPI、ImportApi、SearchApi 等拆分。响应拦截器负责认证失败、统一错误、响应元数据和执行信息处理。

### 4.4 Widget 与布局

- app/client/src/widgets：每个 Widget 通常包含 widget 组件、属性配置、控制器、默认属性、事件和测试。
- WidgetProvider：提供 Widget 元信息、loader 和类型映射；widgets/index.ts 的副作用导入负责注册。
- layoutSystems/fixedlayout：传统固定网格布局。
- layoutSystems/autolayout：自动布局。
- layoutSystems/anvil：新的 Section/Zone/Canvas 结构、拖拽、空间分配和布局编辑器。
- layoutSystems/common、types：布局系统之间共享的 Widget HOC、Canvas 工厂和类型。

Widget 功能变更通常同时影响属性配置、DataTree 类型、评估/事件触发和 Cypress 快照测试，不能只修改展示组件。

### 4.5 客户端表达式评估

评估引擎主要位于 app/client/src/workers/Evaluation：

~~~text
Redux/Saga 取得 DSL 和实体
  -> Evaluation Worker 建立评估环境
  -> handlers/evalTree 解析 DataTree 和绑定表达式
  -> dependency map 确定更新顺序
  -> evaluate / evalExpression 计算值
  -> treeReducer / UI 订阅结果
  -> ActionExecution Saga 触发 API 或内建行为
~~~

entities/DataTree 定义实体树和 Widget 数据，entities/DependencyMap 维护实体依赖，workers/Evaluation/JSObject 处理 JSObject，workers/Tern 提供编辑器补全。@shared/ast、@shared/dsl 为表达式分析和 DSL 处理提供共享能力。

## 5. 服务端架构

### 5.1 Maven 模块

Maven reactor 根工程是 app/server/pom.xml：

| Maven 模块 | 作用 | 主要消费者 |
| --- | --- | --- |
| reactive-caching | Redis 缓存抽象、缓存切面、缓存失效和分布式锁 | appsmith-server |
| appsmith-interfaces（artifactId 为 interfaces） | 插件 SPI、领域模型、DTO、Git 接口、通用 helper 和异常 | Server、所有插件、Git |
| appsmith-plugins | 插件父工程；聚合具体插件 JAR | Server 的 PF4J runtime |
| appsmith-server | WebFlux 主服务、业务服务、Repository、权限和启动类 | 最终 server JAR |
| appsmith-git | 文件格式、JGit 操作、SSH、资源映射和 Git storage | appsmith-server |

主工程使用 Spring Boot 3.5.14，Java 编译目标为 25，响应式链路基于 Reactor Mono / Flux。服务端通过 MongoDB 保存核心业务数据，Redis 用于缓存、分布式锁及部分运行时状态。

### 5.2 启动入口与配置

com.appsmith.server.ServerApplication 是 Spring Boot 入口：

- @SpringBootApplication 启用自动配置。
- @ComponentScan({"com.appsmith"}) 扫描主应用、Git、缓存及相关组件。
- @EnableScheduling 启用定时任务。
- 构造时通过 ProjectProperties 打印版本和 commit SHA。

配置文件位于 app/server/appsmith-server/src/main/resources：

- application.properties：公共 Spring 配置。
- application-ce.properties：CE 覆盖项。
- application-ee.properties：EE 覆盖项。
- system-themes.json、productAlertMessages.json、邮件模板：运行时资源。

环境变量模板是 app/server/envs/dev.env.example。部署环境普遍使用 APPSMITH_* 变量；最关键的连接和安全变量包括 APPSMITH_DB_URL、APPSMITH_REDIS_URL、APPSMITH_ENCRYPTION_PASSWORD、APPSMITH_ENCRYPTION_SALT 和 APPSMITH_GIT_ROOT。

### 5.3 HTTP 分层

服务端大体遵循以下依赖方向：

~~~text
Controller
  -> Service / Application service
  -> Solution / Permission / Helper
  -> Repository / PluginService / appsmith-git
  -> MongoDB / Redis / 外部数据源 / Git remote
~~~

主要 Controller：

| Controller | 基础路径常量 | 主要能力 |
| --- | --- | --- |
| ApplicationController | Url.APPLICATION_URL | 应用 CRUD、复制、导入导出、发布相关入口 |
| PageController | Url.PAGE_URL | 页面 CRUD、页面资源和页面级操作 |
| ActionController | Url.ACTION_URL | NewAction 保存、执行、复制和重构 |
| ActionCollectionController | Action Collection 路径 | Action 集合管理和应用资源处理 |
| DatasourceController | Url.DATASOURCE_URL | 数据源创建、更新、测试、Schema 和连接信息 |
| ConsolidatedAPIController | Url.CONSOLIDATED_API_URL | 编辑器/查看器首屏聚合加载，减少多次请求 |
| PluginController | Plugin 路径 | 插件列表、编辑器配置、模板和安装 |
| LayoutController | Layout 路径 | Widget 布局、布局动作和重构 |
| UserController / WorkspaceController | User/Workspace 路径 | 认证用户、工作区和成员相关操作 |
| OrganizationController | Organization 路径 | 组织及权限相关操作 |
| HealthCheckController | Health 路径 | 应用和依赖健康检查 |
| Git controllers | Git 路径 | 分支、提交、拉取、合并、状态和 SSH 配置 |

Controller 往往只负责参数绑定和委托；跨资源逻辑一般在 Service、Solution 或 Application/Artifact service 中完成。

### 5.4 领域服务分组

app/server/appsmith-server/src/main/java/com/appsmith/server 下的核心包职责如下：

| 包 | 职责 |
| --- | --- |
| applications | Application 生命周期、应用级导入导出、模板、JS library 和 Git 文件辅助 |
| newpages / layouts | 页面、布局和页面首屏数据 |
| newactions / actioncollections | Action、JS Action、Action Collection 的保存、导入导出和重构；newactions 是当前主要模型边界 |
| datasources / datasourcestorages | 数据源元数据与敏感配置分离存储、校验、复制和权限 |
| plugins | Plugin 元数据、编辑器配置、远程插件加载和插件资源缓存 |
| solutions | 权限、Action 执行、数据源访问、发布等跨服务用例编排 |
| repositories | MongoDB Reactive Repository 和自定义查询 |
| authentication | Session、OAuth、登录失败重定向、认证过滤器 |
| acl / ratelimiting | OPA/策略模型、权限检查和限流 |
| imports / exports / fork / refactors | 资源转换、导入导出、应用 Fork 和实体重命名/引用修复 |
| publish | 应用发布、可发布资源和查看器快照 |
| onload | 页面加载时 Action/JSObject 的执行描述和排序 |
| migrations | MongoDB schema/data migration 及初始数据 |
| events / cron / notifications | 领域事件、定时任务和通知 |
| configurations / filters / converters | Spring 配置、请求过滤、序列化和 WebFlux 基础设施 |

### 5.5 持久化和领域模型

核心文档模型位于 app/server/appsmith-server/src/main/java/com/appsmith/server/domains，共享插件输入输出模型位于 app/server/appsmith-interfaces/src/main/java/com/appsmith/external/models。常见关系为：

~~~text
Organization
  -> Workspace
      -> Application
          -> Page
              -> Widget / Layout
              -> Action / NewAction / JSObject
      -> Datasource / Plugin
User
  -> Workspace membership / ACL
~~~

典型 Repository 包括 ApplicationRepository、PageRepository、NewActionRepository、DatasourceRepository、PluginRepository、WorkspaceRepository、UserRepository 及权限、审计、发布、模板相关 Repository。Repository 一般直接返回 Mono / Flux，由 Service 处理权限、校验和组合查询。

敏感数据的处理边界是 Datasource 元数据与 DatasourceStorage / DatasourceStorageDTO 配置分离；加密和解密依赖 APPSMITH_ENCRYPTION_PASSWORD 与 APPSMITH_ENCRYPTION_SALT。不要在日志、DTO 或 Git artifact 中直接输出未脱敏的连接凭据。

## 6. 核心业务流程

### 6.1 编辑器首屏加载

1. 客户端路由进入 AppIDE，初始化 Saga 派发当前用户、组织、应用和页面动作。
2. ConsolidatedAPIController 的 /edit 接口聚合首屏所需的应用、页面、Widget、Action、Datasource、Plugin、Theme 等数据。
3. Service 层通过权限解决方案过滤可见资源，并使用 Reactive Repository 读取 MongoDB。
4. 客户端将响应写入 Entity reducers，构造 DataTree、依赖图和 Widget loader。
5. Evaluation Worker 根据绑定表达式和依赖关系执行首次评估；编辑器再通过 Saga 处理后续变更。

查看器走 /view 聚合接口，加载已发布/可查看资源，行为与编辑器的可编辑状态和权限不同。

### 6.2 Action 执行

~~~text
Widget event / JS function
  -> client ActionExecution Saga
  -> ActionAPI / consolidated execution endpoint
  -> ActionController
  -> ActionExecutionSolution / NewActionService
  -> DatasourceContextService
  -> PluginService + PluginExecutorHelper
  -> PF4J PluginExecutor.execute(...)
  -> ActionExecutionResult
  -> client reducers / Evaluation Worker / post-action handlers
~~~

客户端内建行为（如 navigateTo、showAlert、storeValue、resetWidget、download）在 workers/Evaluation/fns 和 sagas/ActionExecution 中执行，不一定经过远程数据源插件。远程 Action 需要同时经过权限、数据源连接、限流、模板替换和错误转换。

### 6.3 数据源创建和查询

1. DatasourceController 接收连接配置或 Action 保存请求。
2. DatasourceServiceCEImpl.create 检查插件是否存在、权限、过期插件和请求参数。
3. DatasourceContextServiceImpl 组合 DatasourceService、DatasourceStorageService、PluginService、PluginExecutorHelper 和配置服务，建立执行上下文。
4. PluginService 找到插件并加载 form.json、editor.json、模板或 UQI 配置。
5. 具体插件的 PluginExecutor 创建连接、验证连接、获取结构并执行 Action。
6. 返回值通过 ActionExecutionResult、DatasourceStructure 等共享模型返回客户端；结果可进入 DataTree，触发依赖实体的重评估。

连接创建和查询可能是阻塞式第三方 SDK 调用。服务端应沿用现有的 Reactor 调度器、连接池、超时和限流处理，不要在 Netty event loop 上直接增加新的阻塞操作。

### 6.4 Git 同步

~~~text
Client git Saga
  -> GitSyncAPI / Git controller
  -> application Git/artifact service
  -> FileUtils + FileOperations
  -> FSGitHandler
  -> local APPSMITH_GIT_ROOT repository
  -> JGit SSH transport
  -> remote repository
~~~

appsmith-git 将 Application、Page、Action、Datasource、Plugin、JS library 等资源转换为稳定的文件结构。DSLTransformerHelper 负责 Widget DSL 的扁平化、父子目录和嵌套结构处理；FileOperationsCEv2Impl 负责读写、格式版本、删除已不存在资源和文件变更检测；FSGitHandlerCEImpl 负责 clone、commit、push、pull、branch、merge、reset、status 和远程连接测试。

Git storage 是运行时数据，不应默认写入源代码目录。开发环境应设置绝对路径的 APPSMITH_GIT_ROOT，容器则由 /appsmith-stacks 或持久化卷承载。

### 6.5 实时协作

RTS 在 app/client/packages/rts/src/server.ts 启动，默认端口 8091，入口通过 ee/server 组装服务。它与 Java 服务共享 Appsmith MongoDB 配置，负责实时 API、协作/变更通知以及备份恢复等运维能力。Java 服务通过 RTS 健康检查确认其可用；客户端通过 RTS API/WebSocket 接收实时事件，具体客户端处理集中在 WebsocketSagas 和相关版本更新 Saga。

## 7. 关键类与函数索引

以下是维护主链路时优先阅读的符号。方法签名可能随版本演进，以源码为准。

### 7.1 客户端

| 符号 | 文件 | 说明 |
| --- | --- | --- |
| runSagaMiddleware | app/client/src/store.ts | 启动 ee/sagas 导出的 rootSaga；测试环境不自动调用 |
| testStore | app/client/src/store.ts | 创建不运行 Saga 的测试 store |
| AppRouter / Routes | app/client/src/ce/AppRouter.tsx | 处理首屏初始化、错误页、主题、Header 和核心路由 |
| appInitializer | app/client/src/utils/AppUtils.ts | 初始化客户端运行环境、用户/应用相关基础状态 |
| EvaluationsSaga | app/client/src/sagas/EvaluationsSaga.ts | 编排实体变更后的评估、worker 通信和结果回写 |
| ActionExecutionSagas | app/client/src/ce/sagas/ActionExecution/ActionExecutionSagas.ts | CE Action 执行 Saga 入口及事件调度 |
| PluginActionSaga | app/client/src/sagas/ActionExecution/PluginActionSaga.ts | 发送插件 Action、管理 loading/error/success 和后续评估 |
| dataTreeFactory | app/client/src/entities/DataTree/dataTreeFactory.ts | 将页面实体、Widget、Action 和 JSObject 组织为评估输入 |
| evaluation.worker | app/client/src/workers/Evaluation/evaluation.worker.ts | Worker 入口，隔离表达式评估，减少主线程阻塞 |
| evalTree / evalExpression | app/client/src/workers/Evaluation/handlers | 评估整个实体树或单个表达式 |
| getEntityForEvalContextMap | app/client/src/ce/workers/Evaluation/getEntityForEvalContextMap.ts | 将实体转换为评估上下文可查找的结构 |
| CanvasFactory | app/client/src/layoutSystems/CanvasFactory.tsx | 根据布局系统创建编辑/查看 Canvas |
| AnvilEditorCanvas | app/client/src/layoutSystems/anvil/editor/canvas/AnvilEditorCanvas.tsx | Anvil 布局编辑器 Canvas、拖拽和 Widget 编辑上下文 |
| Api | app/client/src/api/Api.ts | 通用 HTTP 请求基类和执行元数据处理 |
| PluginsApi | app/client/src/api/PluginApi.ts | 插件列表、配置和模板请求封装 |
| Git sagas | app/client/src/git/sagas | 将 Git UI 操作映射为 API 请求和本地状态迁移 |

### 7.2 服务端

| 符号 | 文件 | 说明 |
| --- | --- | --- |
| ServerApplication.main | app/server/appsmith-server/src/main/java/com/appsmith/server/ServerApplication.java | Spring Boot 启动入口，关闭 Banner 并启动容器 |
| ActionController | app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ActionController.java | CE Action controller 的默认装配层，委托给 ActionControllerCE |
| ConsolidatedAPIController.getAllDataForFirstPageLoadForEditMode | app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ConsolidatedAPIController.java | 编辑器首屏聚合数据接口 |
| ConsolidatedAPIController.getAllDataForFirstPageLoadForViewMode | app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ConsolidatedAPIController.java | 查看器首屏聚合数据接口 |
| ApplicationService | app/server/appsmith-server/src/main/java/com/appsmith/server/applications/base/ApplicationService.java | Application 生命周期、权限、复制和资源组合 |
| ApplicationPageService | app/server/appsmith-server/src/main/java/com/appsmith/server/services/ApplicationPageService.java | 应用与页面关系、页面加载和保存相关服务 |
| NewActionService | app/server/appsmith-server/src/main/java/com/appsmith/server/newactions/base/NewActionService.java | 当前 Action 模型的查询、保存、复制、导入导出和重构 |
| ActionExecutionSolution | app/server/appsmith-server/src/main/java/com/appsmith/server/solutions/ActionExecutionSolution.java | Action 执行用例，连接权限、Action、Datasource 和插件执行 |
| DatasourceServiceCEImpl.create | app/server/appsmith-server/src/main/java/com/appsmith/server/datasources/base/DatasourceServiceCEImpl.java | 校验插件和权限后创建数据源 |
| DatasourceContextServiceImpl | app/server/appsmith-server/src/main/java/com/appsmith/server/services/DatasourceContextServiceImpl.java | 组装数据源存储、插件和执行上下文 |
| PluginServiceCEImpl | app/server/appsmith-server/src/main/java/com/appsmith/server/plugins/base/PluginServiceCEImpl.java | 插件发现、安装、配置资源读取和模板缓存 |
| PluginExecutorHelper | app/server/appsmith-server/src/main/java/com/appsmith/server/helpers/PluginExecutorHelper.java | 找到 PF4J executor 并统一执行/连接管理 |
| ApplicationPublishableService | app/server/appsmith-server/src/main/java/com/appsmith/server/publish/applications/publishable/ApplicationPublishableService.java | 生成可发布的应用资源和查看器数据 |
| ExecutableOnLoadService | app/server/appsmith-server/src/main/java/com/appsmith/server/onload/executables/ExecutableOnLoadService.java | 组织页面加载时执行的 Action/JSObject |
| FSGitHandlerCEImpl | app/server/appsmith-git/src/main/java/com/appsmith/git/handler/ce/FSGitHandlerCEImpl.java | 本地仓库和远程 Git 操作的核心实现 |
| FileUtilsCEImpl | app/server/appsmith-git/src/main/java/com/appsmith/git/files/FileUtilsCEImpl.java | artifact 与 Git 文件树之间的转换 |
| FileOperationsCEv2Impl | app/server/appsmith-git/src/main/java/com/appsmith/git/files/operations/FileOperationsCEv2Impl.java | 资源 JSON 文件读写、删除和格式版本处理 |
| RedisCacheManagerImpl | app/server/reactive-caching/src/main/java/com/appsmith/caching/components/RedisCacheManagerImpl.java | Reactive Redis get、put、evict 和 evictAll |
| CacheAspect | app/server/reactive-caching/src/main/java/com/appsmith/caching/aspects/CacheAspect.java | @Cacheable / @CacheEvict 类切面实现 |
| DistributedLockAspect | app/server/reactive-caching/src/main/java/com/appsmith/caching/aspects/DistributedLockAspect.java | 基于 Redis 的分布式锁切面 |

### 7.3 插件 SPI 与典型实现

插件公共契约位于 app/server/appsmith-interfaces/src/main/java/com/appsmith/external/plugins：

- BasePlugin：插件元数据和 PF4J 插件基类。
- PluginExecutor<T>：连接类型为 T 的通用执行器，通常包含 execute、datasourceCreate、datasourceDestroy、validateDatasource、testDatasource 和 getStructure。
- BaseRestApiPluginExecutor：REST/HTTP 类插件共享的请求构建和响应处理。
- SmartSubstitutionInterface：支持 Mustache/动态绑定替换的插件契约。
- ActionExecutionRequest、ActionExecutionResult、DatasourceConfiguration、DatasourceStructure：插件与 Server 之间的输入输出模型。

| 插件 | 主类 | 典型能力 |
| --- | --- | --- |
| REST API | RestApiPlugin | 参数化/通用 HTTP 请求、认证、响应解析 |
| JavaScript | JSPlugin | JS Action 执行、动态替换 |
| MongoDB | MongoPlugin | Mongo 查询、连接、Schema/结构和数据类型处理 |
| PostgreSQL | PostgresPlugin | SQL 执行、连接池、Schema、限流标识 |
| MySQL / MSSQL / Oracle / Snowflake / Redshift | 对应 *Plugin | 各数据库连接、SQL 执行和结构发现 |
| GraphQL | GraphQLPlugin | GraphQL 请求和响应处理 |
| Google Sheets | GoogleSheetsPlugin | Sheet 行读写、批量更新和追加 |
| Redis | RedisPlugin | Redis 命令和连接测试 |
| S3 / DynamoDB / Firestore / Elasticsearch / ArangoDB | 对应 *Plugin | 云存储、NoSQL、搜索和文档数据源 |
| OpenAI / Anthropic / Google AI / Appsmith AI | 对应 AI 插件 | AI 请求、触发和响应转换 |
| SMTP / AWS Lambda / SaaS | 对应 *Plugin | 邮件、函数和 SaaS 集成 |

新增插件一般需要：独立 Maven 子模块、主插件类、PluginExecutor、form.json/editor.json/模板资源、错误消息和单元测试，并在插件父 POM 和最终打包流程中注册。

## 8. 依赖关系

### 8.1 内部依赖图

~~~text
appsmith-server
  ├── interfaces
  ├── appsmith-git
  ├── reactiveCaching
  └── PF4J runtime -> appsmith-plugins/*.jar

appsmith-git
  └── interfaces

appsmith-plugins/*
  ├── interfaces
  └── 各第三方 SDK / JDBC driver / HTTP client

client
  ├── @shared/ast
  ├── @shared/dsl
  ├── @appsmith/utils
  ├── @appsmith/ads / WDS / design-system
  └── appsmith-rts（构建时单独打包）
~~~

### 8.2 重要外部依赖

| 类别 | 依赖 | 用途 |
| --- | --- | --- |
| 前端框架 | React、React DOM、React Router | UI 和页面路由 |
| 前端状态 | Redux、Redux Toolkit、Redux-Saga、reselect | 全局状态、异步工作流和选择器 |
| 构建 | Webpack、TypeScript、Yarn 3、Sass | 开发服务器和生产 bundle |
| 表达式 | Acorn、Acorn-walk、Tern、AST/DSL workspace packages | JavaScript/绑定解析、补全和 DSL 转换 |
| 后端 Web | Spring Boot、Spring WebFlux、Reactor Netty | 响应式 HTTP 服务 |
| 后端数据 | Spring Data Mongo Reactive、Lettuce/Redis、Mongock | 持久化、缓存和迁移 |
| 插件 | PF4J / PF4J Spring | 动态加载插件和插件扩展点 |
| Git | JGit、Apache Mina SSHD | Git 操作、SSH 认证和远端同步 |
| 质量与观测 | JUnit、Mockito、Reactor Test、Cypress、Playwright、Sentry、OpenTelemetry | 单元、端到端、链路和错误监控 |

版本以 app/client/package.json、各 workspace package.json 和 app/server/pom.xml 为准；不要只依据本 Wiki 的概括版本号升级依赖。

## 9. 运行方式

### 9.1 推荐：Docker 运行完整实例

根 README 将 Docker 作为最简单的使用方式，服务端开发指南给出的入口是：

~~~bash
cd deploy/docker
docker-compose up -d
~~~

完整镜像的构建输入不是源码直接运行，而是先生成客户端 build、RTS dist、后端 server JAR、插件 JAR 和 info.json，再由根目录 Dockerfile 复制到基础镜像中。最终容器暴露 80 和 443，入口为 /opt/appsmith/entrypoint.sh。

### 9.2 本地运行后端

前置条件：Java 25、Maven 3.9+、Node.js 24.14.1、Docker，以及 MongoDB replica set 和 Redis。最小步骤：

~~~bash
cd app/server
cp envs/dev.env.example .env
# 按实际环境设置 APPSMITH_DB_URL、APPSMITH_REDIS_URL/APPSMITH_REDIS_URI
mvn clean compile
./build.sh -DskipTests
~~~

开发指南要求先启动 RTS，再启动 Java 服务：

~~~bash
cd app/client/packages/rts
cp .env.example .env
./start-server.sh

# 另开终端，从仓库根目录执行
./app/server/scripts/start-dev-server.sh
~~~

Java 服务默认监听 8080；RTS 默认监听 8091。APPSMITH_DB_URL 使用 MongoDB 时通常需要 ?replicaSet=...，因为 Change Streams/部分实时能力要求 replica set。Git 功能还需要设置 APPSMITH_GIT_ROOT 为可写的绝对路径。

### 9.3 本地运行前端

客户端开发需要 Node.js 24.14.1、Yarn 3.5.1、Docker、mkcert 和 envsubst。客户端指南默认使用 dev.appsmith.com 的 HTTPS 入口：

~~~bash
cd app/client
yarn install
yarn start
~~~

若使用本地/远端后端代理，需要根据 contributions/ClientSetup.md 生成证书、配置 /etc/hosts，再运行客户端 HTTPS 代理脚本。生产构建：

~~~bash
cd app/client
yarn build
~~~

app/client/package.json 中的 start 会调用 scripts/start.js，设置开发环境变量并启动自定义 Webpack Dev Server；build.sh 负责生产 bundle 及相关构建步骤。

### 9.4 构建产物

后端 app/server/build.sh 会：

1. 检查 Maven 使用的 Java 版本。
2. 加载 app/server/.env。
3. 执行字段常量检查和 mvn clean package。
4. 将 appsmith-server/target/server-*.jar 复制到 app/server/dist。
5. 将各插件 JAR 复制到 app/server/dist/plugins。

客户端和 RTS 的产物再由发布/镜像脚本分别复制到 editor/ 和 rts/。根 Dockerfile 明确要求 info.json、server JAR、client build 和 RTS dist 都已经存在。

## 10. 测试与质量检查

### 10.1 客户端

~~~bash
cd app/client
yarn test:unit
yarn lint
yarn prettier
yarn check-types
yarn test:pw:smoke
~~~

Cypress 回归测试位于 app/client/cypress/e2e，按 GSheet、Binding、ActionExecution、Anvil、AppNavigation、AdminSettings 等业务场景分类。Playwright 项目按 smoke、sanity、regression 和 regression-git 拆分。Widget 和核心 Saga 附近通常有同目录单元测试，应优先运行受影响的测试。

### 10.2 服务端和插件

~~~bash
cd app/server
mvn test
# 或构建时跳过测试
./build.sh -DskipTests
~~~

服务端测试使用 JUnit、Mockito、Reactor Test、MockWebServer 和 Testcontainers；数据库插件测试经常需要外部数据库容器。单个插件测试可从对应插件目录运行 Maven 测试。没有 Mongo replica set、Redis 或所需 Testcontainers 能力时，应将集成测试失败与业务代码失败区分开。

### 10.3 常见验证点

- 修改 Controller：验证请求路径、权限、响应模型和 WebFlux Mono/Flux 链路。
- 修改 Service/Repository：验证 CE/EE 覆盖、权限、数据脱敏、Mongo 查询和缓存失效。
- 修改插件：验证连接创建/销毁、参数校验、超时、Schema、错误转换和阻塞调用调度。
- 修改 Widget：验证属性配置、DataTree、事件、评估结果、布局和快照。
- 修改 Git：验证资源文件格式、分支状态、冲突/回滚和 APPSMITH_GIT_ROOT 外部存储。
- 修改 RTS：验证 Mongo Change Stream、Java 后端健康检查、端口和容器 Supervisor 配置。

## 11. 配置与运维要点

| 配置 | 作用 | 典型位置 |
| --- | --- | --- |
| APPSMITH_DB_URL | MongoDB 或支持的数据库连接地址 | .env、Helm values、容器环境 |
| APPSMITH_REDIS_URL / APPSMITH_REDIS_URI | Redis 连接地址；具体脚本命名需以当前配置读取处为准 | Server/RTS 配置 |
| APPSMITH_ENCRYPTION_PASSWORD / SALT | 加密数据源敏感字段 | Server/备份恢复 |
| APPSMITH_GIT_ROOT | 本地 Git artifact 根路径 | appsmith-git、RTS 备份 |
| APPSMITH_RTS_PORT / APPSMITH_RTS_HOST | RTS 监听端口和地址 | packages/rts/src/server.ts |
| APPSMITH_MAIL_* | 邮件能力 | Server 和 RTS mailer |
| APPSMITH_CUSTOM_DOMAIN | Caddy 自定义域名 | Docker entrypoint/Caddy |
| APPSMITH_DISABLE_TELEMETRY | 关闭匿名遥测 | Server/Client |

Docker 部署的持久化根目录通常是 /appsmith-stacks，其中包含数据、日志、Git storage、TLS 证书和运行时配置。生产环境必须为 MongoDB、Redis、Git storage、加密密钥和自定义证书配置持久化/密钥管理；不要依赖容器临时文件系统。

## 12. 扩展与修改指南

### 新增一个数据源插件

1. 在 app/server/appsmith-plugins 创建 Maven 子模块，并加入插件父 POM。
2. 依赖 interfaces，实现 BasePlugin 和 PluginExecutor<T>；REST 类插件优先复用 BaseRestApiPluginExecutor。
3. 提供数据源表单、Action 编辑器配置、模板和错误消息资源。
4. 实现连接生命周期、配置校验、连接测试、Schema 获取和 Action 执行。
5. 添加单元/集成测试，并确认 app/server/build.sh 会收集其 JAR。
6. 在 Server 的插件发现、默认插件或迁移逻辑中确认该插件的注册方式。

### 新增一个 Widget

1. 在 app/client/src/widgets 建立 Widget 目录和主组件。
2. 定义属性、默认值、事件、验证和控制器；复用现有 Base Widget/HOC。
3. 确认 widgets/index.ts 和 Widget loader/factory 能发现它。
4. 更新 DataTree、动态绑定、布局系统和属性面板所需类型。
5. 增加 Widget 单元测试和 Cypress/Playwright 快照或回归测试。
6. 同步检查 CE/EE 的 Widget 注册和覆盖目录。

### 修改服务端领域能力

优先遵守 Controller -> Service/Solution -> Repository/Plugin 的方向。权限应通过已有 ACL/Permission/Solution 组件检查；跨实体批处理应使用响应式组合；外部连接和阻塞 SDK 应复用现有连接池、超时、限流和调度策略。涉及导入导出、发布或 Git 时，要同时检查 artifact 格式和迁移兼容性。

## 13. 阅读路线

### 想理解一次页面加载

阅读 app/client/src/index.tsx -> app/client/src/store.ts -> app/client/src/ce/AppRouter.tsx -> app/client/src/pages/AppIDE -> app/client/src/sagas/InitSagas.ts -> app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ConsolidatedAPIController.java。

### 想理解一次查询执行

阅读 app/client/src/sagas/ActionExecution/PluginActionSaga.ts -> app/client/src/api/ActionAPI.tsx -> ActionController / ActionExecutionSolution -> DatasourceContextService -> PluginExecutor -> 具体插件类（如 MongoPlugin 或 RestApiPlugin）。

### 想理解 Git 同步

阅读 app/client/src/git/sagas -> app/client/src/api/GitSyncAPI.tsx -> Server Git controller/service -> appsmith-git 的 FileUtilsCEImpl、FileOperationsCEv2Impl 和 FSGitHandlerCEImpl。

### 想理解运行时启动

阅读 app/server/README.md -> contributions/ServerSetup.md -> app/server/build.sh -> app/server/scripts/start-dev-server.sh；容器运行则继续阅读 Dockerfile -> deploy/docker/fs/opt/appsmith/entrypoint.sh -> Supervisor 配置 -> run-java.sh / run-rts.sh。

## 14. 关键术语

| 术语 | 含义 |
| --- | --- |
| CE / EE | Community Edition / Enterprise Edition；仓库通过 ce、ee 和继承/替换实现能力分层 |
| Widget | 页面中的可视化或交互组件 |
| Entity | 编辑器可识别的 Application、Page、Widget、Action、JSObject 等资源 |
| DataTree | 客户端表达式评估使用的实体数据树 |
| Action / NewAction | 服务端持久化和客户端执行的可执行实体；newactions 是当前主要代码边界 |
| Plugin | 通过 PF4J 动态加载的外部数据源/AI 集成 |
| Artifact | 可导入、导出、发布或同步到 Git 的应用资源集合 |
| RTS | Realtime Server；Node.js 独立进程，承担实时协作和部分控制面能力 |
| UQI | Unified Query Interface；插件编辑器/查询配置所使用的统一配置能力 |
| APPSMITH_GIT_ROOT | 本地 Git artifact 仓库的根路径 |

## 15. 相关文档入口

- 项目定位和安装：README.md
- 服务端概览：app/server/README.md
- 服务端本地开发：contributions/ServerSetup.md
- 客户端本地开发：contributions/ClientSetup.md
- 贡献流程：contributions/CodeContributionsGuidelines.md、CONTRIBUTING.md
- Widget 开发：contributions/AppsmithWidgetDevelopmentGuide.md
- 插件开发：contributions/ServerCodeContributionsGuidelines/PluginCodeContributionsGuidelines.md
- Docker 部署：deploy/docker/README.md
- Helm 部署：deploy/helm/README.md
- 安全策略：SECURITY.md
