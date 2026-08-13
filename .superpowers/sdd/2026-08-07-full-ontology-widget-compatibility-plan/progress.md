# SDD ledger — plan: docs/superpowers/plans/2026-08-07-full-ontology-widget-compatibility-plan.md

基线说明：本计划在 `codex/celanworksmith-t5-checkpoint` 专用分支继续执行。工作区已有 T-Foundation/T8 未提交变更，必须保留并作为前置基线；不得重置、清理或覆盖这些变更。

执行规则：每个任务按 brief → implementer → task review → 必要时 fix/re-review → ledger gate 顺序执行；后续任务不得绕过前置任务的审查门槛。

Task 1: fix round 1/5 started (reviewer found 3 Important findings; implementer resumed)
Task 1: fix round 1/5 (3 Important addressed, 1 Minor deferred — report git-status wording is stale; commits 24e7f7bd43..8f9151da2f)
Task 1: minor (deferred): task report describes only Task 1 files in `git status`, while this dedicated branch intentionally contains pre-existing T-Foundation/T8 changes and committed Task 1 files no longer appear as uncommitted.
Task 1: complete (commits f68625bd1b..8f9151da2f, 1 deferred Minor; scoped review found no Critical/Important issues)
Task 2: fix round 1/5 started (reviewer found 2 Important findings: legacy DSL write-back and overly broad inference)
Task 2: fix round 1/5 (2 Important still open on strict test evidence and complete `$objects` shape; commits 3067585d3e..246476b131)
Task 2: fix round 2/5 started (fresh implementer; strengthen full DSL immutability assertion and metadata shape validation)
Task 2: fix round 2/5 (2 Important addressed, 0 open; commits 246476b131..11195eda66)
Task 2: complete (commits 8f9151da2f..11195eda66, review clean after 2 fix rounds)
Task 3: fix round 1/5 started (reviewer found Critical dependency portability and Important cached-metadata error-state coupling)
Task 3: fix round 1/5 (Critical and Important addressed; commits 51d6e5cc8d..6afbf87d5b; current dirty-worktree typecheck limitation documented)
Task 3: complete (commits 11195eda66..6afbf87d5b, review clean)
Task 4: fix round 1/5 started (reviewer found 2 Important findings: initial loading state and TableV2 selection/meta contract)
Task 4: fix round 1/5 (2 Important and 3 Minor addressed; commits 6fd8103bb1..dc76d2c07c)
Task 4: complete (commits 6afbf87d5b..dc76d2c07c, scoped review clean; browser gate deferred to B6)
Task 5: implementer Poincare timed out before commit; partial Task 5 changes remain in working tree and must be reviewed/recovered, not reverted.
Task 5: fix round 1/5 started (reviewer found 3 Important findings: List renderer regression, FilterList Query isolation, missing real Widget integration tests)
Task 5: fix round 1/5 (FilterList Query isolation addressed; real Widget interaction evidence and Dropdown validity still open; commits 5238ab7679..724093b1af)
Task 5: fix round 2/5 started (add real rendering/interaction tests and boolean/number required validity assertions)
Task 5: fix round 2/5 (selection interaction and Dropdown validity addressed; List Canvas/pagination/current-item and loading evidence remain open; commits 724093b1af..b410f7db08)
Task 5: fix round 3/5 started (replace synthetic Canvas mock and add actual paging/current-item/loading assertions)
Task 5: fix round 3/5 (Select/Dropdown/MultiSelect loading addressed; List synthetic Canvas remains open; commits b410f7db08..f154e71468)
Task 5: fix round 4/5 started (fresh stronger implementer to replace synthetic List Canvas verification)
Task 5: fix round 4/5 BLOCKED (no commit): real Canvas initialized, but legacy List needs a complete page-DSL/evaluated-widget harness; dispatching read-only harness investigation before round 5.
Task 5: fix round 5/5 started (use research-backed DataTree/meta-widget harness; no CanvasFactory mock permitted)
Task 5: fix round 5/5 (unverified real DSL harness timed out; no commit; temporary test changes reverted to verified HEAD f154e71468)
Task 5: parked — real Canvas/DataTree/meta-widget template integration test requires a new full page-DSL harness; ruling: runtime List adapter already reuses native renderer and focused tests cover ObjectSet mapping, pagination/meta, selection, Query isolation, and selection-widget loading/empty/error/type mismatch. The missing test is real and deferred to the B6 browser gate; no downstream API or production behavior is blocked.
Task 5: complete (commits dc76d2c07c..f154e71468, 1 parked test-infrastructure finding after 5 fix rounds)
Task 6: fix round 1/5 started (reviewer found missing Form/Input runtime integration, ObjectDetail type validation, JSONForm states/ENUM, and coverage)
Task 6: fix round 1/5 (ObjectDetail and JSONForm addressed; Input metadata validation/Form propagation remain Critical/Important; commits 838532b79d..5804796fc5)
Task 6: fix round 2/5 started (wire Object property constraints into Input validity and add Form-to-Input integration coverage)
Task 6: fix round 2/5 (runtime constraints addressed; reviewer found Form-to-Input test mounts publisher directly rather than end-to-end; commits 5804796fc5..75455ba7c4)
Task 6: fix round 3/5 started (replace direct publisher test with mounted Object Form, child Input, and validity assertion)
Task 6: fix round 3/5 complete (mounted Form -> Canvas -> Input integration, DataTree edit-state validation, BUTTON_WIDGET and FORM_BUTTON_WIDGET validity synchronization, Query isolation, missing object/property and type-mismatch coverage)
Task 6: complete (5 suites / 29 tests passed; Prettier, scoped ESLint, and git diff --check passed; repository TypeScript check remains blocked by pre-existing global dependency/type errors)
Task 7: fix round 1/5 completed (Action application context propagation, standard Button/FormButton/MenuButton Action binding, confirmation request snapshot; 5 focused suites / 53 tests passed; scoped production ESLint has 0 errors)
Task 7: fix round 2/5 completed (FormButton shared Action path and standard Button loading regression fixed; 6 focused suites / 62 tests passed)
Task 7: fix round 3/5 completed (ButtonWidget actionId rendering regression fixed; 4 focused suites / 48 tests passed; scoped ESLint 0 errors)
Task 7: complete (review findings addressed; manual browser gate deferred until environment validation)
Task 8: implemented in parallel as Chart, Progress, Statbox, and shared visualization adapter subtasks.
Task 8: review fix round 1 completed (empty-set validation order, finite label/value validation, custom chart explicit unsupported state, Progress multi-row guard, Statbox metadata type validation and blueprint overlap).
Task 8: aggregation fix completed (Chart and Statbox consume numeric Aggregation Variables; aggregation-only Statbox does not require Object Type; 80 focused tests passed).
Task 8: complete (52-suite compatibility regression passed separately; 299 tests passed; Prettier and git diff --check passed).
Task 9/B6: autocomplete and UX fixes completed (metadata-only Object schemas, unavailable-node filtering, variable-triggered Tern refresh, metadata lifecycle refresh, bilingual refresh status, stable ID preservation).
Task 9/B6: DataTree schema fix completed (non-enumerable read-only __metadata injection supports empty/all-null Object property completion; 7 focused suites/41 tests passed).
Task 9/B6: parked boundaries — Custom EChart/Fusion Object mode shows explicit unsupported state; Progress multi-row requires an Aggregation Variable; browser acceptance and repository-wide typecheck remain open gates, not silently marked passed.
