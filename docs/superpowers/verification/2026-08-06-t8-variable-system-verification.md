# T8 Variable System Verification

日期：2026-08-06  
阶段：T8 Variable 系统  
目标：让页面变量以持久化定义、依赖图求值和 `$variables.<name>` 数据树节点的方式参与编辑器绑定。

## 1. 实施结果

- 变量定义存储在当前页面根 `CANVAS_WIDGET.celanworksmithVariables`，沿用 Appsmith 页面 DSL 保存链路。
- 支持 `OBJECT_SET`、`OBJECT_PROPERTY`、`FUNCTION`、`AGGREGATION` 四种定义。
- 定义校验包含变量名、ID/名称重复、缺失依赖、拓扑排序和循环路径提示。
- ObjectSet 复用现有 Object Query/Saga，查询请求使用稳定的 `$variable/<variableId>` widget ID。
- Function 变量复用既有 `celanworksmithFunctionRun` 执行链，并按函数 ID 和参数签名去重。
- `$variables` 已合并到未求值数据树和自动补全数据树，不改变 `$objects`、`$functions`、`$actions` 和原生 Query 命名空间。
- Ontology Explorer 增加 Variables 区域，支持新增/删除、ObjectSet 过滤条件、Aggregation 来源与操作、Function 参数 JSON，以及状态/错误展示。

## 2. 自动化验证

在 `app/client` 执行：

```bash
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/variables/variableUtils.test.ts \
  src/celanworksmith/variables/variableLoaderUtils.test.ts \
  src/entities/DataTree/dataTreeCelanworksmithVariables.test.ts \
  src/selectors/celanworksmithVariableSelectors.test.ts \
  src/selectors/dataTreeSelectors.test.ts \
  src/pages/AppIDE/components/CelanworksmithVariablesLoader.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/VariablesSection.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/index.test.tsx \
  --runInBand --no-cache
```

结果：8 个测试套件、17 个测试通过。Explorer 测试输出了既有的 React `act` 警告，不影响断言结果。

静态检查：

- 新增业务代码 ESLint：无 error；存在组件内联回调和匿名 effect 的 warning。
- 目标文件 Prettier：通过。
- `git diff --check`：通过。
- 全仓库 `yarn check-types` 仍受当前仓库 design-system/React JSX 类型环境中的既有大量错误影响；新增变量业务类型错误已单独筛选并清除。

环境复核结果：`http://10.10.110.129/` 返回 `200`；未携带登录态访问 Object Runtime API 返回 `401`，表示 Nginx、后端路由和认证保护均可达。

## 3. 手工验证

### 3.1 创建过滤 ObjectSet

1. 登录并进入任意 App 编辑器，打开 Ontology Explorer。
2. 在 `Variables / 变量` 区域选择 `Object Set`。
3. 输入变量名 `delayedOrders`，Object Type 选择 `PurchaseOrder`。
4. 勾选 Filter，选择 `delayDays`、`gt`，输入 `0`，点击加号。
5. 确认变量出现在列表中，状态先为 `loading`，请求完成后为 `ready`。
6. 在 Table Widget 的 Table Data 切换 JS 模式，输入：

   ```text
   {{$variables.delayedOrders}}
   ```

   应显示过滤后的 PurchaseOrder 数组；没有匹配项时应显示空数组而不是报错。

### 3.2 创建依赖 Aggregation

1. 选择 `Aggregation`。
2. Source 选择 `delayedOrders`，Operation 选择 `count`，输入变量名 `delayedOrderCount`，点击加号。
3. 在 Text Widget 中绑定：

   ```text
   Delayed orders: {{$variables.delayedOrderCount}}
   ```

4. 修改 ObjectSet 过滤条件并重新保存，确认计数随上游集合更新。

### 3.3 创建 Function Variable

1. 选择 `Function`，选择 `CalculateDelayDays`。
2. Function parameters 输入：

   ```json
   { "poId": "PO001" }
   ```

3. 输入变量名 `delayDays` 并创建。
4. 在 Text Widget 中绑定 `{{$variables.delayDays}}`，确认 Function 请求完成后显示返回值。
5. 输入不存在的单号，确认变量状态进入 error 或保持上一份可用值的行为与 `_meta` 一致，不应触发未捕获异常。

### 3.4 持久化、错误和循环

1. 刷新页面或离开后重新进入 App，确认 Variables 定义仍在，ObjectSet/Function 会重新触发一次必要加载。
2. 删除 ObjectSet 后，若仍存在依赖该 ObjectSet 的 Aggregation，确认校验阻止保存并显示缺失依赖错误；先删除 Aggregation 后再删除 ObjectSet。
3. 使用测试 DSL/开发态 Redux fixture 构造 `A -> B -> A` 依赖，确认保存前校验显示完整循环路径；自动化覆盖见 `variableUtils.test.ts`。
4. 在 Object/Function 元数据尚未完成加载时进入编辑器，确认变量节点显示 `idle`，元数据完成后自动进入加载流程，不产生 `UNKNOWN_OBJECT` 的竞态错误。

### 3.5 结构化过滤兼容性修复

手工创建 `delayedOrders` 后出现 `The runtime request failed.` 时，定位到前端发送的版本化过滤结构与 Mock Runtime 原先支持的属性运算符结构不一致。前端请求形态为 `typeId + version + conditions`，旧后端会把 `typeId` 误判为 PurchaseOrder 属性并返回 `FILTER_INVALID`。

- `MockDataStore` 现支持版本 1 的结构化过滤条件，并保留旧属性过滤格式兼容。
- 覆盖 `equals`、`contains`、`startsWith`、`gt`、`gte`、`lt`、`lte` 和 `isEmpty` 运算符。
- `delayDays gt 0` 对当前 Mock 数据返回 40 条 PurchaseOrder。
- 后端 `MockRuntimeProviderTest` 和 `CelanWorksmithControllerTest` 共 12 个测试通过；新 JAR 已部署到开发服务，8081 端口正常监听。

### 3.6 `$variables` 自动补全修复

变量值已经可以求值但输入 `$variables.` 没有提示时，原因是 Tern 自动补全生成器没有注册 `CELANWORKSMITH_VARIABLES` 实体，同时求值后的定义刷新没有传入变量数据树。现已注册变量名和值的类型定义，并将变量数据树加入每次 Tern 刷新；异步值尚未返回时也会生成变量名占位定义。相关 9 个套件、33 个测试通过。

## 4. 已知限制与 T9 边界

- 当前 T8 配置 UI 重点覆盖创建和删除；定义创建后的高级编辑、批量导入和可视化依赖图留待后续迭代。
- 变量定义保存在页面 DSL，但尚未实现发布态/云端运行态的变量快照校验、版本迁移和发布兼容性提示，这些属于 T9。
- Function 参数 JSON 在 UI 中只做对象形状校验，具体参数类型由既有 Function Saga 校验。
- 全仓库 TypeScript 检查的 design-system JSX 类型错误不是本阶段新增，不能用全量 `tsc` 作为 T8 放行条件。
