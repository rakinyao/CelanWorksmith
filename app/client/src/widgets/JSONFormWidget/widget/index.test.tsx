import type React from "react";
import JSONFormWidget from ".";

test("keeps legacy Query form values on the native JSONForm path", () => {
  const widget = new JSONFormWidget({
    formData: { supplierName: "Acme Corp" },
    sourceData: { supplierName: "Acme Corp" },
  } as never);
  const view = widget.getWidgetView() as React.ReactElement<{
    getFormData: () => Record<string, unknown>;
  }>;

  expect(view.props.getFormData()).toEqual({ supplierName: "Acme Corp" });
});

test("passes native source data to the existing JSONForm component", () => {
  const widget = new JSONFormWidget({
    formData: { supplierName: "Acme Corp" },
    sourceData: { supplierName: "Acme Corp" },
  } as never);
  const view = widget.getWidgetView() as React.ReactElement<{
    getFormData: () => Record<string, unknown>;
    showConnectDataOverlay: boolean;
  }>;

  expect(view.props.getFormData()).toEqual({ supplierName: "Acme Corp" });
  expect(view.props.showConnectDataOverlay).toBe(false);
});
