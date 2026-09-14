# Capability Query Mode Unification Design

## Scope

This provisional design unifies Builder and Advanced editing for ontology
Function and Action Queries. It retains the native Appsmith action execution
pipeline and is isolated to the ontology capability query editor and plugin.

## Problem

Builder submits the structured target control, while Advanced submits JSON
text. Native Mustache substitution is textual: an expression that evaluates
to an ID array is inserted inside a JSON string and therefore makes the
Advanced definition invalid JSON. Separately, a Builder validation failure
currently prevents definition serialization, leaving Advanced with an empty
placeholder that cannot hydrate Builder.

## Decisions

- Builder and Advanced retain independent drafts. An invalid Builder draft is
  never cleared when entering Advanced; invalid Advanced text is never cleared
  when attempting to return to Builder.
- Both modes use one canonical runtime definition with `target` and
  `parameters`; `targetBinding` remains editor-only and never crosses the
  plugin boundary.
- The ontology plugin applies capability-specific typed substitution to the
  Advanced definition before generic substitution. A whole-value binding at
  `target.objectIds` is decoded as a JSON string array; a whole-value binding
  at `target.objectId` remains a string. Other fields retain native Mustache
  behavior.
- Builder-to-Advanced always produces a JSON draft from the current target and
  parameter shape. If local semantic validation fails, it preserves the draft
  and shows the existing validation error; it must not replace it with an empty
  placeholder.
- Advanced-to-Builder hydrates only a parseable, semantically valid definition.
  Otherwise it restores the last Builder draft, leaves the Advanced text intact,
  and informs the user that Advanced edits were not synchronized.

## Deferred Contract Boundary

The typed substitution helper is explicitly `DEMO_HANDLER`-era plumbing. If
the Release contract later defines typed expression nodes, replace this helper
and the capability serializer/hydrator while preserving the canonical plugin
definition and the native execution pipeline.

## Verification

- A Builder object-set expression survives Builder to Advanced to Builder.
- Its Advanced execution receives a real ID array and executes successfully.
- An invalid Builder draft can enter Advanced and return to Builder without
  losing Builder controls.
- Invalid Advanced text can return to its prior Builder draft without losing
  the Advanced draft text.
