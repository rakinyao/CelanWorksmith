# CelanWorksmith 开发规划方案

> 基于 Appsmith 开源项目二次开发，对标 Palantir Foundry Workshop，构建本体驱动的应用构建平台

---

## 1. 项目背景与定位

### 1.1 整体平台架构

CelanWorksmith 是一个四层本体平台体系中的第 4 层子项目：

| 层级 | 名称 | 职责 | 当前状态 |
|------|------|------|---------|
| Layer 1 | 数据接入治理平台 | 多源数据接入、ETL、血缘、数据资产目录，输出标准化数据服务 | 已建设 |
| Layer 2 | 本体开发平台 | 可视化定义 Object Type / Link Type / Function（参考 OWL 2 DL 规则），支持代码方式编制关联、执行、推理逻辑 | 开发中 |
| Layer 3 | 本体执行平台 | 运行时推理（硬编码解释业务逻辑 + LLM 软推理关联），Object Instance 管理，Function/Action 执行 | 开发中 |
| **Layer 4** | **CelanWorksmith（本项目）** | **基于上游本体定义和执行引擎，让用户定制规则化应用并固化发布** | **原型阶段** |

### 1.2 核心定位

CelanWorksmith **不自己定义本体、不自己执行推理**。它是本体的"消费端"和"应用装配器"：

- 消费 Layer 2 的本体定义（Object Type、Link Type、Function、Action Type）
- 消费 Layer 3 的运行时数据（Object Instance 查询、Action 执行、推理结果）
- 提供 Workshop 式的低代码拖拽编辑器，让用户把已有本体"拼装"成业务应用
- 支持应用固化、版本管理、发布

### 1.3 与原版 Appsmith 的关系

| 能力 | 原版 Appsmith | CelanWorksmith 改造方向 |
|------|-------------|----------------------|
| 数据源 | 直接绑物理表/API（Datasource Plugin） | 新增"本体数据源"作为一等公民，保留原生 Datasource 作为旁路 |
| 绑定语法 | `{{query.data}}` / `{{Widget.prop}}` | 扩展支持 `{{$objects.xxx}}` / `{{$actions.xxx}}` / `{{$functions.xxx}}` |
| Widget 输入 | 绑 Query 结果 | 可直接绑 Object Set / Object Instance |
| 写回操作 | 自由 SQL/JS Query | 声明式 Action 触发（事务化、参数化） |
| 服务端逻辑 | JSObject（前端沙箱） | 新增 Function 调用（后端执行，来自 Layer 2/3） |
| 变量模型 | 无显式 Variable 体系 | 引入 ObjectSet / ObjectProperty / Aggregation Variable |

### 1.4 当前约束

上游 Layer 2/3 平台尚在开发中，无正式 API 输出物。因此本项目采用 **Ports & Adapters（六边形架构）**：

- 先定义端口接口（Java interface），固化契约规则
- 用 Mock Adapter 实现内部流程走通
- 后续通过替换 Adapter 实现对接真实上游，不影响核心代码

---

## 2. 整体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     CelanWorksmith Client (React)                │
│                                                                 │
│  ┌───────────────┐  ┌─────────────────┐  ┌───────────────────┐ │
│  │ Entity Explorer│  │  Layout Canvas  │  │  Property Panel   │ │
│  │  ┌───────────┐│  │  ┌───────────┐│  │  ┌──────────────┐│ │
│  │  │ UI Widgets││  │  │ Workshop  ││  │  │本体字段编辑   ││ │
│  │  │ Queries   ││  │  │ Layout    ││  │  │Action 绑定    ││ │
│  │  │ JSObjects ││  │  │ (复用)    ││  │  │Function 参数  ││ │
│  │  │ 本体对象  ││  │  └───────────┘│  │  └──────────────┘│ │
│  │  │ Functions ││  │               │  │                   │ │
│  │  │ Actions   ││  │               │  │                   │ │
│  │  └───────────┘│  │               │  │                   │ │
│  └───────────────┘  └─────────────────┘  └───────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Binding Engine 增强层                                   │  │
│  │  {{$objects.User.all}}     → ObjectSet 表达式求值          │  │
│  │  {{$objects.User.5.name}}  → 实例属性求值                 │  │
│  │  {{$functions.xxx(...)}}   → Function 调用                │  │
│  │  {{$actions.xxx.trigger}}  → Action 触发                  │  │
│  │  {{$reason.question}}      → LLM 推理查询                 │  │
│  │  兼容原有 {{Query.data}} / {{Widget.prop}}                │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (REST + WebSocket)
┌───────────────────────────▼─────────────────────────────────────┐
│                  CelanWorksmith Server (Spring Boot)            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  OntologyPort (接口)  ←→  MockAdapter / RealAdapter      │  │
│  │  · 拉取 Object Type / Function / Action 元数据            │  │
│  │  · 缓存 + 变更订阅                                       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  RuntimePort (接口)   ←→  MockAdapter / RealAdapter      │  │
│  │  · Object Set 查询 / 分页 / 过滤                         │  │
│  │  · Action 执行管道                                       │  │
│  │  · Function 调用                                         │  │
│  │  · LLM 软推理查询                                        │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Application Service                                      │  │
│  │  · 应用 CRUD / 版本管理 / 发布                             │  │
│  │  · Variable / Action Trigger DSL 持久化                   │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  原有 Appsmith 能力（保留 + 渐进增强）                    │  │
│  │  · Datasource Plugin 体系 → 保留给旁路数据源场景           │  │
│  │  · Widget 渲染引擎 → 增强为 Object-aware                  │  │
│  │  · JSObject 执行 → 与 Function 形成互补                   │  │
│  │  · 部署 / Git 集成 / 权限                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 端口-适配器架构

```
┌─────────────────────────────────────────────────────────────┐
│  CelanWorksmith 核心（不依赖具体上游实现）                     │
│                                                             │
│  Binding Engine / Widget / Application Service              │
│         │                                                   │
│         ▼                                                   │
│  ┌───────────────┐   ┌──────────────────┐                  │
│  │ OntologyPort  │   │  RuntimePort     │  ← 端口（接口）    │
│  │  (Java iface) │   │  (Java iface)    │                  │
│  └──────┬────────┘   └────────┬─────────┘                  │
└─────────┼──────────────────────┼────────────────────────────┘
          │                      │
    ┌─────▼──────┐         ┌─────▼──────┐
    │ MockAdapter │         │ MockAdapter │  ← 当前（走通流程）
    └────────────┘         └─────────────┘
          │                      │
    ┌─────▼──────┐         ┌─────▼──────┐
    │ RealAdapter│         │ RealAdapter │  ← 后续（对接真实 API）
    │ (Layer 2)  │         │ (Layer 3)  │
    └────────────┘         └─────────────┘
```

**切换机制**：Spring `@Profile("mock")` / `@Profile("production")`，或 `@ConditionalOnProperty`，配置一行切换。

---

## 3. 端口接口定义

### 3.1 OntologyPort（对接 Layer 2 — 本体开发平台）

编辑器启动时拉取已定义的本体元数据，用于构建侧栏、属性面板、自动补全。

```java
public interface OntologyPort {

    // 拉取所有 Object Type 定义
    List<ObjectTypeDTO> getObjectTypes();
    ObjectTypeDTO getObjectType(String typeId);

    // 拉取 Link Type 定义
    List<LinkTypeDTO> getLinkTypes(String sourceTypeId);

    // 拉取 Function 目录
    List<FunctionDTO> getFunctions();
    FunctionDTO getFunction(String functionId);

    // 拉取 Action Type 定义
    List<ActionTypeDTO> getActionTypes(String objectTypeId);
    ActionTypeDTO getActionType(String actionId);
}
```

### 3.2 RuntimePort（对接 Layer 3 — 本体执行平台）

运行时数据和推理结果。

```java
public interface RuntimePort {

    // Object Set 查询（分页/过滤/排序）
    ObjectSetResult queryObjects(String typeId, ObjectSetQuery query);

    // 单个 Object Instance
    ObjectInstanceDTO getInstance(String typeId, String instanceId);

    // 关联对象查询
    List<ObjectInstanceDTO> getLinkedObjects(
        String typeId, String instanceId, String linkTypeId);

    // Action 执行
    ActionResult executeAction(
        String actionId, Map<String, Object> parameters, List<String> objectIds);

    // Function 调用
    Object callFunction(String functionId, Map<String, Object> params);

    // LLM 软推理查询
    ReasoningResult reasoning(String typeId, String instanceId, String question);
}
```

### 3.3 核心 DTO

```java
@Data
public class ObjectTypeDTO {
    private String id;
    private String name;
    private String displayName;
    private String icon;
    private String description;
    private String primaryKey;
    private List<PropertyDTO> properties;
}

@Data
public class PropertyDTO {
    private String id;
    private String name;
    private String displayName;
    private String type;       // STRING, INTEGER, DECIMAL, BOOLEAN, DATETIME, REF
    private String label;
    private boolean required;
    private boolean readOnly;
}

@Data
public class LinkTypeDTO {
    private String id;
    private String name;
    private String sourceTypeId;
    private String targetTypeId;
    private String cardinality;  // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_MANY
    private List<PropertyDTO> properties;
}

@Data
public class FunctionDTO {
    private String id;
    private String name;
    private String description;
    private List<ParamDTO> inputParams;
    private String outputType;
    private String category;
    private String version;
    private boolean readOnly;
}

@Data
public class ActionTypeDTO {
    private String id;
    private String name;
    private String objectTypeId;
    private List<ParamDTO> parameters;
    private List<String> triggers;
    private List<String> rules;  // 权限规则表达式
}

@Data
public class ObjectInstanceDTO {
    private String id;
    private String typeId;
    private Map<String, Object> properties;
    private Map<String, List<String>> links;  // linkTypeId -> instanceIds
}

@Data
public class ObjectSetQuery {
    private Map<String, Object> filter;
    private String sortField;
    private String sortDirection;  // ASC, DESC
    private int offset;
    private int limit;
}

@Data
public class ObjectSetResult {
    private long total;
    private List<ObjectInstanceDTO> items;
}

@Data
public class ActionResult {
    private boolean success;
    private String message;
    private List<Object> changes;
    private List<Object> sideEffects;
}

@Data
public class ReasoningResult {
    private String answer;
    private List<String> evidence;
    private String confidence;  // HIGH, MEDIUM, LOW
}
```

### 3.4 配置切换

```yaml
# application.yml
celanworksmith:
  ontology:
    provider: mock        # mock | production
    base-url: ""          # production 模式下填真实 URL
  runtime:
    provider: mock        # mock | production
    base-url: ""          # production 模式下填真实 URL
```

```java
@Configuration
public class AdapterConfig {

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider",
                           havingValue = "mock")
    public OntologyPort mockOntologyPort() {
        return new MockOntologyAdapter();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider",
                           havingValue = "production")
    public OntologyPort productionOntologyPort(
            @Value("${celanworksmith.ontology.base-url}") String baseUrl) {
        return new HttpOntologyAdapter(baseUrl);
    }

    // RuntimePort 同理
}
```

---

## 4. Mock 场景定义（供应链业务）

### 4.1 场景概述

以供应链业务为验证场景，覆盖以下核心能力：
- 多本体定义与关联
- 跨本体影响传播（订单延期→生产推迟→交付延迟→赔偿→利润更新）
- Action 连锁触发
- 历史数据聚合分析（供应商评级）
- 多应用共享同一套本体

### 4.2 Object Types 定义

#### Supplier（供应商）
```
id:         Supplier
displayName: 供应商
icon:       building
primaryKey: supplierId
properties:
  - supplierId    (STRING, required, readOnly)
  - name          (STRING, required)
  - rating        (STRING)         // A/B/C/D
  - category     (STRING)         // 原材料/零部件/服务
  - contactName  (STRING)
  - contactPhone (STRING)
  - contactEmail (STRING)
derived:
  - onTimeRate   (DECIMAL)        // Function 计算：准时交付率
  - riskLevel    (STRING)         // Function 计算：风险等级
```

#### PurchaseOrder（采购订单）
```
id:         PurchaseOrder
displayName: 采购订单
icon:       file-text
primaryKey: poId
properties:
  - poId              (STRING, required, readOnly)
  - supplierId        (STRING, required)    // REF -> Supplier
  - material          (STRING, required)
  - quantity          (INTEGER, required)
  - unitPrice         (DECIMAL, required)
  - orderDate         (DATETIME, required)
  - expectedDeliveryDate (DATETIME, required)
  - actualDeliveryDate   (DATETIME)          // 为空表示未交付
  - status            (STRING)               // PENDING/DELIVERED/DELAYED
derived:
  - totalAmount       (DECIMAL)              // Function: quantity * unitPrice
  - delayDays         (INTEGER)              // Function: actual - expected（负数为0）
```

#### ProductionOrder（生产订单）
```
id:         ProductionOrder
displayName: 生产订单
icon:       settings
primaryKey: prodId
properties:
  - prodId            (STRING, required, readOnly)
  - poId              (STRING, required)      // REF -> PurchaseOrder
  - productName       (STRING, required)
  - plannedStart      (DATETIME, required)
  - plannedEnd        (DATETIME, required)
  - actualStart       (DATETIME)
  - actualEnd         (DATETIME)
  - status            (STRING)               // PLANNED/IN_PROGRESS/COMPLETED/DELAYED
derived:
  - productionDelay   (INTEGER)              // Function: actualEnd - plannedEnd
```

#### DeliveryOrder（交付订单）
```
id:         DeliveryOrder
displayName: 交付订单
icon:       truck
primaryKey: deliveryId
properties:
  - deliveryId        (STRING, required, readOnly)
  - poId              (STRING, required)      // REF -> PurchaseOrder
  - prodId            (STRING)                // REF -> ProductionOrder
  - customer          (STRING, required)
  - plannedDate       (DATETIME, required)
  - actualDate        (DATETIME)
  - status            (STRING)               // PENDING/DELIVERED/DELAYED
  - penaltyAmount     (DECIMAL)              // 赔偿金额
derived:
  - deliveryDelay      (INTEGER)             // Function: actualDate - plannedDate
  - penaltyDue         (BOOLEAN)             // Function: delayDays > 0
```

#### FinancialRecord（财务记录）
```
id:         FinancialRecord
displayName: 财务记录
icon:       dollar-sign
primaryKey: recordId
properties:
  - recordId          (STRING, required, readOnly)
  - poId              (STRING, required)      // REF -> PurchaseOrder
  - revenue           (DECIMAL, required)
  - cost              (DECIMAL, required)
  - penaltyPaid       (DECIMAL)              // 已支付赔偿
  - period            (STRING)               // 2024-Q1 / 2024-Q2 ...
  - status            (STRING)               // DRAFT/CONFIRMED
derived:
  - adjustedProfit    (DECIMAL)             // Function: revenue - cost - penaltyPaid
  - marginRate         (DECIMAL)             // Function: adjustedProfit / revenue
```

#### SupplierRating（供应商评级）
```
id:         SupplierRating
displayName: 供应商评级
icon:       star
primaryKey: ratingId
properties:
  - ratingId          (STRING, required, readOnly)
  - supplierId        (STRING, required)      // REF -> Supplier
  - period            (STRING, required)      // 2024-Q1
  - deliveryRate      (DECIMAL)              // 准时交付率
  - qualityScore      (DECIMAL)              // 质量评分 0-100
  - responseSpeed     (DECIMAL)              // 响应速度 0-100
  - compositeScore    (DECIMAL)              // 综合评分
derived:
  - grade             (STRING)              // Function: A/B/C/D
```

### 4.3 Link Types 定义

```
Supplier ──(1:N)──> PurchaseOrder         linkId: "supplier_orders"    "下达"
PurchaseOrder ──(1:N)──> ProductionOrder   linkId: "po_production"     "驱动"
PurchaseOrder ──(1:1)──> DeliveryOrder     linkId: "po_delivery"      "交付"
PurchaseOrder ──(1:N)──> FinancialRecord   linkId: "po_finance"        "产生"
Supplier ──(1:N)──> SupplierRating         linkId: "supplier_ratings"  "评级记录"
```

### 4.4 影响传播链路（核心验证场景）

```
采购订单延期（事件触发）
    │
    ├─▶ [硬编码 Function] 计算 delayDays = actualDeliveryDate - expectedDeliveryDate
    │
    ├─▶ [Action: UpdateProductionSchedule]
    │     生产订单 plannedEnd 推迟 delayDays
    │     └─▶ [Action: NotifyProductionTeam] 通知生产团队（side effect: notification）
    │
    ├─▶ [Action: UpdateDeliveryDate]
    │     交付订单 plannedDate 推迟
    │     └─▶ [Function: CalculatePenalty] 按合同计算赔偿金
    │
    ├─▶ [Action: UpdateFinancialRecord]
    │     财务记录 penaltyPaid 更新
    │     profit = revenue - cost - penaltyPaid
    │     └─▶ [Function: RecalcMargin] 利润率重算
    │
    └─▶ [LLM 软推理]
          "该供应商累计延期3次，建议降级为C级"
          "预计影响Q3利润率下降2.3%"
```

### 4.5 Mock 数据规模

```
Supplier:         10 个
PurchaseOrder:   200 条（含 30 条延期）
ProductionOrder: 200 条
DeliveryOrder:   200 条
FinancialRecord: 200 条
SupplierRating:   40 条（10 供应商 × 4 季度）

数据特征要求：
  · 3 个供应商有多次延期记录（用于评级分析）
  · 延期订单的链路数据完整（验证传播链）
  · 含 2 个"连锁延期"场景（A延期导致B也延期）
  · 时间跨度覆盖 4 个季度
```

### 4.6 硬编码逻辑与 LLM 软推理边界

| 类型 | 职责 | 示例 |
|------|------|------|
| **硬编码 Function**（Layer 2 定义，Layer 3 执行） | 确定性计算、规则校验 | `delayDays = actualDate - plannedDate`、`penalty = contract.penaltyRate * orderAmount`、`adjustedProfit = revenue - cost - penaltyPaid` |
| **LLM 软推理**（Layer 3） | 模糊判断、建议生成、自然语言解释 | "该供应商风险等级建议降为C"、"预计影响利润率约2-3%" |

Mock 阶段：硬编码 Function 用 Java 实现真实计算逻辑；LLM 软推理用固定文本模拟。

---

## 5. 分阶段实施计划

### Phase 0：基线建立（1–2 周）

**目标**：Fork 源码，跑通开发环境，产出关键代码导读。

**任务清单**：

- [ ] T0.1 克隆 fork 仓库 `https://github.com/rakinyao/CelanWorksmith` 到开发环境
- [ ] T0.2 按官方文档搭建本地开发环境：
  - 前端：Node.js + React，`cd app/client && yarn install && yarn start`（端口 3000）
  - 后端：Java + Spring Boot，`cd app/server && ./gradlew bootRun`（端口 8080）
  - RTS：Node.js，`cd app/rts && yarn install && yarn start`（端口 8091）
- [ ] T0.3 确认 MongoDB（端口 27017，replica set rs0）和 Redis（端口 6379）容器正常运行
- [ ] T0.4 配置后端 `.env` 文件：
  ```env
  APPSMITH_DB_URL=mongodb://localhost:27017/appsmith?replicaSet=rs0
  APPSMITH_REDIS_URL=redis://127.0.0.1:6379
  APPSMITH_MAIL_ENABLED=false
  APPSMITH_ENCRYPTION_SALT=<random>
  APPSMITH_ENCRYPTION_PASSWORD=<random>
  ```
- [ ] T0.5 验证编辑器可访问（`http://localhost:3000`），能创建应用、拖拽 Widget
- [ ] T0.6 产出 Appsmith 关键代码导读文档，覆盖以下路径：
  - Widget 注册机制：`app/client/src/widgets/` + `app/client/src/utils/WidgetRegistry.ts`
  - 绑定求值引擎：`app/client/src/utils/DynamicBinding/DynamicBindingResolver.ts`
  - DSL 持久化格式：`app/client/src/entities/AppsmithActionTree/...`
  - Query 执行链路：`app/client/src/sagas/` + `app/server/.../datasource/`
  - 插件机制：`app/server/appsmith-server/src/main/java/com/appsmith/server/plugins/`

**验证标准**：
1. 编辑器可正常访问，hot-reload 生效
2. 能创建应用、拖拽 Widget、绑定 Query 数据
3. 关键代码导读文档完成

---

### Phase 1：端口接口定义 + Mock Adapter（3–4 周）

**目标**：定义 OntologyPort / RuntimePort 接口，实现 Mock Adapter，打通内部数据流。

**任务清单**：

- [ ] T1.1 在 Appsmith Server 中新建模块 `celanworksmith-ontology`：
  ```
  app/server/appsmith-server/src/main/java/com/celanworksmith/
    ├── port/
    │   ├── OntologyPort.java
    │   └── RuntimePort.java
    ├── dto/
    │   ├── ObjectTypeDTO.java
    │   ├── PropertyDTO.java
    │   ├── LinkTypeDTO.java
    │   ├── FunctionDTO.java
    │   ├── ActionTypeDTO.java
    │   ├── ObjectInstanceDTO.java
    │   ├── ObjectSetQuery.java
    │   ├── ObjectSetResult.java
    │   ├── ActionResult.java
    │   └── ReasoningResult.java
    ├── adapter/
    │   ├── mock/
    │   │   ├── MockOntologyAdapter.java
    │   │   ├── MockRuntimeAdapter.java
    │   │   └── MockDataInitializer.java    // 初始化供应链假数据
    │   └── production/
    │       ├── HttpOntologyAdapter.java     // 占位，后续实现
    │       └── HttpRuntimeAdapter.java      // 占位，后续实现
    └── config/
        └── AdapterConfig.java               // @ConditionalOnProperty 配置切换
  ```

- [ ] T1.2 实现所有 DTO 类（见第 3.3 节）

- [ ] T1.3 实现 `OntologyPort` 接口（见第 3.1 节）

- [ ] T1.4 实现 `RuntimePort` 接口（见第 3.2 节）

- [ ] T1.5 实现 `MockOntologyAdapter`：
  - 返回第 4.2 节定义的 6 个 Object Type
  - 返回第 4.3 节定义的 5 个 Link Type
  - 返回预定义的 Function 列表（delayDays 计算、penalty 计算、adjustedProfit 计算、评级计算等）
  - 返回预定义的 Action Type 列表（UpdateProductionSchedule、UpdateDeliveryDate、UpdateFinancialRecord、NotifyProductionTeam）

- [ ] T1.6 实现 `MockRuntimeAdapter`：
  - `MockDataInitializer`：在 `@PostConstruct` 中生成第 4.5 节规模的内存数据
  - `queryObjects`：支持 filter（按字段值）、sort、分页
  - `getInstance`：按 typeId + instanceId 查询
  - `getLinkedObjects`：按 linkTypeId 查询关联对象
  - `executeAction`：模拟 Action 执行，修改内存数据，返回 changes + sideEffects
  - `callFunction`：用 Java 实现硬编码 Function 计算逻辑
  - `reasoning`：返回固定文本模拟 LLM 推理

- [ ] T1.7 实现 `AdapterConfig`（见第 3.4 节），默认 `provider=mock`

- [ ] T1.8 新增 REST Controller，暴露本体元数据给前端：
  ```
  GET  /api/v1/celanworksmith/ontology/object-types
  GET  /api/v1/celanworksmith/ontology/object-types/{id}
  GET  /api/v1/celanworksmith/ontology/link-types?sourceTypeId={id}
  GET  /api/v1/celanworksmith/ontology/functions
  GET  /api/v1/celanworksmith/ontology/actions?objectTypeId={id}
  GET  /api/v1/celanworksmith/runtime/objects/{typeId}?filter=...&sort=...&page=...&size=...
  GET  /api/v1/celanworksmith/runtime/objects/{typeId}/{instanceId}
  GET  /api/v1/celanworksmith/runtime/objects/{typeId}/{instanceId}/links?linkTypeId={id}
  POST /api/v1/celanworksmith/runtime/actions/{actionId}/execute
  POST /api/v1/celanworksmith/runtime/functions/{functionId}/execute
  POST /api/v1/celanworksmith/runtime/reasoning
  ```

**验证标准**：
1. 启动后端，访问 `GET /api/v1/celanworksmith/ontology/object-types` 返回 6 个 Object Type
2. 访问 `GET /api/v1/celanworksmith/runtime/objects/Supplier` 返回 10 条供应商数据
3. 调用 `POST /api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute` 能修改内存数据并返回结果
4. 切换 `provider=production` 配置后，启动不报错（HttpAdapter 占位即可）

---

### Phase 2：Entity Explorer 扩展（4–5 周）

**目标**：在左侧 Entity Explorer 加入"本体"标签页，展示本体元数据树。

**任务清单**：

- [ ] T2.1 在前端新增 API Client 模块：
  ```
  app/client/src/api/CelanworksmithAPI.ts
    ├── getObjectTypes()
    ├── getObjectType(id)
    ├── getLinkTypes(sourceTypeId)
    ├── getFunctions()
    ├── getActions(objectTypeId)
    ├── queryObjects(typeId, query)
    ├── getInstance(typeId, instanceId)
    ├── getLinkedObjects(typeId, instanceId, linkTypeId)
    ├── executeAction(actionId, params, objectIds)
    ├── callFunction(functionId, params)
    └── reasoning(typeId, instanceId, question)
  ```

- [ ] T2.2 在 Entity Explorer 中新增"本体"标签页（与现有 Pages / Widgets / Queries 并列）：
  ```
  本体（Ontology）
    ├── Object Types
    │   ├── 供应商 (Supplier)
    │   │   ├── supplierId (STRING, PK)
    │   │   ├── name (STRING)
    │   │   ├── rating (STRING)
    │   │   └── ...
    │   ├── 采购订单 (PurchaseOrder)
    │   ├── 生产订单 (ProductionOrder)
    │   ├── 交付订单 (DeliveryOrder)
    │   ├── 财务记录 (FinancialRecord)
    │   └── 供应商评级 (SupplierRating)
    ├── Link Types
    │   ├── 供应商 → 采购订单 (1:N)
    │   └── ...
    ├── Functions
    │   ├── CalculateDelayDays
    │   ├── CalculatePenalty
    │   └── ...
    └── Actions
        ├── UpdateProductionSchedule
        ├── UpdateDeliveryDate
        └── ...
  ```

- [ ] T2.3 点击 Object Type 节点 → 右侧属性面板展示 properties 列表（名称、类型、是否必填、是否只读、是否派生）
- [ ] T2.4 点击 Function 节点 → 展示函数签名、参数列表、输出类型、描述
- [ ] T2.5 点击 Action 节点 → 展示参数列表、触发条件、规则
- [ ] T2.6 元数据为只读展示，编辑操作显示"请前往本体开发平台"提示（不做编辑功能）

**验证标准**：
1. 打开编辑器，左侧能看到"本体"标签页
2. 展开后能看到 6 个 Object Type 及其字段
3. 能看到 Link Types、Functions、Actions 的完整定义
4. 点击任意节点，右侧面板正确展示详情

---

### Phase 3：Binding Engine 扩展（4–6 周）

**目标**：让 `{{ }}` 表达式支持 `$objects` / `$functions` / `$actions` / `$reason` 语法。

**任务清单**：

- [ ] T3.1 定位 Appsmith 绑定求值引擎入口：
  - 前端：`app/client/src/utils/DynamicBinding/DynamicBindingResolver.ts`
  - 后端：`app/server/.../ExpressionEvaluationService.java`
  - 理解现有 `{{query.data}}` / `{{Widget.prop}}` 的求值流程

- [ ] T3.2 扩展表达式解析器，新增 4 个命名空间：
  ```
  {{$objects.<typeId>.all}}              → 查询该类型所有实例（ObjectSet）
  {{$objects.<typeId>.<instanceId>}}     → 单个实例
  {{$objects.<typeId>.<instanceId>.<prop>}} → 实例的某个属性
  {{$objects.<typeId>.filter(condition)}}   → 过滤后的 ObjectSet

  {{$functions.<functionId>(params)}}    → 调用 Function
  {{$actions.<actionId>.trigger}}        → Action 触发（返回 Promise）
  {{$reason.<question>}}                → LLM 推理查询
  ```

- [ ] T3.3 实现解析逻辑：
  - `$objects` → 调用 `RuntimePort.queryObjects` 或 `getInstance`
  - `$functions` → 调用 `RuntimePort.callFunction`
  - `$actions` → 标记为 Action trigger，在事件触发时调用 `RuntimePort.executeAction`
  - `$reason` → 调用 `RuntimePort.reasoning`

- [ ] T3.4 引入依赖图缓存机制：
  - 记录每个绑定表达式依赖的 Object Type / Instance
  - 仅当依赖项变化时重新求值（避免 N+1 查询）
  - 对不可见 Widget 的绑定做 lazy 求值

- [ ] T3.5 兼容层：确保原有 `{{query.data}}` / `{{Widget.prop}}` / `{{JSObject.fn()}}` 全部照常工作

- [ ] T3.6 在编辑器的绑定输入框中提供自动补全：
  - 输入 `$objects.` → 弹出 Object Type 列表
  - 选择后输入 `.` → 弹出属性列表
  - 输入 `$functions.` → 弹出 Function 列表

**验证标准**：
1. 在 Text Widget 的 Text 属性中输入 `{{$objects.Supplier.S001.name}}`，能渲染出对应供应商名称
2. 在 Table Widget 的 Table Data 属性中输入 `{{$objects.PurchaseOrder.all}}`，能显示采购订单列表
3. 在 Text Widget 中输入 `{{$functions.CalculateDelayDays({poId: "PO001"})}}`，能显示计算结果
4. 原有 Appsmith 示例应用（Users 表 + 表单）仍能正常运行

---

### Phase 4：本体感知 Widget 改造（6–8 周）

**目标**：核心 Widget 改造，让用户无需写代码就能"选本体"完成应用构建。

#### 4.1 Table Widget 改造

- [ ] T4.1.1 在 Table Widget 的数据源配置中新增"本体 Object Set"选项
- [ ] T4.1.2 选择 Object Type 后，自动生成所有属性列（列名 = displayName，列值 = 对应属性）
- [ ] T4.1.3 支持服务端分页、排序、过滤（委托 RuntimePort）
- [ ] T4.1.4 行选择事件输出 `selectedObject`（ObjectInstanceDTO），下游 Widget 可绑定
- [ ] T4.1.5 支持行级操作按钮（绑定 Action Type，点击触发）

**验证**：拖一个 Table Widget，选"采购订单"Object Type，自动显示所有列，能翻页、排序、选中行。

#### 4.2 Form Widget 改造

- [ ] T4.2.1 在 Form Widget 的数据源配置中新增"本体 Object Type"选项
- [ ] T4.2.2 选择后按 Object Type properties 自动生成表单字段（类型映射：STRING→文本框，INTEGER→数字框，DATETIME→日期选择器，BOOLEAN→开关）
- [ ] T4.2.3 `onSubmit` 可直接绑定 Action Type（而非 SQL Query），参数从表单字段自动映射
- [ ] T4.2.4 required 字段自动标记必填，readOnly 字段自动禁用

**验证**：选"供应商"Object Type，自动生成包含所有字段的表单，提交时触发对应的 Action。

#### 4.3 ObjectDetail Widget（新增）

- [ ] T4.3.1 新建 Widget 组件 `app/client/src/widgets/ObjectDetailWidget/`
- [ ] T4.3.2 对标 Palantir Workshop 的 Object View：
  - 输入：Object Instance（通过 `selectedObject` 绑定）
  - 展示：所有属性按分组显示（基础信息、业务数据、派生属性）
  - 支持 Tab 布局（基础信息 / 关联对象 / AI 解释）
- [ ] T4.3.3 关联对象 Tab：展示该实例的所有 Link，点击可导航到关联对象
- [ ] T4.3.4 AI 解释 Tab：展示 LLM 软推理结果（调用 `$reason`）

**验证**：Table 选中一个供应商 → ObjectDetail 显示该供应商所有信息 → 关联对象 Tab 显示其采购订单列表。

#### 4.4 FilterList Widget（新增）

- [ ] T4.4.1 新建 Widget 组件 `app/client/src/widgets/FilterListWidget/`
- [ ] T4.4.2 对标 Workshop 的 Filter List：
  - 输入：Object Type
  - 自动按 properties 生成过滤控件（STRING→文本搜索，枚举→下拉，DATETIME→日期范围，DECIMAL→数值范围）
  - 输出：ObjectSet Filter（JSON），被其他 Widget 消费
- [ ] T4.4.3 Filter 变化时，绑定了同一 Object Type 的 Table Widget 自动刷新

**验证**：FilterList 选"采购订单" → 设置状态=DELAYED → Table 自动过滤为延期订单。

#### 4.5 ActionButton Widget（新增）

- [ ] T4.5.1 新建 Widget 组件 `app/client/src/widgets/ActionButtonWidget/`
- [ ] T4.5.2 配置：选择 Action Type + 参数映射（从当前选中对象或 Widget state 自动绑定）
- [ ] T4.5.3 执行后自动刷新绑定的 Object Set
- [ ] T4.5.4 支持按钮组（多个 Action 并列）

**验证**：在 Table 行内放置"更新交付日期"按钮 → 点击 → 执行 Action → Table 刷新显示新数据。

**Phase 4 整体验证标准**：
用户能在无代码模式下完成完整链路：
```
FilterList（选状态=DELAYED）
  → Table（显示延期订单）
    → 选中行
      → ObjectDetail（显示订单详情 + 关联生产/交付/财务）
        → ActionButton（触发"更新生产排程"Action）
          → Table 自动刷新
```

---

### Phase 5：Variable 系统（4–6 周）

**目标**：在 Widget 之外引入 Module Variable 概念，对标 Workshop 的 Variable 体系。

**任务清单**：

- [ ] T5.1 定义 Variable 类型：
  ```java
  ObjectSetVariable     // 绑定 Object Type，带可选过滤条件
  ObjectPropertyVariable // 绑定 Object Instance 的某个属性
  FunctionVariable      // 值由 Function 计算
  AggregationVariable   // 从 Object Set 聚合（count/sum/avg/min/max）
  ```

- [ ] T5.2 在 Entity Explorer 新增"Variables"区域，支持创建/编辑/删除变量
- [ ] T5.3 实现依赖图：
  - 变量可依赖其他变量（如 AggregationVariable 依赖 ObjectSetVariable）
  - 上游变量变化时自动重新计算下游
  - Lazy loading：仅可见 Widget 引用的变量会求值
- [ ] T5.4 Variable 可被 Widget 绑定（如 `{{$variables.myObjectSet}}`）
- [ ] T5.5 Variable 可被其他 Variable 引用（如 `{{$variables.delayCount = $objects.PurchaseOrder.filter(status="DELAYED").count()}}`）

**验证标准**：
1. 创建一个 ObjectSetVariable 绑定 PurchaseOrder，设置过滤 status=DELAYED
2. 创建一个 AggregationVariable 计算 delayCount = count of 上述 ObjectSet
3. Text Widget 显示 `{{$variables.delayCount}}`，值为延期订单数
4. 修改 ObjectSetVariable 的过滤条件，delayCount 自动更新

---

### Phase 6：应用固化与发布（2–3 周）

**目标**：应用版本管理、发布、运行时校验。

**任务清单**：

- [ ] T6.1 应用版本管理：草稿 → 审核中 → 已发布
- [ ] T6.2 发布时生成 DSL 快照（绑定的 Object Type ID、Action ID、Function ID 固化）
- [ ] T6.3 运行时校验：若上游本体变更导致类型不匹配，告警提示（如 Object Type 被删除、属性改名等）
- [ ] T6.4 已发布应用的只读运行模式（用户不可编辑，仅交互）
- [ ] T6.5 嵌入模块（Module Interface）：定义模块对外暴露的变量，支持在其他应用中嵌入

**验证标准**：
1. 构建一个"采购监控台"应用，包含 Table + FilterList + ObjectDetail
2. 发布该应用，切换到运行模式，功能正常
3. 修改 Mock 的 Object Type 定义（如删除一个属性），重新打开应用时显示告警

---

### Phase 7：LLM 软推理集成（持续迭代）

**目标**：在 Widget 中直接暴露 LLM 推理能力。

**任务清单**：

- [ ] T7.1 在 ObjectDetail Widget 的"AI 解释"Tab 中，展示 `$reason` 查询结果
- [ ] T7.2 支持基于 Object 属性的自然语言问答（如"这个供应商的延期风险如何影响下季度利润"）
- [ ] T7.3 新增 ReasoningPanel Widget：独立的推理查询面板，用户输入问题，返回推理结果 + 证据链
- [ ] T7.4 推理结果展示：answer + evidence（引用的对象属性值）+ confidence
- [ ] T7.5 Mock 阶段用固定文本模拟，后续替换为真实 LLM 调用

**验证标准**：
1. 选中一个延期采购订单，在 ObjectDetail 的 AI Tab 看到"该订单延期 5 天，预计影响交付延迟 5 天，赔偿金额约 5000 元"
2. 在 ReasoningPanel 输入"该供应商累计延期情况及建议"，返回推理结果

---

## 6. 验证应用清单

基于 Mock 本体场景，构建以下 3 个应用验证平台能力：

| 应用 | 核心功能 | Widget 组合 | 验证重点 |
|------|---------|------------|---------|
| **采购监控台** | 订单列表 + 延期预警 + 供应商筛选 | Table + FilterList + ObjectDetail | Object Set 绑定、过滤、行选择 |
| **影响分析器** | 选中延期订单 → 可视化影响传播链 → 财务影响汇总 | ObjectDetail + 关联导航 + ActionButton | 跨本体导航、Action 连锁触发、LLM 推理 |
| **供应商评级看板** | 历史数据聚合 + 评级展示 + 趋势分析 | Table + AggregationVariable + Chart | Function 聚合、派生属性、多应用共享本体 |

---

## 7. 关键技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 架构模式 | Ports & Adapters（六边形架构） | 上游未就绪，先抽象走通内部流程，后续替换 Adapter 即可对接 |
| 本体存储 | 不自己建表，通过 Port 消费上游 | 本体定义的职责在 Layer 2，本项目只消费 |
| 推理引擎 | 不自己实现，通过 Port 消费 Layer 3 | 推理的职责在 Layer 3，本项目只触发和展示 |
| Datasource 体系 | 保留 Appsmith 原生 Datasource Plugin | 作为"旁路数据源"补充，本体数据源通过 Port 提供 |
| 改造范围 | 新增 `celanworksmith-*` 命名空间，核心 Widget 走继承而非覆盖 | 降低与上游 Appsmith 升级的合并冲突 |
| Mock 数据 | 内存数据，`@PostConstruct` 初始化 | 原型阶段足够，后续可替换为持久化 |
| 配置切换 | `@ConditionalOnProperty` | 一行配置切换 mock/production |

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Appsmith 上游升级合并冲突 | fork 维护成本高 | 严格控制定制面：只改 `celanworksmith-*` 命名空间，核心 Widget 走继承而非覆盖 |
| 绑定求值性能 | Object Set 大量查询导致 N+1 | 依赖图缓存 + Lazy loading + 分页 |
| 上游 API 未冻结 | 对接时接口变更 | Port 接口设计稳定后冻结契约，Mock Adapter 与 Real Adapter 共用同一接口 |
| 本体定义频繁变更 | 已发布应用绑定失效 | 发布时快照 + 运行时版本校验 + 降级兜底 |
| LLM 推理成本 | 响应延迟 + 费用 | 仅对派生属性/自然语言查询开放，硬编码逻辑走 Function |

---

## 9. 开发环境信息

### 9.1 基础环境

- 服务器：`10.10.110.129`（SSH 端口 23522）
- 操作系统：Linux
- Docker：已安装，配置了代理（`10.10.110.129:10808`）

### 9.2 已部署服务

| 服务 | 容器名 | 端口 | 用途 |
|------|--------|------|------|
| MongoDB | appsmith-mongodb | 27017 | Appsmith 主数据库，replica set rs0 |
| Redis | appsmith-redis | 6379 | Appsmith 缓存 |
| Appsmith（生产镜像） | appsmith | 10000 | 已停止，保留备用 |

### 9.3 开发环境配置

后端 `.env`：
```env
APPSMITH_DB_URL=mongodb://localhost:27017/appsmith?replicaSet=rs0
APPSMITH_REDIS_URL=redis://127.0.0.1:6379
APPSMITH_MAIL_ENABLED=false
APPSMITH_ENCRYPTION_SALT=<random>
APPSMITH_ENCRYPTION_PASSWORD=<random>
```

前端开发端口：3000
后端开发端口：8080
RTS 开发端口：8091

### 9.4 常用命令

```bash
# SSH 登录开发服务器
ssh -p 23522 10.10.110.129

# 启动 MongoDB 和 Redis
docker start appsmith-mongodb appsmith-redis

# 前端开发
cd app/client && yarn start

# 后端开发
cd app/server && ./gradlew bootRun

# RTS 开发
cd app/rts && yarn start
```

---

## 10. 补充说明

### 10.1 关于"规则化应用"

用户最终产出的应用是"规则化"的，即：
- 应用的每个页面、Widget、绑定关系都通过 DSL（JSON）描述
- 发布时固化 DSL 快照
- 运行时加载 DSL 渲染应用，用户不可编辑结构，仅可交互
- 规则包括：数据过滤规则、显示规则（条件格式）、Action 触发规则

### 10.2 关于多应用共享本体

3 个验证应用（采购监控台、影响分析器、供应商评级看板）共享同一套 Mock 本体定义，验证：
- 同一个 Object Type 被多个应用以不同视角消费
- 同一个 Action 被多个应用触发
- 本体定义变更后，所有应用的行为同步更新

### 10.3 后续真实对接

当 Layer 2/3 平台就绪后：
1. 实现 `HttpOntologyAdapter`：HTTP 调用 Layer 2 REST API
2. 实现 `HttpRuntimeAdapter`：HTTP 调用 Layer 3 REST API + WebSocket 订阅
3. 修改配置 `celanworksmith.ontology.provider=production` / `celanworksmith.runtime.provider=production`
4. 核心代码（Binding Engine、Widget、Application Service）无需任何改动
