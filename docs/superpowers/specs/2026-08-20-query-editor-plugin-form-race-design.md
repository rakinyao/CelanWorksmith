# Query Editor Plugin Form Race Design

## Problem

Opening a newly created Ontology query before its plugin editor form is present
in the client store can dispatch `INIT_FORM_EVALUATION` with no editor config.
The evaluation worker then has no entry for the action form ID. The consumer
unconditionally passes that missing entry to `Object.entries`, which crashes the
Query editor. A browser refresh loads the plugin form first and masks the race.

## Design

The query-pane transition will ensure the selected action's plugin form has been
loaded before reading its editor and settings configs or initializing form
evaluation. It will reuse `checkAndGetPluginFormConfigsSaga`, the established
single-plugin loader used by other editor flows. Once the call returns, the
existing selectors and initialization sequence run unchanged.

`FormEvaluationSaga` will treat a missing form-ID result from the worker as an
empty dynamic-value configuration. This is a defensive boundary: it prevents a
bad or temporarily unavailable worker result from crashing the editor, while
the QueryPane prerequisite ensures the normal path still evaluates and fetches
the Ontology metadata selectors.

## Scope

Only the client query-pane and form-evaluation paths change. Ontology action
configuration, plugin editor JSON, backend endpoints, runtime seed data, and
persisted application data remain unchanged.

## Verification

Regression tests will prove that opening a query loads its plugin form before
initializing form evaluation, and that a missing worker form result produces an
empty dynamic trigger set instead of throwing. Focused client tests will then
run with the existing Query Builder synchronization tests.
