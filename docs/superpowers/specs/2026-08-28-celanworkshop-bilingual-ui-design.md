# CelanWorkshop Bilingual UI Design

## Goal

Provide a bilingual user interface for the CelanWorkshop product: Simplified
Chinese is the default language and English remains selectable. The work
covers the core Appsmith user interface and CelanWorksmith-owned user
interfaces, while preserving Appsmith's internal contracts and excluding
unrelated plugins and documentation.

## Product and Scope Decisions

- The product brand is `CelanWorkshop` in English and `沧澜工坊` in Simplified
  Chinese. Brand text follows the active UI locale.
- The default locale for new or otherwise unconfigured UI sessions is
  `zh-CN`. An explicit authenticated-user preference or stored language choice
  overrides that default. English remains `en-US`.
- In scope: core platform navigation, authentication, workspace and
  application surfaces, editor chrome, shared query/action response UI, and
  CelanWorksmith Ontology, Release, Query Builder, and Action-related UI.
- Other datasource/plugin-specific configuration forms are out of scope. They
  may remain English; shared core chrome around them follows the active locale.
- Visual rebranding is deferred. Existing logos, favicons, PWA icons, login
  artwork, and other bitmap/SVG assets remain unchanged until a separate
  visual-identity design is approved.
- Privacy policy, deployment documentation, help manuals, external
  documentation links, README content, and other non-core UI resources are
  out of scope.
- Internal Appsmith identifiers remain unchanged, including Java/TypeScript
  package names, `appsmith.*` data bindings, protocol headers, API paths,
  environment variables, database fields, Docker paths, and upstream package
  names. This is a display-language and product-brand change, not a fork-wide
  internal rename.

## Locale Behavior

The client continues to use the existing `react-i18next` architecture and
`en-US`/`zh-CN` resource model.

1. Resolve the active locale in this order: authenticated user preference,
   previously stored explicit preference, then the default `zh-CN`.
2. Normalize any Chinese browser/user locale variant to `zh-CN`.
3. Keep `en-US` as fallback only for missing keys or unknown locale input; do
   not use browser language as an implicit default that overrides the product
   default.
4. Update `document.documentElement.lang`, user locale persistence, and the
   visible language switcher when the locale changes.
5. Locale changes rerender client-owned text without mutating saved Query
   definitions, datasource configuration, app data, or ontology metadata.

## Translation Model

All new user-visible client copy must use semantic keys in the existing i18n
resources. Translation keys are organized by ownership rather than individual
screens:

```text
brand.*
core.*
auth.*
navigation.*
editor.*
queryResponse.*
ontologyDatasource.*
ontologyQuery.*
release.*
```

Existing English literals are migrated incrementally, beginning with the
defined core screen matrix. Translation code must not translate ontology
object type names, Function/Action display names, IDs, parameter IDs,
operation values, or authored project metadata. Those values are business
data, not product UI copy.

Translation-key parity is enforced: every `en-US` leaf must have a matching
`zh-CN` leaf, with no unaccounted extra leaves. Missing-key fallback is logged
in development/test environments so coverage gaps are visible before release.

## Brand Text

Brand names are resolved through locale keys rather than globally replacing
the string `Appsmith`:

```text
en-US: CelanWorkshop
zh-CN: 沧澜工坊
```

The initial brand-text migration covers page titles, PWA manifest text,
authentication and account copy, navigation, empty states, onboarding text
inside the defined core UI matrix, and CelanWorksmith interface copy. Existing
visual assets are deliberately not changed in this phase.

References that describe the upstream project, legal entities, external
Appsmith services, package identifiers, or technical compatibility remain
unchanged unless the corresponding user-facing core UI is explicitly in scope.

## Plugin and Dynamic Form UI

CelanWorksmith plugin manifests use static JSON and therefore cannot directly
call React i18n. The platform needs one generic, locale-aware plugin-form
label resolution contract based on stable manifest control identifiers. It
must resolve display-only `label`, `placeholderText`, `info`, option labels,
and section names without changing `configProperty`, plugin package names,
operation values, or persisted form data.

For dynamic capability metadata, the form-renderer contract must allow
selected Function/Action metadata to produce a translated display-only target
acceptance message next to the target input. It must not write that message to
the Query definition or make a static manifest hint claim that is false for a
different selected capability.

This generic mechanism is implemented for the CelanWorksmith Ontology plugin
in this program. It is reusable by other plugins but does not require their
forms to be translated now.

## Error and Response UI

Server protocols, exception codes, IDs, and persisted audit/release messages
remain stable and primarily English/technical. The client maps known
CelanWorksmith error codes and release diagnostic codes to locale-specific UI
templates, including interpolated safe details such as object type, ID, and
limits. Unknown errors render a localized generic prefix and retain a
technical detail view.

The shared query/action response chrome, including response status, elapsed
time, size, and default execution errors, is translated because it is part of
the core user interface used by CelanWorksmith Queries and Actions.

## Delivery Phases

### Phase 1: Locale and Brand Foundation

Set Chinese as the explicit default, retain user choice and English fallback,
add brand keys, and migrate in-scope brand text. Add parity checks and tests
for first load, stored preference, authenticated preference, locale switching,
reload, and `zh-*` normalization.

### Phase 2: Core Platform UI

Translate the agreed core platform screen matrix: authentication, navigation,
workspace/application management, editor/query chrome, common dialogs,
notifications, and shared query/action response UI. Replace literals with
semantic keys and use visual regression checks for Chinese text expansion.

### Phase 3: CelanWorksmith Plugin UI

Translate datasource import, Release, Ontology Query Builder/Advanced,
Function/Action configuration, capability target acceptance, and known
client-visible errors. Add the generic locale-aware manifest/control label
contract required by the Ontology plugin.

### Phase 4: Error Catalog and Acceptance Matrix

Map stable known error/diagnostic codes to both locales. Exercise the core and
Ontology flows under Chinese and English using automated browser tests,
including sign-up/sign-in, datasource import, Object Query, Function Query,
Action Query, Builder/Advanced switching, release operations, and response
failures.

## Acceptance Criteria

1. A fresh session defaults to `zh-CN`; English can be selected and persists
   according to the existing user/session behavior.
2. Every approved core-platform and CelanWorksmith screen in the acceptance
   matrix has no unintended English UI chrome under `zh-CN`, and corresponding
   English text under `en-US`.
3. Brand text is `沧澜工坊` under Chinese and `CelanWorkshop` under English;
   visual assets are unchanged.
4. Other plugin-specific forms are not translated, but shared core controls
   around them honor the selected locale.
5. Plugin form label localization does not alter manifest identifiers,
   `configProperty`, Query JSON, operation values, datasource configuration,
   or ontology metadata.
6. Known CelanWorksmith errors are localized client-side by stable code; audit,
   API, and database contracts remain unchanged.
7. Translation-key parity and targeted Chinese/English unit, integration, and
   browser tests pass. Screenshots verify no clipping, overlap, or unreadable
   Chinese text at desktop and mobile viewports.

## Explicit Non-Goals

- Replacing logos, favicons, PWA icons, or other visual assets.
- Translating privacy/legal pages, deployment content, manuals, README files,
  external documentation, or external service sites.
- Translating other plugins' specialized configuration forms.
- Renaming Appsmith internal implementation or compatibility identifiers.
- Localizing persisted audit messages, raw protocol error strings, or arbitrary
  ontology-authored business metadata.
