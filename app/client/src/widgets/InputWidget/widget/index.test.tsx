import InputWidget, { defaultValueValidation } from "./index";
import type { InputWidgetProps } from "./index";
import _ from "lodash";

const defaultInputWidgetProps: InputWidgetProps = {
  backgroundColor: "",
  borderRadius: "",
  bottomRow: 2,
  inputType: "NUMBER",
  inputValidators: [],
  isLoading: false,
  isValid: true,
  label: "",
  leftColumn: 0,
  parentColumnSpace: 71.75,
  parentRowSpace: 38,
  primaryColor: "",
  renderMode: "CANVAS",
  rightColumn: 100,
  text: "",
  topRow: 0,
  type: "INPUT_WIDGET",
  validation: true,
  version: 1,
  widgetId: "23424",
  widgetName: "input1",
};

describe("#defaultValueValidation", () => {
  const inputs = [
    "",
    "   ",
    "0",
    "123",
    "-23",
    "0.000001",
    -23,
    0,
    100,
    "&*()(",
    "abcd",
  ];
  const expectedOutputs = [
    { isValid: true, parsed: undefined, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: undefined, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: 0, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: 123, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: -23, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: 0.000001, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: -23, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: 0, messages: [{ name: "", message: "" }] },
    { isValid: true, parsed: 100, messages: [{ name: "", message: "" }] },
    {
      isValid: false,
      parsed: undefined,
      messages: [
        {
          name: "TypeError",
          message: "This value must be a number",
        },
      ],
    },
    {
      isValid: false,
      parsed: undefined,
      messages: [
        {
          name: "TypeError",
          message: "This value must be a number",
        },
      ],
    },
  ];

  it("validates correctly for Number type", () => {
    const props = {
      ...defaultInputWidgetProps,
    };

    inputs.forEach((input, index) => {
      const response = defaultValueValidation(input, props, _);

      expect(response).toStrictEqual(expectedOutputs[index]);
    });
  });

  it("validates correctly for Integer type", () => {
    const props = {
      ...defaultInputWidgetProps,
      inputType: "INTEGER",
    };

    inputs.forEach((input, index) => {
      const response = defaultValueValidation(input, props, _);

      expect(response).toStrictEqual(expectedOutputs[index]);
    });
  });

  it("validates correctly for Currency type", () => {
    const props = {
      ...defaultInputWidgetProps,
      inputType: "CURRENCY",
    };

    inputs.forEach((input, index) => {
      const response = defaultValueValidation(input, props, _);

      expect(response).toStrictEqual(expectedOutputs[index]);
    });
  });

  it("validates correctly for Phone Number type", () => {
    const props = {
      ...defaultInputWidgetProps,
      inputType: "PHONE_NUMBER",
    };

    inputs.forEach((input, index) => {
      const response = defaultValueValidation(input, props, _);

      expect(response).toStrictEqual(expectedOutputs[index]);
    });
  });

  it("validates correctly for Number type with undefined value", () => {
    const props = {
      ...defaultInputWidgetProps,
      inputType: "NUMBER",
    };

    const response = defaultValueValidation(undefined, props, _);

    expect(response).toStrictEqual({
      isValid: true,
      parsed: undefined,
      messages: [{ name: "", message: "" }],
    });
  });
});

test("keeps Query values and exposes stable Object property controls", () => {
  const queryView = new InputWidget({
    ...defaultInputWidgetProps,
    dataMode: "QUERY",
    defaultText: "Static query value",
  }).getWidgetView();
  const controls = InputWidget.getPropertyPaneConfig()
    .flatMap((section) => section.children || [])
    .filter((control) =>
      ["objectTypeId", "objectData", "displayPropertyId"].includes(
        control.propertyName,
      ),
    );

  expect(queryView.props.defaultValue).toBe("Static query value");
  expect(controls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        propertyName: "objectTypeId",
        controlType: "CELANWORKSMITH_OBJECT_TYPE",
      }),
      expect.objectContaining({
        propertyName: "displayPropertyId",
        controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
      }),
    ]),
  );
});
