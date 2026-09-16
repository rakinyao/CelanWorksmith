# 本体能力与 Action Server 正式契约草案

## 1. 文档目的与状态

本文定义本体模型平台、CelanWorksmith 和 Action Server 之间拟共同确认的正式接口边界。目标是使 CelanWorksmith 能够在不持有业务写权限、不依赖工作区到服务端点静态绑定的前提下，安全地发现并执行与本体模型兼容的 Functions 和 Actions。

本文是供三方评审的草案，而非现网协议。本文中的 `MUST`、`MUST NOT`、`SHOULD`、`MAY` 分别表示必须、禁止、建议和可选要求。字段模式、HTTP 路径和错误码在三方确认后应分别固化为 JSON Schema 与 OpenAPI 工件。

## 2. 范围

本文覆盖以下三条边界：

1. 本体模型平台发布不可变的 Ontology Release 与独立的 Capability Release。
2. CelanWorksmith 通过注册发现服务，以 adapter 和版本发现可调用的 Function/Action Server。
3. CelanWorksmith 与 Function/Action Server 之间的执行、异步状态、幂等、授权、审计与错误协议。

Runtime Provider 的读数据协议是本契约的外部依赖。本文仅要求执行方以固定 Ontology Release 快照验证对象目标，不重新定义 Runtime Provider 的数据访问协议。

## 3. 术语

| 术语 | 含义 |
| --- | --- |
| Ontology Release | 仅包含本体对象、字段、关系、对象标识和运行时语义映射的不可变发布物。 |
| Capability Release | 独立发布的 Function/Action 能力工件，声明其适用的 Ontology Release 范围、目标对象和实现适配器。 |
| Capability | Capability Release 中的一个 Function 或 Action 定义。 |
| Adapter | 可执行能力的服务实现类型，由 `adapter_id` 与 `adapter_version` 唯一标识。 |
| 注册发现服务 | 根据租户、环境、Adapter 版本、策略和健康状态返回可用服务路由的服务。 |
| 固定快照 | CelanWorksmith 在数据源或 Query 中保存的 Ontology Release digest 与 Capability Release digest 组合。 |
| Action Server | 负责具有副作用的 Action 授权、审计、幂等与业务执行的服务。 |

## 4. 总体责任边界

| 参与方 | 必须负责 | 禁止或不负责 |
| --- | --- | --- |
| 本体模型平台 | 生成不可变发布物；声明对象、关系、能力、兼容范围和摘要；维护发布者身份 | 不关心 CelanWorksmith 工作区、应用、服务 URL、凭据或部署拓扑 |
| CelanWorksmith | 校验发布物并固定快照；将 Query 的目标对象、参数和可信调用上下文转换为执行请求；映射到原生 Query 结果 | 不解释任意脚本；不持有业务写权限；不替代业务授权决定 |
| 注册发现服务 | 选择适用且健康的服务实例；签发短期访问凭据；执行租户和环境路由策略 | 不解析业务对象 ID、Action 参数或业务语义 |
| Function/Action Server | 验证请求、授权、审计、同步或异步执行、领域错误和业务事务 | 不信任浏览器提交的身份、模型版本或调用上下文；不依赖固定工作区绑定 |

Ontology Release、Capability Release、Query 和数据源配置中均不得保存 Action Server URL、服务实例 ID、长期凭据或工作区到服务的静态绑定。

## 5. 发布物模型

### 5.1 Ontology Release

Ontology Release 是本体语义的唯一权威来源，MUST 只包含：

- `model_id`、严格 SemVer `version`、不可变 `release_digest` 和发布者信息；
- 对象类型、字段、字段类型、主标识、关系、关系基数；
- 运行时语义映射和适用于读取侧的兼容性信息。

Ontology Release MUST NOT 内嵌 Function 或 Action 的权威定义。它不引用 Action Server，也不包含工作区、消费系统或执行端点信息。

### 5.2 Capability Release

Functions 和 Actions 通过独立、不可变、可摘要校验的 Capability Release 发布。Capability Release MUST 包含自己的 `capability_release_id`、严格 SemVer `version`、`capability_digest`、发布者信息和以下本体依赖：

```json
{
  "ontology_dependency": {
    "model_id": "business-core",
    "version_range": ">=1.2.0 <2.0.0"
  }
}
```

Capability Release 中每个 Capability MUST 包含：

- 稳定的 `capability_id`、显示名称、类型（`FUNCTION` 或 `ACTION`）和版本；
- `owner_object_type_ids`、`min_items`、`max_items` 与目标对象约束；
- 输入参数的名称、类型、必填性、枚举/范围和对象引用约束；
- Function 的结果模式，或 Action 的确认与业务结果模式；
- `implementation.adapter_id` 和严格 SemVer `implementation.adapter_version`；
- Capability 所依赖的本体字段、关系或语义标识列表。

Action 的 `implementation` 示例：

```json
{
  "adapter_id": "contract-action-server",
  "adapter_version": "1.0.0"
}
```

### 5.3 兼容性判定

Capability Release 可声明本体版本范围，其发布频率可以低于 Ontology Release。CelanWorksmith 在装载或升级时 MUST 验证：

1. `model_id` 与当前 Ontology Release 一致。
2. Ontology Release 的版本落在 Capability 声明的 `version_range` 内。
3. Capability 所引用的对象类型、字段、关系、类型和基数在当前 Ontology Release 中存在且兼容。

版本范围匹配仅表示候选资格，不能替代结构验证。任何缺失或不兼容依赖 MUST 阻止该 Capability 装载或执行。

### 5.4 快照固定与升级

保存的 Query MUST 固定以下标识：

- `ontology_release_digest`；
- `capability_digest`；
- `capability_id` 与 Capability 版本；
- 目标对象类型和经过验证的参数配置。

发布新的 Ontology Release 或 Capability Release 不得静默改变既有 Query 行为。升级 MUST 先产生兼容性报告，经管理员批准后生成新快照；旧快照应保留至明确迁移或回滚完成。

## 6. 注册发现契约

### 6.1 发现请求

CelanWorksmith 在执行前，从固定 Capability 中读取 Adapter 标识并请求注册发现服务。请求至少包含：

```json
{
  "tenant_id": "authoritative-tenant-id",
  "environment": "development",
  "adapter_id": "contract-action-server",
  "adapter_version": "1.0.0",
  "capability_digest": "sha256:...",
  "ontology_release_digest": "sha256:..."
}
```

`tenant_id`、环境和调用者身份 MUST 由 CelanWorksmith 服务端权威注入。浏览器不得覆盖这些字段。工作区可以作为审计上下文附带，但 MUST NOT 是路由匹配键。

### 6.2 发现响应

成功响应 MUST 返回：

- `instance_id`；
- HTTPS `endpoint`；
- 面向该实例和协议受众的短期 bearer token；
- `expires_at`；
- `protocol_version`；
- `timeout_millis`。

CelanWorksmith MUST NOT 持久化长期服务凭据。可在 token 有效期内按 `instance_id` 缓存发现结果；网络失败或凭据过期时 MAY 重新发现一次。

注册发现服务 MUST 对未注册 Adapter、Adapter 版本不兼容、租户不允许、Capability/本体不兼容和无健康实例返回稳定机器错误码。它不得接收对象 ID 或业务参数。

## 7. Function 与 Action 执行契约

### 7.1 统一执行请求

Function 与 Action 使用同一请求信封。Action 额外要求幂等键：

```json
{
  "protocol_version": "1.0",
  "request_id": "uuid",
  "idempotency_key": "required-for-action-only",
  "route": {
    "adapter_id": "contract-action-server",
    "adapter_version": "1.0.0",
    "instance_id": "registry-selected-instance"
  },
  "context": {
    "tenant_id": "authoritative-tenant-id",
    "workspace_id": "celanworksmith-workspace-id",
    "application_id": "celanworksmith-application-id",
    "actor": {
      "subject_id": "authenticated-principal-id",
      "token": "short-lived-delegated-token"
    }
  },
  "model": {
    "ontology_release_digest": "sha256:...",
    "capability_digest": "sha256:...",
    "capability_id": "ApplyContractChange",
    "capability_version": "1.0.0"
  },
  "target": {
    "object_type_id": "contract",
    "object_ids": ["contract-001"]
  },
  "parameters": {
    "changeAmount": -10000,
    "changeReason": "Scope adjustment"
  }
}
```

`target.object_ids` MUST 始终是字符串数组。单对象编辑仅表示数组长度为 1；Capability 的 `min_items` 与 `max_items` 决定数组是否合法。

CelanWorksmith MUST 使用固定快照校验目标和参数。Function/Action Server MUST 重新验证请求的模型、能力、目标、参数、调用者和租户；服务端不得信任浏览器或仅依赖 CelanWorksmith 的前置验证。

### 7.2 Function 语义

Function MUST 是只读、同步的计算。它不得接受 Action 幂等语义，也不得产生业务写操作。成功响应返回结构化 `result` 与可选展示摘要。

### 7.3 Action 语义

Action MUST 提供非空 `idempotency_key`。对于相同授权主体、Capability、模型摘要、能力摘要、目标和参数的重放，Action Server MUST 返回同一终态结果或同一执行句柄，且最多发生一次业务变更。

Action Server MUST 负责最终授权、确认策略、审计持久化、领域事务和领域错误。CelanWorksmith 只将协议结果映射为原生 Action Query 的成功、加载或错误状态。

### 7.4 同步与异步响应

同步终态成功响应 MUST 包含：

```json
{
  "status": "SUCCEEDED",
  "request_id": "uuid",
  "audit_id": "audit-id",
  "result": {},
  "summary": "safe human-readable summary"
}
```

异步接受响应 MUST 包含：

```json
{
  "status": "ACCEPTED",
  "request_id": "uuid",
  "audit_id": "audit-id",
  "operation_id": "operation-id",
  "status_url": "https://...",
  "retry_after_millis": 1000
}
```

异步状态查询 MUST 最终返回 `SUCCEEDED`、`FAILED` 或 `CANCELLED`。CelanWorksmith 应复用原生 Query 的结果和加载状态，不创建平行的本体执行状态系统。

### 7.5 错误响应

所有协议错误 MUST 包含 `code`、安全的 `message`、`request_id`、`retryable` 和可选 `field_errors`。Action Server 一旦接受请求，后续成功或失败响应 MUST 带 `audit_id`。注册、认证、传输和超时错误不得伪装为领域错误。

## 8. 安全与审计

- 生产发布物 MUST 校验摘要，并 SHOULD 校验受信发布者的签名与签发者身份。
- 浏览器不得提交或覆盖租户、工作区、应用、调用者、Release digest、Capability digest、服务实例或授权令牌等权威字段。
- 注册发现服务签发的令牌 MUST 短期有效、受众限定为目标实例，并与租户和协议版本绑定。
- Action Server MUST 独立复核调用者、租户、目标对象、Capability、版本和参数授权。
- 每个 Action 审计记录 MUST 至少保存 `audit_id`、`request_id`、幂等键、调用方、模型/能力摘要、目标摘要、脱敏参数摘要、授权决定、状态时间线和领域结果码。

## 9. 当前 Demo 的过渡规则

当前 `ontology-model-release-demo-actions-1.2.0.json` 将 Action 元数据置于 Ontology Release 内，仅用于证明 `DEMO_HANDLER` 路径和本地 adapter 路由。该格式不能作为正式发布契约。

正式 Capability Release 可用后：

1. 新的正式 Ontology Release 不再以内嵌定义作为 Function/Action 权威来源。
2. CelanWorksmith 导入器装载独立 Capability Release，并执行第 5.3 节的兼容性校验。
3. 本地 `adapter -> URL` 映射仅保留为开发环境 `DemoRouteResolver`。
4. 生产环境仅通过注册发现服务获取端点和短期凭据。

## 10. 建议实施阶段与验收标准

### 阶段一：发布物与适配层

定义 Ontology Release 和 Capability Release 的 JSON Schema、摘要/签名校验和独立 Capability 导入。保留 DemoRouteResolver 以维持现有演示验证。

### 阶段二：注册发现与协议客户端

实现注册发现接口、短期凭据、同步/异步 Action 状态和统一错误模型；建立 Action Server 的契约测试套件。

### 阶段三：正式插件收敛

弃用 Release 内嵌 Function/Action 元数据和本地静态路由；实施升级审批、审计查询、可观测性和生产安全策略。

正式验收必须证明：

1. 同一 Capability 可在其兼容范围内的多个 Ontology Release 与多个工作区中被发现和执行。
2. 不兼容 Capability 或 Ontology Release 在装载、编辑或执行前被明确拒绝。
3. Action 重放不会造成重复业务变更，且可追溯到完整审计记录。
4. Release、Capability、Query、工作区配置和浏览器状态中均无服务端点或长期凭据。
5. CelanWorksmith 保持原生 datasource/query/action 执行路径，不产生并行本体执行状态。
