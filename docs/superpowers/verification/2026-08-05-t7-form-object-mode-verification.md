# T7 Form Object 模式验证记录

记录日期：2026-08-05

## 1. 已交付

- 既有 JSON Form 增加 `formMode=QUERY|OBJECT`，默认仍为 QUERY。
- OBJECT 模式按 Object Type metadata 生成 STRING、INTEGER、DECIMAL、DATETIME、BOOLEAN 字段。
- `required` 映射为浏览器必填校验，`readOnly` 映射为禁用控件。
- 编辑值保存在组件本地；同一对象的 metadata/绑定刷新不会覆盖用户已编辑值，对象身份切换会加载新对象值。
- 提交前执行客户端必填校验，合法提交复用 T5 Action 执行链，并暴露 `formData`、`isValid`、`executionStatus`。
- Action 成功后的 changedObjects 刷新继续由 T5 Saga 负责；成功提交会结束当前 dirty 状态，失败状态不会伪造成功。

## 2. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/JSONFormWidget/component/ObjectFormMode.test.tsx \
  src/widgets/JSONFormWidget/widget/propertyConfig.test.ts
```

结果：2 个 suite、5 个测试通过。

Object Form 文件静态检查：Prettier 通过；ESLint 0 errors、1 个 JSX 性能 warning。

## 3. 手工验收建议

1. 新建 JSON Form，Form mode 选择 Object，Object type 输入 `Supplier`。
2. 绑定 `Supplier` 对象和提交 Action，确认字段自动出现且类型正确。
3. 修改字段后刷新本体 metadata，确认输入值保留。
4. 清空 required 字段提交，确认不触发 Action；填写后提交，确认 Action 参数包含字段值。
5. 切回 Query，确认原 JSON Form schema/sourceData/onSubmit 行为不变。

## 4. 当前边界

- 第一版 Object Form 使用现有浏览器输入控件渲染字段，后续可替换为 JSON Form 内部 FieldRenderer 以复用完整主题和复杂字段能力。
- Action ID 当前通过稳定 ID 配置，动态 Action 选择控件留待属性面板增强。
