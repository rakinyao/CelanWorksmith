# Capability Query Mode Unification Verification

## Automated

- `QueryModeSynchronizer` verifies an invalid Builder capability draft still
  produces structural Advanced JSON and that invalid Advanced JSON restores the
  retained Builder controls without switching the editor back to Advanced.
- `OntologyCapabilityDefinitionSubstitutorTest` verifies an Advanced
  `OBJECT_SET` whole-value binding is converted from its evaluated JSON text
  into a JSON array before ontology definition parsing.
- `OntologyActionConfigurationTest` remains green after typed preparation.

## Manual Checkpoint

1. Bind a Table selection to a multi-object Function in Builder and run it.
2. Switch to Advanced and run the generated definition without editing it.
   The request must succeed with the same selected objects.
3. In Builder, deliberately violate a Function contract, switch to Advanced,
   then switch back. Builder target and parameter inputs must remain editable.
4. In Advanced, enter invalid JSON, switch back to Builder, and confirm the
   prior Builder target/parameters are restored while the invalid Advanced
   text remains available on the next Advanced visit.
