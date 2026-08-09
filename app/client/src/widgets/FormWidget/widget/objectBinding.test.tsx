import { fireEvent, screen, waitFor } from "@testing-library/react";
import { RenderModes } from "constants/WidgetConstants";
import { renderEvaluatedPageDsl } from "test/pageDslEvaluationHarness";
import { CanvasFactory } from "test/factories/Widgets/CanvasFactory";
import { FormFactory } from "test/factories/Widgets/FormFactory";
import { widgetCanvasFactory } from "test/factories/WidgetFactoryUtils";
import type { DSLWidget } from "WidgetProvider/types";
import type { WidgetProps } from "widgets/BaseWidget";
import type { InputWidgetProps } from "widgets/InputWidget/widget";
import { isObjectFormInputValid } from ".";

jest.mock(
  "layoutSystems/fixedlayout/common/widgetGrouping/WidgetsMultiSelectBox",
  () => ({
    __esModule: true,
    default: () => null,
  }),
);
jest.mock("widgets/withLazyRender", () => ({
  __esModule: true,
  withLazyRender: (Widget: unknown) => Widget,
}));

const FORM_ID = "ObjectForm";
const FORM_CANVAS_ID = "ObjectFormCanvas";
const INPUT_ID = "ObjectAmountInput";
const INPUT_NAME = "ObjectAmountInput";
const SUBMIT_ID = "ObjectSubmitButton";

const objectPropertyMetadata = {
  dataType: "INTEGER",
  derived: false,
  displayName: "Amount",
  id: "amount",
  readOnly: false,
  required: true,
};

const objectData = {
  id: "PO001",
  properties: { amount: "not-a-number" },
  typeId: "PurchaseOrder",
};

const createObjectFormDsl = (
  buttonType: "BUTTON_WIDGET" | "FORM_BUTTON_WIDGET" = "BUTTON_WIDGET",
) => {
  const input = {
    bottomRow: 4,
    dataMode: "OBJECT",
    defaultText: "not-a-number",
    displayPropertyId: "amount",
    inputType: "TEXT",
    inputValidators: [],
    isDisabled: false,
    isRequired: false,
    isVisible: true,
    label: "Amount",
    leftColumn: 0,
    parentColumnSpace: 1,
    parentId: FORM_CANVAS_ID,
    parentRowSpace: 1,
    rightColumn: 24,
    topRow: 0,
    type: "INPUT_WIDGET",
    validation: true,
    widgetId: INPUT_ID,
    widgetName: INPUT_NAME,
  };
  const submitButton = {
    bottomRow: 8,
    disabledWhenInvalid: true,
    isVisible: true,
    leftColumn: 0,
    parentColumnSpace: 1,
    parentId: FORM_CANVAS_ID,
    parentRowSpace: 1,
    rightColumn: 12,
    text: "Submit",
    topRow: 5,
    type: buttonType,
    widgetId: SUBMIT_ID,
    widgetName: "ObjectSubmitButton",
  };
  const formCanvas = CanvasFactory.build({
    children: [input, submitButton] as unknown as WidgetProps[],
    parentId: FORM_ID,
    renderMode: RenderModes.PAGE,
    widgetId: FORM_CANVAS_ID,
    widgetName: "ObjectFormCanvas",
  });
  const form = FormFactory.build({
    children: [formCanvas] as unknown as WidgetProps[],
    data: {},
    formMode: "OBJECT",
    objectData,
    objectTypeId: "PurchaseOrder",
    parentId: "0",
    renderMode: RenderModes.PAGE,
    widgetId: FORM_ID,
    widgetName: "ObjectForm",
  });

  return widgetCanvasFactory.build({
    children: [form] as unknown as WidgetProps[],
    renderMode: RenderModes.PAGE,
  }) as unknown as DSLWidget;
};

test("rejects missing, mismatched, and incomplete Object inputs", () => {
  const input = {
    dataMode: "OBJECT",
    displayPropertyId: "amount",
    isDirty: true,
    objectTypeId: "PurchaseOrder",
    text: "12",
  } as Partial<InputWidgetProps>;

  expect(
    isObjectFormInputValid(
      input,
      undefined,
      [objectPropertyMetadata],
      undefined,
      "PurchaseOrder",
    ),
  ).toBe(false);
  expect(
    isObjectFormInputValid(
      input,
      {
        objectData: { ...objectData, typeId: "Supplier" },
      },
      [objectPropertyMetadata],
      objectData,
      "PurchaseOrder",
    ),
  ).toBe(false);
  expect(
    isObjectFormInputValid(
      { ...input, objectTypeId: "Supplier" },
      undefined,
      [objectPropertyMetadata],
      objectData,
      "PurchaseOrder",
    ),
  ).toBe(false);
  expect(
    isObjectFormInputValid(
      input,
      { objectTypeId: "Supplier" },
      [objectPropertyMetadata],
      objectData,
      "PurchaseOrder",
    ),
  ).toBe(false);
  expect(
    isObjectFormInputValid(
      input,
      undefined,
      [objectPropertyMetadata],
      { ...objectData, properties: {} },
      "PurchaseOrder",
    ),
  ).toBe(false);
});

test.each(["BUTTON_WIDGET", "FORM_BUTTON_WIDGET"] as const)(
  "resolves Object metadata through the Form Canvas lifecycle for %s",
  async (buttonType) => {
    const page = await renderEvaluatedPageDsl({
      dsl: createObjectFormDsl(buttonType),
      initialState: {
        celanworksmithObjects: {
          status: "ready",
          types: {
            PurchaseOrder: {
              items: [],
              limit: 100,
              metadata: {
                displayName: "Purchase order",
                id: "PurchaseOrder",
                properties: [objectPropertyMetadata],
              },
              offset: 0,
              status: "ready",
              total: 0,
            },
          },
        },
      },
    });

    await waitFor(() => {
      expect(page.store.getState().entities.meta).toMatchObject({
        [FORM_ID]: {
          objectBinding: {
            instance: objectData,
            objectTypeId: "PurchaseOrder",
          },
        },
        [INPUT_ID]: {
          objectPropertyMetadata,
        },
      });
    });

    await page.reevaluate();

    expect(page.getEvaluatedWidget("ObjectForm")).toMatchObject({
      objectData,
      objectTypeId: "PurchaseOrder",
    });
    expect(page.getEvaluatedWidget("ObjectSubmitButton")).toMatchObject({
      isFormValid: false,
    });

    await waitFor(() => {
      expect(page.getEvaluatedWidget(INPUT_NAME)).toMatchObject({
        isValid: false,
        objectPropertyMetadata: {
          dataType: "INTEGER",
          required: true,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeTruthy();
    });
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "12" },
    });
    await page.reevaluate();

    await waitFor(() => {
      expect(page.getEvaluatedWidget(INPUT_NAME)).toMatchObject({
        isDirty: true,
        isValid: true,
      });
    });
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  },
  30_000,
);
