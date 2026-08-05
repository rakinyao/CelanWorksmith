# CelanWorksmith T4 阶段总结

## 1. 阶段结论

T4 阶段目标已完成并通过手工验证。

本阶段实现了本体对象的只读绑定，当前可以在 Appsmith Widget 中使用：

```text
{{$objects.Supplier.all}}
{{$objects.PurchaseOrder.all}}
{{$objects.PurchaseOrder.PO001}}
{{$objects.PurchaseOrder.PO001.orderNumber}}
```

已验证：

- `$objects` 可以进入 JS 表达式环境。
- `PurchaseOrder` 等对象类型可以加载运行时数据。
- Table Widget 的 `Table Data` 可以绑定 `{{$objects.PurchaseOrder.all}}`。
- Table Widget 可以显示本体对象数据，并根据非空数据生成 Columns。
- 本体导航、原生 Widget、原生 Query 和既有表达式求值链路未因本阶段改动失效。

## 2. 本阶段交付内容

### 2.1 前端 API 与对象状态

主要文件：

- `app/client/src/api/CelanworksmithAPI.ts`
- `app/client/src/actions/celanworksmithObjectActions.ts`
- `app/client/src/reducers/celanworksmithObjectsReducer.ts`
- `app/client/src/sagas/CelanworksmithObjectsSaga.ts`
- `app/client/src/pages/AppIDE/components/CelanworksmithObjectsLoader.tsx`

对象加载状态按对象类型独立维护：

```text
idle -> loading -> ready
                 -> empty
                 -> error
```

加载结果包含对象实例、分页信息、总数、更新时间和错误信息。

### 2.2 DataTree 注入

主要文件：

- `app/client/src/entities/DataTree/dataTreeCelanworksmith.ts`
- `app/client/src/selectors/dataTreeSelectors.ts`
- `app/client/src/ce/entities/DataTree/types.ts`

对象树结构如下：

```text
$objects
├── ENTITY_TYPE
├── Supplier
│   ├── all
│   ├── S001
│   └── _meta
└── PurchaseOrder
    ├── all
    ├── PO001
    └── _meta
```

对象实例的 `properties` 会展开为实例节点属性，并附加 `id` 和 `typeId`。因此既支持集合绑定，也支持单实例和属性绑定。

### 2.3 自动补全

扩展 `entityDefGeneratorMap`，为 Tern 提供以下层级定义：

```text
$objects.Supplier
$objects.Supplier.all
$objects.Supplier.S001
$objects.Supplier.S001.name
```

调试窗口中看到的：

```text
ENTITY_TYPE: "CELANWORKSMITH_OBJECTS"
```

只是 `$objects` 的实体类型标记。判断数据是否真正加载，应继续检查对象类型的 `all` 数组和 `_meta.status`，不能只看 `ENTITY_TYPE`。

## 3. 问题记录与解决方法

### 3.1 对象树只有 ENTITY_TYPE，没有对象类型数据

**现象**

Debug 窗口中的 `$objects` 只有：

```text
{ ENTITY_TYPE: "CELANWORKSMITH_OBJECTS" }
```

服务端日志只有 `/ontology/object-types`，没有 `/runtime/objects/...` 请求。

**根因**

最初依赖页面生命周期事件和左侧编辑器路由触发对象加载。该方式受当前 IDE 路由、页面初始化顺序和已有 Redux 状态影响，不能保证 Loader 实际挂载并执行。

**解决方法**

1. 新增 `CelanworksmithObjectsLoader`，在编辑器挂载后主动读取对象类型和对象实例。
2. 将 Loader 从左侧 `EditorPane` 提升到 `AppIDE` 根组件，避免依赖当前左侧路由。
3. 移除 Loader 仅在 Redux `idle` 状态执行的限制，避免状态曾经停留在 `loading` 或 `error` 后永久跳过加载。
4. 加载完成后派发 `TRIGGER_EVAL`，使求值树和自动补全及时刷新。

**验证方法**

检查浏览器 Network 和后端日志，应看到：

```text
/api/v1/celanworksmith/ontology/object-types
/api/v1/celanworksmith/runtime/objects/PurchaseOrder
```

### 3.2 Saga 监听 TRIGGER_EVAL 导致加载链路循环

**现象**

对象加载完成后会触发评估。对象 Saga 同时监听 `TRIGGER_EVAL`，而加载完成逻辑又派发 `TRIGGER_EVAL`，存在重复触发甚至循环加载风险。

**根因**

通用评估事件被错误地当成了对象数据加载事件。评估触发不等于需要重新请求本体数据。

**解决方法**

从 `CELANWORKSMITH_OBJECT_LOAD_TRIGGERS` 中移除 `TRIGGER_EVAL`，保留：

- 显式对象加载请求。
- 编辑器初始化事件。
- 页面初始化和页面生命周期事件。

`TRIGGER_EVAL` 只负责通知既有求值链刷新，不再反向启动对象加载。

**后续建议**

当前同时保留了 Saga 加载链和根组件 Loader，存在重复请求的可能。后续应统一为一个加载入口，建议让 Loader 只派发显式 action，由 Saga 负责完整的分页、缓存和错误处理。

### 3.3 对象类型存在，但 `all` 数组为空

**现象**

Debug 中可以看到：

```text
PurchaseOrder: {
  all: [],
  _meta: {...}
}
```

Table Widget 无数据显示，Columns 解析也为空。

**根因**

浏览器实际发出的请求为：

```text
/runtime/objects/PurchaseOrder?offset=0&limit=100&filter=undefined
```

后端 `CelanWorksmithQueryParser` 将字符串 `undefined` 当作 JSON 过滤条件解析，返回：

```text
filter must be valid JSON
```

前端 Loader 捕获错误后仍保留对象类型节点，但没有实例数据，因此形成了“类型存在、集合为空”的状态。

**解决方法**

修改 `serializeObjectQuery`：

- 有过滤条件时，将对象过滤器序列化为 JSON。
- 有效字符串过滤器原样传递。
- 未提供过滤条件、`undefined`、`null` 或空字符串时，删除 `filter` 字段，不发送该查询参数。

修复后的请求形态为：

```text
/runtime/objects/PurchaseOrder?offset=0&limit=100
```

**验证方法**

- 后端不再出现 `filter must be valid JSON`。
- `PurchaseOrder.all` 包含对象实例。
- Table Widget 可以显示数据。

### 3.4 Table Columns 没有内容

**现象**

Table Data 已绑定，但 Columns 区域没有可解析字段。

**根因**

Table Widget 的 Columns 依赖实际的非空行数据。此前 `PurchaseOrder.all` 是空数组，Table 没有可用于推导字段的样本行，因此 Columns 为空。

这不是 `$objects` 字段命名或自动补全定义问题，而是 runtime 数据加载失败的连带表现。

**解决方法**

修复 runtime 查询参数后，数据行正常进入 `tableData`，Table Widget 的既有列推导逻辑自动生成 Columns，不需要额外改造 Table Widget。

### 3.5 API 路径和反向代理问题

**现象**

直接访问：

```text
/runtime/objects/PurchaseOrder
```

返回 404；带 API 前缀后正常：

```text
/api/v1/celanworksmith/runtime/objects/PurchaseOrder
```

**原因**

CelanWorksmith API 挂载在 Appsmith 的 `/api/v1` 路径下。前端 `Api` 的默认 `baseURL` 是 `/api/`，因此 API 类只应传递相对路径：

```text
v1/celanworksmith/runtime/objects/PurchaseOrder
```

浏览器最终请求才是 `/api/v1/...`。

**参考原则**

- 前端 API 类不要手工拼接 `/api/`。
- 浏览器和 curl 手工验证时必须使用完整 `/api/v1/...` 路径。
- 发现 404 时先检查请求路径和 Nginx 代理，不要直接判断后端 Controller 未注册。

## 4. 当前服务拓扑与排障记录

当前开发环境服务如下：

| 服务 | 地址 | 用途 |
|------|------|------|
| Nginx | `0.0.0.0:80` | 局域网入口和反向代理 |
| 前端开发服务 | `0.0.0.0:3000` | React/Webpack 开发服务 |
| Appsmith 后端 | `127.0.0.1:8081` | Spring Boot API |
| RTS | `127.0.0.1:8091` | 表达式求值和运行时服务 |
| MongoDB | `localhost:27017` | Appsmith 持久化数据 |
| Redis | `localhost:6379` | 缓存和会话相关能力 |

局域网入口：

```text
http://10.10.110.129/
```

### 4.1 前端服务

前端源码位于 `app/client`，开发服务监听 `3000`，Nginx 将根路径代理到该服务。修改前端代码后需要确认：

1. Webpack 开发服务已重新编译。
2. 浏览器执行强制刷新，避免继续使用旧的 lazy chunk。
3. Network 中的 JS chunk 返回 HTTP 200。

### 4.2 后端服务

后端实际从 `app/server/dist` 目录运行已构建的 JAR，监听 `8081`。后端源码变更后，必须重新构建并重启该进程，否则源码修改不会进入当前运行服务。

### 4.3 RTS 和 502

本阶段早期遇到过 RTS 错误和 Nginx 502。排查要点：

- RTS 进程必须监听 `8091`。
- Nginx 必须配置 `/rts` 到 `8091` 的代理。
- API、RTS 和前端分别检查，不要把 RTS 失败误判为本体 runtime API 失败。
- RTS 修复后，仍需单独检查 `/runtime/objects/...` 请求及后端业务日志。

本次 Table 数据为空的直接根因是 `filter=undefined`，不是 RTS 问题。

### 4.4 与 T4 无关的历史问题

以下问题不属于 T4 对象绑定主链路，当前未纳入修复范围：

- PF4J 插件缺失导致的 `Unable to load datasource templates`。
- 某些原生 Datasource 模板和插件初始化错误。
- 登录后部分非本体业务操作错误。

排查本体绑定时，应先确认 runtime 对象请求和响应，不要被这些独立错误干扰。

## 5. 验证记录

### 5.1 自动化验证

已完成的相关验证包括：

- API 路径和查询参数序列化测试。
- 对象 Reducer 的状态转移测试。
- DataTree 生成和 Selector 测试。
- Saga 分页和对象加载测试。
- 自动补全定义测试。
- Object binding 路径解析测试。
- T3 Ontology Explorer 回归测试。

本轮修复后新增 API 序列化测试通过：

```text
Test Suites: 1 passed
Tests:       3 passed
```

此前 T4 相关测试记录为 8 个测试套件、32 个测试通过。

### 5.2 手工验证

已验证：

1. `$objects` 可在 JS 表达式中使用。
2. `$objects.PurchaseOrder.all` 可以读取对象集合。
3. Table Widget 绑定该集合后显示本体对象数据。
4. Table Columns 可以根据实际数据生成。

## 6. 当前限制与后续建议

### 当前限制

- 当前对象加载仍有根组件 Loader 和 Saga 两套入口，后续需要合并，避免重复请求。
- 根组件 Loader 当前单次请求 `limit=100`；Saga 支持分页合并，但两套入口未统一，真实数据超过 100 条时应优先完成加载链路统一。
- 当前只实现只读对象集合、实例和属性绑定。
- Function、Action 和 `$reason` 不属于 T4，延后到后续阶段。
- `_meta` 已保留错误信息，但当前尚未形成完整的 Widget 可视化错误提示规范。

### 后续建议

1. T5 开始前统一对象加载入口，以 Saga 作为唯一数据加载和分页协调层。
2. 为 runtime 请求增加统一的请求日志和前端错误展示，明确区分网络错误、权限错误、查询参数错误和空数据。
3. 增加空集合、无权限、未知对象类型和后端 500 的手工验收用例。
4. 对 Table/Form 等既有 Widget 增加本体数据模式的专项兼容测试。
5. 在接入真实 Provider 前冻结过滤、排序、分页和错误码契约，避免前端再次依赖隐式参数。

## 7. T4 放行结论

T4 已满足阶段完成定义：


- 代码实现完成。
- 相关自动化测试通过。
- 手工对象绑定和 Table 展示验证通过。
- 加载逻辑、API 参数、服务拓扑和已知限制已记录。
- T5 可以在 T4 只读对象绑定能力之上继续实施 Function 与 Action 执行链。
