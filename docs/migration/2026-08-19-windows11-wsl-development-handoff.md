# CelanWorksmith Development Handoff

Date: 2026-08-19
Target host: `10.10.101.210`
Repository: `/home/gavin/workspace/projects/CelanWorksmith`

This document is the starting point for continuing development on the Windows
11 + WSL2 machine. It is intentionally separate from the migration procedure:
the migration document explains how the machine was prepared, while this
document explains what the next developer should use and verify.

## 1. Current Baseline

- Branch: `feat/ontology-datasource-plugin`
- Verified commit: `bc13e7cbf7`
- Checkpoint tag: `migration-checkpoint-2026-08-19-r1`
- Working tree: clean at the time of handoff
- LAN entry point: `http://10.10.101.210/`
- Backend health: `http://10.10.101.210/api/v1/health`

The current code uses the native Appsmith Datasource, Query, Action, DataTree,
and Widget pipeline. Ontology is a first-class datasource alongside DB and API
datasources. The retired side-channel/Object-mode path is not the target for
new feature work.

The current development simulation uses a MongoDB-backed Ontology Provider.
The seeded runtime data contains `Supplier=10` and `PurchaseOrder=10` rows.
No old Appsmith users, workspaces, apps, queries, datasource records, releases,
Redis sessions, or old encryption keys were migrated.

## 2. Open the Correct Workspace

When working directly on the target Windows machine:

1. Open Windows VS Code.
2. Select `WSL: Connect to WSL` and choose the Ubuntu distribution.
3. Open `/home/gavin/workspace/projects/CelanWorksmith`.
4. Confirm the integrated terminal is Linux/WSL, not PowerShell:

```bash
hostname
id -un
pwd
git status --short --branch
```

The repository must remain under the WSL filesystem. Do not open the working
copy through `/mnt/c`; that causes significantly slower file watching and
larger memory pressure during frontend development.

If connecting from another computer, use Remote Desktop to the Windows host
and then use the WSL VS Code workflow above. A normal SSH connection to
`Rakin@10.10.101.210` lands in Windows PowerShell; it is not the WSL project
shell. For SSH diagnostics, run commands through:

```powershell
wsl.exe -d Ubuntu -- bash -lc "cd /home/gavin/workspace/projects/CelanWorksmith && git status"
```

## 3. Check the Environment

Run this first from the WSL repository root:

```bash
MIGRATION_REQUIRE_SERVICES=1 ./scripts/migration/check-wsl-prerequisites.sh
curl -fsS http://127.0.0.1:8081/api/v1/health
curl -fsS http://10.10.101.210/api/v1/health
```

Expected tool versions are Java 25, Maven 3.9.12, Node.js 24.14.1, and Yarn
3.5.1. Docker Desktop must expose its daemon to the Ubuntu WSL distribution.

The expected local services are:

| Service | Endpoint | Owner |
| --- | --- | --- |
| MongoDB | `127.0.0.1:27017` | Docker container `appsmith-mongodb` |
| Redis | `127.0.0.1:6379` | Docker container `appsmith-redis` |
| Backend | `127.0.0.1:8081` | user unit `cw-backend` |
| RTS | `127.0.0.1:8091` | user unit `cw-rts` |
| Frontend | `0.0.0.0:3000` | user unit `cw-frontend` |
| Nginx | `0.0.0.0:80` | reverse proxy |

Check service state with:

```bash
systemctl --user --no-pager --type=service --state=running \
  | rg 'cw-(backend|rts|frontend|nginx)'
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
ss -ltnp | rg ':(80|3000|8081|8091|27017|6379)\b'
```

Restart only the development application services when needed:

```bash
systemctl --user restart cw-rts cw-backend cw-frontend
```

RTS should be healthy before restarting the backend. This avoids the common
`Error fetching latest DSL version` startup failure.

## 4. First Login and Smoke Test

The migration intentionally starts with a fresh Appsmith application state.
Create a new development account and a new App; do not attempt to restore old
MongoDB or Redis data.

Use this smoke-test sequence:

1. Log in at `http://10.10.101.210/`.
2. Create a new App and open the Datasources area.
3. Add the Demo Ontology datasource and import/bind the Demo project.
4. Create a native Query through the Ontology Query Builder.
5. Select `PurchaseOrder`, run the Query, and verify the seeded rows.
6. Add a Table Widget and bind it to the generated Query.
7. Verify generated columns, explicit Query Run, filtering, sorting, and client pagination.
8. Verify that switching between Builder and Advanced mode preserves the canonical query definition.
9. When needed, separately verify Function, Link, and Action operations.

This smoke test validates the native datasource path. It should not use
`$objects.*` as the primary verification path.

## 5. Architecture Rules for New Work

- Ontology is a standard Appsmith datasource, not a parallel Widget data model.
- Multiple datasources may be bound to one App, including multiple Ontology datasources.
- Native Query/Action execution must reuse the existing Appsmith pipeline.
- Query Builder and Advanced JSON are two views of one canonical query definition.
- Runtime data is Provider-owned and replaceable; an App should not depend on a local Mongo implementation.
- Ontology project metadata supplies the stable provider/project/version identity.
- Business writes remain behind the workspace-level Action Server boundary.
- Worksmith validates and maps Action requests; it does not implement business write-back.
- The external Action Server asynchronous, authorization, retry, timeout, progress, and audit schema is not frozen.
- Do not add a new side-channel state store or a second execution chain to fix a native-path issue.
- New user-facing UI text must use the existing i18n path and remain English.

The detailed development baseline is recorded in
`docs/superpowers/verification/2026-08-16-development-baseline.md`.
The current T9 release plan is
`docs/superpowers/plans/2026-08-15-t9-application-release-plan.md`.

## 6. Build and Test Guidance

Prefer focused checks. The host has limited memory; do not run a full frontend
production build, full client TypeScript check, full ESLint pass, and Maven
tests concurrently.

Plugin/server checks:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Focused client checks should use one Jest worker:

```bash
cd app/client
yarn jest <changed-test-files> --runInBand --no-cache
```

For browser checks, use one Playwright/Cypress worker and avoid concurrent
Maven or production frontend builds. Unset an inherited Electron runner flag
when running Cypress with Electron:

```bash
unset ELECTRON_RUN_AS_NODE
```

Record exact commands and results in a verification document. Do not treat an
HTTP health check as proof that a Widget or Query workflow is correct.

## 7. Troubleshooting

### 502 Bad Gateway

```bash
systemctl --user status cw-backend cw-rts cw-frontend --no-pager
journalctl --user -u cw-backend -n 160 --no-pager
journalctl --user -u cw-rts -n 160 --no-pager
curl -fsS http://127.0.0.1:8081/api/v1/health
```

If the backend is healthy but the LAN endpoint fails, check the Windows
port-forward target. WSL addresses can change after a restart:

```powershell
wsl.exe hostname -I
netsh interface portproxy show v4tov4
```

Refresh the existing `CelanWorksmith-HTTP` forwarding rule to the current WSL
address when required. Do not change application ports to work around a stale
port-forward rule.

### Datasource templates or plugin loading errors

Rebuild the backend/plugin from the current checkout and restart the backend;
do not reuse an old `app/server/dist` directory:

```bash
cd /home/gavin/workspace/projects/CelanWorksmith/app/server
./build.sh -DskipTests
systemctl --user restart cw-backend
```

### Ontology metadata or runtime errors

Confirm RTS is running, then check the backend log. Verify that MongoDB and
Redis are reachable and that the Demo runtime collections still contain the
seeded rows. Do not copy the old `.env`, restore Redis, or run `mongorestore`.

## 8. Git Handoff Rules

Before starting work:

```bash
cd /home/gavin/workspace/projects/CelanWorksmith
git switch feat/ontology-datasource-plugin
git status --short --branch
git log -3 --oneline --decorate
```

Create a focused branch or checkpoint commit for each independent task. Keep
generated output, logs, `node_modules`, Maven targets, frontend builds, and
local `.env` files out of commits. Before handoff or a checkpoint, run:

```bash
git diff --check
git status --short
```

The target machine was synchronized from a migration bundle. Its local
`origin/feat/ontology-datasource-plugin` tracking ref may lag the verified
commit if GitHub access is unavailable from WSL; compare `git rev-parse HEAD`
with the remote before pulling or rebasing. Never reset the working tree to an
older remote-tracking ref without checking the commit first.

## 9. Immediate Next Step

Start with the smoke test in Section 4. If it passes, read the current T9
plan and the development baseline before selecting the next implementation
task. Keep the native datasource architecture as the active path, and record
any remaining Table/Function/Action manual gaps as focused verification items
instead of reintroducing the retired Object-mode architecture.
