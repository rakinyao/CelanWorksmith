# CelanWorksmith T4 开发记录

## 1. 阶段范围

T4 实现只读 `$objects` 绑定，支持以下三类数据访问：

```text
{{$objects.Supplier.all}}
{{$objects.Supplier.S001}}
{{$objects.Supplier.S001.name}}
```

本阶段不实现 Function、Action 和 `$reason`。

## 2. 已实现内容

### 2.1 路径解析

新增 `app/client/src/utils/celanworksmithObjectBindings.ts`：

- 识别 Object Type、Object Set、Instance 和 Property 四类路径。
- 支持合法的引号键访问。
- 拒绝缺少 `$objects` 命名空间、空路径和不完整括号。
- 输出 Object Type、Instance ID、属性路径和原始表达式路径。

### 2.2 对象数据状态

新增 `celanworksmithObjectsReducer` 和对应 Action：

- 页面加载时发现 Object Types。
- 每个 Object Type 独立记录 `idle/loading/ready/empty/error` 状态。
- 记录分页 offset、limit、total、更新时间和错误码。
- 页面切换保留成功缓存，只重新加载 idle、loading 或 error 类型。
- 数据类型级状态变化后触发原有 `TRIGGER_EVAL`，不在同步渲染线程请求后端。

### 2.3 数据树

新增 `app/client/src/entities/DataTree/dataTreeCelanworksmith.ts`，并注入现有 `getUnevaluatedDataTree()`：

```text
$objects
└── Supplier
    ├── all
    ├── S001
    └── _meta
```

实例属性被展开到实例节点，因此可以直接读取 `Supplier.S001.name`。`_meta` 保留加载状态、总数、更新时间和错误信息。

### 2.4 分页查询

新增 `app/client/src/sagas/CelanworksmithObjectsSaga.ts`：

- 使用统一 `CelanworksmithAPI`。
- 每次请求最大 `limit=100`。
- 自动合并多页结果，覆盖 PurchaseOrder 等超过 100 条的数据。
- API 失败时保留明确错误码和错误信息。

### 2.5 自动补全

扩展 Tern DataTree 定义生成器：

- `$objects.Supplier`
- `$objects.Supplier.all`
- `$objects.Supplier.S001`
- `$objects.Supplier.S001.name`

原有 Query、Widget、Action 和 JSObject 的生成分支保持不变。

## 3. 自动化验证

已通过 8 个相关测试套件、32 个测试：

- `$objects` 合法和非法路径解析。
- Object Set、Instance、Property 数据树形态。
- loading、empty、error 状态。
- 页面切换缓存保留。
- 100 条分页上限和多页合并。
- 自动补全定义。
- 原有 DynamicBindingUtils、DataTreeTypeDefCreator 和 T3 Ontology Explorer 回归。

前端新增代码的筛选 TypeScript 检查无错误。仓库全量 TypeScript 检查仍存在既有 ADS/React 类型错误，未作为 T4 改动处理。

## 4. 当前服务

- 前端开发服务：`127.0.0.1:3000`
- 后端服务：`127.0.0.1:8081`
- 局域网入口：`http://10.10.110.129/`
- 前端入口和局域网入口当前均返回 HTTP 200。

前端构建保留仓库既有 `worker_threads` 缺失警告和 chunk 循环警告，不影响开发服务启动。

## 5. 待手工验收

1. Text Widget 的 Text 属性绑定 `{{$objects.Supplier.S001.name}}`，确认显示 `Supplier 1`。
2. Table Widget 的数据属性绑定 `{{$objects.PurchaseOrder.all}}`，确认显示 Mock 订单数据。
3. 验证空集合、权限错误和不存在对象类型时的 `_meta` 状态。
4. 验证原生 Query、Widget 属性和 JSObject 函数绑定未回归。

手工验收通过后，T4 才满足阶段放行条件并进入 T5。
