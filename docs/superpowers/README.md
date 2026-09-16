# CelanWorksmith 开发入口

本文档是 CelanWorksmith 定制开发的入口。仓库根目录的 `README.md` 和
`CONTRIBUTING.md` 主要保留上游 Appsmith 说明；开始 CelanWorksmith 工作前，应先阅读
本页、根目录 `AGENTS.md` 和当前任务所引用的设计/实施计划。

## 当前架构

- 本体通过原生 Appsmith Datasource Plugin 接入，和数据库/API 数据源并列。
- Query、JS 和 Widget 使用原生 Appsmith 执行与数据绑定路径；不得恢复早期的对象模式、
  专用 Redux/Saga、DataTree 根节点或平行本体执行链路。
- Ontology datasource 固定 metadata snapshot、digest 和 Runtime Provider；版本升级必须显式
  执行，不能自动切换。
- 当前 Functions/Actions 是 `DEMO_HANDLER` 验证实现。新工区的 Demo Action 路由按照
  Release Action 的 `adapter_id + adapter_version` 解析，而非按工作区 ID 绑定。

## 本地开发基线

- 后端：`app/server`，用户服务 `cw-backend`，健康检查
  `http://127.0.0.1:8081/api/v1/health`。
- Demo Action Server：用户服务 `cw-demo-action-server`，健康检查
  `http://127.0.0.1:8092/actuator/health`。
- 本地环境变量位于未跟踪的 `app/server/.env`；禁止提交密码、令牌、Mongo/Redis 凭据或
  Action Server 长期凭据。
- Demo Runtime 数据可按
  [2026-09-14 Demo Action 验证记录](verification/2026-09-14-demo-contract-change-action.md)
  重置和验证。

## 权威文档

| 主题 | 当前文档 |
| --- | --- |
| 原生 Ontology Datasource 架构 | [2026-08-13 Ontology Datasource Plugin 设计](specs/2026-08-13-ontology-datasource-plugin-design.md) |
| Release JSON 导入与工作区绑定 | [2026-09-03 Release JSON Workspace Import 设计](specs/2026-09-03-ontology-release-json-workspace-import-design.md) |
| Capability Widget 目标绑定 | [2026-09-09 Capability Widget Target Binding 设计](specs/2026-09-09-capability-widget-target-binding-design.md) |
| Demo Action 路由 | [2026-09-15 Demo Action Server Registration Routing 计划](plans/2026-09-15-demo-action-server-registration-routing-plan.md) |
| Demo Action 手工/自动验证 | [2026-09-14 Demo Contract Change Action 验证记录](verification/2026-09-14-demo-contract-change-action.md) |
| 待三方确认的正式契约 | [2026-09-16 本体能力与 Action Server 正式契约草案](specs/2026-09-16-ontology-capability-action-server-contract-draft.md) |

## 历史资料与协作规则

- `docs/superpowers/plans/` 与 `docs/superpowers/verification/` 中含有阶段性计划和验收证据。
  标有 `Historical`、`Superseded` 或历史说明的文件只用于追溯，不得作为新实现的输入。
- 早期 Object Widget/Object Mode 资料已被原生 Datasource Plugin 架构替代。
- 旧的 workspace-keyed Action Server 路由已被 adapter/version 路由替代。
- 开始新功能前，先创建或确认对应的设计和实施计划；共享生产文件串行修改，避免在同一
  worktree 中并行编辑。
- `.worktrees/` 是隔离开发目录。删除前必须确认 worktree 干净、分支已合并且没有正在使用。
