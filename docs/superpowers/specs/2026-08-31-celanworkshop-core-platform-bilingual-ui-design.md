# CelanWorkshop Core Platform Bilingual UI Design

## Goal

Complete bilingual support for the operational core of CelanWorkshop. Simplified
Chinese remains the default and English remains selectable. This phase covers
the workspace-to-editor workflow so an operator can create, open, edit, run,
and publish an application without unintended English product chrome.

## Scope

The phase contains three independently verifiable delivery groups:

1. Workspace and application management: workspace selection and actions,
   application listing, search, creation, templates, card menus, sharing,
   deletion, and related empty/loading states.
2. Editor and execution chrome: entity explorer, widgets, datasources,
   queries, common editor actions, property-panel common actions, save/run/
   publish controls, and the query/action response chrome shared by core UI.
3. Cross-surface UI: account/profile navigation, global search, confirmation
   dialogs, standard validation errors, and product notifications/toasts used
   by the first two groups.

The following remain excluded: help, manuals, privacy/legal content, external
documentation and Appsmith links, visual assets, source/package/protocol
identifiers, other plugins' specialized forms, ontology-authored business
metadata, and persisted server/audit error messages.

## Translation Architecture

The existing `react-i18next` resources remain the only display-language
mechanism. Add semantic resource groups by UI ownership:

```text
common.*
workspace.*
application.*
editor.*
dialog.*
toast.*
search.*
profile.*
```

`messages.ts` compatibility exports remain callable under their existing
names. Their user-visible values resolve i18n keys instead of literal English.
New React surfaces call `useTranslation()` at component boundaries. Shared
utilities and reducers receive translated text from their callers; they do not
own a second locale state.

No translation key, locale switch, or rendering update may change saved
application data, query definitions, datasource configuration, object type
names, Function/Action IDs, operation values, API paths, or `appsmith.*`
bindings.

## Delivery Design

### Group A: Workspace and Applications

Migrate action labels and visible menu/card/dialog text in the Applications
and workspace surfaces. The principal route is: choose workspace, create or
search an application, open its menu, and invoke share/delete/import/template
actions. Existing test IDs, route paths, permission checks, and callbacks are
preserved. English and Chinese assertions use visible text and roles, not
translated implementation constants.

### Group B: Editor and Execution

Migrate the common editor chrome rather than widget-specific property labels:
the entity explorer, widget/datasource/query entry points, save/run/publish
commands, common editor empty states, and shared response status/errors.
Plugin-specific configuration forms remain outside this group. Query and
datasource operations retain their native Appsmith pipeline; localization is
display-only at the existing React or message boundary.

### Group C: Cross-Surface UI

Migrate reusable confirmation dialogs, generic validation and error messages,
global search chrome, account/profile actions, and notifications that are
reachable from Groups A and B. Do not translate arbitrary server response
strings. Known client-owned messages receive resource keys; unknown technical
details remain inspectable.

## Testing and Acceptance

Each delivery group adds unit or component tests that assert both `zh-CN` and
`en-US` values and extends resource-key parity coverage. Browser acceptance
uses the locally installed Google Chrome executable when the pinned Playwright
Chromium bundle is unavailable. Tests isolate locale storage, verify the
default Chinese route, switch to English, reload, and switch back to Chinese.

The browser matrix covers desktop `1440x900` and mobile `390x844` for each
group's principal workflow. Screenshots are checked for clipped or overlapping
Chinese text. Credential-dependent Ontology and Release flows remain in their
existing suites and are not made prerequisites for this core-platform phase.

## Acceptance Criteria

1. Under `zh-CN`, the approved workspace/application, editor/execution, and
   cross-surface matrices have no unintended English operational chrome.
2. Under `en-US`, the same client-owned labels render in English and the
   selection persists after reload.
3. Existing routes, test IDs, permission behavior, native query/action
   execution, persisted data, and internal compatibility identifiers are
   unchanged.
4. Resource leaf-key parity, focused component tests, and the browser matrix
   pass using a browser that serves the branch under test.
5. Help, documents, legal content, external links, assets, and unrelated
   plugin-specific forms remain unchanged.
