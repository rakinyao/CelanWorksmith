# Ontology Model Release Demo Verification

## Fixture

- Fixture: `docs/superpowers/fixtures/ontology-model-release-demo.json`
- Release: `business` / `business-core-demo` / `1.0.0`
- Compatibility: `INITIAL`
- Release digest: `sha256:42c9ff7557b21f54326ae04fa83d1589094bd109c017867e74d4e0ce3b86e4a0`

The fixture is a source-faithful, normalized subset of the modelling-team
export: `contract`, `customer`, `purchase_order`, and `supplier`. It contains
four entity sets, four entity sources, four entity-source links, four runtime
bindings, and four `VERIFIED` entity-set links. It contains no Function or
Action elements.

## Automated Verification

Run from the repository root:

```bash
node --test scripts/ontologyModelReleaseValidator.test.mjs
git diff --check
```

On 2026-09-02, the Node test command completed with 6 passing tests and 0
failures. The suite verifies canonical JSON digest calculation, required
format version, SemVer, digest mismatch rejection, duplicate identity
rejection, and acceptance of this fixture.

## Non-Goals

This record verifies the fixture and its dependency-free validator only. It
does not verify a JSON version-2 importer, governed-data access, a workspace
provider binding, Function or Action execution, or runtime sample data.
