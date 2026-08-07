import React from "react";
import { fireEvent, render } from "test/testUtils";
import { EditorTheme } from "components/editorComponents/CodeEditor/EditorConfig";
import { celanworksmithApplicationBindingLoadRequest } from "actions/celanworksmithApplicationBindingActions";
import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";
import CelanworksmithObjectTypeControl from "./CelanworksmithObjectTypeControl";

const dispatch = jest.fn();
let state: Record<string, unknown>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (value: unknown) => unknown) => selector(state),
}));

const objectTypes = {
  customer: {
    status: "ready",
    items: [],
    total: 0,
    offset: 0,
    limit: 100,
    metadata: {
      id: "customer",
      displayName: "Customer / 客户",
      properties: [],
    },
  },
  order: {
    status: "ready",
    items: [],
    total: 0,
    offset: 0,
    limit: 100,
    metadata: {
      id: "order",
      displayName: "Order / 订单",
      properties: [],
    },
  },
};

const getControlProps = (propertyValue = "") => ({
  additionalDynamicData: {},
  controlType: "CELANWORKSMITH_OBJECT_TYPE",
  deleteProperties: jest.fn(),
  evaluatedValue: undefined,
  isBindProperty: false,
  isTriggerProperty: false,
  label: "Object type / 对象类型",
  onPropertyChange: jest.fn(),
  openNextPanel: jest.fn(),
  parentPropertyName: "",
  parentPropertyValue: undefined,
  propertyName: "objectTypeId",
  propertyValue,
  theme: EditorTheme.LIGHT,
  widgetProperties: {},
});

const setMetadataState = (status: string, types = objectTypes) => {
  state = {
    celanworksmithApplicationBinding: {
      status: "ready",
      applicationId: "app-1",
      binding: {
        applicationId: "app-1",
        projectId: "project-1",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      },
      projects: [],
      versions: [],
    },
    celanworksmithObjects: { status, types },
  };
};

describe("CelanworksmithObjectTypeControl", () => {
  beforeEach(() => {
    dispatch.mockClear();
    setMetadataState("ready");
  });

  it("writes a stable Object Type ID and searches by display name or ID", () => {
    const props = getControlProps();
    const view = render(<CelanworksmithObjectTypeControl {...props} />);
    const search = view.getByLabelText("Search object types / 搜索对象类型");

    fireEvent.change(search, { target: { value: "订单" } });
    expect(view.getByText("Order / 订单 (order)")).toBeTruthy();
    expect(view.queryByText("Customer / 客户 (customer)")).toBeNull();

    fireEvent.change(search, { target: { value: "customer" } });
    fireEvent.change(view.getByLabelText("Object type / 对象类型"), {
      target: { value: "customer" },
    });

    expect(props.onPropertyChange).toHaveBeenCalledWith(
      "objectTypeId",
      "customer",
      undefined,
    );
  });

  it("disables selection while metadata loads and describes an empty result", () => {
    setMetadataState("loading", {});
    const loading = render(
      <CelanworksmithObjectTypeControl {...getControlProps()} />,
    );

    expect(
      (loading.getByLabelText("Object type / 对象类型") as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    expect(
      loading.getByText("Loading object metadata / 正在加载对象元数据"),
    ).toBeTruthy();

    setMetadataState("empty", {});
    const empty = render(
      <CelanworksmithObjectTypeControl {...getControlProps()} />,
    );

    expect(empty.getByText("No object types / 没有对象类型")).toBeTruthy();
  });

  it("shows error retry and preserves an invalid stable ID for repair", () => {
    setMetadataState("error", {});
    state = {
      ...state,
      celanworksmithObjects: {
        status: "error",
        types: {},
        error: { code: "METADATA_ERROR", message: "Metadata unavailable" },
      },
    };
    const error = render(
      <CelanworksmithObjectTypeControl {...getControlProps("deleted-type")} />,
    );

    expect(error.getByText("deleted-type (missing / 已删除)")).toBeTruthy();
    expect(error.getByText("Metadata unavailable")).toBeTruthy();
    fireEvent.click(error.getByText("Retry / 重试"));

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithObjectsLoadRequest("app-1"),
    );
  });

  it("retries an App Binding error through the existing binding loader", () => {
    state = {
      ...state,
      celanworksmithApplicationBinding: {
        ...state.celanworksmithApplicationBinding,
        status: "error",
        error: { code: "BINDING_ERROR", message: "Binding unavailable" },
      },
    };
    const error = render(
      <CelanworksmithObjectTypeControl {...getControlProps()} />,
    );

    fireEvent.click(error.getByText("Retry / 重试"));

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithApplicationBindingLoadRequest("app-1"),
    );
  });
});
