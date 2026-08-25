# Demo Action Server Native Query Verification

## Scope And Status

This checkpoint preserves the native Appsmith Ontology Query pipeline. It
adds no Action Widget, alternate Widget state, browser side-channel, or direct
Mongo client to the plugin. `ACTION_QUERY` returns the Action Server v1 body as
the normal `ActionExecutionResult` body and appends `auditId`.

Positive `UpdateProductionSchedule` mutation/manual business-loop acceptance
is deferred to a separate complete-data/business-flow phase. The tracked Demo
seed intentionally has no `productionOrderId` on its PurchaseOrders and no
`production_orders` fixtures. Therefore, a valid Action against current seed
records is expected to report `RELATED_OBJECT_NOT_FOUND` with an audit ID and
leave business data unchanged.

## Automated Evidence

The plugin regression test uses the existing `RecordingActionServer` with a
v1-shaped successful response:

- `status`: `SUCCEEDED`
- `message`: `Production schedule updated.`
- `changedObjects`: `[{ objectTypeId: ProductionOrder, objectId: PR001 }]`
- `auditId`: `audit-123`

It asserts that the native Query execution succeeds and retains the v1 fields
plus `auditId`. The existing domain-failure and missing-audit-ID tests remain
in the same suite. A temporary mutation that discarded map fields made the
new assertion fail with expected `SUCCEEDED` but actual `null`; restoring the
field-preserving implementation returned the suite to green.

The handler suite separately covers the positive, complete-data contract with
in-memory Mongo interactions: `UpdateProductionSchedule` reports a
`ProductionOrder` changed-object summary and changes `scheduleDate` and
`status`. The `MongoRuntimeDataProviderTest` separately verifies that
`CalculateDelayDays` returns the scalar stored as `PurchaseOrder.properties.delayDays`.

## Post-Integration Service Operation

Do not deploy or restart the currently running main-worktree services from
this isolated feature branch. After integration, follow the migration guide to
install `cw-demo-action-server.service`, configure the local workspace endpoint
to `http://127.0.0.1:8092`, and only then add the host-local `cw-backend`
dependency override.

Run the deployment and health checks serially:

```bash
systemctl --user daemon-reload
systemctl --user enable --now cw-demo-action-server
systemctl --user restart cw-backend
systemctl --user status cw-demo-action-server cw-backend --no-pager
curl -fsS http://127.0.0.1:8092/actuator/health
curl -fsS http://127.0.0.1:8081/api/v1/health
```

Without a configured workspace endpoint, verify that an Ontology
`ACTION_QUERY` returns "Ontology Action Server is not configured" rather than
using a fallback server.

## Native Query Manual Acceptance

Post-integration, create or update an existing Ontology Query with operation
`ACTION_QUERY`, action ID `UpdateProductionSchedule`, object type
`PurchaseOrder`, a seeded object ID such as `PO001`, and
`parameters.newScheduleDate` set to `2026-09-01`. Trigger it from an existing
Button, Table row event, or Form submit with `{{ActionQuery.run()}}`.

For the current seed, this is the expected negative result:

1. The normal Query loading and error/result state carries the Action Server
   domain failure with an `auditId` and code `RELATED_OBJECT_NOT_FOUND`.
2. The request has a valid date and target; the failure is caused by the
   intentionally missing related ProductionOrder, not validation.
3. Confirm that no PurchaseOrder or ProductionOrder business record changed.
   The terminal audit record is expected to be stored and is not a business
   mutation.

Use Mongo to record the pre- and post-request business-data state:

```bash
docker exec appsmith-mongodb mongosh --quiet 'mongodb://127.0.0.1:27017/celanworksmith_runtime' --eval \
  'db.purchase_orders.findOne({_id:"PO001"}, {_id:1, properties:1})'
docker exec appsmith-mongodb mongosh --quiet 'mongodb://127.0.0.1:27017/celanworksmith_runtime' --eval \
  'db.production_orders.findOne({_id:"PR001"}, {_id:1, properties:1})'
```

Submit a missing/blank `newScheduleDate` and an absent PurchaseOrder target in
the same native Query. Both are expected to be normal Query domain failures
with audit IDs where the Action Server accepted the request, and neither may
change business data.

Create a native `FUNCTION_QUERY` for `CalculateDelayDays` using `poId: PO005`.
Its scalar result must equal the Mongo value `8` at
`purchase_orders._id = "PO005"`, `properties.delayDays`.

For the idempotency protocol check, use the service test/client with the same
complete-data request and identical idempotency key. Verify one mutation and
the stored terminal result on replay. While a key remains running, the client
must receive `ACTION_IN_PROGRESS`. This is automated service-level coverage in
the current phase; it is not a substitute for the deferred complete-data
browser business loop.
