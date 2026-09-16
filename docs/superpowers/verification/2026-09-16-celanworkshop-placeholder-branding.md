# Task 4 Report: Validate Default Branding And Overrides

Date: 2026-09-16
Status: complete with documented visual-environment limitation

## Automated Verification

### Focused formatting

The command specified by the task brief was run exactly:

```bash
cd app/client && yarn prettier --check src/utils/BrandingUtils.ts src/pages/Editor/AppsmithLink.tsx src/pages/AppViewer/BrandingBadge.tsx src/pages/AppViewer/BrandingBadgeMobile.tsx src/pages/common/ErrorPageHeader.tsx
```

Result: exit status `1`. The repository `prettier` Yarn script expands to `prettier --check ./src && prettier --check ./cypress`, so it checked the whole client tree. It reported four unrelated pre-existing files:

```text
[warn] src/components/formControls/FieldArrayControl.tsx
[warn] src/components/formControls/PaginationControl.tsx
[warn] src/pages/UserAuth/FooterLinks.test.tsx
[warn] src/utils/WidgetQueryGeneratorRegistry.test.ts
[warn] Code style issues found in 4 files. Run Prettier to fix.
```

The requested files were checked directly to isolate this task's result:

```bash
cd app/client && ./node_modules/.bin/prettier --check src/utils/BrandingUtils.ts src/pages/Editor/AppsmithLink.tsx src/pages/AppViewer/BrandingBadge.tsx src/pages/AppViewer/BrandingBadgeMobile.tsx src/pages/common/ErrorPageHeader.tsx
```

Result: exit status `0`; `All matched files use Prettier code style!`

### Focused Jest tests

```bash
cd app/client && yarn jest src/utils/BrandingUtils.test.ts src/pages/Editor/AppsmithLink.test.tsx src/pages/AppViewer/BrandingBadge.test.tsx --runInBand
```

Result: exit status `0`; 3 suites passed, 8 tests passed. Jest emitted an existing React ref warning from the Appsmith ADS tooltip wrapper; it did not fail a test.

### Expanded old-brand audit

The audit includes the planned remote-logo references plus the missed favicon and Cloudinary baseline forms:

```bash
rg -n 'favicon-orange|cloudinary.*favicon|appsmith-logo-no-margin|assets\.appsmith\.com/appsmith-logo' app/client/public app/client/src/pages/Editor/AppsmithLink.tsx app/client/src/pages/AppViewer app/server/appsmith-server/src/main/resources/email/ce
```

Result: no output; `rg_exit=1`. This literal audit found no old favicon, Cloudinary favicon, old logo asset, or remote Appsmith logo text in the searched files. It cannot detect the intentional compatibility fallback in `AppsmithLink.tsx:12-15`, where the legacy `https://assets.appsmith.com/appsmith-favicon-orange.ico` value is assembled from split string segments. That fallback is only for recognizing an existing organization setting; the user-visible default still resolves to the local CelanWorkshop asset.

### Asset and static checks

```bash
file app/client/src/assets/images/celanworkshop_logo_square.png app/client/src/assets/images/celanworkshop_logo.png app/client/src/assets/svg/celanworkshop-mark.svg app/client/public/static/img/celanworkshop-favicon.ico app/client/public/static/img/celanworkshop-logo.png
```

Result: the two source PNGs and public logo are `1024 x 1024`, 8-bit RGBA PNGs; the source is ASCII SVG; the favicon is a Windows ICO containing three PNG-backed icons (16x16, 32x32, and 48x48).

The manifest and public favicon assertions were run with this exact command:

```bash
cd app/client && node - <<'NODE'
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
if (m.short_name !== 'CelanWorkshop' || m.name !== 'CelanWorkshop Web UI' || m.theme_color !== '#0E7490' || m.icons?.[0]?.src !== 'static/img/celanworkshop-favicon.ico') process.exit(1);
for (const file of ['public/404.html', 'public/privacy-policy.html', 'public/terms-and-conditions.html']) {
  if (!fs.readFileSync(file, 'utf8').includes('celanworkshop-favicon.ico')) throw new Error(`${file}: missing favicon`);
}
console.log('manifest and public favicon assertions: PASS');
NODE
```

Result: exit status `0`.

```text
manifest and public favicon assertions: PASS
```

The CE email brand/table assertions were run with this exact command:

```bash
cd app/client && node - <<'NODE'
const fs = require('fs');
const path = require('path');
const dir = '../server/appsmith-server/src/main/resources/email/ce';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
for (const name of files) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  if (!text.includes('CelanWorkshop') || !text.includes('沧澜工坊')) throw new Error(`${name}: missing brand text`);
  const open = (text.match(/<table\b/gi) || []).length;
  const close = (text.match(/<\/table>/gi) || []).length;
  if (open !== close) throw new Error(`${name}: table tags ${open}/${close}`);
}
console.log(`email brand/table assertions: PASS (${files.length} templates)`);
NODE
```

Result: exit status `0`; all five CE email templates contain both `CelanWorkshop` and `沧澜工坊`, and their table tags are balanced.

```text
email brand/table assertions: PASS (5 templates)
```

The scoped whitespace check was run with:

```bash
git diff --check HEAD -- app/client/src/utils/BrandingUtils.ts app/client/src/pages/Editor/AppsmithLink.tsx app/client/src/pages/AppViewer/BrandingBadge.tsx app/client/src/pages/AppViewer/BrandingBadgeMobile.tsx app/client/src/pages/common/ErrorPageHeader.tsx app/client/public app/server/appsmith-server/src/main/resources/email/ce
```

Result: exit status `0` (no output).

### Override validation

`AppsmithLink.test.tsx` passed default rendering, a custom organization `brandFaviconUrl`, and the legacy Appsmith favicon fallback. `ErrorPageHeader.tsx` directly selects `organizationConfig?.brandLogoUrl || "/static/img/celanworkshop-logo.png"`, then resolves that selected URL through `getAssetUrl`; this preserves a custom administrator Logo URL ahead of the default. The default constants test passed for the local favicon, local logo, and `#0E7490` primary color.

## Manual Visual Acceptance

An existing local client service was available on port `3000`; no additional service was started. URLs checked:

- `http://127.0.0.1:3000/`: HTTP 200, favicon request returned HTTP 200 (`image/x-icon`, 1782 bytes), but the runtime body remained empty and the static fallback title was `Appsmith` because the application/backend did not initialize.
- `http://127.0.0.1:3000/404.html`: HTTP 200, title `CelanWorkshop`, visible `C`, `CelanWorkshop`, and `沧澜工坊` header text, and local favicon link.

Because the root application did not initialize, login, editor dark shell, app-viewer desktop/mobile layouts, and the authenticated administrator branding preview could not be visually inspected in this environment. No screenshots were saved. Automated tests and source assertions provide the available default/override evidence; a browser session with a functioning backend remains the follow-up for pixel-level acceptance of those routes.

## Concerns

- The prescribed Yarn formatting command is repository-wide despite the file arguments and fails on four unrelated files; the direct targeted Prettier check is clean.
- The live root title/body limitation is environmental and does not alter product code or the committed branding implementation.
- Pre-existing untracked paths (`.superpowers/brainstorm/`, `.superpowers/chinese-localization-feasibility-report.md`, and `ref/`) were left untouched.

## Review Follow-up

The review follow-up clarified the split-string legacy favicon compatibility path and replaced summary-only assertion claims with their exact reproducible commands and exit statuses. No product code was changed.
