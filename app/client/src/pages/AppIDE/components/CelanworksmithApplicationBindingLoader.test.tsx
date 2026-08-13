import React from "react";
import { render } from "test/testUtils";
import CelanworksmithApplicationBindingLoader from "./CelanworksmithApplicationBindingLoader";
import { celanworksmithApplicationBindingLoadRequest } from "actions/celanworksmithApplicationBindingActions";

const dispatch = jest.fn();

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ entities: { pageList: { applicationId: "app-1" } } }),
}));

describe("CelanworksmithApplicationBindingLoader", () => {
  beforeEach(() => dispatch.mockClear());

  it("loads binding once for the current application", () => {
    render(<CelanworksmithApplicationBindingLoader />);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithApplicationBindingLoadRequest("app-1"),
    );
  });
});
