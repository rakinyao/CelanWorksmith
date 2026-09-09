# Capability Widget Target Binding Design

## Scope

This provisional design improves the target-object input used by native
Ontology Function and Action Queries. It preserves the existing native
Appsmith datasource/query/action pipeline and the server-side
`OntologyObjectSet<T>` execution contract.

The first delivery supports Table, Select, and MultiSelect Widgets plus a
manual expression or literal-ID escape hatch. Other Widgets can be added by
registering an adapter without changing the capability runtime contract.

## Decisions

- Functions and Actions receive a homogeneous, snapshot-resolved
  `OntologyObjectSet<T>`. An object identifier is a client-side reference used
  to resolve that set; it is never a business parameter.
- `maxItems` is a target-cardinality upper bound. It is not a target-source
  selector and a Function that accepts many objects may still receive one.
- Widgets retain their native public state. This work does not add
  `selectedObject`, an ontology-specific Widget execution path, or client-side
  object authority.
- The query editor owns the target binding. A Widget instance does not have a
  permanently assigned ontology object type.
- The server remains the authoritative validator of type, object existence,
  target count, and pinned Release/runtime context.

## Target Binding Contract

The canonical target continues to normalize to the current runtime inputs:

```json
{
  "source": "SINGLE_OBJECT",
  "objectId": "CUST-001"
}
```

The Builder adds editor-only source information before evaluation:

```json
{
  "source": "WIDGET_SELECTION",
  "widgetId": "stable-widget-instance-id",
  "objectIdExpression": "{{SelectCustomer.selectedOptionValue}}"
}
```

For a many-target source, `objectIdsExpression` replaces `objectIdExpression`
and must evaluate to an array of strings. `widgetId` is an editor aid: it
enables durable picker selection, source revalidation, and clear diagnostics.
It is not a business input and is not trusted by the server. The expression is
the value evaluated by Appsmith; after evaluation, the plugin normalizes the
result into an `OntologyObjectSet<T>`.

Manual mode stores an explicit expression or literal ID and no `widgetId`.
It is intentionally allowed even when the editor cannot infer provenance.

## Widget Adapter Registry

The client has a small declarative registry indexed by Widget type. An adapter
describes how a Widget's native selection state becomes one or many canonical
object IDs; it does not define a concrete ontology object type.

| Widget | Single target | Many target |
| --- | --- | --- |
| Table | `selectedRow.<canonicalObjectId>` | `selectedRows.map(row => row.<canonicalObjectId>)` |
| Select | `selectedOptionValue` | Not supported |
| MultiSelect | Not supported | `selectedOptionValues` |

For an ontology-generated Table Object Query, the canonical ID must remain in
the row data even when the Table column is hidden. The property is discovered
from the object's Release mapping; no adapter hard-codes the field name
`id`.

For Select and MultiSelect, the application author configures an option's
native `value` to the canonical object ID and uses `label` for the human
display value. The Widgets do not expose any new public value.

## Editor Interaction

The fixed, disabled `Target source: Single object` control is removed. Builder
mode presents one target-input choice:

- **Widget selection**: choose a compatible existing Widget. The adapter
  generates and stores the target expression.
- **Manual expression or ID**: enter a dynamic expression, literal ID, or,
  for a many-target Function, an expression returning an ID array.

For `maxItems = 1`, the picker offers Table single selection and Select. For
`maxItems > 1`, it also offers Table multi-selection and MultiSelect; all
single-target adapters remain valid. The editor labels the input in terms of
its source rather than misleadingly treating `maxItems` as a single/multi
mode.

## Validation

When a Widget's ontology provenance is known, the editor may verify that its
current object type equals the selected capability owner and that its selection
cardinality fits `maxItems`. For example, a Function targeting `customer`
should flag a selected Widget that has been reconfigured to a known
`supplier` source.

The editor must not reject arbitrary JavaScript transformations, static option
lists, external data, or literal IDs merely because it cannot prove their
provenance. Those targets are marked as manual/unverified and execute through
the normal runtime path.

At execution, the plugin always validates the evaluated IDs against the
selected owner type, capability target bounds, and pinned snapshot. Unknown
or cross-type IDs return native Query errors before Function or Action
execution.

## Compatibility And Deferred Work

Existing development Queries using `SINGLE_OBJECT` plus `objectId` remain
valid. Advanced JSON retains the current explicit target representation and
is the escape hatch for configurations outside the Builder adapters.

This is a provisional client contract because the Release capability contract
is not final. The isolated change points are the client adapter registry, the
Function/Action target-builder serializer/hydrator, and the plugin's target
normalization. A future final contract may replace the saved editor metadata
without changing Widget public state or the server's `OntologyObjectSet<T>`
boundary.

Deferred: List, Tree, Form, date/filter controls, direct server-side Object
Query/Filter target sources, composite-key authoring UX, and richer provenance
discovery.

## Verification

- Unit tests cover adapter expressions for each first-phase Widget and manual
  bindings.
- Query synchronization tests cover Builder/Advanced round trips and legacy
  target compatibility.
- Plugin tests cover normalized single and many target values, malformed
  arrays, missing IDs, owner mismatch, and `maxItems` rejection.
- Manual verification binds a single-target Function through Table and Select,
  and a many-target Function through Table multi-select and MultiSelect.
