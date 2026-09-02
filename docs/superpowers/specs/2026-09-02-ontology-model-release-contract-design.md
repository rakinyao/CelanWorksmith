# Ontology Model Release Contract Design

## Goal

Adopt the ontology modelling platform's existing `ontology-model` JSON as
the only interchange format between modelling and CelanWorksmith. Evolve that
format into an immutable, domain-scoped release contract that CelanWorksmith
can validate, snapshot, query, and later execute through Function and Action
capabilities.

The existing YAML project package remains a development-only Demo format. It
will be removed after the JSON importer and Demo migration are complete.

## Product Boundary

The modelling platform owns the published ontology release:

- semantic object, field, relationship, and data-governance definitions;
- Function and Action interface definitions and their implementation binding;
- logical runtime data-asset bindings; and
- immutable release versioning, digesting, and compatibility metadata.

CelanWorksmith imports a published release, binds its logical assets to a
workspace's configured runtime provider, and snapshots it for application
execution. It does not edit ontology semantics, capabilities, or release
bindings.

The modelling platform may use Palantir OSDK internally, but does not connect
to Foundry. OSDK types, SDK packages, and Foundry transport details are not
part of this contract or a CelanWorksmith dependency.

## Source Comparison

The supplied `ref/ontology-yisa-model.json` is a rich semantic and
data-governance export:

- 49 `entity_set` elements and 83 `entity_set_link` elements;
- 49 `entity_source` and 49 `entity_source_link` elements;
- 973 fields with localized names/descriptions, semantic roles, source
  lineage, primary-key lists, and relationship field mappings.

The current Demo YAML package is a compact, execution-oriented package. It
adds runtime table/primary-key bindings, link cardinality, and Function/Action
metadata, but does not preserve multilingual descriptions, source lineage,
composite keys, relationship mapping confidence, or source mappings.

The JSON export is therefore the canonical source. The contract extends its
existing shape; it does not create a competing package format.

## Release Envelope

Beginning with `format_version: 2`, every export has a required top-level
`release` object:

```json
{
  "format": "ontology-model",
  "format_version": 2,
  "release": {
    "domain": "business",
    "model_id": "business-core",
    "version": "1.0.0",
    "previous_release_digest": null,
    "released_at": "2026-09-02T12:00:00Z",
    "release_digest": "sha256:<hex>",
    "change_set": {
      "compatibility": "INITIAL",
      "changes": []
    }
  },
  "elements": []
}
```

`domain` is the atomic publication boundary. One domain release contains a
full, internally consistent copy of all of its objects, relationships,
capabilities, and logical runtime bindings. Consumers never mix elements from
two releases of the same domain. Repeating an unchanged entity definition in a
new domain release is intentional and inexpensive.

`domain + model_id + version` is unique and `version` must be valid semantic
versioning (`major.minor.patch`). The producer assigns compatibility according
to the declared change set:

- `INITIAL`: the first release;
- `BACKWARD_COMPATIBLE`: additive or otherwise compatible changes; and
- `BREAKING`: removed or incompatible objects, fields, relationships,
  capabilities, or runtime mappings.

`release_digest` is the SHA-256 digest of the RFC 8785 JSON Canonicalization
Scheme representation of the complete release document after removing only
`release.release_digest`. It is the machine identity used by imports,
snapshots, executions, and audits. `previous_release_digest` links releases of
one model. A digest proves content identity, not publisher identity; signing,
certificate validation, and approval workflow are explicitly deferred.

## Existing Element Enhancements

The existing `elements` array remains the resource container. `domain + kind +
name` is unique within a release. Element `version` remains useful modelling
history but is not a runtime selection key.

`entity_set` requirements:

- `spec.display_name` and `spec.description` use localized-text objects keyed
  by BCP 47 language tags such as `zh-CN` and `en-US`; a scalar display name is
  not valid in version 2.
- `spec.primary_key_fields` is a non-empty ordered list of distinct declared
  field names. It supports composite keys.
- every field has a localized name, optional localized description, and a
  type from `string`, `integer`, `decimal`, `boolean`, `date`, `timestamp`,
  `json`, or `reference`.
- `float` is replaced with `decimal`; legacy `time` is replaced with either
  `date` or `timestamp`.
- field metadata explicitly records `nullable`, `read_only`, `derived`,
  `enum_values`, and `reference_target` when applicable. Existing
  `semantic_role` and source lineage are retained.

`entity_set_link` requirements:

- source and destination entity sets and every mapped field must exist;
- `cardinality` is one of `ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, or
  `MANY_TO_MANY`;
- `field_mappings` is an ordered mapping that supports composite keys;
- `mapping_status` is `INFERRED`, `VERIFIED`, or `REJECTED`; only
  `VERIFIED` links are executable by a production release; and
- `confidence` is retained as evidence, not as an execution decision.

## Runtime Binding

Existing `entity_source` and `entity_source_link` preserve governance lineage.
Version 2 adds a `runtime_binding` element for every executable entity set:

```json
{
  "kind": "runtime_binding",
  "domain": "business",
  "name": "supplier_runtime",
  "version": "1.0.0",
  "spec": {
    "entity_set": "supplier",
    "provider_kind": "GOVERNED_DATASET",
    "asset_ref": "${source_dataset_id}:public.ont_supplier",
    "access_mode": "READ_ONLY",
    "primary_key_mapping": { "id": "supplier_id" },
    "field_mappings": { "name": { "column": "supplier_name" } }
  }
}
```

This binding is immutable with the release. It declares a logical governed
asset and mappings, never a database host, account, password, secret, or
connection-pool setting. A CelanWorksmith workspace provider supplies the
environment-specific connectivity and authorizes `asset_ref` at import time.

## Capabilities

Future releases add `function` and `action` elements. Both are member
capabilities and must declare one or more owner entity sets. Their target is a
homogeneous, snapshot-resolved `ObjectSet<OwnerType>`, not a business
parameter. Filters and searches produce target sets outside the capability.

The interface contains target limits, JSON Schema parameter/result contracts,
and Action confirmation, idempotency, audit, effects, and atomicity metadata.
An implementation binding has an immutable `kind`, `ref`, `version`, and
digest. The initial executable kind is `DEMO_HANDLER`; `CELAN_DSL`,
`PYTHON_PACKAGE`, and `HTTP_EXECUTOR` are reserved but cannot execute in
version 2. Raw source code, Python snippets, credentials, and untrusted URLs
do not appear in a release.

This phase defines no Function or Action business cases. Its Demo release has
an empty capability set until the modelling team confirms the domain semantics
and implementation approach.

## Import and Upgrade Rules

The CelanWorksmith JSON importer must reject a release when it has an
unsupported `format_version`, missing release metadata, invalid SemVer,
incorrect digest, duplicate identities, unresolved references, invalid key or
field mappings, unsupported types, non-verified production links, or a
runtime asset unavailable to the selected workspace provider.

When the predecessor is locally known, the importer also verifies the digest
chain and that the declared change-set compatibility agrees with the semantic
diff. A first imported release is a recorded trust anchor. Datasources store a
complete immutable snapshot; an upgrade is an explicit import and selection of
a newer release, never an in-place mutation.

Unknown top-level fields and element kinds are rejected in version 2 so a
consumer cannot silently discard semantics. A future namespaced extension
mechanism requires a later format version.

## Demo Scope

The first JSON Demo is a representative connected subgraph from the supplied
model export. It preserves source entity names, localized display content,
field lineage, entity sources, and relationship mappings wherever selected.
Only the release envelope, type normalization, verified relationship metadata,
and runtime-binding elements are added.

Runtime sample data is a separate, synthetic or sanitized fixture. It may be
generated from a data structure supplied by the modelling/data-governance team
or replaced later by an authorized sanitized dump. It is not embedded in the
ontology release and never requires production data export.

## Out of Scope

- Foundry integration or a CelanWorksmith OSDK dependency;
- execution of Python, DSL, or arbitrary code from a release;
- capability business semantics before they are defined by the modelling team;
- release signing and approval workflow; and
- migration of all existing YAML Demo projects before the JSON importer is
  implemented and verified.
