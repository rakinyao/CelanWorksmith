import React from "react";
import { render } from "test/testUtils";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import CelanworksmithOntologyLoader from "./CelanworksmithOntologyLoader";

const dispatch = jest.fn();
const state = {
  entities: { pageList: { applicationId: "app-1" } },
  celanworksmithApplicationBinding: {
    status: "unbound",
    applicationId: "app-1",
    binding: null,
    projects: [],
    versions: [],
  },
};

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector(state),
}));

describe("CelanworksmithOntologyLoader", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it("does not load compatibility data before the app is bound", () => {
    render(<CelanworksmithOntologyLoader />);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("reloads ontology metadata after an unbound app becomes bound", () => {
    const view = render(<CelanworksmithOntologyLoader />);

    state.celanworksmithApplicationBinding = {
      ...state.celanworksmithApplicationBinding,
      status: "ready",
      binding: {
        applicationId: "app-1",
        projectId: "celanworksmith-demo",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      },
    };

    view.rerender(<CelanworksmithOntologyLoader />);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith(
      celanworksmithOntologyLoadRequest("app-1"),
    );
  });
});
