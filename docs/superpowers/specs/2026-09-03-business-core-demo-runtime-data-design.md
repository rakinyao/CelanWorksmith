# Business Core Demo Runtime Data Design

## Goal

Create a reproducible, synthetic runtime dataset for the `business-core-demo`
ontology release. The dataset demonstrates a Chinese-language enterprise
software and services company without accessing, exporting, or deriving from
the modelling platform's governed production data.

The release remains the semantic contract. Synthetic runtime rows are a
separate fixture and must not be embedded in the release JSON.

## Business Scenario

The Demo company provides enterprise and government software products,
implementation, and operations services. It has approximately 260 employees
and operates as a light-asset software business with limited external
procurement.

The synthetic contract-signing scale has approximately 15 percent annual
compound growth:

| Calendar year | Contract-signing scale |
| --- | --- |
| 2024 | approximately CNY 130 million |
| 2025 | approximately CNY 150 million |
| 2026 | approximately CNY 172.5 million annual target |

The fixture snapshot time is `2026-08-31T23:59:59+08:00`. No generated date
may exceed this timestamp. The 2026 rows represent only the first eight
months: signed and completed work reaches approximately CNY 110-120 million;
the remaining annual target is represented by active and draft contracts.

The current selected ontology entities do not contain revenue-recognition,
cost, or profit fields. `signed_amount` and `current_amount` therefore model
the contract-signing scale only. They must not be represented as recognized
revenue or used to calculate the stated 25 percent net-profit margin.

## Dataset Shape

The initial fixture contains the following logical assets, matching the
release runtime bindings exactly:

| Logical asset / collection | Rows | Purpose |
| --- | ---: | --- |
| `ont_supplier` | 15 | Cloud, server, network, office, and professional-service suppliers |
| `ont_customer` | 75 | Enterprise and government customers |
| `ont_contract` | 260 | Software, implementation, and operations-service contracts |
| `ont_purchase_order` | 95 | Limited cloud, service, and hardware procurement orders |

The size is intentionally sufficient for table views, filters, aggregation,
relationship traversal, pagination, and ObjectSet tests without making local
Demo startup or reset expensive.

## Presentation And Identifiers

All business-facing runtime values are Chinese: entity names, customer and
supplier names, contract names, project names, categories, state values, and
source-system labels. Examples include `执行中`, `已完成`, `云资源管理平台`, and
`软件实施服务`.

Technical identifiers remain stable ASCII values for integration and
relationship safety:

- customer codes: `CUS-YYYY-NNN`;
- supplier codes: `SUP-NNN`;
- contract numbers: `CON-YYYY-NNN`;
- purchase-order numbers: `PO-YYYY-NNN`.

`ont_contract.state` has exactly four stored values: `草稿`, `执行中`, `已完成`,
and `已取消`.

## Generation Design

A dependency-free Node generator consumes a versioned scenario configuration
and the tracked release JSON. It uses a documented, fixed pseudorandom seed,
so an unchanged configuration and release yield byte-stable output.

Generation order is:

1. Create suppliers and customers.
2. Create contracts using valid customer and supplier codes.
3. Create purchase orders using valid supplier codes and contract numbers.
4. Validate all four generated assets.
5. Write formatted JSON fixtures under `scripts/celanworksmith/runtime-data/`.

Contracts use a layered amount distribution rather than a uniform distribution:
small delivery engagements, standard implementation projects, and a small
number of major platform projects. Annual totals and counts grow from 2024 to
2026. Purchase orders are materially lower than contract totals; most represent
cloud subscriptions and supporting services, while a small minority represent
high-value server or networking hardware.

## Integrity Rules

The generator validator must reject data when any of these rules fail:

- every primary key is unique;
- all values match the normalized ontology field types;
- every `contract.customer_code` and `contract.supplier_code` exists;
- every purchase order references an existing contract and supplier;
- `current_amount = original_amount + change_amount` for non-cancelled
  contracts;
- `paid_amount + unpaid_amount = order_amount` for each purchase order;
- contract signing precedes or equals later change dates, and order creation
  precedes or equals arrival dates when an arrival exists;
- no generated timestamp is after the snapshot time; and
- only the declared Chinese state and source-system values are used.

The test suite also verifies the target entity counts, annual contract-scale
bands, relationship coverage, Chinese presentation values, and deterministic
regeneration.

## Loading Boundary

Generation and database loading remain separate steps. The generator writes
reviewable, tracked JSON. The existing MongoDB seed entry point is extended to
upsert those four files into the `celanworksmith_runtime` database under the
same collection names as the release assets: `ont_supplier`, `ont_customer`,
`ont_contract`, and `ont_purchase_order`.

The loader is idempotent and contains no business-generation logic. It must
not write a parallel ontology state, modify the ontology release, or include
connection information in the release fixture.

## Non-Goals

- Production data access, export, masking, or anonymization.
- Revenue recognition, cost accounting, or profit calculation.
- Employee, organization, position, or payroll data before those entities are
  present in a release.
- Function and Action definitions or execution semantics.
- A production data-governance integration.
