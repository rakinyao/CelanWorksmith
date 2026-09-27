# 发布预检原生资源兼容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除合法 JS 和内嵌 API 的数据源 ID 误报，保留本体严格校验及原生发布语义，并改善诊断可读性。

**Architecture:** 在现有提取器中先识别资源语义，再提取独立数据源 Pin。原生校验留在原生入口，本体契约检查留在本体扩展；快照和发布协调器继续沿用既有流程。诊断使用现有结构化字段，不新增协议或通用插件框架。

**Tech Stack:** Java / Reactor / JUnit / Mockito；React / TypeScript / Jest / styled-components / i18n。

设计依据：[已审核设计](../specs/2026-09-27-release-preflight-native-resource-compatibility-design.md)。

## Global Constraints

- 保持 `ReleaseDatasourcePin` 的非空 ID 契约，不给 JS/内嵌资源伪造 ID，不新增 Pin 类型或数据库迁移。
- 不改写已有发布快照，不自动发布用户应用，不清理业务 Action。
- 本体识别失败也不能降级为普通原生资源以绕过校验。
- 类型识别使用现有 Action 插件类型和插件身份，不根据函数名、显示名称或单纯 ID 是否为空判断。
- “不生成独立 Pin”不等于跳过所有检查或不发布该 Action。
- 英文为新增文案源语言，通过现有 i18n 提供中文，不进行发布面板全面重构或中文化。
- 不增加可能写库的预检调用，不复制原生字段校验器，不修改原生 datasource/query/action 执行管线。
- 保留 `feat/ontology-datasource-plugin` 和其他工作区修改；提交仅包含本任务路径，不推送远程。历史 SDD 报告删除状态不属于本轮清理范围。
- 不读取或输出连接密码、执行体及认证材料；真实发布验收使用授权测试应用，未执行项明确保留。

## Task 1: 数据源提取的原生类型边界

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDatasourcePinExtractor.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ReleaseDatasourcePinExtractorTest.java`
- Inspect: `app/server/appsmith-server/src/main/java/com/appsmith/server/newactions/base/NewActionServiceCEImpl.java`
- Inspect: `app/server/appsmith-server/src/main/java/com/appsmith/server/plugins/base/PluginServiceCE.java`

**Interfaces:** 保持 `extract(ApplicationReleaseCandidate)` 返回 `Mono<ReleaseDatasourcePinExtractionResult>` 及现有构造器。后续任务消费 `pins()` 与 `diagnostics()`；不改变候选对象中的 Action 集合。

- [x] 1. 先在现有提取器测试中复现 JS 误报，复用该文件现有 `action`、`datasource`、`candidate`、`extractor` fixtures：

```java
NewAction js = action("js-action", datasource(null, "js-plugin-id", List.of()));
js.setPluginType(PluginType.JS);
js.setPluginId("js-plugin-id");
js.getUnpublishedAction().setName("calculateTotal");
Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
        .thenReturn(Flux.just(js));
ReleaseDatasourcePinExtractionResult result = extractor(repository, pluginService)
        .extract(candidate(js)).block();
assertThat(result.diagnostics()).isEmpty();
assertThat(result.pins()).isEmpty();
```

- [x] 2. 添加合法内嵌 REST API fixture：已识别的原生 API 插件、`PluginType.API`、无 datasource ID、非空 `DatasourceConfiguration`；插件元数据使用真实 `Plugin` 对象。断言无 ID 误报且不生成独立 Pin。添加 JS 自动生成 datasource 的原生结构回归，不能只验证截图中一种结构。
- [x] 3. 运行 RED，并记录具体失败而非仅编译失败：

```bash
cd app/server
mvn -q -pl appsmith-server -am -Dtest=ReleaseDatasourcePinExtractorTest -Dsurefire.failIfNoSpecifiedTests=false test
```

- [x] 4. 用小范围私有方法调整提取顺序。先检查 Action 结构和插件身份；优先识别本体，包括已解析的 datasource 及现有本体元数据线索；再确认合法 JS 或原生内嵌 API。只有确认不具有独立数据源身份的原生资源不生成 Pin。其余引用保留 ID、插件和现有冲突检查。需要插件元数据时使用 `PluginService.findById`，在单次提取内按 ID 复用结果，不引入全局缓存或逐 Action 重复查询。

```text
Action 结构检查
  -> 本体身份/元数据检查 -> 严格提取 ONTOLOGY Pin
  -> 确认的原生 JS -> 不提取独立 Pin
  -> 确认的原生内嵌 API -> 不提取独立 Pin
  -> 独立数据源引用 -> 保留现有 NATIVE Pin/引用校验
  -> 未知或矛盾结构 -> 明确诊断，不按“空 ID”直接放行
```

- [x] 5. 增加反例：本体缺少 ID、缺少插件但携带本体元数据、插件身份与类型矛盾、未知插件无 ID、缺少实际 datasource 配置、真实本体引用不存在。保持既有有效 NATIVE/ONTOLOGY 混合测试通过，不因收紧分类而把历史测试中的可解析独立引用误报为内嵌资源。
- [x] 6. 加混合 fixture，断言只生成真实独立数据源 Pins，诊断稳定排序，同一 datasource 的冲突仍报告。重跑上述命令至 GREEN，审查后提交 `fix: respect native resource semantics in release pin extraction`。

## Task 2: 混合发布内容和校验编排回归

**Files:**
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ReleaseDependencyScannerTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseSnapshotBuilderTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseValidationServiceTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleasePublishCoordinatorTest.java`
- Inspect/Modify only if regression demonstrates need: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDependencyScanner.java`
- Inspect/Modify only if regression demonstrates need: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseSnapshotBuilder.java`

**Interfaces:** 消费 Task 1 的真实提取结果。沿用 `scan(candidate, pins)`、快照 `applicationContent()`、现有验证服务和发布协调器公共方法，不新增并行流水线。

- [x] 1. 构造同一个候选应用含 JS、内嵌 API、普通独立数据源和本体查询。编排测试实例化真实提取器与 scanner，只 mock 仓库、插件元数据、快照查询等外部边界。不能 mock 提取结果再据此声称覆盖混合分类。
- [x] 2. 使用具体身份断言依赖：所有 Action ID 保留；DATASOURCE 依赖只包含真实独立 ID；本体校验器只接收 ONTOLOGY Pin。无效本体 fixture 仍使结果 `valid()` 为 false。

```java
assertThat(scan.dependencies()).filteredOn(d -> "ACTION".equals(d.kind()))
        .extracting(ReleaseDependency::referenceId)
        .contains("js-action", "inline-api-action");
assertThat(scan.dependencies()).filteredOn(d -> "DATASOURCE".equals(d.kind()))
        .extracting(ReleaseDependency::datasourceId)
        .doesNotContainNull();
```

- [x] 3. 快照测试通过现有 `ObjectMapper` 检查 `applicationContent.actions`：JS 名称/配置和内嵌 API 非敏感配置保留，不生成虚构 datasource ID。给内嵌认证、敏感 header 和 URL 凭据分别放唯一哨兵文本；序列化快照后断言哨兵均不存在，同时断言非敏感配置存在，不能以删掉整个 Action 通过脱敏测试。

```java
String serialized = objectMapper.writeValueAsString(snapshot.applicationContent());
assertThat(serialized).contains("js-action", "inline-api-action", "public-marker");
assertThat(serialized).doesNotContain("secret-auth-marker", "secret-header-marker", "secret-url-marker");
```

- [x] 4. 运行以下定向套件。已有正确行为允许新增测试立即通过；实际发现的脱敏/依赖缺口必须保留 RED 证据，再局部修复。不得借此引入 JS 源码解析或全局敏感词替换。

```bash
cd app/server
mvn -q -pl appsmith-server -am -Dtest=ReleaseDatasourcePinExtractorTest,ReleaseDependencyScannerTest,ApplicationReleaseSnapshotBuilderTest,ApplicationReleaseValidationServiceTest,ApplicationReleasePublishCoordinatorTest -Dsurefire.failIfNoSpecifiedTests=false test
```

- [x] 5. 确认发布协调器继续调用原生发布，非法本体仍阻断；记录 mock 服务边界与未验证的真实部署区别，提交 `test: cover mixed native and ontology release resources`（如修复生产代码，提交说明同时注明）。

## Task 3: 结构化诊断和弹窗可读性

**Files:**
- Modify/Test: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDatasourcePinExtractor.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/release/ReleaseDatasourcePinExtractorTest.java`
- Modify: `app/client/src/pages/AppIDE/components/ApplicationReleasePanel/index.tsx`
- Test: `app/client/src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Inspect, preserve public shape: `app/client/src/api/ApplicationReleasesAPI.ts`
- Inspect, preserve public shape: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseDiagnostic.java`

**Interfaces:** 仍为 `ReleaseDiagnostic(severity, code, path, message, details)`。`details.actionId`、`details.actionName` 为可选字符串；英文资源键 `release.actionName` 对应 `Action`，中文对应 `操作`。缺失名称时不渲染空名称行。

- [x] 1. 后端新增失败断言：ID 缺失时 `path` 精确指向 `.datasource.id`；`message` 为简短原因且不含完整路径；details 只含可用身份信息，不含 datasource 配置。

```java
assertThat(diagnostic.path()).endsWith(".datasource.id");
assertThat(diagnostic.message()).doesNotContain("unpublishedActions[");
assertThat(diagnostic.details()).containsEntry("actionName", "queryWithMissingReference");
```

- [x] 2. 调整提取器诊断生成：用显式的字段路径和原因组装错误，移除该路径上依赖异常 message 猜测 `.id`/`.pluginId` 的逻辑。可用局部异常携带字段信息或显式返回诊断，不扩展公共协议。普通身份信息取自当前 Action；不把任意异常堆栈/配置写入 message。
- [x] 3. 前端使用现有 API mock 添加包含长路径、Action 名称的阻塞响应。断言完整路径仅出现一次、原因与名称存在、发布按钮仍禁用；另覆盖空 details 及非字符串 actionName 不崩溃、不渲染 `[object Object]`。补充预检成功后阻塞消失且恢复现有按钮逻辑的回归。

```tsx
expect(screen.getAllByText(longPath, { exact: false })).toHaveLength(1);
expect(screen.getByText("Datasource identifier is missing")).toBeVisible();
```

- [x] 4. 在 DiagnosticList 及文本容器内设置 `min-width: 0; max-width: 100%;`，长文本设置 `white-space: normal; overflow-wrap: anywhere;`，按现有组件 DOM 结构应用，不使用全站 CSS。不裁剪或隐藏技术路径，不用前端字符串删减掩盖后端重复。
- [x] 5. 新增名称标签接入 en-US/zh-CN 两份资源；保持现有严重性、技术 code 和历史无 details 的降级展示。历史已保存 message 不改写，此次去重保证针对新产生的诊断。运行既有 `src/i18n/resources/resourceParity.test.ts`，确认两份资源键一致。
- [x] 6. 先 RED 后 GREEN，运行下面命令并审查提交 `fix: clarify release diagnostic messages and wrapping`：

```bash
cd app/client
yarn g:jest src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx --maxWorkers=2
./node_modules/.bin/eslint src/pages/AppIDE/components/ApplicationReleasePanel/index.tsx src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx
./node_modules/.bin/prettier --check src/pages/AppIDE/components/ApplicationReleasePanel/index.tsx src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx src/i18n/resources/en-US.ts src/i18n/resources/zh-CN.ts
```

同时从 `app/server` 重跑 `ReleaseDatasourcePinExtractorTest`。浏览器视觉验证在 Task 4 执行，DOM 单测不能替代溢出检查。

## Task 4: 整体回归与授权环境验收

**Files:**
- Update: 本计划及对应设计的实际验证状态。

**Interfaces:** 通过既有预检、创建版本、原生发布入口验收，不直写 Mongo 或修改功能开关。

- [x] 1. 重跑 Task 2 的服务端套件及 Task 3 的前端套件。补跑既有 `ApplicationReleaseControllerTest` 与 `ApplicationReleaseProviderHealthGateTest`，确认 API 响应和本体健康检查未改变。记录每组测试计数、退出码及环境告警。
- [x] 2. 对变更 Java 路径执行限定文件的 `spotless:check`，运行 `git diff --check`；不要用全仓格式化顺带修改无关文件。
- [ ] 3. 使用授权测试应用包含 JS、内嵌 API、普通查询和本体查询，先运行预检、再创建版本和发布。确认合法 JS/内嵌 API 不再误报，真实无效本体仍阻断。检查发布后 JS 和查询可用，不能只验证按钮变亮。
- [ ] 4. 截图验证宽屏和窄视口：长路径完整可读、不造成弹窗横向溢出；名称缺失时布局正常。保持错误时发布阻断、修正后重新预检解除阻断。
- [x] 5. 认证、后端版本、插件或测试基础设施不足时记录具体未执行项，不搜寻无关凭据、不通过业务数据库绕过身份。是否重启服务按当前运行方式和授权范围处理，并报告实际服务版本；不能声称仅编译代码就已经部署。
- [x] 6. 整体审查 Task 1-3 的边界和回归结果，更新文档并提交 `docs: record release preflight compatibility verification`。保留主开发分支；不清理历史 worktree，不修改用户业务发布状态。

## 状态

截至 2026-09-27，Task 1-3 已实施并通过逐任务规格与质量审查：`f37bb84035`、`4c9012d812`、`e0a11463bf`。Task 4 自动化回归和格式检查通过，证据记录提交为 `d3ea994194`；整体最终审查通过，无 Critical/Important 或新增 Minor 问题。授权环境发布验收和真实视口检查未完成。

### 自动化验证

验证代码基线为 `e0a11463bf`；以下命令退出码均为 0。

从 `app/server` 执行（控制代理本轮已运行，Task 4 复核 Surefire 报告）：

```bash
mvn -q -pl appsmith-server -am -Dtest=ReleaseDatasourcePinExtractorTest,ReleaseDependencyScannerTest,ApplicationReleaseSnapshotBuilderTest,ApplicationReleaseValidationServiceTest,ApplicationReleasePublishCoordinatorTest,ApplicationReleaseControllerTest,ApplicationReleaseProviderHealthGateTest -Dsurefire.failIfNoSpecifiedTests=false test
```

| 服务端套件 | 测试数 |
| --- | ---: |
| ReleaseDatasourcePinExtractorTest | 20 |
| ReleaseDependencyScannerTest | 6 |
| ApplicationReleaseSnapshotBuilderTest | 11 |
| ApplicationReleaseValidationServiceTest | 7 |
| ApplicationReleasePublishCoordinatorTest | 7 |
| ApplicationReleaseControllerTest | 11 |
| ApplicationReleaseProviderHealthGateTest | 6 |
| 合计 | 68 |

上述服务端测试均无失败、错误或跳过。混合资源测试使用真实提取、扫描、验证、快照及发布协调器；持久化、权限、外部 RuntimeProvider 和原生发布回调等边界受控或模拟。这只能证明进程内编排，不等于已部署应用发布成功。既有 JS 执行体脱敏行为保持不变，发布快照不是可直接执行的应用副本。

从 `app/client` 重新执行：

```bash
yarn g:jest src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx src/i18n/resources/resourceParity.test.ts --maxWorkers=2
```

2 个套件、25 个测试通过（面板 18、资源键一致性 7）。覆盖完整路径、名称缺失/非法名称、阻塞后的按钮状态及重新预检恢复；DOM 测试不证明真实浏览器换行或横向溢出。

从 `app/server` 执行限定六个已变更 Java 文件的格式检查：

```bash
mvn -q -pl appsmith-server spotless:check '-DspotlessFiles=.*(ReleaseDatasourcePinExtractor|ReleaseDatasourcePinExtractorTest|ReleaseDependencyScannerTest|ApplicationReleaseSnapshotBuilderTest|ApplicationReleaseValidationServiceTest|ApplicationReleasePublishCoordinatorTest)\.java'
```

仓库根目录 `git diff --check` 通过。Task 3 已完成局部 ESLint（0 错误、7 个既有警告）和 Prettier 检查。环境仍有 Java 25 Unsafe/动态 agent/多个 SLF4J provider、客户端 NO_COLOR/FORCE_COLOR 及旧 Browserslist 数据告警，不能描述为无告警输出。

### 未执行的环境验收

- 现有 `playwright/auth/user.json` 会话访问 `http://127.0.0.1/applications` 仍重定向到 `/user/login`，当前没有可用的已认证测试应用会话。未搜索其他凭据或绕过认证。
- 80、3000、8081 端口已有服务；本轮没有重新打包、部署或重启业务服务。运行后端的确切提交版本未核实，不能声称它已包含本轮修复。
- 未在真实应用依次执行预检、创建版本、原生发布，以及发布后的 JS/查询执行；无效本体在部署环境中的阻断行为也未验收。未写业务数据或自动发布应用。
- 未完成宽屏/窄屏的长路径、缺少名称截图及真实溢出检查；没有找到现成的发布面板独立浏览器 fixture，未为此新增测试基础设施。
- Task 4 第 6 项整体最终审查已通过。既有构建/lint 告警仍保留记录；代码级检查和审查通过不能代替上述未执行项。保留当前开发分支，未推送或合并。下一步需加载新的后端版本，再在授权测试环境完成预检、创建版本、正式发布及宽窄视口验收。
