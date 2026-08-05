# CelanWorksmith T5 阶段检查点

记录日期：2026-08-05

## 1. 检查点定位

当前检查点用于固化 T0-T5 的本地开发成果，作为进入 T6 Object-aware Widget 开发前的恢复基线。

本检查点基于 `release` 的提交 `665fbf1f33`，包含此前的中英双语改造、T0-T4 本体能力、T5 Function/Action 执行链以及相关文档和测试。

本检查点不是生产发布版本。当前仍需补做 Action 的浏览器成功/失败手工验证，再决定是否将 T5 标记为完整放行。

## 2. 已完成能力

### 2.1 后端

- `OntologyProvider`、`RuntimeProvider`、Mock Provider 和结构化错误模型已建立。
- Mock 本体包含六类 Object Type、五类 Link Type、五个 Function 和四个 Action。
- Runtime API 统一使用 `/api/v1/celanworksmith` 前缀。
- Function、Action、Object 查询、关联查询和 Reasoning API 已接入。
- Action 成功返回 `changedObjects`、`sideEffects` 和 `executionId`。

### 2.2 前端

- 本体元数据进入 Redux/Saga 全局状态。
- `$objects`、`$functions`、`$actions` 进入 DataTree。
- Function/Action 使用异步 DataTree 节点执行，网络请求不在同步求值器中发起。
- Function/Action 执行状态支持 `queued`、`running`、`succeeded`、`failed`、`cancelled`。
- Action 成功后按受影响 Object Type 刷新对象数据并重新求值。
- Function/Action 元数据在编辑器根组件加载，不再依赖打开本体页。
- 元数据成功后自动刷新 Tern 自动补全定义。
- 失败元数据不阻塞编辑器，本体页提供失败提示和 Retry。

## 3. 已验证内容

### 3.1 自动化验证

- T5 前端重点测试：16 个测试套件、126 个测试通过。
- CelanWorksmith 后端测试：3 个测试类、13 个测试通过。
- 本体预加载补充测试：6 个测试套件、13 个测试通过。
- 后端 Maven 测试：11 个测试通过，0 个失败。
- 变更模块 ESLint：0 个错误，保留少量既有性能 warning。
- 变更文件 Prettier 检查通过。
- `git diff --check` 通过。

### 3.2 浏览器手工验证

已验证：

```text
Table Data: {{$objects.PurchaseOrder.all}}
Text: Delayed {{$functions.CalculateDelayDays.data}} days
Button: {{$functions.CalculateDelayDays.run({poId: "PO005"})}}
```

按钮执行后 Text Widget 可刷新为 `Delayed 8 days`。

补充验证：

- `PO001` 返回 `0`，Text Widget 显示 `Delayed 0 days`。
- 不存在的 `PS005` 执行失败后，Text Widget 保留上一次成功的 `.data`，页面不弹出全局提示。
- Function 失败状态应通过以下路径观察：

```text
{{$functions.CalculateDelayDays._meta.status}}
{{$functions.CalculateDelayDays._meta.error.code}}
{{$functions.CalculateDelayDays._meta.error.message}}
```

## 4. 待补验证

以下内容不阻塞创建当前检查点，但在 T5 最终放行前必须验证：

1. `UpdateProductionSchedule` 成功执行后，`$actions.<id>._meta.status` 变为 `succeeded`。
2. Action 返回的 `changedObjects` 可见，相关 `$objects` 数据刷新。
3. 不存在的 Action Object ID 进入 `failed`，且不发生误刷新。
4. 缺少 Action 参数时显示结构化错误。
5. 原生 Query + Table 绑定回归正常。

## 5. 开发环境

| 服务 | 地址 | 说明 |
|------|------|------|
| Nginx | `0.0.0.0:80` | 局域网入口 |
| Frontend Dev Server | `0.0.0.0:3000` | `app/client` Webpack 开发服务 |
| Appsmith Backend | `127.0.0.1:8081` | Spring Boot |
| RTS | `127.0.0.1:8091` | 独立运行进程，源码不在本仓库 |
| MongoDB | `127.0.0.1:27017` | 已配置 |
| Redis | `127.0.0.1:6379` | 已配置 |

局域网访问地址：`http://10.10.110.129/`

Nginx 配置保存在 `.local/dev-nginx.conf`。该文件没有敏感信息，但属于当前开发机部署配置，迁移环境时需重新核对端口和路径。

## 6. 已知注意事项

- 直接访问 `/runtime/...` 会返回 404，必须使用 `/api/v1/celanworksmith/runtime/...`。
- 当前前端首次 Webpack 编译和热重编译内存消耗较高。若出现 502，先检查 `3000` 是否仍监听；502 通常表示前端进程退出，不代表 Nginx 或后端故障。
- 前端开发日志仍有 BetterBugs `worker_threads`、chunk circular dependency 等既有 warning。
- 仓库全量 `yarn check-types` 仍受原项目基线和依赖类型错误影响，不能作为当前阶段的唯一放行标准。
- Appsmith 全量 Maven 测试需要完整的 `APPSMITH_MONGODB_URI` 等环境变量；当前环境下无关基线测试会因 Spring 上下文初始化失败，T5 放行以 CelanWorksmith 定向测试为准。
- Appsmith datasource template 的 PF4J 插件错误仍属于已知问题，不影响当前 CelanWorksmith 本体绑定和 Function 基础链路。
- Mock Action 数据保存在内存中，后端重启后恢复 fixture，不应把它当作持久化业务数据。
- 当前未创建生产 Provider、Object-aware Widget 或发布态 DSL 兼容能力，这些属于后续阶段。

## 7. 后续开发入口

完成 Action 手工验证后，建议进入 T6：

1. ObjectDetail Widget。
2. FilterList Widget。
3. ActionButton Widget。

T6 必须复用当前 API Client、DataTree、执行 Saga 和刷新机制，不应在新 Widget 内重复实现请求、缓存或 Action 执行逻辑。
