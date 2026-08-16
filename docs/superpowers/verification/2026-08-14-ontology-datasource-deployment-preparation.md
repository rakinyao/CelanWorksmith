# Ontology Datasource Deployment Preparation

Date: 2026-08-14

## Scope

This record covers preparation and controlled deployment for the Task 12
browser gate. That gate must complete before Task 13 removes the legacy
ontology Widget/Object-mode path.

## Source Baseline

- Branch: `feat/ontology-datasource-plugin`
- Latest committed server change: `aa80aa1a73`
- Native plugin registration: `2bc7ec9c0e`
- Native query editor resources and metadata selectors: `447b903035`,
  `cd582913db`
- The Task 11 Integration Editor import UI and Task 12 verification record
  remain uncommitted working-tree changes. They must be included in the build
  candidate after a review/checkpoint decision.

## Deployment Result

The controlled server candidate was packaged with:

```bash
cd app/server
mvn -pl appsmith-server -Dmaven.test.skip=true package
```

The resulting `server-1.0-SNAPSHOT.jar` SHA-256 is:

```text
78fd80e8a9e4cd411589b38eb5fb69aff6762a324fdd1cbb5bf8a1ab2bdde896
```

At `2026-08-14 11:43 CST`, the server candidate replaced
`app/server/dist` while preserving the immediately prior candidate at:

```text
app/server/dist.pre-constructor-fix-20260814-1142/
```

The deployed directory contains 26 plugin JARs, including
`celanworksmithOntologyPlugin-1.0-SNAPSHOT.jar`. The client candidate remains
at `app/client/build`; the browser development environment is served by the
current worktree through Webpack on `0.0.0.0:3000`.

## Startup Corrections

The first candidate start failed because Spring could not select a production
constructor for `OntologyMetadataSnapshotRepository`: its package-visible
Mongo-client constructor is required by tests, so Spring found two constructors
and attempted to use a nonexistent default constructor. The production
constructor is now explicitly annotated with `@Autowired`, with a focused
Spring wiring regression test in
`OntologyMetadataSnapshotRepositoryWiringTest`.

The server transient unit must use
`/home/gavin/workspace/projects/CelanWorksmith/app/server/dist` as its working
directory. PF4J resolves `plugins/` relative to the working directory; using
`app/server` starts the API but reports `No 'plugins' root` and leaves the
Ontology datasource plugin unavailable.

The Nginx root route proxies to the frontend development server. If it returns
`502` while `/api/v1/health` succeeds, restore the frontend process on port
`3000`. The user systemd transient unit requires the NVM Node/Yarn path:

```bash
systemd-run --user --unit=celanworksmith-frontend --collect \
  --property=Restart=on-failure --property=RestartSec=5s \
  --setenv=PATH=/home/gavin/.nvm/versions/node/v24.14.1/bin:/usr/local/bin:/usr/bin:/bin \
  --working-directory=/home/gavin/workspace/projects/CelanWorksmith/app/client \
  /bin/bash -lc 'exec /home/gavin/.nvm/versions/node/v24.14.1/bin/yarn start'
```

## Rollback Backup

The live artifacts were archived before replacement:

```text
/home/gavin/workspace/backups/ontology-datasource-pre-task13-20260814-110134/
```

Contents and SHA-256 checksums:

```text
server-dist.tar.gz  c86b1628ac6611b612d3fc1c611f7ab03a338ae988e5983ecc030cd23102514f
client-build.tar.gz 3f3b14bbb3cbc153dc0e9e186e42ba17e8154aa30b6a6989caa09b80eaf8a0ae
```

## Controlled Deployment Procedure

1. Verify the working-tree scope and create a reviewable checkpoint before
   building; do not build from an accidental mixed worktree.
2. Build server artifacts in a staging copy or isolated worktree. Do not run
   `app/server/build.sh` against the live checkout while the current server
   uses `app/server/dist`: the script deletes and recreates that directory.
3. Use `-Dmaven.test.skip=true` only for the deployment package if fresh
   server test compilation remains blocked by the known unrelated
   `RuntimeControllerAclTest` overload ambiguity. The plugin and client
   focused suites must remain green before packaging.
4. Build the client bundle in the same staged source tree. Confirm the bundle
   contains the Integration Editor import UI before copying it into the live
   client build directory.
5. Stop the Java process, atomically replace the server and client artifact
   directories, then start the Java process with the existing environment and
   the `app/server/dist` working directory. Keep Nginx running unless its
   configuration changes.
6. Verify `/api/v1/health` returns `200`, inspect startup logs for the
   `celanworksmith-ontology-plugin`, and confirm the plugin JAR exists under
   `app/server/dist/plugins/`.
7. Execute every browser case in
   `2026-08-13-ontology-datasource-native-path.md`. Record the environment
   URL, datasource ID, query IDs, and actual outcomes before starting Task 13.

## Rollback Procedure

1. Stop the Java server process.
2. Replace `app/server/dist` and `app/client/build` from the two archived tar
   files above.
3. Restart the Java server with the prior command and confirm
   `/api/v1/health` returns `200`.
4. Preserve server and Nginx logs from the failed candidate for diagnosis.

## Gate Status

- Artifact backup: complete and checksum recorded.
- Controlled candidate build/deploy: complete.
- Backend health: `http://127.0.0.1:8081/api/v1/health` and
  `http://10.10.110.129/api/v1/health` returned `200` after deployment.
- Plugin loading: PF4J resolved and started
  `celanworksmith-ontology-plugin@1.0-SNAPSHOT`.
- Browser entry: `http://127.0.0.1/` and `http://10.10.110.129/` returned
  `200` after the frontend development service was restored.
- Browser gate: ready for manual execution; results are not yet recorded.
- Task 13 legacy removal: still prohibited.
