# CelanWorksmith 第三阶段检查点

日期：2026-08-11

## 检查点状态

第三阶段“全面兼容本体”的优化工作已完成 Task 1-10（C0-C9）。当前检查点保留在工作区，未创建提交；仓库已有的 T0-T8、T-Foundation、B0-B6 以及第二阶段改造均属于基线的一部分，不应通过 reset、clean 或 checkout 覆盖。

## 已完成能力

- C0：统一加载状态、错误码、重试和权限错误契约。
- C1：稳定 ID 与 displayName 分离，配置路径使用稳定 ID。
- C2：Property 字段元数据映射、显示名称和字段状态。
- C3：Action 执行状态、禁用、错误和进度反馈。
- C4：Action 成功后的局部刷新，避免覆盖用户编辑值。
- C5：绑定诊断、不可用节点过滤和自动补全定义刷新。
- C6：Link metadata/entry 按 applicationId 隔离，legacy 兼容键，懒加载/预读、空集、权限和重试。
- C7：统一字段与 Action 参数校验，表单摘要、错误路径、readOnly/derived 编辑保护、Menu/Form Action 错误反馈。
- C8：本体绑定向导、调试面板、稳定绑定键复制、敏感信息脱敏、403/PERMISSION_DENIED 保留和运行时清缓存。
- C9：语义 metadata 权限过滤、敏感值过滤、版本化缓存键和 Explorer 展示。

## 关键集成修复

- Chart 保留原生 Query 默认模式；Object 模式通过显式 \`dataMode\` 使用。
- Object Query key 对绑定应用加入 applicationId scope，legacy key 保持兼容。
- Runtime cache clear 清空对象运行时 items 并保留 metadata，随后重新加载对象数据。
- Object、Link、Function 缓存按目标 applicationId 清理；无 applicationId 时全量清理。
- 对象加载保留 runtime 返回的 \`PERMISSION_DENIED\` 等错误码。
- 未明确授权的 semantic metadata 默认不返回。
- Form Object 模式在 metadata 未 ready 时不递归渲染。

## 验证证据

- 第三阶段整体回归复核：**49 suites / 377 tests passed**。
- Object Query 的组件、变量 DataTree 和 watcher 均携带 applicationId；Function provider 接收 runtime context；应用切换 stale 响应被丢弃。
- 第三阶段整体回归：**47 suites / 364 tests passed**。
- C6 定向回归：6 suites / 64 tests passed。
- C7 定向回归：10 suites / 50 tests passed。
- C8-C9 定向回归：8 suites / 69 tests passed。
- Prettier：全部变更 TypeScript/TSX 文件通过。
- ESLint：全部变更 TypeScript/TSX 文件 0 errors，剩余 83 个既有 warning。
- \`git diff --check\`：通过。

## 手工验证建议

1. 新建 App，绑定 Ontology Project，确认 Object/Link/Function/Action/Variable 节点可见。
2. Table、ObjectDetail、Form、Chart 分别验证 Query 模式和 Object 模式；确认 Chart 新建默认仍为 Query。
3. 触发对象查询、Link 展开、Function 和 Action，检查 loading/empty/error/permission 状态。
4. 在 Form 中修改普通字段、readOnly 字段和 derived 字段，确认错误路径与表单摘要定位正确。
5. 打开调试面板执行 Retry/Clear Cache，确认当前数据重新加载且用户输入值保留。
6. 切换两个 App 或 Ontology binding，确认 Query/Link/Function 不串用缓存。

## 已知限制

- T9 发布态快照、生产 Provider、生产 Action Server 和通用 Custom Chart 注入协议仍未实现。
- 语义权限目前采用后端授权信息缺失时 fail-closed，Explorer 的权限判断仍是错误码启发式，后续可由后端显式下发权限位。
- Binding Panel 的 providerId 仍是当前模拟 Provider；未来接入 Provider 注册表后再开放选择。
- 调试脱敏仍可增加多重 URL 编码的防御纵深。
- Button/MenuButton 的部分 Action 错误通过 meta 暴露，未统一在按钮自身视觉组件中呈现。

## 恢复方式

- 阶段备份目录：\`/home/gavin/backups/CelanWorksmith/stage-20260811-third-stage\`
- 恢复前先确认目标工作区状态，再使用备份中的文件覆盖对应工作区；不要执行破坏性 Git 命令。
- 恢复后在 \`app/client\` 执行第三阶段整体 Jest、Prettier、ESLint 和 \`git diff --check\`。
