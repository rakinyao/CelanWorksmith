import React from "react";
import { fireEvent, render } from "test/testUtils";
import { EditorTheme } from "components/editorComponents/CodeEditor/EditorConfig";
import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";
import CelanworksmithObjectPropertyControl from "./CelanworksmithObjectPropertyControl";

const dispatch = jest.fn();
let state: Record<string, unknown>;

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (value: unknown) => unknown) => selector(state),
}));

const properties = [
  {
    id: "customer-name",
    displayName: "Customer name / 客户名称",
    description: { en: "Customer contact name", zh: "客户联系人名称" },
    dataType: "STRING",
    required: true,
    readOnly: false,
    derived: false,
  },
  {
    id: "score",
    displayName: "Score / 分数",
    dataType: "NUMBER",
    required: false,
    readOnly: true,
    derived: true,
  },
];

const getControlProps = (propertyValue = "") => ({
  additionalDynamicData: {},
  controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
  deleteProperties: jest.fn(),
  evaluatedValue: undefined,
  isBindProperty: false,
  isTriggerProperty: false,
  label: "Property / 属性",
  onPropertyChange: jest.fn(),
  openNextPanel: jest.fn(),
  parentPropertyName: "",
  parentPropertyValue: undefined,
  propertyName: "displayPropertyId",
  propertyValue,
  theme: EditorTheme.LIGHT,
  widgetProperties: { objectTypeId: "customer" },
});

const setMetadataState = (status: string, objectTypeId = "customer") => {
  state = {
    entities: {
      pageList: {
        applicationId: "app-1",
      },
    },
    celanworksmithObjects: {
      status,
      types:
        objectTypeId === "customer"
          ? {
              customer: {
                status: "ready",
                items: [],
                total: 0,
                offset: 0,
                limit: 100,
                metadata: {
                  id: "customer",
                  displayName: "Customer / 客户",
                  properties,
                },
              },
            }
          : {},
    },
  };
};

describe("CelanworksmithObjectPropertyControl", () => {
  beforeEach(() => {
    dispatch.mockClear();
    setMetadataState("ready");
  });

  it("writes a stable Property ID and searches by display name or ID", () => {
    const props = getControlProps();
    const view = render(<CelanworksmithObjectPropertyControl {...props} />);
    const search = view.getByLabelText("Search properties / 搜索属性");

    fireEvent.change(search, { target: { value: "score" } });
    expect(view.getByText("Score / 分数 (score)")).toBeTruthy();
    expect(
      view.queryByText("Customer name / 客户名称 (customer-name)"),
    ).toBeNull();

    fireEvent.change(search, { target: { value: "客户名称" } });
    fireEvent.change(view.getByLabelText("Property / 属性"), {
      target: { value: "customer-name" },
    });

    expect(props.onPropertyChange).toHaveBeenCalledWith(
      "displayPropertyId",
      "customer-name",
      undefined,
    );
  });

  it("shows filtered semantic help for the selected Property", () => {
    const view = render(
      <CelanworksmithObjectPropertyControl
        {...getControlProps("customer-name")}
      />,
    );

    expect(
      view.getByText(
        "Semantic description / 语义描述: Customer contact name / 客户联系人名称",
      ),
    ).toBeTruthy();
  });

  it("limits Properties to the selected Object Type and explains missing metadata", () => {
    const props = getControlProps();

    props.widgetProperties = {};
    const noType = render(<CelanworksmithObjectPropertyControl {...props} />);

    expect(
      (noType.getByLabelText("Property / 属性") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      noType.getByText("Select an object type / 请选择对象类型"),
    ).toBeTruthy();

    setMetadataState("empty", "deleted-type");
    const missing = render(
      <CelanworksmithObjectPropertyControl {...getControlProps()} />,
    );

    expect(missing.getByText("No properties / 没有属性")).toBeTruthy();
  });

  it("disables while loading and preserves invalid IDs with an error retry", () => {
    setMetadataState("loading", "deleted-type");
    const loading = render(
      <CelanworksmithObjectPropertyControl {...getControlProps()} />,
    );

    expect(
      (loading.getByLabelText("Property / 属性") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      loading.getByText("Loading object metadata / 正在加载对象元数据"),
    ).toBeTruthy();

    setMetadataState("error", "deleted-type");
    state = {
      ...state,
      celanworksmithObjects: {
        status: "error",
        types: {},
        error: { code: "METADATA_ERROR", message: "Metadata unavailable" },
      },
    };
    const error = render(
      <CelanworksmithObjectPropertyControl
        {...getControlProps("deleted-property")}
      />,
    );

    expect(error.getByText("deleted-property (missing / 已删除)")).toBeTruthy();
    fireEvent.click(error.getByText("Retry / 重试"));

    expect(dispatch).toHaveBeenCalledWith(celanworksmithObjectsLoadRequest());
  });

  it("preserves the selected stable ID while cached metadata refreshes", () => {
    setMetadataState("loading");
    const view = render(
      <CelanworksmithObjectPropertyControl
        {...getControlProps("customer-name")}
      />,
    );

    expect(
      (view.getByLabelText("Property / 属性") as HTMLSelectElement).value,
    ).toBe("customer-name");
    expect(
      view.getByText("Refreshing object metadata / 正在刷新对象元数据"),
    ).toBeTruthy();
  });

  it("retries an App Binding error through its action contract", () => {
    state = {
      ...state,
      celanworksmithApplicationBinding: {
        status: "error",
        applicationId: "app-1",
        error: { code: "BINDING_ERROR", message: "Binding unavailable" },
      },
    };
    const error = render(
      <CelanworksmithObjectPropertyControl {...getControlProps()} />,
    );

    fireEvent.click(error.getByText("Retry / 重试"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST",
      payload: { applicationId: "app-1" },
    });
  });
});
