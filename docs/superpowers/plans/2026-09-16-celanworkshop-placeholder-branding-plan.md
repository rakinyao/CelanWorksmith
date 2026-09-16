# CelanWorkshop Placeholder Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Appsmith default user-visible branding with the CelanWorkshop / 沧澜工坊 placeholder brand and local assets.

**Architecture:** A local teal `C` raster mark supplies default Logo and favicon assets. The existing organization branding reducer remains the sole source of runtime overrides; only its default values change. React page components render accurate, accessible CelanWorkshop text where space permits, while public HTML and email templates receive equivalent static markup without remote Appsmith Logo dependencies.

**Tech Stack:** React, TypeScript, Jest, static HTML, Java email templates, PNG/ICO raster assets, Playwright.

## Global Constraints

- Public product name is `CelanWorkshop`; Chinese product name is `沧澜工坊`.
- The default primary brand color is exactly `#0E7490`.
- Preserve internal `CelanWorksmith`, Appsmith package, service and API identifiers.
- Preserve administrator Branding uploads and runtime organization overrides.
- User-visible copy is English except the intentional Chinese secondary brand name.
- Do not retain a user-visible Appsmith Logo or an `assets.appsmith.com` Appsmith Logo reference in covered entries.
- Do not modify third-party datasource logos, legal pages, or historical test fixtures.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/client/src/assets/images/celanworkshop_logo_square.png` | Generated transparent teal `C` mark for compact UI use. |
| `app/client/src/assets/images/celanworkshop_logo.png` | Generated transparent mark for standard image-logo consumers. |
| `app/client/public/static/img/celanworkshop-favicon.ico` | Browser favicon containing the teal `C` mark. |
| `app/client/public/static/img/celanworkshop-logo.png` | Public default Logo referenced by organization branding configuration. |
| `app/client/src/utils/BrandingUtils.ts` | Default primary color, default favicon URL and default Logo URL. |
| `app/client/src/pages/Editor/AppsmithLink.tsx` | Editor header mark, tooltip and accessible image name. |
| `app/client/src/pages/AppViewer/BrandingBadge.tsx` | Desktop viewer badge branding. |
| `app/client/src/pages/AppViewer/BrandingBadgeMobile.tsx` | Mobile viewer badge branding. |
| `app/client/public/manifest.json` | Browser installed-app name, icon and theme color. |
| `app/client/public/404.html` | Public error-page title, favicon and brand header. |
| `app/server/appsmith-server/src/main/resources/email/ce/*.html` | Verification, invitation and password-recovery email brand header. |

## Task 1: Create Local Brand Assets And Change Default Branding

**Files:**
- Create: `app/client/src/assets/images/celanworkshop_logo_square.png`
- Create: `app/client/src/assets/images/celanworkshop_logo.png`
- Create: `app/client/public/static/img/celanworkshop-favicon.ico`
- Create: `app/client/public/static/img/celanworkshop-logo.png`
- Modify: `app/client/src/utils/BrandingUtils.ts:20-30`
- Modify: `app/client/src/ce/reducers/organizationReducer.ts:25-35`
- Test: `app/client/src/utils/BrandingUtils.test.ts`

**Interfaces:**
- Consumes: existing `getAssetUrl(src)` and `createBrandColorsFromPrimaryColor(brand)` helpers.
- Produces: `CELANWORKSHOP_BRAND_PRIMARY_COLOR`, `CELANWORKSHOP_BRAND_FAVICON_URL`, and `CELANWORKSHOP_BRAND_LOGO_URL`; `defaultBrandingConfig` remains the override base.

- [ ] **Step 1: Generate the mark source asset**

Use the image generation tool to create a transparent 1024px square PNG with this exact prompt:

```text
Use case: logo-brand
Asset type: SaaS developer-tool placeholder brand mark
Primary request: a single abstract capital C mark for CelanWorkshop, inspired by a calm ocean current and a workshop-built object
Style/medium: flat vector-friendly raster mark, no gradients, no shadows
Color palette: solid #0E7490 on genuine transparent background
Composition/framing: centered, generous transparent padding, legible at 16px
Text (verbatim): ""
Constraints: one symbol only; no letters other than the abstract C shape; no border; no watermark
Avoid: Appsmith orange, purple, black background, photorealism, extra symbols
```

- [ ] **Step 2: Inspect and derive runtime assets**

Inspect the PNG at 32px and 24px. Save the accepted transparent mark as `celanworkshop_logo_square.png`; create `celanworkshop_logo.png` and `public/static/img/celanworkshop-logo.png` from the same accepted mark without introducing a white background. Create a multi-size ICO at `public/static/img/celanworkshop-favicon.ico` with 16px, 32px and 48px images.

- [ ] **Step 3: Write the failing default-branding test**

Create `BrandingUtils.test.ts` with assertions that import the three default constants and verify their values:

```ts
expect(CELANWORKSHOP_BRAND_PRIMARY_COLOR).toBe("#0E7490");
expect(CELANWORKSHOP_BRAND_FAVICON_URL).toBe(
  "/static/img/celanworkshop-favicon.ico",
);
expect(CELANWORKSHOP_BRAND_LOGO_URL).toBe(
  "/static/img/celanworkshop-logo.png",
);
```

- [ ] **Step 4: Run the test to verify it fails**

Run:

```bash
cd app/client && yarn jest src/utils/BrandingUtils.test.ts --runInBand
```

Expected: FAIL because the CelanWorkshop default constants do not exist.

- [ ] **Step 5: Implement the default configuration**

In `BrandingUtils.ts`, replace the Appsmith default constants with local URLs and the exact teal color. Preserve `createBrandColorsFromPrimaryColor`; update its comparisons to use the renamed CelanWorkshop default constant so the default light background, hover and active behavior continue to work. Update `organizationReducer.ts` imports and retain `defaultBrandingConfig` field names unchanged.

- [ ] **Step 6: Run focused checks**

Run:

```bash
cd app/client && yarn jest src/utils/BrandingUtils.test.ts --runInBand
file public/static/img/celanworkshop-favicon.ico
```

Expected: Jest passes; `file` identifies an ICO file.

- [ ] **Step 7: Commit**

```bash
git add app/client/src/assets/images/celanworkshop_logo_square.png app/client/src/assets/images/celanworkshop_logo.png app/client/public/static/img/celanworkshop-favicon.ico app/client/public/static/img/celanworkshop-logo.png app/client/src/utils/BrandingUtils.ts app/client/src/utils/BrandingUtils.test.ts app/client/src/ce/reducers/organizationReducer.ts
git commit -m "feat(brand): add CelanWorkshop default assets"
```

## Task 2: Replace React Shell And Viewer Branding

**Files:**
- Modify: `app/client/src/pages/Editor/AppsmithLink.tsx:1-65`
- Modify: `app/client/src/pages/AppViewer/BrandingBadge.tsx:1-28`
- Modify: `app/client/src/pages/AppViewer/BrandingBadgeMobile.tsx:1-28`
- Modify: `app/client/src/pages/common/ErrorPageHeader.tsx:70-95`
- Test: `app/client/src/pages/Editor/AppsmithLink.test.tsx`
- Test: `app/client/src/pages/AppViewer/BrandingBadge.test.tsx`

**Interfaces:**
- Consumes: organization configuration `brandLogoUrl` and `brandFaviconUrl`; custom organization assets retain precedence.
- Produces: an accessible CelanWorkshop default mark and a non-Appsmith viewer badge.

- [ ] **Step 1: Write failing component tests**

Add tests covering the default render paths:

```tsx
expect(screen.getByRole("img", { name: "CelanWorkshop logo" })).toBeVisible();
expect(screen.getByText("CelanWorkshop")).toBeVisible();
expect(screen.queryByText("Built on")).not.toBeInTheDocument();
```

Mock the organization selector with no custom `brandFaviconUrl` or `brandLogoUrl`; add a second header test with custom URLs to assert that the custom URL remains the rendered `img.src`.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd app/client && yarn jest src/pages/Editor/AppsmithLink.test.tsx src/pages/AppViewer/BrandingBadge.test.tsx --runInBand
```

Expected: FAIL because the default image alt text is `Appsmith logo` and viewer badges render `Built on`.

- [ ] **Step 3: Implement the React entry points**

Replace asset imports with `celanworkshop_logo_square.png`. Rename local presentation symbols from `AppsmithLogo` to `CelanWorkshopMark`, set `alt="CelanWorkshop logo"`, and update the header tooltip message through the existing i18n key. Replace both viewer badges with a non-linking brand mark plus `CelanWorkshop` and a visually secondary `沧澜工坊`; remove the Appsmith external link. Use the existing organization Logo URL in `ErrorPageHeader` and change its alt text to `CelanWorkshop logo`.

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command again.

Expected: PASS, including the custom organization override assertion.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/pages/Editor/AppsmithLink.tsx app/client/src/pages/AppViewer/BrandingBadge.tsx app/client/src/pages/AppViewer/BrandingBadgeMobile.tsx app/client/src/pages/common/ErrorPageHeader.tsx app/client/src/pages/Editor/AppsmithLink.test.tsx app/client/src/pages/AppViewer/BrandingBadge.test.tsx app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts
git commit -m "feat(brand): replace shell and viewer branding"
```

## Task 3: Replace Static Documents And Email Headers

**Files:**
- Modify: `app/client/public/manifest.json`
- Modify: `app/client/public/404.html`
- Modify: `app/client/public/404.css`
- Modify: `app/client/public/privacy-policy.html`
- Modify: `app/client/public/terms-and-conditions.html`
- Modify: `app/server/appsmith-server/src/main/resources/email/ce/emailVerificationTemplate.html`
- Modify: `app/server/appsmith-server/src/main/resources/email/ce/forgotPasswordTemplate.html`
- Modify: `app/server/appsmith-server/src/main/resources/email/ce/instanceAdminInviteTemplate.html`
- Modify: `app/server/appsmith-server/src/main/resources/email/ce/inviteWorkspaceExistingUserTemplate.html`
- Modify: `app/server/appsmith-server/src/main/resources/email/ce/inviteWorkspaceNewUserTemplate.html`
- Test: static asset and template search command.

**Interfaces:**
- Consumes: local `/static/img/celanworkshop-favicon.ico` and a CSS/HTML brand header that does not require a remote image URL.
- Produces: static client documents and email headers with the CelanWorkshop brand.

- [ ] **Step 1: Write the failing static-reference check**

Run:

```bash
rg -n 'appsmith-favicon-orange|appsmith-logo-no-margin|assets\.appsmith\.com/appsmith-logo' app/client/public app/server/appsmith-server/src/main/resources/email/ce
```

Expected: output identifies the old public favicon and five remote email Logo references.

- [ ] **Step 2: Implement static branding**

Set manifest `short_name` to `CelanWorkshop`, `name` to `CelanWorkshop Web UI`, `theme_color` to `#0E7490`, and its icon to `static/img/celanworkshop-favicon.ico`. Update public HTML favicon links and the 404 title to CelanWorkshop. Replace the large inline Appsmith SVG header in `404.html` with a compact teal `C` mark and text nodes `CelanWorkshop` and `沧澜工坊`; add only the required classes to `404.css`.

- [ ] **Step 3: Implement email branding**

In each of the five email templates, replace the remote `<img>` used as the Appsmith Logo with the same inline-compatible header: a teal square containing `C`, followed by the literal text `CelanWorkshop` and a smaller `沧澜工坊`. Keep all existing table layout, token placeholders, links and message body untouched.

- [ ] **Step 4: Run the static-reference check to verify it passes**

Run the Step 1 command again.

Expected: no output and exit status `1`; then run:

```bash
rg -n 'CelanWorkshop|沧澜工坊' app/client/public/404.html app/server/appsmith-server/src/main/resources/email/ce
```

Expected: the new brand appears in the error page and each email template.

- [ ] **Step 5: Commit**

```bash
git add app/client/public/manifest.json app/client/public/404.html app/client/public/404.css app/client/public/privacy-policy.html app/client/public/terms-and-conditions.html app/server/appsmith-server/src/main/resources/email/ce
git commit -m "feat(brand): update public and email branding"
```

## Task 4: Validate Default Branding And Overrides

**Files:**
- Modify: `docs/superpowers/verification/2026-09-16-celanworkshop-placeholder-branding.md`

**Interfaces:**
- Consumes: completed default assets, React entry points, static documents and email templates.
- Produces: a reproducible record of automated and manual verification.

- [ ] **Step 1: Run formatting and focused automated verification**

Run:

```bash
cd app/client && yarn prettier --check src/utils/BrandingUtils.ts src/pages/Editor/AppsmithLink.tsx src/pages/AppViewer/BrandingBadge.tsx src/pages/AppViewer/BrandingBadgeMobile.tsx src/pages/common/ErrorPageHeader.tsx
yarn jest src/utils/BrandingUtils.test.ts src/pages/Editor/AppsmithLink.test.tsx src/pages/AppViewer/BrandingBadge.test.tsx --runInBand
```

Expected: formatting check and all added focused tests pass.

- [ ] **Step 2: Run brand-leak audit**

Run:

```bash
rg -n 'appsmith-favicon-orange|appsmith-logo-no-margin|assets\.appsmith\.com/appsmith-logo' app/client/public app/client/src/pages/Editor/AppsmithLink.tsx app/client/src/pages/AppViewer app/server/appsmith-server/src/main/resources/email/ce
```

Expected: no output and exit status `1`.

- [ ] **Step 3: Perform visual acceptance**

Start the local client and inspect the login page, editor dark shell, app-viewer desktop and mobile widths, 404 page, browser favicon, and the administrator branding preview. Confirm custom administrator Logo/favicon values override the default assets. Save screenshots under the existing verification workflow only when they materially support the record.

- [ ] **Step 4: Record results and commit**

Create the verification note with commands, outcomes, manual URLs and override result. Then run:

```bash
git add docs/superpowers/verification/2026-09-16-celanworkshop-placeholder-branding.md
git commit -m "docs(brand): record placeholder branding verification"
```
