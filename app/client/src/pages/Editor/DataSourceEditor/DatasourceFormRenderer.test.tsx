import { render } from "@testing-library/react";
import type { Datasource } from "entities/Datasource";
import React from "react";
import DatasourceFormRenderer from "./DatasourceFormRenderer";

describe("DatasourceFormRenderer", () => {
  it("does not crash before an asynchronously loaded plugin form is available", () => {
    const { container } = render(
      <DatasourceFormRenderer
        currentEnvironment="default-env"
        datasource={{ id: "datasource-1" } as Datasource}
        section={undefined}
        viewMode
      />,
    );

    expect(container.innerHTML).toBe("");
  });
});
