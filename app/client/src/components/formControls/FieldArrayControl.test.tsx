import { shouldResetFieldArray } from "./FieldArrayControl";

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

describe("FieldArrayControl dependency reset", () => {
  it("resets an opted-in array when its dependency changes", () => {
    expect(
      shouldResetFieldArray({
        dependencyCondition,
        formValues: currentFormValues,
        prevFormValues: previousFormValues,
        resetOnDependencyChange: true,
      }),
    ).toBe(true);
  });

  it("keeps an array unchanged when reset is not configured", () => {
    expect(
      shouldResetFieldArray({
        dependencyCondition,
        formValues: currentFormValues,
        prevFormValues: previousFormValues,
      }),
    ).toBe(false);
  });
});
