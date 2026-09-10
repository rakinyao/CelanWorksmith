import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import i18n from "i18n";
import ConnectedCapabilityTargetBindingControl, {
  CapabilityTargetBindingControl,
  type CapabilityTargetBinding,
} from "./CapabilityTargetBindingControl";

const widgets = {
  "table-id": {
    type: "TABLE_WIDGET",
    widgetName: "Table1",
    primaryColumnId: "contract_id",
  },
  "select-id": {
    type: "SELECT_WIDGET",
    widgetName: "CustomerSelect",
  },
  "multi-id": {
    type: "MULTI_SELECT_WIDGET",
    widgetName: "Customers",
  },
};

const controlProps = {
  configProperty: "actionConfiguration.formData.targetBinding.data",
  controlType: "ONTOLOGY_CAPABILITY_TARGET" as const,
  formName: "QueryEditorForm",
  id: "capability-target",
  isValid: true,
  label: "Target",
  maxItems: 1,
  canonicalKey: "contract_id",
  currentPageWidgets: widgets,
};

function renderControlled(
  initialValue: CapabilityTargetBinding = {
    mode: "MANUAL",
    cardinality: "ONE",
    expression: "",
  },
  overrides: Partial<typeof controlProps> = {},
) {
  const onBindingChange = jest.fn();
  const ControlledControl = () => {
    const [value, setValue] = React.useState(initialValue);

    return (
      <CapabilityTargetBindingControl
        {...controlProps}
        {...overrides}
        onBindingChange={(nextValue) => {
          setValue(nextValue);
          onBindingChange(nextValue);
        }}
        value={value}
      />
    );
  };

  render(<ControlledControl />);

  return onBindingChange;
}

describe("CapabilityTargetBindingControl", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("offers compatible one-target widgets and writes the selected binding", () => {
    const onBindingChange = renderControlled();

    fireEvent.change(screen.getByLabelText("Target source"), {
      target: { value: "WIDGET" },
    });

    const widgetPicker = screen.getByLabelText("Target widget");

    expect(
      within(widgetPicker).getByRole("option", { name: "Table1" }),
    ).not.toBeNull();
    expect(
      within(widgetPicker).getByRole("option", { name: "CustomerSelect" }),
    ).not.toBeNull();
    expect(
      within(widgetPicker).queryByRole("option", { name: "Customers" }),
    ).toBeNull();

    fireEvent.change(widgetPicker, { target: { value: "table-id" } });

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "WIDGET",
      widgetId: "table-id",
      cardinality: "ONE",
      expression: '{{Table1.selectedRow["contract_id"]}}',
    });
  });

  it("uses a Table primaryColumnId when no explicit canonical key is provided", () => {
    const onBindingChange = renderControlled(
      { mode: "MANUAL", cardinality: "ONE", expression: "" },
      {
        canonicalKey: undefined,
        tableCanonicalKey: undefined,
        tableCanonicalKeys: undefined,
      },
    );

    fireEvent.change(screen.getByLabelText("Target source"), {
      target: { value: "WIDGET" },
    });
    fireEvent.change(screen.getByLabelText("Target widget"), {
      target: { value: "table-id" },
    });

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "WIDGET",
      widgetId: "table-id",
      cardinality: "ONE",
      expression: '{{Table1.selectedRow["contract_id"]}}',
    });
  });

  it("displays a legacy canonical target as a manual binding", () => {
    renderControlled({
      source: "SINGLE_OBJECT",
      objectId: "PO002",
    } as unknown as CapabilityTargetBinding);

    expect(
      (
        screen.getByRole("textbox", {
          name: "Target expression",
        }) as HTMLInputElement
      ).value,
    ).toBe("PO002");
  });

  it("hydrates the legacy canonical target through the connected resource path", () => {
    const state = {
      form: {
        QueryEditorForm: {
          values: {
            actionConfiguration: {
              formData: {
                target: {
                  data: {
                    source: "SINGLE_OBJECT",
                    objectId: "PO002",
                  },
                },
              },
            },
          },
        },
      },
    };
    const store = createStore(() => state);

    render(
      <Provider store={store}>
        <ConnectedCapabilityTargetBindingControl {...controlProps} />
      </Provider>,
    );

    expect(
      (
        screen.getByRole("textbox", {
          name: "Target expression",
        }) as HTMLInputElement
      ).value,
    ).toBe("PO002");
  });

  it.each([
    ["one-target Function metadata", 1, false],
    ["many-target Function metadata", 2, true],
    ["missing Function metadata", undefined, false],
    ["invalid Function metadata", 0, false],
  ])(
    "uses %s from the selected native Function dropdown entry",
    (_description, maxItems, exposesManyTarget) => {
      const state = {
        evaluations: {
          triggers: {
            "action-id": {
              "actionConfiguration.formData.functionId.data": {
                fetchDynamicValues: {
                  data:
                    maxItems === undefined
                      ? []
                      : [{ value: "manyScore", maxItems }],
                },
              },
            },
          },
        },
        form: {
          QueryEditorForm: {
            values: {
              id: "action-id",
              actionConfiguration: {
                formData: {
                  functionId: { data: "manyScore" },
                  targetBinding: {
                    data: {
                      mode: "MANUAL",
                      cardinality: "ONE",
                      expression: "",
                    },
                  },
                },
              },
            },
          },
        },
      };
      const store = createStore(() => state);

      render(
        <Provider store={store}>
          <ConnectedCapabilityTargetBindingControl
            {...controlProps}
            functionMetadataConfigProperty="actionConfiguration.formData.functionId.data"
            maxItems={1000}
          />
        </Provider>,
      );

      expect(screen.queryByLabelText("Target cardinality") !== null).toBe(
        exposesManyTarget,
      );
    },
  );

  it("falls back to one target when Function metadata contains a null entry", () => {
    const state = {
      evaluations: {
        triggers: {
          "action-id": {
            "actionConfiguration.formData.functionId.data": {
              fetchDynamicValues: { data: [null] },
            },
          },
        },
      },
      form: {
        QueryEditorForm: {
          values: {
            id: "action-id",
            actionConfiguration: {
              formData: {
                functionId: { data: "manyScore" },
                targetBinding: {
                  data: { mode: "MANUAL", cardinality: "ONE", expression: "" },
                },
              },
            },
          },
        },
      },
    };
    const store = createStore(() => state);

    render(
      <Provider store={store}>
        <ConnectedCapabilityTargetBindingControl
          {...controlProps}
          functionMetadataConfigProperty="actionConfiguration.formData.functionId.data"
          maxItems={1000}
        />
      </Provider>,
    );

    expect(screen.queryByLabelText("Target cardinality")).toBeNull();
  });

  it("switches to manual mode without losing the expression", () => {
    const onBindingChange = renderControlled({
      mode: "WIDGET",
      widgetId: "select-id",
      cardinality: "ONE",
      expression: "{{CustomerSelect.selectedOptionValue}}",
    });

    fireEvent.change(screen.getByLabelText("Target source"), {
      target: { value: "MANUAL" },
    });

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "MANUAL",
      cardinality: "ONE",
      expression: "{{CustomerSelect.selectedOptionValue}}",
    });
    expect(
      (
        screen.getByRole("textbox", {
          name: "Target expression",
        }) as HTMLInputElement
      ).value,
    ).toBe("{{CustomerSelect.selectedOptionValue}}");
  });

  it("does not persist Widget mode before a widget is selected", () => {
    const onBindingChange = renderControlled();

    fireEvent.change(screen.getByLabelText("Target source"), {
      target: { value: "WIDGET" },
    });

    expect(onBindingChange).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText("Target source") as HTMLSelectElement).value,
    ).toBe("WIDGET");
  });

  it("reports a selected widget that was removed from the page", () => {
    renderControlled({
      mode: "WIDGET",
      widgetId: "removed-id",
      cardinality: "ONE",
      expression: "{{RemovedSelect.selectedOptionValue}}",
    });

    expect(screen.getByRole("status").textContent).toContain(
      "Selected widget is no longer available",
    );
  });

  it("offers many-target Table and MultiSelect adapters above one item", () => {
    const onBindingChange = renderControlled(
      { mode: "MANUAL", cardinality: "ONE", expression: "" },
      { maxItems: 2 },
    );

    fireEvent.change(screen.getByLabelText("Target source"), {
      target: { value: "WIDGET" },
    });

    const widgetPicker = screen.getByLabelText("Target widget");

    expect(
      within(widgetPicker).getByRole("option", { name: "Table1 (One)" }),
    ).not.toBeNull();
    expect(
      within(widgetPicker).getByRole("option", { name: "Table1 (Many)" }),
    ).not.toBeNull();
    expect(
      within(widgetPicker).getByRole("option", { name: "CustomerSelect" }),
    ).not.toBeNull();
    expect(
      within(widgetPicker).getByRole("option", { name: "Customers" }),
    ).not.toBeNull();

    fireEvent.change(widgetPicker, { target: { value: "multi-id" } });

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "WIDGET",
      widgetId: "multi-id",
      cardinality: "MANY",
      expression: "{{Customers.selectedOptionValues}}",
    });
  });

  it("lets Function manual mode choose a target cardinality", () => {
    const onBindingChange = renderControlled(
      { mode: "MANUAL", cardinality: "ONE", expression: "{{ids}}" },
      { maxItems: 2 },
    );

    expect(screen.getByLabelText("Target cardinality")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Target cardinality"), {
      target: { value: "MANY" },
    });

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "MANUAL",
      cardinality: "MANY",
      expression: "{{ids}}",
    });
  });

  it("does not offer many cardinality for an Action target", () => {
    renderControlled(
      { mode: "MANUAL", cardinality: "ONE", expression: "PO001" },
      { maxItems: 1 },
    );

    expect(screen.queryByLabelText("Target cardinality")).toBeNull();
  });

  it("revalidates a saved Table binding when bounds and provenance change", () => {
    const onBindingChange = jest.fn();
    const initialValue: CapabilityTargetBinding = {
      mode: "WIDGET",
      widgetId: "table-id",
      cardinality: "MANY",
      expression: "{{Table1.selectedRows.map((row) => row.contract_id)}}",
    };
    const { rerender } = render(
      <CapabilityTargetBindingControl
        {...controlProps}
        maxItems={2}
        onBindingChange={onBindingChange}
        value={initialValue}
      />,
    );

    rerender(
      <CapabilityTargetBindingControl
        {...controlProps}
        canonicalKey="customer_id"
        maxItems={1}
        onBindingChange={onBindingChange}
        value={initialValue}
      />,
    );

    expect(onBindingChange).toHaveBeenLastCalledWith({
      mode: "WIDGET",
      widgetId: "table-id",
      cardinality: "ONE",
      expression: '{{Table1.selectedRow["customer_id"]}}',
    });
  });
});
