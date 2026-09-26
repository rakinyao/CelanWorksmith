# 中文页面名称与 URL 兼容修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 多个中文页面可独立重命名、发布和访问，预览与实际 URL 一致。

**Architecture:** 名称与 URL 标识分离；普通 URL 继续由 basePageId 定位，空 slug 组装时回退为 page。静态 URL 沿用原生服务分配并持久化非空唯一标识，不随显示名变化。所有补全遵循权限、功能开关、Git 身份及原生发布流程。

**Tech Stack:** React / TypeScript / Jest；Spring / Reactor / MongoDB / JUnit。

设计依据：[已审核设计](../specs/2026-09-26-chinese-page-name-url-design.md)。

## Global Constraints

- 保留页面 ID 和正常历史链接；不批量改写普通 slug，不引入拼音转换。
- 不自动启用静态 URL，不绕过 CE 兼容服务或功能开关。
- 新 UI 文案使用英文源文案并接入现有 i18n；不扩展 App Settings 中文化范围。
- 不直接修改用户业务应用或已发布版本；发布验收使用专门测试应用。
- 有效且唯一的静态标识保持；重复已发布地址只诊断，不静默选择归属。
- 保留当前 PageSettings 未提交修复及测试，不覆盖其他工作区资料。
- 顺序执行四项任务。数据库并发唯一性或历史地址归属如需新增架构决策，说明证据后暂停相关阶段，不擅自扩大范围。

## Task 1：普通 URL、预览与名称校验

**Files:**
- Modify: `app/client/src/pages/AppIDE/components/AppSettings/components/PageSettings.tsx`
- Test: `app/client/src/pages/AppIDE/components/AppSettings/components/PageSettings.test.ts`
- Modify: `app/client/src/pages/AppIDE/components/AppSettings/utils.ts`
- Create: `app/client/src/pages/AppIDE/components/AppSettings/utils.test.ts`
- Modify/Test: `app/client/src/ce/entities/URLRedirect/URLAssembly.ts` / `URLAssembly.test.ts`
- Modify/Test: `app/client/src/utils/helpers.tsx` / `helpers.test.ts`
- Inspect/Test: `app/server/appsmith-server/src/main/java/com/appsmith/server/newpages/base/NewPageServiceCEImpl.java`
- Inspect/Test: `app/server/appsmith-server/src/test/java/com/appsmith/server/services/NewPageServiceTest.java`

**Interfaces:** 保留 `getPagePathPreview(basePageId, pageName)`、`splitPathPreview(url, customSlug?)` 和 `getUrlPreview(...)` 的公共签名。保留 `hasPageNameSlugConflict(pageName, pages, currentPageId)` 的空 slug 防护。

- [x] 1. 添加失败测试：空名称可读片段回退到 page；两个不同页面 ID 的 URL 不同；保留英文 slug 和 customSlug 行为。实例化真实 URLBuilder 并配置 applicationSlug 为 `ontdemo1-2-0`，不可 mock 被测生成方法。

```typescript
expect(builder.getPagePathPreview(pageId, "")).toBe(
  `/app/ontdemo1-2-0/page-${pageId}`,
);
```

- [x] 2. 添加拆分回归：应用名含多个连字符、页面 slug 为单独 `-`、应用名包含同样的页面 slug、正常静态路径、Mongo ID 和 UUID 路径。每种输入必须满足：

```typescript
const parts = splitPathPreview(url);
expect(Array.isArray(parts) ? parts.join("") : parts).toBe(url);
```

还要断言高亮片段确实是页面部分，避免“完全不拆分”也通过。

- [x] 3. 运行新增测试确认旧代码失败，然后修改预览：`getPagePathPreview` 使用 `pageName || PLACEHOLDER_PAGE_SLUG`；拆分函数以匹配的路由路径和页面 ID 确定页面片段位置，构造前缀/高亮/后缀，不再全局 split。保持消费者拼接完整性及 query/hash 行为。
- [x] 4. 补名称回归：不同中文、真实中文重名、当前页面自身、非空 URL 冲突。追踪服务端真实更新入口及仓库约束，补直接更新同名测试；若缺失保护，在已有校验链修补，不在前端单独定义另一套名称规则。
- [x] 5. 定向验证并审查；提交仅包含本任务路径。直接更新单元测试通过；新增 Spring 集成用例受环境阻塞，详见状态。

```bash
cd app/client
yarn g:jest src/pages/AppIDE/components/AppSettings src/ce/entities/URLRedirect/URLAssembly.test.ts src/utils/helpers.test.ts
```

服务端新增测试采用 Task 3 列出的 Maven 命令，不能以客户端测试代替。

## Task 2：静态 slug 的确定性分配

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceImpl.java`
- Create: `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/PageSlugAllocator.java`
- Create: `app/server/appsmith-server/src/test/java/com/appsmith/server/staticurl/PageSlugAllocatorTest.java`
- Create: `app/server/appsmith-server/src/test/java/com/appsmith/server/staticurl/StaticUrlServiceImplTest.java`

**Interfaces:** 包内分配器 `String allocate(String preferredSlug, Set<String> reservedSlugs)`：接收有效候选或空值，返回非空可用值并加入占用集合。调用方先保留所有已有有效标识；不得用此方法自动修正手动输入冲突。

- [x] 1. 先写以下失败测试，加上英文候选、重复调用、已有 `page-1`、纯中文来源经 makeSlug 后为空的场景。

```java
Set<String> reserved = new HashSet<>(Set.of("page", "page-1"));
assertThat(PageSlugAllocator.allocate("", reserved)).isEqualTo("page-2");
assertThat(PageSlugAllocator.allocate("", reserved)).isEqualTo("page-3");
```

- [x] 2. 实现仅负责选值的分配器：基础值为空时用 `page`，先尝试基础值，再递增整数后缀。不是缓存，不使用随机值，不直接访问数据库。
- [x] 3. 重构现有分配函数调用同一算法；启用静态 URL 时先收集有效 uniqueSlug，再按稳定页面顺序补齐缺失值，不因普通 slug 为空跳过页面。重复有效标识返回明确诊断，不在该流程重新编号。
- [x] 4. 服务测试断言保存对象中的 uniqueSlug，而非只断言 mock 被调用：两个中文页面、预占候选、已有英文标识、第二次执行不变、无 unpublishedPage 的异常输入及重复有效标识。
- [x] 5. 运行分配器和服务定向测试；提交算法与启用流程修改。检查并发保证放在 Task 3，不宣称此分配器提供数据库锁。

## Task 3：生命周期接入与存量边界

**Files:**
- Modify/Test: `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceImpl.java`
- Inspect/Modify: `app/server/appsmith-server/src/main/java/com/appsmith/server/services/ce/ApplicationPageServiceCEImpl.java`
- Inspect/Modify: `app/server/appsmith-server/src/main/java/com/appsmith/server/newpages/base/NewPageServiceCEImpl.java`
- Inspect/Modify: `app/server/appsmith-server/src/main/java/com/appsmith/server/newpages/importable/NewPageImportableServiceCEImpl.java`
- Test: `app/server/appsmith-server/src/test/java/com/appsmith/server/services/ApplicationPageServiceTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/appsmith/server/services/NewPageServiceTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/appsmith/server/staticurl/StaticUrlServiceImplTest.java`

**Interfaces:** 沿用 `updateUniquePageSlugsBeforeImport`、`updateUniqueSlugBeforeClone` 及现有创建/发布入口；分配必须完成于原生保存链中。CE 兼容实现的 unsupported/无静态设置行为保持不变。

- [ ] 1. 检查应用与分支隔离、静态功能开关、唯一性查询和数据库索引。用并发测试证明是否已有唯一性保障；若需要新增数据库唯一索引或跨请求锁，先报告历史冲突/分支风险并单独确认，不能以 `.collectList()` 后的内存检查冒充并发保证。
  已完成代码审计及隔离 Mongo 的 migration 074 索引并发验证；部署索引状态、完整服务并发链仍未验证，因此本项保持未勾选。
- [x] 2. 补失败测试：静态应用新建纯中文页面得到非空标识；重命名不改变已有标识；复制的新页面标识不同；不启用静态 URL 的应用行为不变。
- [x] 3. 补导入失败测试：新增无标识中文页面得到新标识；同 Git sync ID 覆盖不改身份；同批及数据库中的占用标识都保留；不同应用/分支隔离。修改原生入口使用 Task 2 的分配规则，不能另起执行链。占用查询与持久化边界采用 mock；真实导入待集成验证。
- [x] 4. 用受控测试数据验证存量缺失补全：先只读列出缺失与重复映射，补全仅写未发布版本，通过正常发布生效。已发布重复地址仅报告冲突页面，等待用户确定归属；不运行自动线上修复脚本。已完成受控对象的映射、草稿保存及发布前阻断测试；未执行业务库存量诊断或真实发布。
- [ ] 5. 回归服务端并记录实际执行结果。先检查 Maven Wrapper、Java 版本、仓库测试基础设施要求，使用现有服务测试的数据库准备方式，不连接用户业务数据库。
  定向单元/原生入口测试已通过；以下完整 Spring 服务测试命令受环境阻塞，尚未完成。

```bash
cd app/server
mvn -pl appsmith-server -am -Dtest=PageSlugAllocatorTest,StaticUrlServiceImplTest,NewPageServiceTest,ApplicationPageServiceTest -Dsurefire.failIfNoSpecifiedTests=false test
```

- [x] 6. 审查并提交仅相关入口修改。测试基础设施不可用时明确标记未验证，不能宣告静态模式验收完成。

## Task 4：发布验收与收尾

**Files:**
- Update: `docs/superpowers/plans/2026-09-26-chinese-page-name-url-plan.md`

- [x] 1. 运行客户端上述定向套件、变更文件 ESLint/Prettier、服务端对应格式检查及 `git diff --check`。不使用仓库全量 TypeScript 既有错误替代本次变更诊断。
- [ ] 2. 新建可识别为测试用途的应用，应用名包含多个连字符；添加“合同管理”“其他组件展示”，各放不同标识内容。普通发布后分别复制 URL、直达、刷新、导航，确认不会串页。
- [ ] 3. 重命名为中文/中英混合，检查预览与实际 URL 一致，并以旧的带 ID 地址直达原页面。真实重名必须失败。
- [ ] 4. 静态能力可用时，在测试应用内启用并重复上述操作，另验证复制、导入和重命名后的稳定地址。能力不可用时记录环境限制，不改功能开关来强行绕过。
- [ ] 5. 整体审查，记录测试计数、浏览器结果、存量诊断是否执行及未验证项。用户业务数据未授权修改；测试应用清理前确认精确目标。
- [x] 6. 将相关提交保留在已确认的主开发分支 `feat/ontology-datasource-plugin`，不合并到 origin/release，不推送远程，不清理历史 worktree。

## 状态

截至 2026-09-26，Task 1-3 的实现及任务级审查已完成；相关提交为 `e6a9821848`、`e556874cba`、`290e031cee`。Task 4 已完成定向自动验证和证据整理；整体最终审查提出的问题已完成统一修复，等待最终复审及已登录环境验收。勾选项只表示其注明范围已完成，不代表普通或静态发布环境验收通过。

### 自动验证证据

- 客户端：`yarn g:jest src/pages/AppIDE/components/AppSettings src/ce/entities/URLRedirect/URLAssembly.test.ts src/utils/helpers.test.ts --maxWorkers=2`，5 suites / 44 tests 通过。
- 服务端：在 `app/server` 运行 `mvn -q -pl appsmith-server -am -Dtest=PageSlugAllocatorTest,PageStaticUrlLifecycleTest,StaticUrlServiceImplTest,NewPageNameValidationTest -Dsurefire.failIfNoSpecifiedTests=false test`，最终修复轮次为 3 + 5 + 18 + 4 = 30 tests 通过，0 failures/errors/skips，已检查 Surefire 报告。客户端 44 tests 及修复前服务端 28 tests 由主代理在收尾阶段重新执行；本轮服务端新增手动地址分阶段转移、原生复制目标已发布地址与查询投影回归。
- 7 个变更客户端文件的直接 Prettier 检查通过；ESLint 0 errors / 21 existing warnings。`yarn prettier` 包脚本意外检查全部 `src`，报告 4 个无关既有格式问题；未修改这些文件，随后限定文件检查通过。
- 11 个变更 Java 文件的 `spotless:check` 通过，过滤参数为 `'-DspotlessFiles=.*(NewPageServiceCEImpl|ApplicationPageServiceCEImpl|PageSlugAllocator|StaticUrlServiceCECompatible|StaticUrlServiceCECompatibleImpl|StaticUrlServiceImpl|NewPageNameValidationTest|NewPageServiceTest|PageStaticUrlLifecycleTest|PageSlugAllocatorTest|StaticUrlServiceImplTest)\.java'`，命令前缀为 `mvn -q -pl appsmith-server spotless:check`。
- 最终修复轮次的 5 个 Java 文件已执行 scoped `spotless:apply` / `spotless:check` 并通过，过滤参数为 `'-DspotlessFiles=.*(AppsmithError|StaticUrlServiceImpl|StaticUrlServiceImplTest|PageStaticUrlLifecycleTest|NewPageServiceTest)\.java'`；格式化后再次执行上述服务端 30 tests，全部通过。
- `git diff --check bba4d481a9..HEAD` 及本次文档差异检查通过。既有 Browserslist、JVM/Unsafe、SLF4J、Jest 颜色变量警告仍存在，不声称输出无警告；未执行仓库全量 TypeScript 或全量测试。

### 环境限制与待验收项

- Playwright Chromium 访问 `http://127.0.0.1`，包括加载现有 `playwright/auth/user.json`，均落在 `/user/login` 的 Sign In 页面。无 `playwright/.env` 或已配置的 `USERNAME`/`PASSWORD`。未创建测试应用；Task 4 的创建、发布、复制 URL、直达、刷新、导航、中文/混合重命名、旧带 ID 链接及真实重名拒绝尚未执行。此为认证条件缺失，不能记为产品行为失败。
- 静态功能在当前部署的可用性未知；静态发布、复制、导入及重命名稳定地址待已登录且功能可用的测试环境验证。未绕过登录或功能开关，未创建管理员，未查找无关凭据，未修改业务数据。
- Spring `NewPageServiceTest` 新增用例在 ApplicationContext 初始化阶段因缺少 `APPSMITH_MONGODB_URI` 失败，未执行断言；Docker/Redis Testcontainers 不可用。完整 `NewPageServiceTest` / `ApplicationPageServiceTest` 集成验收仍待隔离基础设施；未连接业务 Mongo 27017。
- 在隔离 Mongo 27129 重现 migration 074 的编辑/发布唯一索引：同应用相同 slug 并发插入均为 1 成功、1 duplicate-key 11000；其他应用相同 slug 成功。仅证明索引定义语义；未证明部署索引已存在、服务竞争可重试或完整持久化生命周期。未新增索引或锁，竞争失败仍使用原生 duplicate-key 错误。隔离 Mongo 已正常停止（exit 0），业务服务未变更。
- 业务库存量缺失/重复映射诊断未执行；仅使用受控测试对象验证草稿补全、发布版本不变及重复所有权阻断。真实持久化导入和成功发布未验证。
- 整体最终审查已执行，统一修复轮次完成，待最终复审。手动编辑现在检查其他页面的草稿和已发布地址，并在冲突提示中解释先发布原页面的新地址或删除、再转移旧地址；当前页面自身地址仍允许使用。原生发布保守预检保留，同一次发布不支持跨页面地址转移。集成重名测试已将两个页面的成功创建与重命名错误断言分开；该修订测试 `NewPageServiceTest.updatePage_DuplicateChineseName_IsRejected` 仅编译、未在本轮运行，不能声称持久化重名集成验收通过。原生复制新增目标应用仅已发布地址冲突的保存对象与查询投影回归。并发显示名检查与写入仍不具备原子性。详细证据见 `.superpowers/sdd/2026-09-26-chinese-page-name-url-plan/final-fix-report.md`。

下一步是在最终审查后，使用授权的已登录测试环境和隔离 Spring 测试基础设施完成仍未勾选项。分支保留在 `feat/ontology-datasource-plugin`，不推送、不合并、不清理历史 worktree；未创建测试应用，因此无测试应用清理操作。
