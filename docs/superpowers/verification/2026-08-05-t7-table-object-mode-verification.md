# T7 Table Object 模式验证记录

记录日期：2026-08-05

## 1. 已交付

- 既有 Table Widget 增加 `dataMode=QUERY|OBJECT`，默认仍为 QUERY。
- OBJECT 模式按 Object Type metadata 自动生成稳定 property ID 列和 displayName 表头。
- Table 页面、排序、FilterList 结构化过滤条件通过 Shared Query Layer 发起服务端查询。
- 支持上一页/下一页和列头排序，查询期间保留已有结果。
- 行选择输出标准 Object Instance 到 `selectedObject`，并输出 `selectedObjects`。
- 原生 Query Table 的现有 derived properties、属性和渲染分支未改变。

## 2. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/TableWidget/widget/objectTableUtils.test.ts \
  src/widgets/TableWidget/component/ObjectTableMode.test.tsx \
  src/widgets/TableWidget/widget/propertyConfig.test.ts
```

结果：3 个 suite、5 个测试通过。

新增 Object Table 文件及 Table loader 静态检查：Prettier 通过，ESLint 0 errors；Table 原文件保留仓库既有 objectKeys/perf warning。

## 3. 手工验收建议

1. 新建 Table，Data mode 选择 Object，Object type 输入 `PurchaseOrder`。
2. 确认 metadata 列显示，数据通过 `/api/v1/celanworksmith/runtime/objects/PurchaseOrder` 查询。
3. 点击列头排序，确认 sortBy/sortDirection 请求变化；绑定 FilterList.filter，确认过滤请求变化。
4. 翻页并选择行，确认 `{{Table1.selectedObject}}` 是完整 Object Instance。
5. 切回 Query，确认原生 Table Data、selectedRow 和既有分页行为不变。

## 4. 当前边界

- Object 模式第一版采用独立轻量渲染分支，后续可复用原生 Table 的更多列样式和工具栏能力。
- 多行选择当前输出当前页选中对象集合的第一版形态；复杂跨页选择留待后续增强。
