# T6.2 FilterList 验证记录

记录日期：2026-08-05

## 1. 已交付

- 新增 `FilterListWidget`，可选择 Object Type 并按 metadata 属性构造结构化过滤条件。
- 支持 STRING、INTEGER、DECIMAL、DATETIME、BOOLEAN 属性类型。
- 仅允许 `equals`、`contains`、`startsWith`、`gt`、`gte`、`lt`、`lte`、`isEmpty` 运算符；类型兼容性由纯函数校验。
- 输出版本化结构：`{ typeId, conditions, version: 1 }`，并暴露 `objectTypeId`、`filter`、`isValid` 元属性。
- 支持空条件、重置、无 metadata 加载态和 metadata 错误态；不会直接发起 API 请求。
- 已通过现有 Widget lazy loader 注册，未修改原生 Table/Form 行为。

## 2. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/FilterListWidget/index.test.ts \
  src/widgets/FilterListWidget/widget/filterUtils.test.ts \
  src/widgets/FilterListWidget/widget/index.test.tsx
```

结果：3 个 suite、16 个测试通过。

```bash
yarn exec prettier --check src/widgets/FilterListWidget src/widgets/index.ts
yarn exec eslint src/widgets/FilterListWidget src/widgets/index.ts
git diff --check
```

结果：Prettier 通过；ESLint 0 errors、15 个性能相关 warning；`git diff --check` 通过。

收尾修复补充了外部 Widget 属性同步、metadata 变化后的输出重算，以及有限 Decimal 校验；对应回归测试覆盖这些场景。

全仓库 `yarn tsc --noEmit` 仍受仓库已有 design-system/WDS 类型错误影响；对本次新增文件过滤检查未发现 FilterList 或 loader 类型错误。

## 3. 手工验收建议

1. 拖入 FilterList，等待本体 metadata 加载完成。
2. 选择 `PurchaseOrder`，新增状态或供应商条件，确认 `filter` 输出包含稳定 `propertyId`，而不是 displayName。
3. 输入不兼容的运算符或空值，确认 `isValid=false` 且不产生查询请求。
4. 点击 Reset，确认条件清空且版本化 filter 输出保留 `typeId`。
5. 将 FilterList 输出绑定到后续 Object-aware Table 的过滤输入。

## 4. 当前边界

- T6.2 只负责构造 Filter JSON，不负责查询对象或分页；查询执行属于 T7 Table Object 模式。
- Object Type 当前通过属性输入配置，后续可在 metadata 已稳定后替换为动态选择控件。
- 当前 UI 文案沿用英文，业务全量中文化不在本迭代范围。
