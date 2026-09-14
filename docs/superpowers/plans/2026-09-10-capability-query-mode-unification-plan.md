# Capability Query Mode Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ontology capability Builder and Advanced modes preserve drafts and execute the same canonical target definition.

**Architecture:** The client maintains independent Builder and Advanced drafts and performs lossless conversion only when a definition is valid. The ontology plugin performs narrowly-scoped typed substitution for Advanced capability targets before its normal validation; global Appsmith substitution remains unchanged.

**Tech Stack:** TypeScript/React/Jest, Java/Jackson/JUnit, native Appsmith ontology plugin.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline.
- Do not send `targetBinding` or widget IDs to the runtime.
- Limit typed substitution to capability Advanced definitions.
- Keep all UI copy routed through existing i18n keys.

---

### Task 1: Preserve Capability Editor Drafts

**Files:**
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`

- [ ] Add failing tests for invalid Builder to Advanced to Builder recovery and for invalid Advanced recovery without clearing either draft.
- [ ] Run the focused Jest suite and confirm RED.
- [ ] Preserve the last capability Builder draft and serialize a structural Advanced draft without requiring semantic validation during mode switching.
- [ ] Restore Builder fields when Advanced cannot hydrate while preserving its definition text.
- [ ] Run the focused Jest suite and confirm GREEN.

### Task 2: Type-Safe Advanced Capability Target Evaluation

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Create or modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyCapabilityDefinitionSubstitutor.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyPluginTest.java`

- [ ] Add a failing test that executes an Advanced Function Query with an object-set binding evaluating to a JSON array.
- [ ] Run the focused JUnit test and confirm RED.
- [ ] Override only the ontology executor preparation step, decoding full-value capability `objectIds` bindings into arrays before configuration validation and leaving ordinary fields on native substitution.
- [ ] Run focused plugin tests and confirm GREEN.

### Task 3: Focused Regression Verification

**Files:**
- Modify: `docs/superpowers/verification/2026-09-10-capability-query-mode-unification.md`

- [ ] Run the client synchronizer tests, plugin configuration/executor tests, formatting checks, and `git diff --check`.
- [ ] Rebuild the ontology plugin and restart the local backend.
- [ ] Manually verify a Table object-set Function in Builder and Advanced and record the result.
