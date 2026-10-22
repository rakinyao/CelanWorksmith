# Ontology Platform Handoff Evidence Ledger

Date: 2026-10-22
Scope: current consumer contract on branch `feat/ontology-datasource-plugin`
Source snapshot/base commit inspected: `255197a9e9c910dacac1c6212664c2f7a9a4715c`
Evidence ledger commit: `5ead8bfbd4`

## Branch and fixtures

The three supplied release fixtures are the contract inputs inspected by this ledger:

| Fixture | `release.version` | `release.release_digest` |
| --- | --- | --- |
| `docs/superpowers/fixtures/ontology-model-release-demo.json` | `1.0.0` | `sha256:42c9ff7557b21f54326ae04fa83d1589094bd109c017867e74d4e0ce3b86e4a0` |
| `docs/superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json` | `1.1.0` | `sha256:7ad2623afc768a0d78a3055788089bc2cd7e329f94bf6b50bcce10e34c1c391b` |
| `docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json` | `1.2.0` | `sha256:1780b0163940006b4e0026ff56c476f55a09e044b2aebe5164b8d1f37419131e` |

The first fixture contains the audited business release (20 parsed elements in `OntologyModelReleaseParserTest`). The function fixture adds four `function` elements. The action fixture adds one `action` element and carries the function release digest as `previous_release_digest`.

## Implemented Release envelope

Evidence: `OntologyModelRelease.java:5-17`; `OntologyModelReleaseParser.java:47-105,524-537`.

Consumed JSON paths are `/format`, `/format_version`, `/release/domain`, `/release/model_id`, `/release/version`, optional `/release/previous_release_digest`, `/release/release_digest`, `/release/change_set/compatibility`, `/release/change_set/changes`, and `/elements[]`. The parser requires `format=ontology-model`, `format_version=2`, strict SemVer for release and element versions, a nonblank domain/model ID/digest, an allowed change-set compatibility (`INITIAL`, `BACKWARD_COMPATIBLE`, or `BREAKING`), and a SHA-256 JCS digest calculated after removing `/release/release_digest`.

The implemented element model is `entity_set`, `runtime_binding`, `entity_set_link`, `function`, `action`, plus validated but non-mapped lineage elements `entity_source` and `entity_source_link` (`OntologyModelRelease.java:18-146`; parser `:27-34,113-126,416-468`). Element domain must equal release domain; element identity `(domain, kind, name)` must be unique.

## Entity sets and runtime bindings

Evidence: `OntologyModelRelease.java:35-107`; `OntologyModelReleaseParser.java:275-373,470-522`; `OntologyModelReleaseMapper.java:17-79`.

Implemented entity paths are `/elements[]/spec/display_name`, `/spec/fields[]`, `/spec/primary_key_fields[]`, with accepted but not retained entity metadata `/spec/description`, `/spec/properties`, and `/spec/source_table`. Field paths are `name`, `type`, `display_name`, optional `nullable`, `read_only`, `derived`, `enum_values`, and `reference_target`; accepted field `description` and `properties` are validation-only. Supported field types are `string`, `integer`, `decimal`, `boolean`, `date`, `timestamp`, `json`, and `reference`. Exactly one primary key is required; composite keys are rejected.

Runtime binding paths are `/spec/entity_set`, `/spec/provider_kind`, `/spec/asset_ref`, `/spec/access_mode`, `/spec/primary_key_mapping`, and `/spec/field_mappings/{field}/column`, optional `expression` and `status`. Every entity needs one binding and every entity field needs a mapping. Mapper output preserves asset reference, primary-key mapping, property mappings, nullability/read-only/derived flags, enum values, and reference target. Display text resolves `zh-CN`, then `en-US` (`OntologyModelReleaseMapper.java:148-167`).

## Links

Evidence: `OntologyModelRelease.java:108-139`; `OntologyModelReleaseParser.java:375-414,470-494`; `OntologyModelReleaseMapper.java:81-98`.

Link paths are `/spec/source_entity_set`, `/spec/destination_entity_set`, `/spec/cardinality`, `/spec/mapping_status`, and `/spec/field_mappings[]/{source_field,destination_field}`. `cardinality` must be one of `ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, or `MANY_TO_MANY`; mapping status must be `INFERRED`, `VERIFIED`, or `REJECTED`; source and destination fields must exist. The mapper accepts links only when status is `VERIFIED`. `confidence`, `entity_link_type`, and `source_fields_mapping` are accepted for compatibility/validation but are not represented in the mapped project definition.

## Functions (supported, provisional)

Evidence: `OntologyModelRelease.java:75-106`; `OntologyModelReleaseParser.java:129-177,495-500`; `OntologyModelReleaseMapper.java:99-111`; function fixture and `OntologyModelReleaseMapperTest.java:76-92`.

Supported paths are `/spec/display_name`, `/spec/owner_object_type_ids[]`, `/spec/return_type`, `/spec/side_effect_free`, `/spec/target/max_items`, and `/spec/implementation/{kind,ref,version}`. Functions must have owners, `side_effect_free=true`, positive `max_items`, and implementation `kind=DEMO_HANDLER` with strict-SemVer implementation version. Mapper carries ID/display name/return type/owners/side-effect-free/max-items/implementation metadata. Function parameters are not consumed by the release model or mapper (`FunctionDTO` receives an empty parameter list). The fixture and tests establish this as provisional demo-handler support, not a general implementation contract.

## Actions (supported, provisional)

Evidence: `OntologyModelRelease.java:108-146`; `OntologyModelReleaseParser.java:180-273,501-506`; `OntologyModelReleaseMapper.java:112-135`; action fixture and `OntologyModelReleaseMapperTest.java:94-106`.

Supported paths are `/spec/display_name`, `/spec/owner_object_type_ids[]`, `/spec/target/max_items`, `/spec/atomic`, `/spec/requires_confirmation`, `/spec/parameters[]`, and `/spec/implementation/{adapter_id,adapter_version}`. Parameters support `name`, `type`, `display_name`, `description`, `required`, `read_only`, `derived`, `enum_values`, and `reference_target`; names must be unique and types must be in the field type set. Positive target bounds, both boolean controls, and a required adapter implementation are enforced. Mapper carries owners, atomic/max-items/confirmation, parameter metadata, and adapter ID/version. Runtime plugin action execution resolves adapter configuration from the pinned snapshot (`OntologyPlugin.java:621-655`), while metadata exposes max-items/atomic/confirmation (`:464-477`).

## Rejection rules and runtime boundaries

- Unknown envelope, release, element, spec, or nested fields are rejected by `requireOnlyKeys` (`OntologyModelReleaseParser.java:539-543`). Duplicate JSON members are rejected before Jackson parsing (`:49-50`).
- Invalid format/version, blank required text, non-SemVer versions, digest mismatch, invalid change-set compatibility, duplicate element identity, unsupported kinds, and domain mismatch are rejected (`:53-105,611-635`).
- Unknown entity/link/runtime references, incomplete primary-key mappings, missing field mappings, unknown owners, invalid cardinality/status, empty link mappings, and composite primary keys are rejected (`:323-331,470-522`).
- Mapper rejects null releases, duplicate runtime bindings, missing runtime bindings/field mappings, unverified links, unsupported capabilities, unavailable localized display text, and unsupported runtime types (`OntologyModelReleaseMapper.java:17-35,40-59,83-85,148-167`).
- `OntologyProjectValidator` independently rejects blank/duplicate object, link, function, and action IDs; unknown link endpoints; missing/blank/duplicate/unknown function or action owners (`OntologyProjectValidator.java:13-77`).
- The plugin pins every structure, metadata, and query/action execution to `metadataSnapshotId` and `metadataDigest`, rejecting mismatches (`OntologyPlugin.java:532-539,732-735`). It exposes object types, properties, links, functions, and actions through metadata requests (`:266-300`) and delegates action execution to the configured adapter (`:621-655`).

## Draft-only / not consumer-supported

The source does not expose a general release importer named `OntologyReleaseJsonImporter`; `rg` found no such class or test. The current importer-equivalent test is `LocalReleaseJsonOntologyProjectImporterTest`, which exercises local Release JSON import, runtime binding resolution, snapshot persistence, and the action fixture. Lineage (`entity_source`, `entity_source_link`) is parsed and validated into `LineageElement` but is not mapped by `OntologyModelReleaseMapper`. Entity descriptions, semantic properties, source table metadata, field descriptions/properties, link confidence/entity-link-type/source-field-map compatibility fields, and function parameter definitions are not retained in the mapped project contract. Function implementation is restricted to `DEMO_HANDLER`; action execution requires a runtime adapter and pinned snapshot. These fields should remain provisional until a source-backed consumer and fixture/test coverage exist.

## Focused verification

Requested command adapted because `OntologyReleaseJsonImporterTest` is absent; the current equivalent importer test is `LocalReleaseJsonOntologyProjectImporterTest`:

```text
cd app/server
mvn -pl appsmith-server -Dtest=OntologyModelReleaseMapperTest,LocalReleaseJsonOntologyProjectImporterTest test
```

Result: exit status 1 before test execution. Maven could not resolve reactor sibling artifacts `com.appsmith:appsmith-git:1.0-SNAPSHOT`, `com.appsmith:interfaces:1.0-SNAPSHOT`, and `com.appsmith:reactiveCaching:1.0-SNAPSHOT`; test count: 0 executed. No source or fixture claims are upgraded by this failed run. The original parser/mapper-only command was also attempted and failed at the same dependency-resolution step.
