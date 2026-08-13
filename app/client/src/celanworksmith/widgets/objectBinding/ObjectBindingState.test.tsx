import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import ObjectBindingState from "./ObjectBindingState";

describe("ObjectBindingState", () => {
  it("renders a polite bilingual loading state", () => {
    render(<ObjectBindingState status="loading" />);

    expect(
      screen.getByText("Loading object data / 正在加载本体数据"),
    ).toHaveAttribute("aria-live", "polite");
  });

  it("renders a readable alert for a repairable binding error", () => {
    render(
      <ObjectBindingState
        diagnostic="Select an ontology Object Type."
        status="typeMismatch"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select an ontology Object Type.",
    );
  });

  it("preserves a runtime error message", () => {
    render(
      <ObjectBindingState errorMessage="Runtime unavailable" status="error" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Runtime unavailable");
  });
});
