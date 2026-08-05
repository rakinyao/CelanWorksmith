import React from "react";
import { render } from "test/testUtils";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import CelanworksmithOntologyLoader from "./CelanworksmithOntologyLoader";

const dispatch = jest.fn();

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
}));

describe("CelanworksmithOntologyLoader", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it("requests ontology metadata once for the editor root", () => {
    render(<CelanworksmithOntologyLoader />);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(celanworksmithOntologyLoadRequest());
  });
});
