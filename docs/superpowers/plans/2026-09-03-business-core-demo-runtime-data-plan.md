# Business Core Demo Runtime Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver reproducible, Chinese-language synthetic runtime data for the
`business-core-demo` release and a separate, idempotent MongoDB loading path.

**Architecture:** A dependency-free Node module reads the tracked release and
a versioned scenario configuration, generates all four source assets with a
fixed seed, and validates entity types, relationships, dates, and amounts.
The generated JSON is tracked under `scripts/celanworksmith/runtime-data`; the
Mongo shell loader only upserts it into collections that match runtime asset
names.

**Tech Stack:** Node.js built-in modules, Node test runner, JSON, MongoDB
`mongosh`, Bash.

## Global Constraints

- Do not access, export, mask, or derive from production or modelling-platform data.
- Do not change `docs/superpowers/fixtures/ontology-model-release-demo.json`.
- Use the release as the field and runtime-asset contract; do not add a
  parallel ontology execution path or embed runtime rows in it.
- Snapshot time is `2026-08-31T23:59:59+08:00`; generated timestamps cannot
  be later.
- Generate exactly 15 suppliers, 75 customers, 260 contracts, and 95 purchase orders.
- Produce Chinese business-facing values; preserve ASCII relation identifiers:
  `CUS-YYYY-NNN`, `SUP-NNN`, `CON-YYYY-NNN`, and `PO-YYYY-NNN`.
- Store contract state only as `草稿`, `执行中`, `已完成`, or `已取消`.
- Treat `signed_amount` and `current_amount` as contract-signing scale, not
  recognized revenue, cost, or profit.
- Target contract-signing scale: about CNY 130m in 2024, CNY 150m in 2025,
  and a CNY 172.5m 2026 annual target, with CNY 110-120m signed/completed by
  the snapshot.
- Do not delete or modify the existing legacy `suppliers` and
  `purchase_orders` Demo collections in this phase.
- Keep implementation ASCII except for deliberate Chinese runtime literals.

## Files

| Path | Responsibility |
| --- | --- |
| `scripts/celanworksmith/generate-business-core-runtime-data.mjs` | Deterministic generator, release-driven field completion, validation, and CLI writer. |
| `scripts/celanworksmith/business-core-runtime-scenario.json` | Fixed seed, snapshot, counts, annual targets, and Chinese business vocabularies. |
| `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs` | Generator and dataset invariant regression tests. |
| `scripts/celanworksmith/runtime-data/ont_supplier.json` | Generated supplier fixture. |
| `scripts/celanworksmith/runtime-data/ont_customer.json` | Generated customer fixture. |
| `scripts/celanworksmith/runtime-data/ont_contract.json` | Generated contract fixture. |
| `scripts/celanworksmith/runtime-data/ont_purchase_order.json` | Generated purchase-order fixture. |
| `scripts/celanworksmith/seed-runtime-mongodb.js` | Idempotent MongoDB loader for the four new asset collections. |
| `scripts/celanworksmith/seed-runtime-mongodb.test.mjs` | Loader contract tests using an in-memory Mongo shell API double. |
| `docs/superpowers/verification/2026-09-03-business-core-demo-runtime-data.md` | Reproducible verification command and dataset counts. |

## Tasks

### Task 1: Deterministic Release-Driven Generator

**Files:**
- Create: `scripts/celanworksmith/generate-business-core-runtime-data.mjs`
- Create: `scripts/celanworksmith/business-core-runtime-scenario.json`
- Create: `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

**Interfaces:**
- `loadScenario(path): Promise<Scenario>` reads the JSON scenario.
- `generateRuntimeData({ release, scenario }): RuntimeData` returns an object
  with `ont_supplier`, `ont_customer`, `ont_contract`, and
  `ont_purchase_order` arrays.
- `validateRuntimeData({ release, scenario, data }): void` throws an error
  identifying the violated invariant.
- `writeRuntimeData({ data, outputDirectory }): Promise<void>` writes four
  stable, formatted JSON array files.

- [ ] **Step 1: Write failing tests for deterministic release-driven output**

```js
test("generates a deterministic Chinese dataset from the release", async () => {
  const release = await readJson(releasePath);
  const scenario = await loadScenario(scenarioPath);

  const first = generateRuntimeData({ release, scenario });
  const second = generateRuntimeData({ release, scenario });

  assert.deepEqual(second, first);
  assert.deepEqual(Object.fromEntries(Object.entries(first).map(([name, rows]) => [name, rows.length])), {
    ont_supplier: 15,
    ont_customer: 75,
    ont_contract: 260,
    ont_purchase_order: 95,
  });
  assert.match(first.ont_customer[0].customer_name, /[\u3400-\u9fff]/);
  assert.match(first.ont_contract[0].contract_no, /^CON-20(24|25|26)-\d{3}$/);
});
```

- [ ] **Step 2: Run the generator test to verify it fails**

Run: `node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

Expected: FAIL because `generate-business-core-runtime-data.mjs` does not
exist.

- [ ] **Step 3: Add the fixed scenario configuration**

Create JSON with these literal core values:

```json
{
  "seed": "business-core-demo-2026-08-31-v1",
  "snapshot_at": "2026-08-31T23:59:59+08:00",
  "counts": { "suppliers": 15, "customers": 75, "contracts": 260, "purchase_orders": 95 },
  "contract_targets": { "2024": 130000000, "2025": 150000000, "2026": 172500000 },
  "contract_states": ["草稿", "执行中", "已完成", "已取消"]
}
```

Include Chinese vocabulary arrays for customer types, supplier types, contract
categories, project names, source systems, provinces, and hardware/cloud/
service procurement categories. Do not include personal names, phone numbers,
addresses, credentials, or real organisation names.

- [ ] **Step 4: Implement the minimal generator**

Implement a seedable PRNG using a 32-bit string hash and `mulberry32`.
Read entity field definitions from the four `runtime_binding` targets in the
release. Generate every declared field as a top-level document property; set
`_id` equal to the entity primary-key value for MongoDB upsert compatibility.
Use field-name-specific generators for keys, names, amounts, states, dates,
source systems, relation keys, and booleans; generate deterministic nonempty
Chinese placeholder values for remaining string fields. Create entities in
supplier/customer/contract/purchase-order order.

Use exact integer fen internally and emit decimal CNY values rounded to two
places. Allocate annual contract totals using a weighted distribution and
ensure 2026 signed/completed totals are within CNY 110-120m. Do not generate
dates beyond the snapshot.

- [ ] **Step 5: Run the generator test to verify it passes**

Run: `node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

Expected: PASS with the deterministic counts and Chinese values asserted.

- [ ] **Step 6: Commit the generator foundation**

```bash
git add scripts/celanworksmith/generate-business-core-runtime-data.mjs \
  scripts/celanworksmith/business-core-runtime-scenario.json \
  scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
git commit -m "feat(ontology): generate business demo runtime data"
```

### Task 2: Dataset Integrity Validator And Checked-In Fixtures

**Files:**
- Modify: `scripts/celanworksmith/generate-business-core-runtime-data.mjs`
- Modify: `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`
- Create: `scripts/celanworksmith/runtime-data/ont_supplier.json`
- Create: `scripts/celanworksmith/runtime-data/ont_customer.json`
- Create: `scripts/celanworksmith/runtime-data/ont_contract.json`
- Create: `scripts/celanworksmith/runtime-data/ont_purchase_order.json`

**Interfaces:**
- Consumes the Task 1 functions and scenario.
- `validateRuntimeData` accepts valid generated data and rejects malformed
  relation, amount, date, type, state, or temporal data.
- CLI: `node scripts/celanworksmith/generate-business-core-runtime-data.mjs`
  writes the four fixtures to `scripts/celanworksmith/runtime-data`.

- [ ] **Step 1: Add failing invariant tests**

```js
test("rejects a contract with an unknown customer relationship", () => {
  const data = generateRuntimeData({ release, scenario });
  data.ont_contract[0].customer_code = "CUS-2024-999";
  assert.throws(() => validateRuntimeData({ release, scenario, data }), /customer_code/);
});

test("rejects a purchase order whose payment total is inconsistent", () => {
  const data = generateRuntimeData({ release, scenario });
  data.ont_purchase_order[0].unpaid_amount += 1;
  assert.throws(() => validateRuntimeData({ release, scenario, data }), /paid_amount/);
});

test("rejects a future timestamp and an English contract state", () => {
  const data = generateRuntimeData({ release, scenario });
  data.ont_contract[0].latest_change_at = "2026-09-01T00:00:00+08:00";
  assert.throws(() => validateRuntimeData({ release, scenario, data }), /snapshot/);
  data.ont_contract[0].latest_change_at = "2026-08-01T00:00:00+08:00";
  data.ont_contract[0].state = "active";
  assert.throws(() => validateRuntimeData({ release, scenario, data }), /state/);
});
```

- [ ] **Step 2: Run tests to verify the validator behavior is absent**

Run: `node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

Expected: FAIL because the initial generator does not yet reject the mutated
documents.

- [ ] **Step 3: Implement invariant validation**

Validate release-driven field presence and types, unique primary keys, all
four foreign-key relationships, contract and purchase-order amount equations,
date order, snapshot cutoff, allowed Chinese contract states, source systems,
counts, and annual target bands. Explicitly allow a null arrival date only for
unreceived orders; otherwise require `created_at <= arrived_at`.

- [ ] **Step 4: Generate and track fixtures**

Run:

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
```

Expected: four formatted files created, all tests pass, and a second generator
run produces no diff.

- [ ] **Step 5: Commit validated JSON fixtures**

```bash
git add scripts/celanworksmith/generate-business-core-runtime-data.mjs \
  scripts/celanworksmith/generate-business-core-runtime-data.test.mjs \
  scripts/celanworksmith/runtime-data/ont_supplier.json \
  scripts/celanworksmith/runtime-data/ont_customer.json \
  scripts/celanworksmith/runtime-data/ont_contract.json \
  scripts/celanworksmith/runtime-data/ont_purchase_order.json
git commit -m "feat(ontology): add business demo runtime fixtures"
```

### Task 3: Idempotent Runtime-Asset MongoDB Loader

**Files:**
- Modify: `scripts/celanworksmith/seed-runtime-mongodb.js`
- Create: `scripts/celanworksmith/seed-runtime-mongodb.test.mjs`

**Interfaces:**
- The loader invokes `seed("ont_supplier", "ont_supplier.json")`,
  `seed("ont_customer", "ont_customer.json")`, `seed("ont_contract",
  "ont_contract.json")`, and `seed("ont_purchase_order",
  "ont_purchase_order.json")`.
- It uses `replaceOne({ _id: document._id }, document, { upsert: true })` for
  every row and does not drop collections.

- [ ] **Step 1: Write a failing Mongo-shell contract test**

```js
test("upserts each release runtime asset without touching legacy collections", () => {
  const calls = executeLoaderWithFakeMongoShell();

  assert.deepEqual([...new Set(calls.map((call) => call.collection))], [
    "suppliers", "purchase_orders", "ont_supplier", "ont_customer",
    "ont_contract", "ont_purchase_order",
  ]);
  assert.ok(calls.every((call) => call.options.upsert === true));
  assert.ok(calls.every((call) => !["drop", "deleteMany"].includes(call.operation)));
});
```

`executeLoaderWithFakeMongoShell` runs the real loader source in `node:vm`
with fake `db`, `print`, `process.cwd`, and `fs.readFileSync` values. The fake
collection records `replaceOne` calls, so the test observes behavior rather
than source text.

- [ ] **Step 2: Run the loader test to verify it fails**

Run: `node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs`

Expected: FAIL because the loader has no `ont_*` calls.

- [ ] **Step 3: Extend the Mongo shell loader**

Keep existing legacy `suppliers` and `purchase_orders` upserts. Add the four
new `ont_*` collection/file pairs after them. Do not add connection settings,
drop statements, deletion calls, or data-generation code.

- [ ] **Step 4: Run focused loader and generator tests**

Run:

```bash
node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
```

Expected: PASS; fake Mongo shell records only upserts for the six expected
collections.

- [ ] **Step 5: Commit the loader**

```bash
git add scripts/celanworksmith/seed-runtime-mongodb.js \
  scripts/celanworksmith/seed-runtime-mongodb.test.mjs
git commit -m "feat(ontology): seed business runtime assets"
```

### Task 4: Reproducible Verification Record

**Files:**
- Create: `docs/superpowers/verification/2026-09-03-business-core-demo-runtime-data.md`

**Interfaces:** The record names the exact generation and verification
commands, snapshot time, scenario seed, entity counts, annual target bands,
and explicit non-goals.

- [ ] **Step 1: Write the verification record**

Include these commands:

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs
git diff --check
```

State that fixture generation and fake-loader verification do not prove a
running MongoDB service, an ontology JSON v2 importer, governed-data access,
revenue recognition, profit calculation, or Function/Action execution.

- [ ] **Step 2: Run final verification**

Run the four commands listed in Step 1, then run the existing release fixture
suite:

```bash
node --test scripts/ontologyModelReleaseValidator.test.mjs
```

Expected: all test suites pass and `git diff --check` has no output.

- [ ] **Step 3: Commit the verification record**

```bash
git add docs/superpowers/verification/2026-09-03-business-core-demo-runtime-data.md
git commit -m "docs(ontology): verify business demo runtime data"
```

## Plan Self-Review

- Task 1 implements the release-driven, fixed-seed Chinese data generator and
  scenario parameters.
- Task 2 covers every stated integrity rule, checked-in data files, dates,
  annual growth, and repeatability.
- Task 3 preserves the native MongoDB seed path while adding matching runtime
  assets without destructive operations.
- Task 4 records the exact verification procedure and all runtime/importer
  non-goals.
- The plan introduces no production access, ontology-release changes, employee
  data, Function/Action behavior, or runtime credentials.
