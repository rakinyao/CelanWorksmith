# CelanWorksmith T1-T2 验收记录

记录日期：2026-08-03

## T1 交付

- 在现有 `appsmith-server` 模块中新增独立 `com.celanworksmith` 命名空间。
- 新增 Ontology/Runtime Port、响应式 DTO、统一错误码和结构化错误响应。
- 默认 Provider 为 Mock，可通过 `CELANWORKSMITH_ONTOLOGY_PROVIDER` 和 `CELANWORKSMITH_RUNTIME_PROVIDER` 切换。
- Production Provider 当前返回明确的 `PROVIDER_NOT_CONFIGURED`，不伪造空数据。
- 新 API 使用 `/api/v1/celanworksmith` 前缀，并继承 Appsmith 现有认证保护。

## T2 交付

- 六类 Object Type：Supplier、PurchaseOrder、ProductionOrder、DeliveryOrder、FinancialRecord、SupplierRating。
- 五类 Link Type：supplier_orders、po_production、po_delivery、po_finance、supplier_ratings。
- 固定 Mock fixture：Supplier 10 条、PurchaseOrder 200 条、ProductionOrder 200 条、DeliveryOrder 200 条、FinancialRecord 200 条、SupplierRating 40 条。
- 支持过滤、排序、分页、实例查询和关联查询。
- 支持五个 Function、四个 Action 和 Mock Reasoning。
- Action 变更保存在内存 Mock Store，服务重启后重新初始化固定 fixture。

## 自动化验证

执行命令：

```bash
cd app/server
mvn -pl appsmith-server -am \
  -Dtest='com.celanworksmith.CelanWorksmithConfigurationTest,com.celanworksmith.runtime.MockRuntimeProviderTest,com.celanworksmith.controller.CelanWorksmithControllerTest' \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

结果：10 个测试通过，0 个失败，0 个错误。

覆盖内容：

- Provider 默认/Production 条件装配。
- Fixture 数量、关系和延期订单筛选分页。
- Function 指标计算和 Action 对象更新。
- Reasoning 证据、非法排序和非法关联错误。
- Controller 路由、JSON 响应包装和结构化错误。

## 运行验证

- `GET /api/v1/health` 返回 `200`。
- T1/T2 API 未登录访问返回 `401`，认证保护有效。
- 后端最新 JAR 已启动并监听 `127.0.0.1:8081`。
- MongoDB replica set 连接正常，Redis 连接正常。
- 当前 RTS `127.0.0.1:8091` 未运行，启动日志中的 RTS health check 为连接拒绝；这是现有环境状态，不属于 T1/T2 Mock 链路。

## 手动验收

通过局域网地址访问：

```text
GET http://10.10.110.129/api/v1/celanworksmith/runtime/objects/Supplier?limit=10
```

验证结果：

- 返回 HTTP `200`，响应包装和分页字段正确。
- 返回 `Supplier` 对象 10 条，`total=10`、`offset=0`、`limit=10`。
- 对象包含 `id`、`typeId` 和 `properties`，供应商名称、联系人、平均评分和风险等级均有值。

该结果确认 T2 Mock Runtime API 已具备从局域网访问和展示的基本能力。

## 放行结论

T1 和 T2 的服务端 Mock 链路达到进入 T3 前端本体 API/Explorer 开发的条件。真实 Layer 2/3 协议、Action 事务语义和生产数据映射仍需在接入真实 Provider 前单独确认。
