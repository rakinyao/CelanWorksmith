import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { ObjectFormMode } from ".";

const createStubStore = (objectsState: unknown) =>
  createStore(
    () =>
      ({
        celanworksmithObjects: objectsState,
        entities: { canvasWidgets: {} },
        evaluations: { tree: {} },
      }) as never,
  );

const formProps = {
  formMode: "OBJECT",
  objectTypeId: "PurchaseOrder",
  renderMode: "CANVAS",
  widgetId: "Form1",
  widgetName: "Form1",
} as never;

test.each(["idle", "loading", "error"] as const)(
  "renders no recursive FormWidget while object metadata is %s",
  (status) => {
    const store = createStubStore({
      status,
      types: { PurchaseOrder: { status } },
    });
    const { container } = render(
      <Provider store={store}>
        <ObjectFormMode {...formProps} />
      </Provider>,
    );

    expect(container.innerHTML).toBe("");
  },
);
