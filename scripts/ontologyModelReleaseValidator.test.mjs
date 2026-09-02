import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateReleaseDigest,
  canonicalizeRelease,
  validateRelease,
} from "./ontologyModelReleaseValidator.mjs";

const canonicalRelease =
  '{"elements":[{"domain":"business","kind":"entity_set","name":"supplier","spec":{"display_name":{"en-US":"Supplier"},"fields":[{"name":"id","type":"string"}],"primary_key_fields":["id"]},"version":"1.0.0"},{"domain":"business","kind":"runtime_binding","name":"supplier_runtime","spec":{"entity_set":"supplier"},"version":"1.0.0"}],"format":"ontology-model","format_version":2,"release":{"change_set":{"changes":[],"compatibility":"INITIAL"},"domain":"business","model_id":"business-core-demo","previous_release_digest":null,"released_at":"2026-09-02T00:00:00Z","version":"1.0.0"}}';

const makeValidRelease = () => ({
  release: {
    version: "1.0.0",
    model_id: "business-core-demo",
    domain: "business",
    released_at: "2026-09-02T00:00:00Z",
    previous_release_digest: null,
    change_set: { compatibility: "INITIAL", changes: [] },
    release_digest:
      "sha256:30022663f22b6b1474462d69a312864a3ba0b5bbfd87d9c916f4408b78635d0a",
  },
  elements: [
    {
      version: "1.0.0",
      name: "supplier",
      kind: "entity_set",
      domain: "business",
      spec: {
        primary_key_fields: ["id"],
        fields: [{ type: "string", name: "id" }],
        display_name: { "en-US": "Supplier" },
      },
    },
    {
      spec: { entity_set: "supplier" },
      domain: "business",
      name: "supplier_runtime",
      kind: "runtime_binding",
      version: "1.0.0",
    },
  ],
  format_version: 2,
  format: "ontology-model",
});

test("canonicalizes release keys and calculates the documented digest", () => {
  const release = makeValidRelease();

  assert.equal(canonicalizeRelease(release), canonicalRelease);
  assert.equal(
    calculateReleaseDigest(release),
    "sha256:30022663f22b6b1474462d69a312864a3ba0b5bbfd87d9c916f4408b78635d0a",
  );
  assert.doesNotThrow(() => validateRelease(release));
});

test("rejects a release without format version", () => {
  const release = makeValidRelease();
  delete release.format_version;

  assert.throws(() => validateRelease(release), /format_version/);
});

test("rejects a release with invalid SemVer", () => {
  const release = makeValidRelease();
  release.release.version = "1";

  assert.throws(() => validateRelease(release), /SemVer/);
});

test("rejects a release whose digest does not match its content", () => {
  const release = makeValidRelease();
  release.release.release_digest = "sha256:0";

  assert.throws(() => validateRelease(release), /digest/);
});

test("rejects duplicated element identities before accepting a release", () => {
  const release = makeValidRelease();
  release.elements.push(structuredClone(release.elements[0]));

  assert.throws(() => validateRelease(release), /Duplicate element/);
});
