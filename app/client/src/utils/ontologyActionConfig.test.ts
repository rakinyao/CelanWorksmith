import { ontologyDefaultActionConfiguration } from "./ontologyActionConfig";

describe("ontologyDefaultActionConfiguration", () => {
  it("persists the default object-query operation for manually created queries", () => {
    expect(ontologyDefaultActionConfiguration()).toEqual({
      formData: {
        operation: { data: "OBJECT_QUERY" },
        queryMode: { data: "BUILDER" },
      },
    });
  });
});
