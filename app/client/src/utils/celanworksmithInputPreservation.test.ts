import {
  preserveCelanworksmithLocalInput,
  type CelanworksmithInputState,
} from "./celanworksmithInputPreservation";

const currentInput = (
  overrides: Partial<CelanworksmithInputState> = {},
): CelanworksmithInputState => ({
  path: "Table1.data",
  localValue: "local",
  remoteValue: "remote",
  dirty: false,
  conflict: false,
  updatedAt: 1,
  ...overrides,
});

describe("preserveCelanworksmithLocalInput", () => {
  it("adopts remote data for an unmodified input", () => {
    expect(preserveCelanworksmithLocalInput(currentInput(), "latest")).toEqual(
      expect.objectContaining({
        localValue: "latest",
        remoteValue: "latest",
        dirty: false,
        conflict: false,
      }),
    );
  });

  it("keeps a dirty input while recording an unchanged remote value", () => {
    expect(
      preserveCelanworksmithLocalInput(currentInput({ dirty: true }), "remote"),
    ).toEqual(
      expect.objectContaining({
        localValue: "local",
        remoteValue: "remote",
        dirty: true,
        conflict: false,
      }),
    );
  });

  it("marks a dirty input as conflicted when remote data changes", () => {
    expect(
      preserveCelanworksmithLocalInput(
        currentInput({ dirty: true }),
        "new remote",
      ),
    ).toEqual(
      expect.objectContaining({
        localValue: "local",
        remoteValue: "new remote",
        dirty: true,
        conflict: true,
      }),
    );
  });

  it("creates a clean input state when no local state exists", () => {
    expect(preserveCelanworksmithLocalInput(undefined, "initial")).toEqual(
      expect.objectContaining({
        localValue: "initial",
        remoteValue: "initial",
        dirty: false,
        conflict: false,
      }),
    );
  });
});
