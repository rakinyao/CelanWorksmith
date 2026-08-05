# T6.1 ObjectDetail Widget Design

## Scope

T6.1 delivers the first object-aware widget: `ObjectDetail`. It accepts one
dynamic object binding, renders ontology-aware properties, and exposes a
read-only selected linked object. It establishes the link-loading contract
used by later `FilterList` and `ActionButton` work.

This phase does not implement an object-aware Table, editable object fields,
or direct API calls from a Widget component.

## Input Contract

The Widget has one bindable property named `objectData`:

```text
{{Table1.selectedRow}}
{{$objects.PurchaseOrder.PO001}}
```

The normalizer accepts both current data shapes:

```typescript
{ id: string; typeId: string; [propertyId: string]: unknown }
{ id: string; typeId: string; properties: Record<string, unknown> }
```

The normalized instance keeps `id`, `typeId`, and a flat property map. Missing
or invalid input is rendered as an input error and never causes a runtime API
request from the Widget.

## Property Presentation

Property metadata comes from the global CelanWorksmith ontology/object state.
The first version derives groups without changing the backend DTO:

- `Basic`: `id` and `typeId`.
- `Business`: metadata properties where `derived` is false.
- `Derived`: metadata properties where `derived` is true.

The property pane exposes these display modes:

- `BUSINESS_ONLY` (default)
- `BUSINESS_AND_DERIVED`
- `ALL_METADATA`

Unknown runtime fields are shown only in `ALL_METADATA` mode. Metadata order is
preserved. A missing metadata record falls back to the runtime object fields
and displays a degraded metadata state without hiding the object.

## Link Loading

Link type metadata is loaded into the global CelanWorksmith link state by
`getLinkTypes(sourceTypeId)`. Link records are loaded through Redux/Saga using the existing
`CelanworksmithAPI.getLinkedObjects` client method.

The Widget dispatches a link-load request when the object identity changes and
when a user opens a link Tab. The component never calls the API directly.

The first source link type is prefetched asynchronously after the primary
object is renderable. The prefetch never blocks property rendering. Other link
types remain lazy and load on Tab selection.

Link state is keyed by `typeId`, `objectId`, and `linkTypeId`, and contains:

```typescript
{
  status: "idle" | "loading" | "ready" | "empty" | "error";
  result?: CelanworksmithObjectSet;
  error?: CelanworksmithObjectError;
  updatedAt?: number;
}
```

Duplicate requests for the same key are ignored while loading. Retry replaces
the failed request for that key only. Object/action refreshes invalidate link
entries whose source object identity is affected.

## Widget Outputs

The Widget keeps the primary object stable when a linked record is selected.
It stores the selection through Appsmith's `updateWidgetMetaProperty` and
declares the transient values in `getMetaPropertiesMap`, so the evaluated
output exposes:

```text
ObjectDetail1.objectData
ObjectDetail1.selectedLinkedObject
ObjectDetail1.selectedLinkedObjectId
ObjectDetail1.selectedLinkType
```

Changing `objectData` or the active Link Tab clears the previous linked
selection. Selecting a linked record updates the Widget meta properties; the
first version does not render a nested detail panel or add a new event type.

## Error and Loading Behavior

- Empty `objectData`: empty state, no request.
- Missing `id` or `typeId`: input validation error, no request.
- Unknown object type: metadata degradation state, no global toast.
- Link loading: loading indicator scoped to the active Link Tab.
- Empty link result: explicit empty state.
- Link failure: error message and local Retry control; primary properties stay visible.
- Object refresh: the Widget re-renders from DataTree updates and does not own refresh logic.

## Registration and Compatibility

`ObjectDetail` is registered through the existing Widget loader registry and
`WidgetProvider/factory/registrationHelper` pattern. It supplies defaults,
property pane configuration, runtime component, autocomplete definitions,
styles, thumbnail/icon, and a widget version. No Table or Form implementation
is copied.

The default DSL contains `objectData`, `displayMode`, layout defaults, and the
normal Appsmith visibility/name properties. Import/export tests assert that the
widget survives a DSL round trip with defaults and configured bindings.

## Testing Strategy

Unit coverage is split by boundary:

1. Object normalizer and property grouping pure functions.
2. Link reducer and Saga request/cache/retry behavior.
3. ObjectDetail rendering for default, empty, degraded, loading, empty-link,
   and error-link states.
4. Widget registration, defaults, autocomplete output, and DSL round trip.
5. Integration coverage proving the Widget dispatches link requests and reads
   the selected linked object without calling the API from render.

Manual acceptance uses the existing Table as the temporary object selector:

```text
Table1.selectedRow
  -> ObjectDetail.objectData
  -> open a Link Tab
  -> select a linked record
  -> inspect ObjectDetail.selectedLinkedObject
```

## Agent and Review Boundaries

Tasks execute sequentially. No parallel Agent modifies the shared Redux,
DataTree, or Widget registry files. Each short task has a narrow file list and
must finish its focused test command before the next task starts. Cross-task
integration and final verification stay in the main session.
