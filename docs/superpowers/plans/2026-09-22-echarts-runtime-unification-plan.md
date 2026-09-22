# ECharts Runtime Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run both ChartWidget rendering paths on ECharts 6.1.0 while retaining Custom ECharts 3D support through ECharts GL 2.1.0.

**Architecture:** Keep the Custom ECharts iframe and its existing message/error boundary. Pin the app package versions, replace the committed versioned UMD files that the iframe loads, and make the iframe source document reference those exact files in ECharts-before-ECharts-GL order. No persisted chart configuration is migrated or transformed.

**Tech Stack:** React 17, TypeScript, Jest/Testing Library, Yarn 3, ECharts 6.1.0, ECharts GL 2.1.0, committed public UMD assets.

## Global Constraints

- Keep `chartType`, `customEChartConfig`, `__fn_keys__`, `chartData`, DSL fields, and existing data-point event contracts unchanged.
- Keep the sandboxed Custom ECharts iframe and its `setOption(option, true)`, error, resize, and click-message behavior unchanged.
- Pin `echarts` to exactly `6.1.0` and add/pin `echarts-gl` to exactly `2.1.0`; do not use range specifiers.
- Load only local versioned iframe assets: `/libraries/echarts@6.1.0.js`, then `/libraries/echarts-gl@2.1.0.js`, then the existing lodash asset.
- Do not add Builder chart types, templates, theme controls, map work, or changes to public/shared editors.
- Do not stage or alter unrelated untracked `.superpowers/` or `ref/` paths.

---

### Task 1: Lock the Custom ECharts iframe asset contract

**Files:**
- Modify: `app/client/src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx`
- Modify: `app/client/src/widgets/ChartWidget/component/CustomEChartIFrameComponent.tsx`

**Interfaces:**
- Consumes: `CustomEChartIFrameComponent` and its existing `srcDoc` iframe rendering.
- Produces: an iframe source document that loads the exact ECharts 6 and ECharts GL 2.1 versioned local paths in dependency order.

- [ ] **Step 1: Write the failing iframe source-document test**

  In the existing `returns the iframe with sandbox attributes` test, read `iFrameElement.getAttribute("srcdoc")` and assert all of the following:

  ```ts
  const srcDoc = iFrameElement.getAttribute("srcdoc") ?? "";

  expect(srcDoc).toContain('/libraries/echarts@6.1.0.js');
  expect(srcDoc).toContain('/libraries/echarts-gl@2.1.0.js');
  expect(srcDoc.indexOf('/libraries/echarts@6.1.0.js')).toBeLessThan(
    srcDoc.indexOf('/libraries/echarts-gl@2.1.0.js'),
  );
  expect(srcDoc).not.toContain('echarts@5.4.3.js');
  expect(srcDoc).not.toContain('echarts-gl@2.0.9.js');
  ```

- [ ] **Step 2: Run the focused test and verify the expected failure**

  Run:

  ```bash
  yarn g:jest src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx
  ```

  Expected: the new assertion fails because the iframe still contains `/libraries/echarts@5.4.3.js` and `/libraries/echarts-gl@2.0.9.js`.

- [ ] **Step 3: Change only the iframe script references**

  In `CustomEChartIFrameComponent.tsx`, replace the two script tags in `defaultHTMLSrcDoc` with:

  ```html
  <script src="/libraries/echarts@6.1.0.js"></script>
  <script src="/libraries/echarts-gl@2.1.0.js"></script>
  ```

  Preserve the following lodash script and every other part of the iframe document and React component unchanged.

- [ ] **Step 4: Run the focused test and verify it passes**

  Run:

  ```bash
  yarn g:jest src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx
  ```

  Expected: PASS, including the existing sandbox and overlay assertions.

- [ ] **Step 5: Commit the iframe contract change**

  ```bash
  git add app/client/src/widgets/ChartWidget/component/CustomEChartIFrameComponent.tsx app/client/src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx
  git commit -m "feat(echarts): update custom iframe runtime paths"
  ```

### Task 2: Pin packages and replace the versioned UMD assets

**Files:**
- Create: `app/client/src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts`
- Modify: `app/client/package.json`
- Modify: `app/client/yarn.lock`
- Create: `app/client/public/libraries/echarts@6.1.0.js`
- Create: `app/client/public/libraries/echarts-gl@2.1.0.js`
- Delete: `app/client/public/libraries/echarts@5.4.3.js`
- Delete: `app/client/public/libraries/echarts-gl@2.0.9.js`

**Interfaces:**
- Consumes: the exact dependency declarations from `app/client/package.json` and the two public files referenced by Task 1.
- Produces: reproducible local ECharts 6/GL 2.1 iframe assets with package versions locked in the client manifest and lockfile.

- [ ] **Step 1: Write failing runtime-asset contract tests**

  Add `ChartWidgetRuntimeAssets.test.ts`. Resolve the client package root from the test file and use Node `fs` to read the public library assets. Assert:

  ```ts
  expect(packageJson.dependencies.echarts).toBe("6.1.0");
  expect(packageJson.dependencies["echarts-gl"]).toBe("2.1.0");
  expect(existsSync(echartsAsset)).toBe(true);
  expect(existsSync(echartsGlAsset)).toBe(true);
  expect(readFileSync(echartsAsset, "utf8")).toContain('t.version="6.1.0"');
  expect(existsSync(legacyEchartsAsset)).toBe(false);
  expect(existsSync(legacyEchartsGlAsset)).toBe(false);
  ```

  Use the exact paths below so the test checks the public files shipped by the client rather than `node_modules`:

  ```ts
  const librariesDirectory = resolve(process.cwd(), "public", "libraries");
  const echartsAsset = join(librariesDirectory, "echarts@6.1.0.js");
  const echartsGlAsset = join(librariesDirectory, "echarts-gl@2.1.0.js");
  ```

- [ ] **Step 2: Run the new asset test and verify the expected failure**

  Run:

  ```bash
  yarn g:jest src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts
  ```

  Expected: FAIL because `echarts` is range-pinned, `echarts-gl` is absent, the new assets do not exist, and the legacy assets still exist.

- [ ] **Step 3: Pin the packages and refresh the lockfile**

  In `app/client/package.json`, change the ECharts declaration and add the GL declaration:

  ```json
  "echarts": "6.1.0",
  "echarts-gl": "2.1.0"
  ```

  From `app/client`, run:

  ```bash
  yarn install
  ```

  Confirm `app/client/yarn.lock` records ECharts 6.1.0 and ECharts GL 2.1.0. Do not accept unrelated dependency churn.

- [ ] **Step 4: Generate and replace the committed public UMD assets**

  Copy the installed UMD distribution files without minifying or editing their contents:

  ```bash
  cp node_modules/echarts/dist/echarts.min.js public/libraries/echarts@6.1.0.js
  cp node_modules/echarts-gl/dist/echarts-gl.min.js public/libraries/echarts-gl@2.1.0.js
  git rm public/libraries/echarts@5.4.3.js public/libraries/echarts-gl@2.0.9.js
  ```

  Verify the ECharts asset contains `t.version="6.1.0"`, and verify the two new assets are nonempty. Do not delete any other library asset.

- [ ] **Step 5: Run the new asset test and verify it passes**

  Run:

  ```bash
  yarn g:jest src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts
  ```

  Expected: PASS, proving the manifest pins both packages and the client-shipped asset set matches the iframe contract.

- [ ] **Step 6: Commit the reproducible asset set**

  ```bash
  git add app/client/package.json app/client/yarn.lock app/client/public/libraries/echarts@6.1.0.js app/client/public/libraries/echarts-gl@2.1.0.js app/client/src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts
  git add -u app/client/public/libraries
  git commit -m "feat(echarts): align custom chart runtime with v6"
  ```

### Task 3: Run ChartWidget regression and browser acceptance checks

**Files:**
- Verify: `app/client/src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx`
- Verify: `app/client/src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts`
- Verify: `app/client/src/widgets/ChartWidget/component/index.test.tsx`
- Verify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`
- Verify: `app/client/src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts`
- Verify: `app/client/src/widgets/ChartWidget/component/LayoutBuilders/*.test.ts`
- Verify: `app/client/src/widgets/ChartWidget/widget/*.test.ts`

**Interfaces:**
- Consumes: the unified ECharts runtime asset contract from Tasks 1 and 2.
- Produces: verification evidence that existing ChartWidget behavior remains intact.

- [ ] **Step 1: Run the full focused ChartWidget Jest suite**

  From `app/client`, run:

  ```bash
  yarn g:jest src/widgets/ChartWidget
  ```

  Expected: PASS for component, configuration builder, dataset builder, layout, property-config, syntax-error, and widget tests.

- [ ] **Step 2: Run formatting and type checks for the modified TypeScript/package surface**

  From `app/client`, run:

  ```bash
  yarn exec prettier --check src/widgets/ChartWidget/component/CustomEChartIFrameComponent.tsx src/widgets/ChartWidget/component/CustomEChartIFrameComponent.test.tsx src/widgets/ChartWidget/component/ChartWidgetRuntimeAssets.test.ts
  yarn check-types
  ```

  Expected: both commands exit successfully. If full type checking has pre-existing unrelated failures, record the exact failures and separately run the narrow Jest evidence; do not suppress or alter unrelated code.

- [ ] **Step 3: Perform browser acceptance on a local client/server environment**

  Use an existing development environment or start the local stack. In one application, create or verify these ChartWidget configurations:

  1. A basic Builder column chart using `chartData`.
  2. A Custom ECharts 2D chart whose tooltip uses a formatter function stored through `__fn_keys__`.
  3. A Custom ECharts `bar3D` chart using `grid3D`, `xAxis3D`, `yAxis3D`, and `zAxis3D`.
  4. A Custom ECharts option with an invalid series configuration.

  Confirm the first three render; confirm a data-point click still reaches `onDataPointClick`; confirm the invalid option uses the existing ChartWidget error display without destabilizing the editor.

- [ ] **Step 4: Record the verification result**

  Add a concise verification note under `docs/superpowers/verification/` only if browser acceptance exposes a compatibility qualification that future maintainers must know. Do not add a note merely to repeat passing automated test output.

- [ ] **Step 5: Inspect the final scope and commit any verification note**

  Run:

  ```bash
  git diff --check
  git status --short
  rg -n 'echarts@5\.4\.3|echarts-gl@2\.0\.9' app/client --glob '!app/client/yarn.lock'
  ```

  Expected: no stale iframe/library references; only intended ChartWidget, package, lockfile, public library, and optional verification-note changes are present. If a verification note was added, commit it with:

  ```bash
  git add docs/superpowers/verification/2026-09-22-echarts-runtime-unification-verification.md
  git commit -m "docs(echarts): record runtime verification"
  ```
