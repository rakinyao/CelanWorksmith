export type CelanworksmithBindingKind =
  | "objectType"
  | "objectSet"
  | "instance"
  | "property";

export interface CelanworksmithObjectBinding {
  kind: CelanworksmithBindingKind;
  objectTypeId: string;
  instanceId?: string;
  propertyPath: string;
  path: string;
}

export interface CelanworksmithObjectDependency
  extends CelanworksmithObjectBinding {
  query?: {
    offset: number;
    limit: number;
  };
  status: "idle" | "loading" | "ready" | "empty" | "error";
  updatedAt?: number;
  error?: { code: string; message: string };
}

const identifier = /^[A-Za-z_$][A-Za-z\d_$]*$/;

const readToken = (path: string, start: number, separator: string) => {
  if (separator === ".") {
    const match = path.slice(start + 1).match(/^[A-Za-z_$][A-Za-z\d_$]*/);

    return match ? { token: match[0], end: start + 1 + match[0].length } : null;
  }

  if (path[start] !== "[") return null;
  const end = path.indexOf("]", start + 1);

  if (end === -1) return null;

  const raw = path.slice(start + 1, end);

  if (raw.length < 2 || raw[0] !== '"' || raw[raw.length - 1] !== '"') {
    return null;
  }

  try {
    const token = JSON.parse(raw) as unknown;

    return typeof token === "string" && token.length > 0
      ? { token, end: end + 1 }
      : null;
  } catch {
    return null;
  }
};

const tokenizePath = (path: string): string[] | null => {
  if (!path.startsWith("$objects")) return null;

  const tokens = ["$objects"];
  let cursor = "$objects".length;

  while (cursor < path.length) {
    const separator = path[cursor];
    const token = readToken(path, cursor, separator);

    if (!token) return null;

    tokens.push(token.token);
    cursor = token.end;
  }

  return tokens;
};

export const parseCelanworksmithObjectBinding = (
  path: string,
): CelanworksmithObjectBinding | null => {
  const tokens = tokenizePath(path.trim());

  if (!tokens || tokens.length < 2) return null;

  const objectTypeId = tokens[1];

  if (!objectTypeId || !identifier.test(objectTypeId)) return null;

  if (tokens.length === 2) {
    return {
      kind: "objectType",
      objectTypeId,
      propertyPath: "",
      path,
    };
  }

  const instanceId = tokens[2];
  const propertyPath = tokens.slice(3).join(".");

  if (instanceId === "all") {
    return {
      kind: "objectSet",
      objectTypeId,
      propertyPath,
      path,
    };
  }

  return {
    kind: propertyPath ? "property" : "instance",
    objectTypeId,
    instanceId,
    propertyPath,
    path,
  };
};

export const createCelanworksmithObjectDependency = (
  binding: CelanworksmithObjectBinding,
  state: CelanworksmithObjectDependency["status"],
  query?: CelanworksmithObjectDependency["query"],
  updatedAt?: number,
  error?: CelanworksmithObjectDependency["error"],
): CelanworksmithObjectDependency => ({
  ...binding,
  query,
  status: state,
  updatedAt,
  error,
});
