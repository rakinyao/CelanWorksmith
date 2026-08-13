# CelanWorksmith 清理与归档日志

日期：2026-08-11
原因：从“旁路验证”阶段进入“正式融合”阶段，将临时调试、早期文档和运行时产物移出活跃源码树，减少后续开发的认知负担与合并冲突。

## 处理原则

- 可读内容（代码、文档）只迁移，不删除。
- 临时编译/运行产物从源码树移除，并通过 .gitignore 排除。
- 被归档的代码如果仍被活跃源码引用，先解除引用再迁移。

## 代码变更

1. app/client/src/celanworksmith/semanticMetadata.ts
   - 移除对 celanworksmith/ontologyDebug 的依赖。
   - 将 isSensitiveOntologyValue 函数内联到本文件，保留语义过滤能力。

2. app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.tsx
   - 移除对 ontologyDebug 和 CelanworksmithOntologyDebugPanel 的引用。
   - 简化 UI：保留项目选择、绑定、错误提示、重试和清除缓存按钮。
   - 移除 objectTypeIds 和 objectTypeStatus props。

3. app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx
   - 从 CelanworksmithApplicationBindingPanel 调用处移除 objectTypeIds 和 objectTypeStatus props。

4. app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.test.tsx
   - 原测试已归档（依赖调试面板）。
   - 新增同路径测试，覆盖绑定、错误重试、就绪状态展示、缓存清除和外部重试回调。

## 归档文件清单

位置：docs/superpowers/archive/2026-08-11-cleanup/

### 调试旁路代码
- ontologyDebug.ts
- ontologyDebug.test.ts
- CelanworksmithOntologyDebugPanel.tsx
- CelanworksmithApplicationBindingPanel.test.tsx（原调试面板测试）

### 早期中文检查点/计划文档（根目录 duplicates）
- CelanWorksmith_阶段备份_20260808.md
- CelanWorksmith_T-Foundation阶段检查点.md
- CelanWorksmith_T8基础能力检查点.md
- CelanWorksmith_第二阶段检查点与第三阶段优化计划.md
- CelanWorksmith_第三阶段检查点.md

### 运行时产物
- runtime-logs/（原 app/server/.runtime-logs/）
- server-plugins/（原 app/server/plugins/）

## .gitignore 更新

新增排除：

- app/server/.runtime-logs/
- app/server/plugins/

说明：归档目录本身未加入 .gitignore，仍保留在仓库中作为历史参考。

## 后续建议

- 归档目录中的调试面板如未来需要，可重新设计为“开发者模式”或“诊断面板”后回归。
- 早期中文文档的内容已逐步迁移到 docs/superpowers/ 下的计划/检查点/验证文档中。
- 运行时产物（插件 jar、日志）应由构建/启动脚本按需生成，不应纳入源码控制。
