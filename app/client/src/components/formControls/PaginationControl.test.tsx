import {
  getPaginationResetValue,
  shouldResetPagination,
} from "./PaginationControl";

const dependencyCondition =
  "{{!!actionConfiguration.formData.objectTypeId.data}}";
const previousFormValues = {
  actionConfiguration: {
    formData: { objectTypeId: { data: "PurchaseOrder" } },
  },
};
const currentFormValues = {
  actionConfiguration: {
    formData: { objectTypeId: { data: "Supplier" } },
  },
};

describe("PaginationControl dependency reset", () => {
  it("resets opted-in pagination to its configured default", () => {
    expect(
      shouldResetPagination({
        dependencyCondition,
        formValues: currentFormValues,
        prevFormValues: previousFormValues,
        resetOnDependencyChange: true,
      }),
    ).toBe(true);
    expect(getPaginationResetValue({ offset: 0, limit: 50 })).toEqual({
      offset: 0,
      limit: 50,
    });
  });

  it("keeps pagination unchanged when reset is not configured", () => {
    expect(
      shouldResetPagination({
        dependencyCondition,
        formValues: currentFormValues,
        prevFormValues: previousFormValues,
      }),
    ).toBe(false);
  });
});
