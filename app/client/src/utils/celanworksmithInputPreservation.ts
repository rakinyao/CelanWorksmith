export interface CelanworksmithInputState {
  path: string;
  localValue: unknown;
  remoteValue: unknown;
  dirty: boolean;
  conflict: boolean;
  updatedAt: number;
}

export const preserveCelanworksmithLocalInput = (
  current: CelanworksmithInputState | undefined,
  remoteValue: unknown,
): CelanworksmithInputState => {
  if (!current || !current.dirty) {
    return {
      path: current?.path || "",
      localValue: remoteValue,
      remoteValue,
      dirty: false,
      conflict: false,
      updatedAt: current?.updatedAt || 0,
    };
  }

  return {
    ...current,
    remoteValue,
    conflict: !Object.is(current.remoteValue, remoteValue),
    updatedAt: current.updatedAt,
  };
};
