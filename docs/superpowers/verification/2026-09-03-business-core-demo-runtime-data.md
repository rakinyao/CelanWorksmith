# Business Core Demo Runtime Data Verification

## Scope

This record verifies the release-driven, deterministic Chinese runtime fixtures
for the business-core Demo scenario.

- Snapshot cutoff: `2026-08-31T23:59:59+08:00`
- Scenario seed: `business-core-demo-2026-08-31-v1`
- Entity counts: `ont_supplier` 15, `ont_customer` 75, `ont_contract` 260,
  `ont_purchase_order` 95

## Annual Targets

The 2024 and 2025 annual signing totals use a 10% tolerance band. The 2026
total is exact to one cent, and its completed/executing subtotal must remain in
the CNY 110m-120m band.

| Year | Target | Accepted band | Generated total | 2026 active subtotal |
| --- | ---: | ---: | ---: | ---: |
| 2024 | CNY 130,000,000 | CNY 117,000,000-143,000,000 | CNY 130,402,245.00 | n/a |
| 2025 | CNY 150,000,000 | CNY 135,000,000-165,000,000 | CNY 148,280,060.72 | n/a |
| 2026 | CNY 172,500,000 | CNY 172,500,000.00 +/- CNY 0.01 | CNY 172,500,000.00 | CNY 115,000,000.01 |

## Commands And Evidence

The final verification was run from the repository root on 2026-09-03.

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
```

Result: exit 0; no output. The four fixture files were generated from the
fixed scenario and release snapshot.

```bash
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
```

Result: exit 0; 6 tests passed, 0 failed.

```bash
node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs
```

Result: exit 0; 1 test passed, 0 failed. The fake MongoDB shell verification
confirmed release runtime assets are upserted without touching legacy
collections.

```bash
git diff --check
```

Result: exit 0; no output.

The generated fixture counts and SHA-256 digests are:

| Fixture | Rows | SHA-256 |
| --- | ---: | --- |
| `ont_supplier.json` | 15 | `0ce23c7f42e985608774847dd70c8096c0c065f62cf083f36a47af7ab0e3aa84` |
| `ont_customer.json` | 75 | `e7ed3600bd1d5c8c967388d42f807f5a4ee8dfef549b944c966159231f25bbd9` |
| `ont_contract.json` | 260 | `f96e75f2b4115d89e5388548eb9c02949b5c5c5ae8d549ea34ef4c4988b68e8e` |
| `ont_purchase_order.json` | 95 | `4bc4e1caa7a2c6245153c2c41d321b3fbfa2bf5ffeb517adaccf1b051d27d81c` |

```bash
node --test scripts/ontologyModelReleaseValidator.test.mjs
```

Result: exit 0; 6 tests passed, 0 failed. The source-faithful business Demo
release fixture was accepted.

## Explicit Non-goals

Fixture generation and fake-loader verification do not prove a running
MongoDB service, an ontology JSON v2 importer, governed-data access, revenue
recognition, profit calculation, or Function/Action execution.
