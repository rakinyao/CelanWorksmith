# 本体建模平台需求输入与发布契约

**文档状态：** CelanWorksmith 当前阶段的对接基线

**适用消费者：** CelanWorksmith `feat/ontology-datasource-plugin` 分支及
`v0.1.0-ontology-integration` 阶段标签

**对接格式：** `ontology-model` JSON，`format_version: 2`

本文供独立的本体建模平台开发团队使用。平台必须按照本文生成可被
CelanWorksmith 导入、校验、快照化并用于原生 Query/Action 流程的 Release
JSON。本文描述的是当前已实现的消费者契约；未来的 Capability Release、服务
注册发现和生产 Action Server 协议不属于本阶段必做范围。

英文字段、JSON 名称和枚举值以本文示例为准，不应翻译成中文。展示名称和
描述可以提供 `zh-CN` 与 `en-US` 两种语言。

## 1. 双方职责边界

### 本体建模平台负责

- 对象类型、字段、字段类型、主键、关系和关系映射；
- Function/Action 的当前元数据，包括所有者、返回类型、目标上限和实现引用；
- 逻辑运行时资产引用及字段映射；
- Release 的完整性、版本、前序摘要、兼容性声明和内容摘要；
- 生成每次发布的不可变、完整、自洽 Release。

### CelanWorksmith 负责

- 工作区数据源、元数据快照和应用 Query/Action 配置；
- 按部署/租户和 domain 解析实际运行时 Provider；
- 凭据、主机地址、连接池、环境选择和运行时可用性；
- 使用原生 Appsmith datasource、Query、Action、DataTree 和应用发布流程；
- 保存 Release 摘要并拒绝不兼容或无法服务的 Release。

Release 中禁止出现数据库主机、端口、账号、密码、Token、连接字符串、
CelanWorksmith workspace/application ID、外部 Action Server URL 或长期凭据。
`asset_ref` 只能是逻辑资产引用。

## 2. Release 顶层结构

每个 Release 必须是完整 domain 的不可变快照，不能只发布增量元素：

```json
{
  "format": "ontology-model",
  "format_version": 2,
  "release": {
    "domain": "business",
    "model_id": "business-core-demo",
    "version": "1.0.0",
    "previous_release_digest": null,
    "released_at": "2026-10-22T00:00:00Z",
    "release_digest": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "change_set": {
      "compatibility": "INITIAL",
      "changes": []
    }
  },
  "elements": []
}
```

### 必填规则

| 字段 | 要求 |
| --- | --- |
| `format` | 必须为 `ontology-model` |
| `format_version` | 当前必须为整数 `2` |
| `release.domain` | 非空；是运行时绑定和发布边界 |
| `release.model_id` | 非空；与 domain、version 共同标识模型版本 |
| `release.version` | 严格 SemVer，例如 `1.2.0` |
| `release.previous_release_digest` | 首次发布为 `null`，后续发布指向前一版本摘要 |
| `release.released_at` | 可提供；当前消费者接受但不保存，不作为运行时身份 |
| `release.release_digest` | 必填，`sha256:` 加 64 位小写十六进制摘要 |
| `release.change_set.compatibility` | `INITIAL`、`BACKWARD_COMPATIBLE` 或 `BREAKING` |
| `release.change_set.changes` | 必须存在；无变化时为空数组 |
| `elements` | 必须为数组，包含该 domain 的完整元素集合 |

`domain + model_id + version` 不得重复。每个元素的 `domain` 必须等于
Release domain；元素的 `domain + kind + name` 在同一 Release 中必须唯一。
所有元素版本也必须是严格 SemVer。

## 3. 摘要计算

平台发布前必须按以下顺序计算 `release.release_digest`：

1. 复制完整 JSON 文档；
2. 仅移除 `/release/release_digest`；
3. 使用 RFC 8785 JSON Canonicalization Scheme 生成规范字节；
4. 对规范字节执行 SHA-256；
5. 将结果写成 `sha256:` 加 64 位小写十六进制，例如
   `sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`。

任何其他字段变化都必须重新计算摘要。摘要证明内容身份，不代表发布者身份；
本阶段不要求签名、证书或审批服务。

## 4. `entity_set` 对象类型

```json
{
  "kind": "entity_set",
  "domain": "business",
  "name": "contract",
  "version": "1.0.0",
  "spec": {
    "display_name": { "zh-CN": "合同", "en-US": "Contract" },
    "fields": [
      {
        "name": "id",
        "type": "string",
        "display_name": { "zh-CN": "合同ID", "en-US": "Contract ID" },
        "nullable": false,
        "read_only": false,
        "derived": false,
        "enum_values": [],
        "reference_target": null
      }
    ],
    "primary_key_fields": ["id"]
  }
}
```

### 当前消费者要求

- `spec.display_name` 必须提供可用本地化文本；读取顺序为 `zh-CN`、`en-US`；
- `fields` 中每个字段必须有 `name`、`type` 和 `display_name`；
- 支持类型：`string`、`integer`、`decimal`、`boolean`、`date`、`timestamp`、
  `json`、`reference`；
- 当前必须恰好一个主键字段；复合主键会被拒绝；
- `enum_values`、`reference_target` 按字段类型使用；不适用时使用空数组或
  `null`；
- `nullable`、`read_only`、`derived` 应明确输出布尔值；
- `description`、`properties`、`source_table` 可被旧解析器接受，但当前不会
  进入可查询的映射模型，不得作为 CelanWorksmith 当前能力的依赖。

## 5. `runtime_binding` 运行时逻辑绑定

每个可执行 `entity_set` 必须有且只有一个绑定：

```json
{
  "kind": "runtime_binding",
  "domain": "business",
  "name": "contract_runtime",
  "version": "1.0.0",
  "spec": {
    "entity_set": "contract",
    "provider_kind": "GOVERNED_DATASET",
    "asset_ref": "${source_dataset_id}:public.ont_contract",
    "access_mode": "READ_ONLY",
    "primary_key_mapping": { "id": "id" },
    "field_mappings": {
      "id": { "column": "id", "expression": null, "status": "inferred" }
    }
  }
}
```

要求：

- `entity_set` 必须解析到同一 Release 中的实体；
- `asset_ref` 只表达逻辑资产，不得携带连接信息；
- `primary_key_mapping` 必须完整；
- 每个实体字段必须有 `field_mappings`；
- CelanWorksmith 导入时会在当前部署/租户中检查 provider、资产可用性和字段
  映射，无法解析时拒绝创建快照；
- 当前访问模式应使用 `READ_ONLY`，业务写入通过 Action，而非运行时绑定直写。

## 6. `entity_set_link` 关系

```json
{
  "kind": "entity_set_link",
  "domain": "business",
  "name": "contract_customer",
  "version": "1.0.0",
  "spec": {
    "source_entity_set": "contract",
    "destination_entity_set": "customer",
    "cardinality": "MANY_TO_ONE",
    "mapping_status": "VERIFIED",
    "field_mappings": [
      { "source_field": "customer_code", "destination_field": "customer_code" }
    ]
  }
}
```

`cardinality` 只能是 `ONE_TO_ONE`、`ONE_TO_MANY`、`MANY_TO_ONE`、
`MANY_TO_MANY`。`mapping_status` 可以是 `INFERRED`、`VERIFIED`、`REJECTED`，
但只有 `VERIFIED` 关系进入可执行映射。两端实体和每个字段映射都必须存在。

`confidence`、`entity_link_type`、`source_fields_mapping` 以及
`entity_source`/`entity_source_link` 属于兼容或血缘信息；当前会进行有限解析
或校验，但不会进入 CelanWorksmith 的可执行项目定义。

## 7. Function 当前支持范围

当前 Function 是只读能力，支持：

```text
spec.display_name
spec.owner_object_type_ids[]
spec.return_type
spec.side_effect_free
spec.target.max_items
spec.implementation.kind
spec.implementation.ref
spec.implementation.version
```

要求所有者至少一个且必须是已定义实体；`side_effect_free` 必须为 `true`；
`target.max_items` 必须为正数；当前 `implementation.kind` 只能是
`DEMO_HANDLER`，实现版本必须是严格 SemVer。

当前 Release 不消费 Function 参数定义，平台不得把参数定义当作当前
CelanWorksmith 的正式输入能力。Function 参数契约需要双方另行设计和升级
`format_version` 后才能使用。

## 8. Action 当前支持范围

当前 Action 的元数据路径为：

```text
spec.display_name
spec.owner_object_type_ids[]
spec.target.max_items
spec.atomic
spec.requires_confirmation
spec.parameters[]
spec.implementation.adapter_id
spec.implementation.adapter_version
```

每个参数必须包含 `name`、`type`、本地化 `display_name`、本地化
`description`、`required`、`read_only`、`derived`；参数名在 Action 内唯一，
类型必须属于支持的字段类型集合。`target.max_items` 必须为正数，两个控制
字段必须为布尔值，且必须提供 adapter ID 和严格 SemVer 版本。

当前编辑器主要创建单对象目标；Release 使用 `max_items` 表达目标上限。
`min_items` 尚未被消费者使用，不得作为本阶段的必填字段。

Action 的执行仍走 CelanWorksmith 原生 Query/Action 和已配置 adapter 路径。
平台只发布能力元数据和逻辑 adapter 标识，不发布服务 URL、凭据或业务代码。

## 9. 导入、快照和升级流程

CelanWorksmith 的预期流程如下：

```text
建模平台发布完整 Release JSON
        ↓
CelanWorksmith 校验格式、摘要、引用和运行时映射
        ↓
按 deployment/tenant + domain 解析受管运行时
        ↓
生成不可变 metadata snapshot
        ↓
创建原生 ontology datasource
        ↓
通过原生 Query/Action/DataTree 使用
```

数据源保存 Release/快照身份和受管绑定标识，不保存凭据。新 Release 不会
静默修改已有数据源或已发布应用；升级必须显式导入、校验并选择新快照，旧
快照保留用于已有配置和回滚。

## 10. 生产方必须执行的校验

建模平台在发布前至少必须执行：

1. 顶层格式和版本校验；
2. 严格 SemVer、domain/元素唯一性和重复 JSON 成员校验；
3. 所有引用、主键、字段映射、关系端点和关系字段映射校验；
4. 字段类型、Localized Text、Function/Action 所有者和目标上限校验；
5. 每个实体的运行时绑定和字段映射完整性校验；
6. `VERIFIED` 关系和逻辑资产引用校验；
7. RFC 8785 + SHA-256 摘要生成和独立复算；
8. 根据语义变更填写 `INITIAL`、`BACKWARD_COMPATIBLE` 或 `BREAKING`；
9. 使用三个现有 fixture 做结构回归：基础、Function、Action；
10. 将生成文件导入 CelanWorksmith，验证快照生成和原生查询路径。

## 11. 验收用例

建模平台交付首个可对接版本时，至少应通过以下用例：

| 编号 | 用例 | 预期 |
| --- | --- | --- |
| A1 | 导出基础 Release | CelanWorksmith 接受并生成不可变快照 |
| A2 | 修改任意字段后不更新摘要 | 导入被拒绝 |
| A3 | 同一元素重复出现 | 导入被拒绝 |
| A4 | 缺少实体字段映射 | 导入被拒绝 |
| A5 | 关系状态为 `INFERRED` | 生产映射被拒绝 |
| A6 | Function 无所有者或 `side_effect_free=false` | 导入被拒绝 |
| A7 | Action 参数缺少本地化名称/描述 | 导入被拒绝 |
| A8 | Release 引用不可用运行时资产 | 导入被拒绝且不留下半成品快照 |
| A9 | 发布同一模型的新兼容版本 | 旧快照行为不变，新快照可显式选择 |
| A10 | Release 含数据库密码或外部服务 URL | 生产方校验失败，不得发布 |

## 12. 当前明确不属于需求

- 复合主键的运行时查询支持；
- Function 参数的正式 Release 契约；
- 独立 Capability Release；
- 服务注册发现、生产 Action Server URL 协议和短期凭据；
- 发布签名、证书和审批工作流；
- 将业务数据、数据库连接或本体执行代码打包进 Release；
- 替换 CelanWorksmith 原生 Appsmith datasource/query/action pipeline。

这些能力可以在后续版本中通过新的设计和格式版本演进，不能由建模平台
直接向当前 `format_version: 2` Release 中添加并期待消费者执行。

## 13. 参考工件

- 当前实现契约（英文）：[`ontology-model-release-contract-handoff.md`](./ontology-model-release-contract-handoff.md)
- 源码证据：[2026-10-22-ontology-platform-handoff-evidence.md](../superpowers/verification/2026-10-22-ontology-platform-handoff-evidence.md)
- 基础 Release：[ontology-model-release-demo.json](../superpowers/fixtures/ontology-model-release-demo.json)
- Function Release：[ontology-model-release-demo-functions-1.1.0.json](../superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json)
- Action Release：[ontology-model-release-demo-actions-1.2.0.json](../superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json)
- 阶段版本说明：[v0.1.0-ontology-integration.md](../releases/v0.1.0-ontology-integration.md)
