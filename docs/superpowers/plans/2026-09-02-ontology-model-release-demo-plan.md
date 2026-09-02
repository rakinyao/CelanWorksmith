# Ontology Model Release Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a self-validating `ontology-model` format-version-2 Demo Release derived from the modelling platform export, with no Function or Action capabilities.

**Architecture:** The tracked Demo Release lives under `docs/superpowers/fixtures`. A dependency-free Node validator checks canonical JSON, SHA-256 digest, release identity, and cross-element references. Node tests prove the validator rejects invalid documents and accepts the final fixture.

**Tech Stack:** JSON, Node.js built-in `node:crypto`, Node test runner, RFC 8785 JSON Canonicalization Scheme, SemVer validation.

## Global Constraints

- `ref/ontology-yisa-model.json` is user-provided reference material and remains untracked.
- The fixture uses the existing `ontology-model` format with `format_version: 2`; it does not create a second package format.
- Select the connected `supplier`, `customer`, `contract`, and `purchase_order` subgraph.
- Preserve selected names, localized text, field lineage, entity sources, relationship mappings, and source assets.
- Exclude Function/Action elements, raw code, secrets, database addresses, credentials, and runtime sample rows.
- Release identity is `business` / `business-core-demo` / `1.0.0`, with `INITIAL` compatibility and no predecessor digest.
- Convert `float` to `decimal` and `time` to `timestamp`; retain other normalized source types.
- Mark selected links `VERIFIED` and retain their source confidence values.
- The digest is SHA-256 over canonicalized document content with only `release.release_digest` removed.
- Do not modify the YAML Demo package or runtime importer.

## Files

| Path                                                                      | Responsibility                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `scripts/ontologyModelReleaseValidator.mjs`                               | Canonicalization, digest, and reference validation.   |
| `scripts/ontologyModelReleaseValidator.test.mjs`                          | Node regression tests for valid and invalid releases. |
| `docs/superpowers/fixtures/ontology-model-release-demo.json`              | Immutable JSON Demo Release.                          |
| `docs/superpowers/verification/2026-09-02-ontology-model-release-demo.md` | Fixture verification record and non-goals.            |

## Tasks

### Task 1: Release Validator

**Files:** Create `scripts/ontologyModelReleaseValidator.mjs` and `scripts/ontologyModelReleaseValidator.test.mjs`.

**Interfaces:** Export `canonicalizeRelease(value)`, `calculateReleaseDigest(release)`, and `validateRelease(release)`.

- [ ] Write tests first. Use a literal valid release with deliberately unordered keys. Assert its hand-derived canonical JSON and SHA-256 digest. Independently assert that missing `format_version`, invalid SemVer, incorrect digest, and duplicated `domain + kind + name` identities throw errors naming the failed rule.
- [ ] Run `node --test scripts/ontologyModelReleaseValidator.test.mjs`; it must fail because the validator module does not exist.
- [ ] Implement recursive canonicalization for null, booleans, strings, finite numbers, arrays, and plain objects. Sort object keys and retain array order. Use `node:crypto` SHA-256. Validate `format`, `format_version`, nonblank release identity, strict SemVer, permitted compatibility, and digest equality.
- [ ] Validate unique elements, localized entity names, primary-key field references, normalized field types, runtime-binding entity references, and link entity/field references, cardinality, and mapping status.
- [ ] Re-run the Node test and commit the two files as `test(ontology): validate model release fixtures`.

### Task 2: Source-Faithful Demo Release

**Files:** Create `docs/superpowers/fixtures/ontology-model-release-demo.json`; modify `scripts/ontologyModelReleaseValidator.test.mjs`.

**Interfaces:** The fixture is accepted by `validateRelease` and its stored digest equals `calculateReleaseDigest`.

- [ ] Add a failing fixture test. Assert entity-set names exactly equal `contract`, `customer`, `purchase_order`, and `supplier`; four runtime bindings; four entity links; every link is `VERIFIED`; compatibility is `INITIAL`; and no Function/Action element exists.
- [ ] Run `node --test scripts/ontologyModelReleaseValidator.test.mjs`; it must fail because the fixture does not exist.
- [ ] Create four `entity_set`, four `entity_source`, four `entity_source_link`, four `runtime_binding`, and four `entity_set_link` elements. Preserve all source fields and complete mappings. The links are `contract_customer`, `contract_supplier`, `purchase_order_contract`, and `purchase_order_supplier`, each `MANY_TO_ONE` with original confidence.
- [ ] Set the release timestamp to `2026-09-02T00:00:00Z`, use `previous_release_digest: null`, and compute the final stored digest after the fixture is otherwise complete.
- [ ] Re-run the complete Node suite and commit fixture/test changes as `docs(ontology): add model release demo fixture`.

### Task 3: Verification Record

**Files:** Create `docs/superpowers/verification/2026-09-02-ontology-model-release-demo.md`.

- [ ] Record the exact Node command, test count, fixture entity/link/binding counts, and release digest. State that this verifies a fixture only, not a JSON v2 importer, governed-data access, Function/Action execution, or runtime sample data.
- [ ] Run `node --test scripts/ontologyModelReleaseValidator.test.mjs` and `git diff --check`.
- [ ] Commit the note as `docs(ontology): verify model release demo`.

## Plan Self-Review

- Task 1 covers identity, digest, and references; Task 2 covers source-faithful entities, relationships, sources, and bindings; Task 3 records verification and preserves importer/runtime non-goals.
- Paths, commands, element names, release values, and types are explicit and consistent with the design.
