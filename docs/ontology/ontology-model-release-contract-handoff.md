# Ontology Model Release Contract Handoff

**Status:** current CelanWorksmith consumer contract for `ontology-model`
Release JSON `format_version: 2` (2026-10-22).

This document is the initial producer handoff for the modelling-platform team.
It is based on the checked-in consumer, fixtures, and verification ledger in
[`ontology-platform-handoff-evidence.md`](../superpowers/verification/2026-10-22-ontology-platform-handoff-evidence.md).
The older design documents provide context; the implemented parser, mapper,
runtime, and fixtures control this contract.

## Ownership boundary

The modelling platform owns immutable semantic Releases and logical mappings:
entity sets, fields, primary-key declarations, links, capability metadata,
logical runtime asset references, release versioning, predecessor links,
compatibility declarations, and content digests.

CelanWorksmith owns runtime provider and deployment resolution, credentials,
workspace datasources, query configuration, metadata snapshots, and application
publication. A Release may name a logical `asset_ref` and mappings, but never a
host, credential, secret, provider connection, or application/workspace
selection. CelanWorksmith resolves the managed runtime for the consuming
deployment and domain, then pins the imported Release to an immutable snapshot.

## Release envelope and identity

Every Release must contain these top-level members:

```json
{
  "format": "ontology-model",
  "format_version": 2,
  "release": {},
  "elements": []
}
```

The consumed Release members are:

- `release.domain`, `release.model_id`, and strict SemVer `release.version`;
- optional `release.previous_release_digest`;
- optional `release.released_at` is accepted by the parser but ignored and not
  retained in the mapped Release model;
- nonblank `release.release_digest`;
- `release.change_set.compatibility`, one of `INITIAL`,
  `BACKWARD_COMPATIBLE`, or `BREAKING`; and
- `release.change_set.changes`.

`domain + model_id + version` identifies one published version. Every element
also has `domain`, `kind`, `name`, and strict SemVer `version`; the tuple
`domain + kind + name` must be unique within a Release, and each element domain
must equal the Release domain.

`release.release_digest` is the SHA-256 digest of the RFC 8785 JSON
Canonicalization Scheme representation of the complete Release after removing
only `/release/release_digest`. The digest is content identity for imports,
snapshots, executions, and audits. `previous_release_digest` links a new
version to its predecessor; it does not make a mutable chain. The producer must
recalculate the digest whenever any other Release byte changes.

Unknown envelope, Release, element, spec, or nested members are rejected. JSON
documents with duplicate member names are rejected before parsing.

## Supported element contract

### `entity_set`

The supported paths are:

```text
/elements[]/domain
/elements[]/name
/elements[]/version
/elements[]/spec/display_name
/elements[]/spec/fields[]/name
/elements[]/spec/fields[]/type
/elements[]/spec/fields[]/display_name
/elements[]/spec/fields[]/nullable
/elements[]/spec/fields[]/read_only
/elements[]/spec/fields[]/derived
/elements[]/spec/fields[]/enum_values
/elements[]/spec/fields[]/reference_target
/elements[]/spec/primary_key_fields[]
```

`display_name` and field `display_name` are localized label objects. The
mapper resolves `zh-CN`, then `en-US`; a usable label is required. For example,
the basic fixture labels `contract` as `{ "en-US": "合同", "zh-CN": "合同" }`
and its `id` field as `{ "en-US": "合同ID", "zh-CN": "合同ID" }`:

```json
{
  "kind": "entity_set",
  "domain": "business",
  "name": "contract",
  "version": "1.0.0",
  "spec": {
    "display_name": { "en-US": "合同", "zh-CN": "合同" },
    "fields": [
      {
        "name": "id",
        "type": "string",
        "display_name": { "en-US": "合同ID", "zh-CN": "合同ID" }
      }
    ],
    "primary_key_fields": ["id"]
  }
}
```

Supported field types are `string`, `integer`, `decimal`, `boolean`, `date`,
`timestamp`, `json`, and `reference`. The current consumer requires exactly one
primary-key field. Composite primary keys are currently rejected, even though
older design material described a composite-key shape.

`spec.description`, `spec.properties`, and `spec.source_table`, plus field
`description` and `properties`, are accepted for compatibility and validation
but are not retained in the mapped project definition. Producers must not rely
on those fields being queryable through the consumer contract.

### `runtime_binding`

Each executable entity set must have one binding. The consumed paths are:

```text
/elements[]/spec/entity_set
/elements[]/spec/provider_kind
/elements[]/spec/asset_ref
/elements[]/spec/access_mode
/elements[]/spec/primary_key_mapping
/elements[]/spec/field_mappings/{field}/column
/elements[]/spec/field_mappings/{field}/expression
/elements[]/spec/field_mappings/{field}/status
```

The basic fixture illustrates the logical form (the asset reference contains
no connection details):

```json
{
  "kind": "runtime_binding",
  "domain": "business",
  "name": "contract_runtime",
  "version": "1.0.0",
  "spec": {
    "entity_set": "contract",
    "provider_kind": "GOVERNED_DATASET",
    "asset_ref": "${source_dataset_id}:public.ont_contract",
    "access_mode": "READ_ONLY",
    "primary_key_mapping": { "id": "id" },
    "field_mappings": {
      "id": { "column": "id", "expression": null, "status": "inferred" }
    }
  }
}
```

Every entity field must have a mapping, and the primary-key mapping must be
complete. CelanWorksmith verifies the provider kind, access mode, asset
availability, and mappings in the managed deployment runtime before creating
a usable snapshot.

### `entity_set_link`

The consumed paths are:

```text
/elements[]/spec/source_entity_set
/elements[]/spec/destination_entity_set
/elements[]/spec/cardinality
/elements[]/spec/mapping_status
/elements[]/spec/field_mappings[]/source_field
/elements[]/spec/field_mappings[]/destination_field
```

`cardinality` must be `ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, or
`MANY_TO_MANY`. `mapping_status` must be `INFERRED`, `VERIFIED`, or
`REJECTED`; only `VERIFIED` links are mapped into the executable project. Both
endpoints and every mapped field must resolve. The fixture's
`contract_customer` link is a verified `MANY_TO_ONE` mapping from
`customer_code` to `customer_code`:

```json
{
  "kind": "entity_set_link",
  "domain": "business",
  "name": "contract_customer",
  "version": "1.0.0",
  "spec": {
    "source_entity_set": "contract",
    "destination_entity_set": "customer",
    "cardinality": "MANY_TO_ONE",
    "mapping_status": "VERIFIED",
    "field_mappings": [
      { "source_field": "customer_code", "destination_field": "customer_code" }
    ]
  }
}
```

`confidence`, `entity_link_type`, and `source_fields_mapping` are accepted for
compatibility and validation but are not represented in the mapped project
definition. `entity_source` and `entity_source_link` are parsed and validated
lineage elements, but are not mapped into the project.

### `function` (current provisional support)

The current consumer supports these paths:

```text
/elements[]/spec/display_name
/elements[]/spec/owner_object_type_ids[]
/elements[]/spec/return_type
/elements[]/spec/side_effect_free
/elements[]/spec/target/max_items
/elements[]/spec/implementation/kind
/elements[]/spec/implementation/ref
/elements[]/spec/implementation/version
```

Owners must be present and resolve to entity sets. `side_effect_free` must be
`true`; `target.max_items` must be positive; implementation `kind` is currently
`DEMO_HANDLER` and implementation `version` is strict SemVer. For example,
`CalculateSupplierRisk` in
[`ontology-model-release-demo-functions-1.1.0.json`](../superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json)
has owner `supplier`, return type `STRING`, `max_items: 1`, and implementation
`demo.calculate_supplier_risk` at version `1.0.0`.

Function parameters are not currently consumed by the Release model or mapper;
the mapped `FunctionDTO` receives an empty parameter list. Do not treat a
parameter definition as an initial producer-to-consumer contract.

### `action` (current provisional support)

The current consumer supports these paths:

```text
/elements[]/spec/display_name
/elements[]/spec/owner_object_type_ids[]
/elements[]/spec/target/max_items
/elements[]/spec/atomic
/elements[]/spec/requires_confirmation
/elements[]/spec/parameters[]/name
/elements[]/spec/parameters[]/type
/elements[]/spec/parameters[]/display_name
/elements[]/spec/parameters[]/description
/elements[]/spec/parameters[]/required
/elements[]/spec/parameters[]/read_only
/elements[]/spec/parameters[]/derived
/elements[]/spec/parameters[]/enum_values
/elements[]/spec/parameters[]/reference_target
/elements[]/spec/implementation/adapter_id
/elements[]/spec/implementation/adapter_version
```

Owners must resolve to entity sets. Parameter names must be unique and their
types must be in the field type set. `target.max_items` must be positive,
`atomic` and `requires_confirmation` are required booleans, and an adapter ID
and strict-SemVer adapter version are required. The action fixture's
`ApplyContractChange` owns `contract`, has `max_items: 1`, sets both controls
to `true`, and uses adapter `demo-action-server` version `1.0.0`:

```json
{
  "kind": "action",
  "domain": "business",
  "name": "ApplyContractChange",
  "version": "1.0.0",
  "spec": {
    "display_name": { "en-US": "Apply contract change", "zh-CN": "登记合同变更" },
    "owner_object_type_ids": ["contract"],
    "target": { "max_items": 1 },
    "atomic": true,
    "requires_confirmation": true,
    "implementation": { "adapter_id": "demo-action-server", "adapter_version": "1.0.0" },
    "parameters": [
      {
        "name": "changeAmount",
        "type": "decimal",
        "display_name": { "en-US": "Change amount", "zh-CN": "变更金额" },
        "description": {
          "en-US": "Signed contract change amount.",
          "zh-CN": "本次合同变更金额，可正可负。"
        },
        "required": true,
        "read_only": false,
        "derived": false,
        "enum_values": []
      },
      {
        "name": "changeReason",
        "type": "string",
        "display_name": { "en-US": "Change reason", "zh-CN": "变更说明" },
        "description": {
          "en-US": "Reason retained in the action audit record.",
          "zh-CN": "变更说明仅保存在操作审计中。"
        },
        "required": true,
        "read_only": false,
        "derived": false,
        "enum_values": []
      }
    ]
  }
}
```

The current UI authors one target. The metadata carries bounded target
semantics through `max_items`; `min_items` is not currently consumed and must
not be added as an assumed producer requirement.

Action execution stays on the native Query and Action Server adapter path. The
runtime resolves adapter configuration from the pinned snapshot; it does not
turn Release metadata into a second execution pipeline.

## Validation, snapshot pinning, and upgrades

CelanWorksmith rejects a Release for any of the following source-verified
conditions:

- invalid format/version, missing or blank identity/digest, non-SemVer version,
  digest mismatch, invalid compatibility, duplicate members, duplicate
  identities, or domain mismatch;
- unknown envelope, Release, element, spec, or nested keys;
- unsupported element kinds or field types;
- unknown entity, field, owner, or runtime references;
- missing or incomplete primary-key/field mappings, including composite primary
  keys;
- invalid link cardinality/status/mapping, or a link that is not `VERIFIED`;
- duplicate or missing runtime bindings, unavailable managed assets, or runtime
  type incompatibility; and
- invalid capability ownership, missing required implementation metadata, or
  non-positive target bounds.

The importer resolves the deployment/tenant runtime binding for the Release
domain, maps supported elements, and creates one immutable metadata snapshot.
The datasource and every structure, metadata request, and query/action
execution are pinned to the snapshot's `metadataSnapshotId` and
`metadataDigest`; mismatches are rejected. A saved datasource or published
application is never silently mutated by a newer Release. An upgrade is an
explicit import and selection of a new immutable snapshot, with the prior
snapshot retained for the existing configuration.

## Provisional future boundary

The 2026-09-16 Action Server document is a design draft, not a released
consumer requirement. Capability Release separation, service-registry
discovery, publisher signing, short-lived execution credentials, and
production Action Server protocol details remain future proposals. The current
contract permits the fixture-backed Function/Action metadata above solely for
the `DEMO_HANDLER` and local adapter path. Producers must not require an
independent Capability Release, registry endpoint, signing certificate,
`min_items`, or production Action Server protocol from the current importer.

## Producer checklist

Before handing a Release to CelanWorksmith, the modelling platform must:

1. Emit canonical JSON with `format: "ontology-model"`, `format_version: 2`,
   the complete Release envelope, and a complete internally consistent
   `elements` array.
2. Enforce strict SemVer, domain and element identity uniqueness, supported
   field types, exactly one primary-key field per entity set, resolvable owners
   and references, complete runtime mappings, and verified executable links.
3. Calculate `release.release_digest` using RFC 8785 canonical JSON after
   removing only `/release/release_digest`, then independently recalculate and
   compare the value.
4. Validate the generated shape against all three checked-in fixtures:
   [`ontology-model-release-demo.json`](../superpowers/fixtures/ontology-model-release-demo.json),
   [`ontology-model-release-demo-functions-1.1.0.json`](../superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json),
   and [`ontology-model-release-demo-actions-1.2.0.json`](../superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json).
5. Import through CelanWorksmith with the managed runtime binding and verify
   that the resulting datasource uses the native metadata snapshot/runtime
   gateway path.
6. Run consumer regression coverage for the basic, Function, and Action
   fixtures. The checked-in importer-equivalent test is
   `LocalReleaseJsonOntologyProjectImporterTest`; there is no
   `OntologyReleaseJsonImporterTest` in the current source tree.

The current evidence ledger records that the focused Maven command could not
start because reactor sibling artifacts (`appsmith-git`, `interfaces`, and
`reactiveCaching`) were unavailable. That dependency-resolution limitation does
not expand the supported contract or turn draft fields into obligations.
