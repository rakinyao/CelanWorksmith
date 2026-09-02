import { createHash } from "node:crypto";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const FIELD_TYPES = new Set([
  "string",
  "integer",
  "decimal",
  "boolean",
  "date",
  "timestamp",
  "json",
  "reference",
]);
const CARDINALITIES = new Set([
  "ONE_TO_ONE",
  "ONE_TO_MANY",
  "MANY_TO_ONE",
  "MANY_TO_MANY",
]);
const MAPPING_STATUSES = new Set(["INFERRED", "VERIFIED", "REJECTED"]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON requires finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (!isPlainObject(value)) throw new TypeError("Canonical JSON requires plain objects");

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

export function canonicalizeRelease(release) {
  return canonicalize(withoutDigest(release));
}

function withoutDigest(release) {
  if (!isPlainObject(release) || !isPlainObject(release.release)) return release;
  const clone = structuredClone(release);
  delete clone.release.release_digest;
  return clone;
}

export function calculateReleaseDigest(release) {
  return `sha256:${createHash("sha256")
    .update(canonicalizeRelease(release))
    .digest("hex")}`;
}

function requireNonblankString(value, rule) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${rule} must be a nonblank string`);
  }
}

function requireLocalizedText(value, rule) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    throw new Error(`${rule} must be a nonempty localized-text object`);
  }
  for (const [locale, text] of Object.entries(value)) {
    requireNonblankString(locale, `${rule} locale`);
    requireNonblankString(text, `${rule}.${locale}`);
  }
}

function entityKey(domain, name) {
  return `${domain}\u0000${name}`;
}

function validateEntitySet(element) {
  const spec = element.spec;
  if (!isPlainObject(spec)) throw new Error(`Entity ${element.name} must have a spec`);
  requireLocalizedText(spec.display_name, `Entity ${element.name} display_name`);
  if (!Array.isArray(spec.fields)) throw new Error(`Entity ${element.name} fields must be an array`);
  const fieldNames = new Set();
  for (const field of spec.fields) {
    if (!isPlainObject(field)) throw new Error(`Entity ${element.name} has an invalid field`);
    requireNonblankString(field.name, `Entity ${element.name} field name`);
    if (!FIELD_TYPES.has(field.type)) {
      throw new Error(`Entity ${element.name} field ${field.name} has unsupported type ${field.type}`);
    }
    if (fieldNames.has(field.name)) throw new Error(`Entity ${element.name} has duplicate field ${field.name}`);
    fieldNames.add(field.name);
  }
  if (!Array.isArray(spec.primary_key_fields) || spec.primary_key_fields.length === 0) {
    throw new Error(`Entity ${element.name} must declare primary_key_fields`);
  }
  const primaryKeys = new Set();
  for (const field of spec.primary_key_fields) {
    if (!fieldNames.has(field)) throw new Error(`Entity ${element.name} primary key ${field} is undeclared`);
    if (primaryKeys.has(field)) throw new Error(`Entity ${element.name} has duplicate primary key ${field}`);
    primaryKeys.add(field);
  }
}

function getEntity(elementIndex, domain, name, linkName) {
  const entity = elementIndex.get(entityKey(domain, name));
  if (!entity || entity.kind !== "entity_set") {
    throw new Error(`Link ${linkName} references unknown entity ${domain}/${name}`);
  }
  return entity;
}

function fieldsOf(entity) {
  return new Set(entity.spec.fields.map((field) => field.name));
}

function validateLink(element, elementIndex) {
  const spec = element.spec;
  if (!isPlainObject(spec)) throw new Error(`Link ${element.name} must have a spec`);
  const source = getEntity(elementIndex, element.domain, spec.source_entity_set, element.name);
  const destination = getEntity(elementIndex, element.domain, spec.destination_entity_set, element.name);
  if (!CARDINALITIES.has(spec.cardinality)) {
    throw new Error(`Link ${element.name} has invalid cardinality`);
  }
  if (!MAPPING_STATUSES.has(spec.mapping_status)) {
    throw new Error(`Link ${element.name} has invalid mapping_status`);
  }
  if (!Array.isArray(spec.field_mappings) || spec.field_mappings.length === 0) {
    throw new Error(`Link ${element.name} must have field_mappings`);
  }
  const sourceFields = fieldsOf(source);
  const destinationFields = fieldsOf(destination);
  for (const mapping of spec.field_mappings) {
    if (!isPlainObject(mapping)) throw new Error(`Link ${element.name} has invalid field mapping`);
    if (!sourceFields.has(mapping.source_field)) {
      throw new Error(`Link ${element.name} references unknown source field ${mapping.source_field}`);
    }
    if (!destinationFields.has(mapping.destination_field)) {
      throw new Error(`Link ${element.name} references unknown destination field ${mapping.destination_field}`);
    }
  }
}

function validateRuntimeBinding(element, elementIndex) {
  const spec = element.spec;
  if (!isPlainObject(spec)) throw new Error(`Runtime binding ${element.name} must have a spec`);
  const entity = getEntity(elementIndex, element.domain, spec.entity_set, element.name);
  if (spec.primary_key_mapping !== undefined && !isPlainObject(spec.primary_key_mapping)) {
    throw new Error(`Runtime binding ${element.name} primary_key_mapping must be an object`);
  }
  if (spec.primary_key_mapping) {
    const fields = fieldsOf(entity);
    for (const field of Object.keys(spec.primary_key_mapping)) {
      if (!fields.has(field)) throw new Error(`Runtime binding ${element.name} maps unknown field ${field}`);
    }
  }
}

export function validateRelease(release) {
  if (!isPlainObject(release)) throw new Error("Release must be an object");
  if (release.format !== "ontology-model") throw new Error("format must be ontology-model");
  if (release.format_version !== 2) throw new Error("format_version must be 2");
  if (!isPlainObject(release.release)) throw new Error("release metadata is required");
  const metadata = release.release;
  requireNonblankString(metadata.domain, "release.domain");
  requireNonblankString(metadata.model_id, "release.model_id");
  if (typeof metadata.version !== "string" || !SEMVER.test(metadata.version)) {
    throw new Error("release.version must be strict SemVer");
  }
  if (!isPlainObject(metadata.change_set) || !["INITIAL", "BACKWARD_COMPATIBLE", "BREAKING"].includes(metadata.change_set.compatibility)) {
    throw new Error("release.change_set.compatibility is invalid");
  }
  if (!Array.isArray(release.elements)) throw new Error("elements must be an array");

  const identities = new Set();
  const elementIndex = new Map();
  for (const element of release.elements) {
    if (!isPlainObject(element)) throw new Error("Elements must be objects");
    requireNonblankString(element.domain, "element.domain");
    requireNonblankString(element.kind, "element.kind");
    requireNonblankString(element.name, "element.name");
    const identity = `${element.domain}\u0000${element.kind}\u0000${element.name}`;
    if (identities.has(identity)) throw new Error(`Duplicate element identity ${identity}`);
    identities.add(identity);
    if (element.kind === "entity_set") elementIndex.set(entityKey(element.domain, element.name), element);
  }
  for (const element of release.elements) {
    if (element.kind === "entity_set") validateEntitySet(element);
    if (element.kind === "runtime_binding") validateRuntimeBinding(element, elementIndex);
    if (element.kind === "entity_set_link") validateLink(element, elementIndex);
  }
  requireNonblankString(metadata.release_digest, "release.release_digest");
  const calculatedDigest = calculateReleaseDigest(release);
  if (metadata.release_digest !== calculatedDigest) {
    throw new Error("release_digest does not match release content");
  }
}
