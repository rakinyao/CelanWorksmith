import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FunctionParametersControl } from "./FunctionParametersControl";

const metadata = [
  {
    value: "poId",
    label: "Purchase Order ID",
    dataType: "STRING",
    required: true,
  },
  {
    value: "createdAt",
    label: "Created at",
    dataType: "TIMESTAMP",
    readOnly: true,
  },
  {
    value: "delayDays",
    label: "Delay days",
    dataType: "INTEGER",
    derived: true,
  },
];

const controlProps = {
  configProperty: "actionConfiguration.formData.parameters.data",
  controlType: "FUNCTION_PARAMETERS" as const,
  formName: "QueryEditorForm",
  id: "function-parameters",
  isValid: true,
  label: "Parameters",
};

describe("FunctionParametersControl", () => {
  it("renders writable metadata and preserves an expression in the parameter map", async () => {
    const onParametersChange = jest.fn();
    const ControlledFunctionParameters = () => {
      const [parameterValues, setParameterValues] = React.useState<
        Record<string, unknown>
      >({});

      return (
        <FunctionParametersControl
          {...controlProps}
          functionId="CalculateDelayDays"
          metadata={metadata}
          onParametersChange={(parameters) => {
            setParameterValues(parameters);
            onParametersChange(parameters);
          }}
          parameterValues={parameterValues}
        />
      );
    };

    render(<ControlledFunctionParameters />);

    expect(screen.getByText("Purchase Order ID (STRING)")).not.toBeNull();
    expect(screen.queryByText("Created at (TIMESTAMP)")).toBeNull();
    expect(screen.queryByText("Delay days (INTEGER)")).toBeNull();

    fireEvent.change(
      screen.getByRole("textbox", { name: /Purchase Order ID \(STRING\)/ }),
      { target: { value: "{{Table1.selectedRow.id}}" } },
    );

    expect(onParametersChange).toHaveBeenLastCalledWith({
      poId: "{{Table1.selectedRow.id}}",
    });
  });
});
