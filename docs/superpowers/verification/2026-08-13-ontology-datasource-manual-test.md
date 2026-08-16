# Ontology Datasource Replacement Manual Test

Purpose: verify that ontology data uses the ordinary Appsmith Datasource,
Query, Action, and Widget path after the legacy Object-mode removal.

## Preconditions

- Start MongoDB and Redis.
- Start the server with `app/server/dist` as its working directory so PF4J can
  resolve the plugin directory.
- Start the client and open the development URL.
- Sign in with a user who can manage workspace Datasources.

## Cases

### M1: Import the Demo Datasource

1. Open the workspace Datasources screen.
2. Choose **Ontology datasource** and source **Demo**.
3. Enter a Datasource name and import it.
4. Confirm the Datasource appears in the ordinary Datasource list.
5. Open its configuration and confirm project, version, provider, snapshot,
   and digest metadata are present as imported values.

Expected: import succeeds without an App-specific ontology binding step.

### M2: Create a native Object Query

1. Create a Query using the imported ontology Datasource.
2. Select the Object query operation and object type `PurchaseOrder`.
3. Run the Query.
4. Confirm the result is an ordinary array in `Query.data`.
5. Add a standard Table Widget and bind its Table Data to
   `{{PurchaseOrdersQuery.data}}`.

Expected: the Table uses its normal columns, search, sort, selection, and
pagination controls. No Object Type or Object Data Widget property appears.

### M3: Metadata-driven query controls

1. In the Object Query editor, open object type, property, projection, and
   pagination controls.
2. Change the object type to `Supplier` and run the Query.
3. Change the projection and run it again.

Expected: choices come from the pinned snapshot and the Query result remains a
normal Appsmith Action result.

### M4: Function, Link, and Action Queries

1. Create and run a Function Query using a valid Function and parameters.
2. Create and run a Link Query using a valid source object and Link.
3. Create an Action Query with valid parameters, then run it.
4. Repeat the Action with an invalid object or parameter.

Expected: Function and Link results use normal Query data. Action success and
failure use the normal Query result/error contract and the Action Server
boundary; no direct client-side provider write occurs.

### M5: Shared workspace Datasource

1. Open a second App in the same workspace.
2. Select the same ontology Datasource.
3. Create a native Object Query in the second App.

Expected: both Apps use the same workspace Datasource. No application-level
ontology binding or metadata loader is required.

### M6: Version and snapshot safety

1. Import or prepare a second version of the same ontology project.
2. Attempt to activate a conflicting version in the same application scope.
3. Attempt to execute a Query with a changed snapshot digest.

Expected: the conflicting version is rejected and the digest mismatch fails
closed before runtime data access.

## Current Manual Status

Automated verification is complete and recorded in the replacement checkpoint.
The final browser pass is pending after the next deployment restart. Earlier
manual observations found that Datasource Demo import and native Table display
were the two areas requiring attention; the import plugin-ID defect has been
fixed, while repeated Table refresh must be explicitly observed and recorded.
