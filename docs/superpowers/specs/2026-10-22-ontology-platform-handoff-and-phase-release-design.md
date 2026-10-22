# Ontology Platform Handoff And Phase Release Design

## Goal

Prepare CelanWorksmith for handoff to a separately developed ontology modelling
platform without changing its native Appsmith datasource, query, action, or
application-release paths. The handoff must make the currently consumed
ontology Release contract explicit, distinguish implemented behavior from
provisional protocol work, and identify one reproducible CelanWorksmith phase
baseline in Git.

## Scope

This work has two outputs:

1. A versioned handoff document for the modelling-platform repository team.
   It describes the `ontology-model` Release JSON consumed by
   CelanWorksmith, ownership boundaries, validation and compatibility rules,
   supported capability metadata, and the current fixtures.
2. A phase-release record for the committed state of
   `feat/ontology-datasource-plugin`, identified by an annotated Git tag and
   published to the existing `origin` repository.

The five independent experimental worktrees are excluded. Their branches and
working changes remain untouched. Uncommitted changes in the primary worktree
are likewise excluded from every commit, tag, and release record.

## Release Strategy

`feat/ontology-datasource-plugin` remains the sole long-lived development
branch. The phase baseline is an annotated tag on a verified commit of that
branch; no release branch is created. The tag name uses
`v0.1.0-ontology-integration` unless that tag is already occupied, in which
case the next unused semantically ordered prerelease tag is selected before
publication.

The release record identifies the exact commit, included source areas, manual
verification already reported by the user, focused automated verification run
for the release, and known exclusions. It is not a claim that all Appsmith
upstream tests have been run.

## Handoff Document

The handoff document is normative only where CelanWorksmith currently imports
or executes the described metadata. It has these sections:

- **Contract status and versioning:** `format: "ontology-model"`,
  `format_version: 2`, immutable `domain + model_id + version` identity,
  canonical digest calculation, predecessor digest, and declared compatibility
  classification.
- **Release data model:** `entity_set`, fields, primary keys,
  `entity_set_link`, `runtime_binding`, and the supported Function and Action
  metadata shape. It links to the checked-in JSON fixtures as executable
  examples instead of duplicating them.
- **Ownership boundary:** the modelling platform owns semantic definitions,
  logical asset references, versions, and digests. CelanWorksmith owns
  deployment/tenant runtime resolution, provider implementations, credentials,
  workspace datasource records, application query configuration, and native
  release packaging.
- **Consumer behavior:** Release JSON becomes an immutable metadata snapshot
  consumed through the existing Appsmith datasource/plugin and runtime-gateway
  path. No widget-local ontology state or separate execution pipeline exists.
- **Capability semantics:** Functions are read-only; Actions use the native
  query path and Action Server adapter. Capability ownership is homogeneous by
  object type. Target cardinality follows `minItems`/`maxItems`; the current
  editor authors a single target while metadata remains forward-compatible
  with object sets.
- **Validation and compatibility:** consumer-side rejection conditions,
  snapshot pinning, upgrade behavior, and the required producer/consumer test
  fixtures.
- **Provisional boundary:** the standalone Capability Release, registry
  discovery, and production Action Server protocol from the 2026-09-16 draft
  are clearly labelled as proposed future work, not requirements for the new
  modelling platform's initial integration.
- **Migration checklist:** a concrete producer checklist and compatibility
  test sequence for the modelling platform team.

The document will state the difference between the original first Release
importer limitation (which deferred capabilities) and the current committed
plugin behavior (which consumes the checked-in Function/Action demo metadata).
This prevents the new platform from treating an older design note as the final
contract.

## Validation And Publication

Before tagging, the release process will:

1. Confirm the target commit, branch, tag availability, and that the staged
   change list contains only new handoff/release documentation.
2. Run focused server/plugin contract tests covering Release parsing,
   datasource snapshot import, Function/Action metadata validation, and
   application release pin extraction. Any failure stops publication.
3. Commit the documentation without staging the user's unrelated worktree
   changes.
4. Create the annotated tag at that documentation commit, push the long-lived
   branch and tag to `origin`, and record the resulting commit and tag in the
   handoff document or release note.

No force push, history rewrite, worktree cleanup, or automatic merge of the
experimental branches is permitted.

## Non-Goals

- Building the separate ontology modelling platform.
- Adding network import, publisher signing, registry discovery, or a new
  Capability Release format.
- Changing the current Appsmith publication model or creating a parallel
  ontology runtime path.
- Reworking the discarded experimental worktree changes.
