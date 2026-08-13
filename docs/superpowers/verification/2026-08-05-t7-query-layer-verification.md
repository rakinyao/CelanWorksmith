# T7 Shared Query Layer 验证记录

记录日期：2026-08-05

## 1. 已交付

- 新增 widget-scoped Object Query actions、reducer、selector 和 Saga。
- 查询 key 包含 `widgetId`、`typeId` 和规范化 query JSON，避免不同 Widget 或不同页互相覆盖。
- 所有请求统一调用 `CelanworksmithAPI.queryObjects`，API 前缀继续为 `/api/v1/celanworksmith`。
- `limit` 限制为 1-100，`offset` 不允许为负数，sortBy 必须存在于 Object Type metadata 属性白名单。
- `sortDirection` 仅接受 `asc` 或 `desc`，查询 key 对嵌套查询字段采用稳定序列化，避免字段顺序造成重复请求。
- loading 时保留上一次成功结果；支持 ready、empty、error 状态。
- 未加载到 Object Type metadata 时返回结构化 `UNKNOWN_OBJECT` 错误，不发起无效请求。

## 2. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/reducers/celanworksmithObjectQueryReducer.test.ts \
  src/sagas/__tests__/CelanworksmithObjectQuerySaga.test.ts
```

结果：2 个 suite、5 个测试通过。

ActionButton 回归测试：3 个 suite、6 个测试通过。新增查询层和 ActionButton 相关文件 Prettier 通过；ESLint 0 errors，剩余 warning 为仓库既有 JSX/useEffect 性能规则。

## 3. 后续接入

- T7 Table Object 模式消费 query selector，使用 Table 的 pageNo、sortOrder、filters 生成 query intent。
- T7 Form Object 模式不直接使用分页查询；表单提交复用 T5 Action 执行链。
- 当前 query layer 尚未绑定具体 Table UI，暂不改变原生 Query Table/Form 行为。
- Saga 只接受版本为 1、typeId 匹配、propertyId 和 operator 均在白名单内的结构化 Filter JSON。
