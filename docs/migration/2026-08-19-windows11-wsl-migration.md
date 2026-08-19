# CelanWorksmith Development Migration

This guide moves the development environment to Windows 11 + WSL2 + VS Code.
It restores source code and reproducible demo runtime data only.

## Migration Boundary

The following are transferred through Git and the migration bundle:

- Source code, tests, plans, specifications, verification records, and scripts.
- Git history, the `feat/ontology-datasource-plugin` branch, and the migration tag.
- The tracked Demo Ontology project and Mongo runtime seed files.

The following are deliberately **not** transferred:

- Appsmith MongoDB data: users, workspaces, apps, queries, datasource records, and releases.
- Redis data and sessions.
- `.env` files, encryption keys, credentials, SSH private keys, and tokens.
- `node_modules`, Maven `target`, frontend `build`, server `dist`, logs, and Playwright results.

Create a new test account and test apps on the new machine. Use fresh development
encryption values because no old encrypted MongoDB data is being restored.

## Source Machine: Finalize

Run these commands from WSL in the repository root:

```bash
git switch feat/ontology-datasource-plugin
git status --short
```

The working tree must be intentionally clean before the migration bundle is
created. The current Query Builder/Advanced synchronization work is included in
the migration checkpoint; its browser verification remains a follow-up item.

Run the focused checks before committing if they have not already been run:

```bash
cd app/client
yarn jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  src/WidgetQueryGenerators/Ontology/index.test.ts \
  --runInBand --no-cache

cd ../server
mvn -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyActionConfigurationTest,OntologyConfigurationTest,OntologyObjectQueryExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Commit and push the source state. The migration checkpoint tag is created once
the migration files are committed:

```bash
git add -A
git commit -m "chore: prepare Windows WSL development migration"
git tag -a migration-checkpoint-2026-08-19-r1 -m "Windows WSL development migration checkpoint"
git push origin feat/ontology-datasource-plugin
git push origin migration-checkpoint-2026-08-19-r1
```

Create an optional offline bundle. It fails if the working tree is dirty:

```bash
./scripts/migration/create-migration-bundle.sh "$HOME/celanworksmith-migration-$(date +%Y%m%d)"
```

Copy that output directory to external storage only if an offline fallback is
needed. Do not copy `app/server/.env` or any other ignored local configuration.

## Windows 11 and WSL2 Setup

1. Install WSL2 with an Ubuntu LTS distribution.
2. Install Docker Desktop for Windows and enable the WSL2 engine and Ubuntu integration.
3. Install VS Code on Windows with the **WSL** extension.
4. Install GitHub SSH access inside WSL and verify `ssh -T git@github.com`.
5. Keep the repository under the WSL filesystem, such as `~/workspace/projects`, rather than `/mnt/c`, to reduce filesystem and watcher overhead.
6. Install Java 25, Maven 3.9.12, Node.js 24.14.1, and Yarn 3.5.1 inside WSL.
7. Install `gitleaks` if you want the repository pre-commit secret scan to run.

Verify the toolchain:

```bash
java -version
mvn --version
node --version
yarn --version
docker info
```

The expected versions are Java major `25`, Node `v24.14.1`, Maven `3.9.12`,
and Yarn `3.5.1`.

The repository hook also invokes client `lint-staged`. If a fresh checkout
reports `ENOENT` for `gitleaks` or `eslint`, install the missing tool or run the
targeted checks manually before using `HUSKY=0` for a checkpoint-only commit.
Do not use `HUSKY=0` to hide failing tests or secret-scan findings.

## Restore the Repository

Using the remote repository:

```bash
mkdir -p "$HOME/workspace/projects"
cd "$HOME/workspace/projects"
git clone --branch feat/ontology-datasource-plugin \
  git@github.com:rakinyao/CelanWorksmith.git CelanWorksmith
cd CelanWorksmith
git describe --always --tags
```

For an offline bundle, clone from the bundle instead:

```bash
git clone /path/to/CelanWorksmith-<commit>.bundle "$HOME/workspace/projects/CelanWorksmith"
cd "$HOME/workspace/projects/CelanWorksmith"
git switch feat/ontology-datasource-plugin
```

Run the repository initializer. It creates only ignored local config and
installs client dependencies; it does not import MongoDB application data:

```bash
./scripts/migration/initialize-new-wsl.sh "$PWD"
```

## Fresh Development Services

Start fresh MongoDB and Redis through Docker Desktop. The standard local
configuration expects MongoDB replica set `rs0`:

```bash
docker run -d --name appsmith-mongodb --hostname localhost \
  -p 127.0.0.1:27017:27017 \
  -e MONGO_INITDB_DATABASE=appsmith \
  -v "$HOME/.local/share/celanworksmith/mongodb:/data/db" \
  mongo:8 mongod --replSet rs0

docker run -d --name appsmith-redis \
  -p 127.0.0.1:6379:6379 \
  redis:7

docker exec appsmith-mongodb mongosh --quiet --eval \
  'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

If the containers already exist, use `docker start` and check `rs.status()`;
do not create duplicate containers.

Seed only the reproducible ontology demo data:

```bash
./scripts/migration/seed-runtime-data.sh "$PWD"
```

This writes the `celanworksmith_runtime` demo collections. It does not create
users, workspaces, apps, queries, or release records.

## Build and Start

Build the backend from the repository root:

```bash
cd app/server
mvn clean compile
./build.sh -DskipTests
cd ../..
```

Start services in separate WSL terminals, in this order:

```bash
# Terminal 1: RTS
cd ~/workspace/projects/CelanWorksmith/app/client/packages/rts
yarn start

# Terminal 2: backend
cd ~/workspace/projects/CelanWorksmith
./app/server/scripts/start-dev-server.sh

# Terminal 3: frontend
cd ~/workspace/projects/CelanWorksmith/app/client
yarn start
```

The local development ports are backend `8081`, RTS `8091`, frontend `3000`,
MongoDB `27017`, and Redis `6379`. If using the repository HTTPS proxy instead,
follow `contributions/ClientSetup.md` for mkcert and `dev.appsmith.com` hosts
configuration.

## Validation Gate

Run the non-browser migration check:

```bash
MIGRATION_REQUIRE_SERVICES=1 ./scripts/migration/check-wsl-prerequisites.sh
curl -fsS http://127.0.0.1:8081/api/v1/health
```

Then create a fresh user and App through the UI and verify:

1. The new user can log in.
2. A new App can add the Demo Ontology Datasource.
3. The Table Query Builder lists `PurchaseOrder` and `Supplier`.
4. A generated native Query returns the seeded demo rows.
5. A fresh Function/Action test can be created when manual verification resumes.

Do not run `mongorestore`, import an old Redis dump, or copy the old `.env`.
Those actions would violate the agreed migration boundary.

## Troubleshooting

- `502`: confirm backend `8081`, frontend proxy target, and RTS `8091`; inspect the backend startup terminal first.
- `Error fetching latest DSL version`: RTS must be started before the backend.
- `Unable to load datasource templates`: rebuild the backend/plugin from the current checkout and restart the backend; do not reuse an old `app/server/dist` directory.
- Mongo replica set errors: check `docker exec appsmith-mongodb mongosh --quiet --eval 'rs.status()'` and confirm `.env` uses `?replicaSet=rs0`.
- Slow or OOM builds: keep the repo in the WSL filesystem, use one Playwright worker, and avoid frontend production builds while Maven tests are running.
