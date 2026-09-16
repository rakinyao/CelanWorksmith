# Demo 合同变更 Action 验证记录

日期：2026-09-14

## 范围与数据边界

本检查验证 Release 1.2.0、原生 Ontology `ACTION_QUERY` 和 Demo Action
Server v1 的合同变更流程。所有步骤只使用本地 Demo Runtime 和本地测试工作区，
不连接、读取或导出生产数据。

Release fixture：
`docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json`。
该文件的 Release 版本为 `1.2.0`，Action ID 为 `ApplyContractChange`，目标类型为
`contract`，`maxItems: 1`、`atomic: true`、`requiresConfirmation: true`，并要求
`changeAmount`（DECIMAL）和 `changeReason`（STRING）两个参数。

## 自动化证据

本地 Maven 回归命令：

```bash
cd app/server
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=LocalReleaseJsonOntologyProjectImporterTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

结果：通过。`LocalReleaseJsonOntologyProjectImporterTest` 11 个测试、
`OntologyFunctionLinkActionExecutorTest` 45 个测试，均为 0 failures/errors。
导入测试验证 1.2.0 快照固定 `ApplyContractChange` 元数据；插件测试验证原生请求
包含 `actionId`、单个 `contract` ObjectSet、`atomic=true` 以及且仅有两个业务参数，
并验证多对象目标在解析 Action Server 前因 `maxItems: 1` 被拒绝。

说明：若不带 `-Dsurefire.failIfNoSpecifiedTests=false`，reactor 上游没有目标测试的
模块会因 Surefire 测试选择策略退出失败；该参数仅允许无匹配测试的模块跳过，不改变
目标测试内容。

## 手工验证步骤

### 新工区 Action Server 路由验收（DEMO）

本节验证的是当前 CelanWorksmith 的最小化 DEMO 路由，不是外部注册中心或正式
Action Server 注册服务。Action Server 端点只在部署环境中按适配器和版本配置一次；
Release 发布者和新工区都不需要携带或编辑 Action Server URL，也不需要配置工区专属
端点。

1. 在后端部署配置中设置一次环境属性
   `celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].url`
   和可选的 `...timeout-millis`，指向本地 Demo Action Server（默认演示端口为
   `http://127.0.0.1:8092`）。该配置属于当前运行环境，不写入 Release JSON。

   当前仓库可复现的本地方式是在未跟踪的 `app/server/.env` 中加入。版本 map 的键包含点号，
   因此必须使用 Spring 的方括号 map-key 记法：

   ```bash
   export SPRING_APPLICATION_JSON='{"celanworksmith":{"action-server":{"adapters":{"demo-action-server":{"versions":{"[1.0.0]":{"url":"http://127.0.0.1:8092","timeout-millis":3000}}}}}}}'
   ```

2. 启动后端和 Demo Action Server。可使用仓库模板和启动脚本：

   ```bash
   install -Dm644 scripts/migration/cw-demo-action-server.service ~/.config/systemd/user/cw-demo-action-server.service
   systemctl --user daemon-reload
   systemctl --user enable --now cw-demo-action-server
   ./app/server/scripts/start-dev-server.sh
   ```

   已运行用户服务时，也可执行 `systemctl --user restart cw-backend`，并检查：

   ```bash
   curl -fsS http://127.0.0.1:8092/actuator/health
   curl -fsS http://127.0.0.1:8081/api/v1/health
   ```

   创建一个全新的工作区及 App；不要为该工作区新增
   Action Server 配置，也不要复制其他工作区的绑定记录。
3. 导入未修改的
   `docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json`，并确认
   Release 中的 Action 元数据声明 `demo-action-server@1.0.0`。
4. 注入 Demo Runtime 数据。仓库提供以下可重复执行的命令：

   ```bash
   node scripts/celanworksmith/generate-business-core-runtime-data.mjs
   ./scripts/migration/seed-runtime-data.sh "$PWD"
   ```

   创建 `ApplyContractChange` 原生 Ontology Action Query，
   选择单个合同并执行。解析器应使用全局部署配置解析
   `demo-action-server@1.0.0`，请求成功并返回 `auditId`。
5. 检查该新工作区的持久化配置和导入快照：不应出现 workspace-specific Action
   Server URL、凭据或 endpoint 覆盖项。刷新合同查询，确认变更已写入并可由返回的
   `auditId` 在 Demo Action Server 审计记录中定位。

2026-09-16 手工复验：多个新工作区分别导入相同的 1.2.0 Release，并成功执行
`ApplyContractChange`。该结果证明 Demo 路由只依赖
`demo-action-server@1.0.0` 的部署级配置，不依赖预先存在的工作区绑定。

### Action 行为验收

1. 在本地 Appsmith 工作区使用管理员绑定的 `business` Demo Runtime，导入上述
   Release JSON。成功结果应创建不可变的 1.2.0 metadata snapshot，并在 Action
   元数据中看到 `ApplyContractChange`。不要填写或信任调用方提供的 runtime provider。
2. 从该 datasource 新建原生 Ontology Query，配置为 **Builder**：
   `operation = ACTION_QUERY`、`Action = ApplyContractChange`、
   `Object type = contract`、`Target source = SINGLE_OBJECT`，选择一个合同 ID（例如
   `CTR-1`），确认参数输入显示 `changeAmount` 与 `changeReason` 两项。
3. 正向执行：输入非零正数（例如 `120000`）和非空说明 `Scope expansion`，通过已有
   Button、Table 行事件或 Form submit 触发 `{{ActionQuery.run()}}`。结果应为成功的 v1
   outcome，并返回 `auditId`。
4. 负向金额执行：对同一合同再次输入非零负数（例如 `-50000`）及新的非空说明。
   成功时金额按增量更新；若导致 `current_amount` 小于零，Action 应返回声明的领域
   错误且不写入任何业务字段。
5. Action 完成后，显式刷新 Contract Query（调用该 Query 的 **Refresh/Run**，不要
   依赖旧表格缓存），检查 `change_amount`、`current_amount`、
   `latest_change_at` 三个字段，以及结果中的 `auditId`。在 Action Server 审计集合中按
   `auditId` 检查 action、目标、状态和 `changeAmount/changeReason` 摘要；不得出现
   datasource metadata context 等敏感字段。
6. 原生 Plugin 每次执行 `ACTION_QUERY` 都生成新的 UUID idempotency key，Builder
   中保存的 Query 不能固定并重放同一个 key。因此手工 UI 验证到上一步为止；幂等重放
   使用 Action Server v1 的同一请求（协议测试或受控 HTTP 客户端）重复提交完全相同
   的 key。第二次应返回与第一次相同的终态结果和 `auditId`，业务金额只增加一次；
   第一次仍在运行时，重复请求应返回 `ACTION_IN_PROGRESS`，不能触发第二次 handler
   dispatch。对应的 `ActionExecutionServiceTest` 是本流程的自动化证据。
7. 分别验证拒绝路径：`changeAmount` 缺失、为零、不是合法有限 DECIMAL，
   `changeReason` 缺失或为空白，多于一个合同 ID，未知合同 ID，以及会使
   `current_amount` 变为负数的负金额。每种情况都应显示原生 Query 错误，且 Action
   Server 不得发生写入；多对象情况应在 Plugin 侧、解析 Action Server 之前失败。

## Demo Runtime 重导入与重置

手工变更后按现有 Demo Runtime 重导入流程恢复确定性数据。在仓库根目录执行：

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
./scripts/migration/seed-runtime-data.sh "$PWD"
```

该流程重新生成受版本控制的 `scripts/celanworksmith/runtime-data/` fixture，
再通过现有 `seed-runtime-mongodb.js` 对本地 MongoDB 进行幂等 upsert；它不删除或
覆盖生产集合。若主机已安装 `mongosh`，也可直接运行：

```bash
mongosh "mongodb://127.0.0.1:27017" scripts/celanworksmith/seed-runtime-mongodb.js
```

重置完成后重新导入 1.2.0 fixture，并重新创建/刷新 Contract Query 以确认原始金额
和时间字段已恢复。运行数据、构建产物和本地报告均不加入 Git。

## 最终检查

```bash
git diff --check
```

结果：通过，无 whitespace errors。
