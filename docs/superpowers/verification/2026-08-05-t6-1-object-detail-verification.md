# T6.1 ObjectDetail 验证记录

记录日期：2026-08-05

## 1. 验证范围

本阶段完成 Object-aware Widget 第一批中的 ObjectDetail 基础能力：

- 单一 Object Data 动态绑定：`{{Table1.selectedRow}}` 或 `{{$objects.PurchaseOrder.PO001}}`。
- Object 数据归一化、Basic/Business/Derived 分组和 metadata fallback。
- Link Type 元数据及关联对象的 Redux/Saga 异步加载。
- 首个 Link Type 非阻塞预取，其余 Link Tab 点击后懒加载。
- Link 数据按 `typeId/objectId/linkTypeId` 隔离；刷新或失败保留已有结果。
- 关联对象选中输出 `selectedLinkedObject`、`selectedLinkedObjectId`、`selectedLinkType`。
- Widget loader、WidgetFactory 注册路径和 DSL migration 配置。

ObjectDetail 不直接调用 API，统一使用 `CelanworksmithAPI` 与 Redux/Saga。请求前缀为 `/api/v1/celanworksmith`，关联对象接口使用 `getLinkedObjects`。

## 2. 关键提交

| 提交 | 内容 |
|------|------|
| `de18d5f1db` | Object 数据归一化与属性分组 |
| `601eceea61` | Link action、reducer、selectors、Saga 与测试 |
| `0c8373ae0f` | 防止 Link metadata 并发重复加载 |
| `d7569a998e` | ObjectDetail runtime Widget |
| `0c5b336137` | 保持同一 Object 身份刷新时的关联选择 |
| `acc9526b19` | Widget loader、Factory 测试、DSL 兼容配置 |
| `7199f666a4` | 空绑定清理选择状态、稳定 Link 请求对象 |

## 3. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/ObjectDetailWidget \
  src/reducers/celanworksmithLinksReducer.test.ts \
  src/sagas/__tests__/CelanworksmithLinksSaga.test.ts \
  src/api/__tests__/CelanworksmithAPI.test.ts
```

结果：7 个 suite、49 个测试通过，0 个失败。

```bash
yarn eslint --no-cache src/widgets/ObjectDetailWidget \
  src/actions/celanworksmithLinkActions.ts \
  src/reducers/celanworksmithLinksReducer.ts \
  src/sagas/CelanworksmithLinksSaga.ts \
  src/selectors/celanworksmithSelectors.ts
./node_modules/.bin/prettier --check src/widgets/ObjectDetailWidget \
  src/actions/celanworksmithLinkActions.ts \
  src/reducers/celanworksmithLinksReducer.ts \
  src/sagas/CelanworksmithLinksSaga.ts \
  src/selectors/celanworksmithSelectors.ts
git diff --check
```

结果：ESLint 0 errors、10 warnings；warning 来自 named useEffect 和 JSX inline callback/object 性能规则。Prettier 与 `git diff --check` 通过。

## 4. 环境验证

- 前端开发服务通过 `cd app/client && yarn start` 恢复，监听 `0.0.0.0:3000`。
- Nginx 局域网入口 `http://10.10.110.129/` 恢复返回 HTTP 200。
- 后端 `127.0.0.1:8081` 正常监听；未携带登录凭据的 API 探测返回 HTTP 401，属于认证结果而非连接失败。
- RTS `127.0.0.1:8091` 正常监听；未认证根路径返回 HTTP 404，表明进程可达。
- MongoDB `127.0.0.1:27017`、Redis `127.0.0.1:6379` 仍在监听。
- 前端首次编译保留仓库既有 BetterBugs `worker_threads` 和 chunk circular dependency warning。

## 5. 手工验收状态

自动化测试覆盖了主对象立即展示、metadata fallback、Link error/Retry、Link 预取 intent、关联对象选择输出和 DSL migration。当前环境已恢复入口，但本轮没有可用的浏览器自动化会话和登录凭据，因此以下浏览器场景仍需登录后手工确认：

1. 设置 `ObjectDetail.objectData = {{Table1.selectedRow}}` 后主对象属性正常显示。
2. 首个 Link Tab 在不阻塞主对象的情况下预取，其余 Tab 点击后再请求。
3. 点击关联对象后，`{{ObjectDetail1.selectedLinkedObjectId}}` 等输出可被其他 Widget 使用。
4. 关联请求失败时主对象属性仍保留，Retry 只重试当前 Link。

## 6. 后续边界

- ObjectDetail 当前只接收一个 Object Data 动态绑定；多数据源、多选和列表分页不在本阶段。
- Object-aware Table 完整列表能力保留到 T7。
- FilterList 和 ActionButton 属于后续 T6.2/T6.3，不应在 ObjectDetail 内重复实现。
- T5 Action 成功/失败浏览器验证仍按 T5 检查点记录执行，与本阶段 Link 状态测试相互独立。
