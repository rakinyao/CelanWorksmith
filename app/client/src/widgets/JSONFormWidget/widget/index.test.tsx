import type React from "react";
import JSONFormWidget from ".";
import ObjectFormMode from "../component/ObjectFormMode";

test("keeps legacy Query form values on the native JSONForm path", () => {
  const widget = new JSONFormWidget({
    formData: { supplierName: "Acme Corp" },
    formMode: "QUERY",
    sourceData: { supplierName: "Acme Corp" },
  } as never);
  const view = widget.getWidgetView() as React.ReactElement<{
    getFormData: () => Record<string, unknown>;
  }>;

  expect(view.type).not.toBe(ObjectFormMode);
  expect(view.props.getFormData()).toEqual({ supplierName: "Acme Corp" });
});
