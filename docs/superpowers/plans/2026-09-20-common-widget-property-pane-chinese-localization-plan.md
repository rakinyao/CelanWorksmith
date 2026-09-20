# 常用 Widget 设置页中文化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为传统 Button、Text、Image 与 Container Widget 的私有属性面板提供可切换的中英文文案，同时保持所有技术配置和运行时行为不变。

**Architecture:** 每个 Widget 使用 owner-scoped `widgetProperty.button.*`、`widgetProperty.text.*`、`widgetProperty.image.*` 或 `widgetProperty.container.*` 资源。属性面板由零参数工厂在请求时使用现有 i18n 单例解析显示字段；配置对象的技术字段、控制结构和顺序保持原样。现有 WidgetFactory 语言分区缓存仅在测试证实传统 Widget 仍无法切换时才扩展。

**Tech Stack:** TypeScript、React、i18next、Jest、Yarn workspaces。

## Global Constraints

- 仅处理 `BUTTON_WIDGET`、`TEXT_WIDGET`、`IMAGE_WIDGET`、`CONTAINER_WIDGET`。
- 不处理任何 `WDS_*` Widget、Anvil 布局系统或其专属属性配置。
- 仅国际化 `sectionName`、非技术 `label`、`helpText`、`placeholderText`、`searchPlaceholderText` 和展示型选项标签。
- `onClick` 保持技术事件标识；不翻译 `propertyName`、事件值、DSL、表达式、默认值、颜色/尺寸值、图标名、hooks、条件和验证逻辑。
- 不修改 Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器、Chart、Form、DatePicker、JSON Form 或 ECharts。
- 所有新增资源必须在 `en-US.ts` 和 `zh-CN.ts` 中有相同键结构；不得将语言相关配置保存在模块级静态对象中。
- 不暂存或修改无关的 `.superpowers/`、`ref/` 和已有工作区变更。

---

### Task 1: 完成 Button 私有属性面板本地化

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/ButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ButtonWidget/widget/nativePath.test.ts`

**Interfaces:**
- Consumes: 既有 `widgetProperty.button.*` 资源及 i18n 单例。
- Produces: `getButtonPropertyPaneContentConfig()` 和 `getButtonPropertyPaneStyleConfig()` 零参数工厂，供 `ButtonWidget` 的两个静态属性面板方法调用。

- [ ] **Step 1: 写出失败的中英文属性面板测试**

在 `nativePath.test.ts` 中新增测试，切换到 `zh-CN` 后检查基础区为 `基础`、`text` 标签为 `标签`、`buttonVariant` 标签为 `按钮变体`；检查 `onClick` 标签和值仍为 `onClick`。用 `try/finally` 恢复 `en-US`。

```ts
await i18n.changeLanguage("zh-CN");
const content = ButtonWidget.getPropertyPaneContentConfig();
expect(content[0].sectionName).toBe("基础");
expect(findProperty(content, "text")?.label).toBe("标签");
expect(findProperty(content, "onClick")?.label).toBe("onClick");
expect(findProperty(content, "onClick")?.propertyName).toBe("onClick");
```

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/ButtonWidget/widget/nativePath.test.ts`

Expected: FAIL，当前静态英文配置没有根据语言变化。

- [ ] **Step 3: 补全 Button 资源并工厂化配置**

扩展 Button 的既有 owner-scoped 资源，覆盖内容、样式、reCAPTCHA、表单设置、图标、标签样式、边框阴影及其展示选项。添加 `tableV2Text` 同等局部 helper，例如 `buttonText(path)`，通过 `i18n.t("widgetProperty.button.${path}")` 解析。

将两个静态方法的数组主体移动到 `getButtonPropertyPaneContentConfig()` 与 `getButtonPropertyPaneStyleConfig()`。只替换显示字段；`RecaptchaTypes`、`ButtonVariantTypes`、`ButtonPlacementTypes`、字体尺寸值、图标与 `onClick` 均保持原值。

- [ ] **Step 4: 补充资源完整性断言并验证为绿**

在 `resourceParity.test.ts` 添加 Button 资源键结构与代表性中文值断言；确保所有 Button 新增资源在两种语言都能解析，而非返回 key。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/ButtonWidget/widget/nativePath.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/ButtonWidget/widget/index.tsx app/client/src/widgets/ButtonWidget/widget/nativePath.test.ts
git commit -m "feat(i18n): localize button property pane"
```

### Task 2: 本地化 Text 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/TextWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/TextWidget/widget/index.test.tsx`

**Interfaces:**
- Consumes: `widgetProperty.text.*` 的配对资源。
- Produces: `getTextPropertyPaneContentConfig()` 和 `getTextPropertyPaneStyleConfig()`，由 `TextWidget` 静态方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

在 `index.test.tsx` 中对既有普通 Text 行为测试保持不变，新增配置测试：`zh-CN` 下断言 `常规`、文本标签 `文本`、溢出文本标签 `文本溢出`、选项 `滚动`；断言 `propertyName: "overflow"` 和其持久化值 `SCROLL` 不变。恢复英文后断言 `General`。

- [ ] **Step 2: 验证为红**

Run: `yarn --cwd app/client g:jest src/widgets/TextWidget/widget/index.test.tsx`

Expected: FAIL，现有属性面板固定为英文。

- [ ] **Step 3: 添加 Text 资源并使用配置工厂**

新增 `widgetProperty.text.content`、`style`、`help`、`placeholder`、`option` 资源，覆盖文本、可见性、链接处理、字体、字号、颜色、文本格式和边框阴影显示文案。将 Text 的内容与样式数组改为零参数工厂；字号标签可国际化但 `S`、`M`、`L`、`XL`、`XXL`、`3XL` 对应尺寸值不变。

- [ ] **Step 4: 添加资源配对和行为验证**

在资源测试中断言 Text 命名空间配对，并运行：

`yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/TextWidget/widget/index.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/TextWidget/widget/index.tsx app/client/src/widgets/TextWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize text property pane"
```

### Task 3: 本地化 Image 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/ImageWidget/widget/index.tsx`
- Create: `app/client/src/widgets/ImageWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**
- Consumes: `widgetProperty.image.*` 配对资源。
- Produces: `getImagePropertyPaneContentConfig()` 与 `getImagePropertyPaneStyleConfig()`，供 `ImageWidget` 的静态方法调用。

- [ ] **Step 1: 写出失败测试**

创建属性面板测试，在中文语言下断言数据区 `数据`、图片字段 `图片`、对象适应字段 `对象适应`、`Contain` 展示为 `包含`；断言选项值仍为 `contain`，事件标签和字段仍为 `onClick`。在 `finally` 中恢复英文。

- [ ] **Step 2: 验证为红**

Run: `yarn --cwd app/client g:jest src/widgets/ImageWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL，当前配置返回英文。

- [ ] **Step 3: 添加 Image 资源和请求时工厂**

添加 `widgetProperty.image.content`、`style`、`help`、`placeholder`、`option` 资源。将 Image 的内容和样式数组改为零参数工厂。保留 URL/Base64 输入格式、`objectFit` 值、数字缩放级别、`onClick`、图片验证、旋转和下载逻辑。

- [ ] **Step 4: 验证资源和 Widget 行为**

扩展资源配对测试，运行：

`yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/ImageWidget/widget/propertyPaneConfig.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/ImageWidget/widget/index.tsx app/client/src/widgets/ImageWidget/widget/propertyPaneConfig.test.ts
git commit -m "feat(i18n): localize image property pane"
```

### Task 4: 本地化 Container 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/ContainerWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ContainerWidget/widget/index.test.tsx`

**Interfaces:**
- Consumes: `widgetProperty.container.*` 配对资源。
- Produces: `getContainerPropertyPaneContentConfig()` 与 `getContainerPropertyPaneStyleConfig()`，供 `ContainerWidget` 静态方法调用。

- [ ] **Step 1: 写出失败测试**

在既有 Container 测试中新增语言切换断言：中文内容区为 `常规`，`shouldScrollContents` 标签为 `滚动内容`；样式区为 `颜色`，`backgroundColor` 标签为 `背景颜色`。断言 `shouldScrollContents`、`backgroundColor` 和颜色格式占位示例保持原值。

- [ ] **Step 2: 验证为红**

Run: `yarn --cwd app/client g:jest src/widgets/ContainerWidget/widget/index.test.tsx`

Expected: FAIL，当前静态配置仍为英文。

- [ ] **Step 3: 添加 Container 资源和请求时工厂**

添加 `widgetProperty.container.content`、`style`、`help`、`placeholder` 资源。将 Container 内容与样式数组改为零参数工厂。保留 `postUpdateAction`、自动高度布局、children 渲染、条件、颜色格式示例和所有验证值。

- [ ] **Step 4: 验证资源和 Widget 行为**

扩展资源测试，运行：

`yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/ContainerWidget/widget/index.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/ContainerWidget/widget/index.tsx app/client/src/widgets/ContainerWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize container property pane"
```

### Task 5: 执行四个 Widget 的集中回归验证

**Files:**
- Modify only if a focused test exposes a missing in-scope resource or a locale-static configuration; otherwise no source changes.

**Interfaces:**
- Consumes: 前四项的资源与配置工厂。
- Produces: 四个传统 Widget 在两种语言下可用的属性面板验证证据。

- [ ] **Step 1: 写出失败的工厂/缓存回归测试（仅在需要时）**

若顺序调用某个 Widget 的英文和中文配置仍返回首次语言，先在该 Widget 测试中加入如下断言：

```ts
await i18n.changeLanguage("en-US");
expect(getConfig()[0].sectionName).toBe("General");
await i18n.changeLanguage("zh-CN");
expect(getConfig()[0].sectionName).toBe("常规");
```

仅在该测试失败时，定位并按 locale 划分相关的属性面板缓存；不修改非属性面板缓存。

- [ ] **Step 2: 运行集中套件**

Run:

```bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/ButtonWidget/widget/nativePath.test.ts \
  src/widgets/TextWidget/widget/index.test.tsx \
  src/widgets/ImageWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/ContainerWidget/widget/index.test.tsx
```

Expected: PASS，且所有断言均在 `finally` 中恢复英文语言。

- [ ] **Step 3: 检查范围和格式**

Run:

```bash
git diff --check
app/client/node_modules/.bin/prettier --check \
  app/client/src/i18n/resources/en-US.ts \
  app/client/src/i18n/resources/zh-CN.ts \
  app/client/src/i18n/resources/resourceParity.test.ts \
  app/client/src/widgets/ButtonWidget/widget/index.tsx \
  app/client/src/widgets/TextWidget/widget/index.tsx \
  app/client/src/widgets/ImageWidget/widget/index.tsx \
  app/client/src/widgets/ContainerWidget/widget/index.tsx
```

Expected: PASS；差异中不含 WDS、Anvil、Action selector、Callbacks 或 ECharts 文件。
