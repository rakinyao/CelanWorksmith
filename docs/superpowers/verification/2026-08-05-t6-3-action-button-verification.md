# T6.3 ActionButton 验证记录

记录日期：2026-08-05

## 1. 已交付

- 新增 `ActionButtonWidget`，支持 Action ID、单一 Object Data 和参数对象绑定。
- 对对象身份、Action objectType 和参数对象进行前端校验；无效输入不会 dispatch。
- 点击后复用 `celanworksmithActionRun`，不在 Widget 内复制 API、Saga、重试或刷新逻辑。
- 展示 idle、invalid、running、succeeded 和 failed 状态，并暴露 `executionStatus`、`lastResult`、`lastError`、`requestId` 元属性。
- 已接入现有 Widget lazy loader；T5 执行 Saga 继续负责 changedObjects 刷新。

## 2. 自动化验证

从 `app/client` 执行：

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/ActionButtonWidget/index.test.ts \
  src/widgets/ActionButtonWidget/widget/actionButtonUtils.test.ts \
  src/widgets/ActionButtonWidget/widget/index.test.tsx
```

结果：3 个 suite、5 个测试通过。

```bash
yarn exec eslint src/widgets/ActionButtonWidget src/widgets/index.ts
yarn exec prettier --check src/widgets/ActionButtonWidget src/widgets/index.ts
git diff --check
```

结果：ESLint 0 errors、4 个既有风格性能 warning；Prettier 和 `git diff --check` 通过。

## 3. 手工验收建议

1. 将 ObjectDetail 或 Table 的 selected object 绑定到 `objectData`。
2. 选择已有 Action，并绑定合法参数对象。
3. 点击按钮，确认状态进入 running，成功后本体数据按 T5 changedObjects 自动刷新。
4. 使用不存在的对象或错误参数，确认按钮禁用或显示失败，且不显示伪成功。
5. 先成功执行一次，再执行失败请求，确认 `lastResult` 保留而错误状态单独展示。

## 4. 当前边界

- Action Type 当前通过属性输入 Action ID，动态 metadata 选择控件留待后续属性面板增强。
- requiresConfirmation 尚未增加二次确认弹窗；第一版沿用 Action 执行链的参数校验和状态模型。
- 当前 UI 文案沿用英文，业务全量中文化不在本迭代范围。
