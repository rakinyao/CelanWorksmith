import {
  getCelanworksmithObjectMetadataState,
  getCelanworksmithObjectTypeOptions,
  getCelanworksmithPropertyOptions,
} from "./celanworksmithObjectMetadataSelectors";

const readyState = {
  entities: {
    pageList: {
      applicationId: "app-1",
    },
  },
  celanworksmithObjects: {
    status: "ready",
    types: {
      customer: {
        status: "ready",
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        metadata: {
          id: "customer",
          displayName: "Customer",
          localizedName: "客户",
          chineseName: "顾客",
          properties: [
            {
              id: "name",
              displayName: "Name",
              localizedName: "名称",
              dataType: "STRING",
              required: true,
              readOnly: false,
              derived: false,
            },
            {
              id: "name",
              displayName: "Duplicate name",
              nameZh: "重复名称",
              dataType: "STRING",
              required: false,
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
            {
              id: "owner",
              displayName: "Owner",
              localizedName: "负责人",
              dataType: "STRING",
              required: false,
              readOnly: false,
              derived: false,
            },
            {
              id: "assignee",
              displayName: "Owner",
              localizedName: "负责人",
              dataType: "STRING",
              required: false,
              readOnly: false,
              derived: false,
            },
          ],
        },
      },
      account: {
        status: "ready",
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        metadata: {
          id: "account",
          displayName: "Account",
          localizedName: "账户",
          properties: [],
        },
      },
      duplicateCustomer: {
        status: "ready",
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        metadata: {
          id: "customer",
          displayName: "Z duplicate / 重复",
          properties: [],
        },
      },
    },
  },
};

describe("celanworksmithObjectMetadataSelectors", () => {
  it("returns sorted, stable Object Type options from ready metadata", () => {
    expect(getCelanworksmithObjectTypeOptions(readyState as never)).toEqual([
      {
        value: "account",
        label: "Account / 账户",
        description: "account",
        searchText: "Account 账户 account",
      },
      {
        value: "customer",
        label: "Customer / 客户 / 顾客",
        description: "customer",
        searchText: "Customer 客户 顾客 customer",
      },
    ]);
  });

  it("returns property metadata once per stable Property ID", () => {
    expect(
      getCelanworksmithPropertyOptions(readyState as never, "customer"),
    ).toEqual([
      {
        value: "name",
        label: "Name / 名称",
        searchText: "Name 名称 name",
        dataType: "STRING",
        readOnly: false,
        derived: false,
      },
      {
        value: "assignee",
        label: "Owner / 负责人",
        searchText: "Owner 负责人 assignee",
        dataType: "STRING",
        readOnly: false,
        derived: false,
      },
      {
        value: "owner",
        label: "Owner / 负责人",
        searchText: "Owner 负责人 owner",
        dataType: "STRING",
        readOnly: false,
        derived: false,
      },
      {
        value: "score",
        label: "Score / 分数",
        searchText: "Score / 分数 score",
        dataType: "NUMBER",
        readOnly: true,
        derived: true,
      },
    ]);
  });

  it("exposes loading and empty metadata states", () => {
    expect(
      getCelanworksmithObjectMetadataState({
        ...readyState,
        celanworksmithObjects: { status: "loading", types: {} },
      } as never),
    ).toMatchObject({ status: "loading", isBound: true });

    expect(
      getCelanworksmithObjectMetadataState({
        ...readyState,
        celanworksmithObjects: { status: "empty", types: {} },
      } as never),
    ).toMatchObject({ status: "empty", isBound: true });
  });

  it("keeps cached metadata ready when an object refresh reports an error", () => {
    expect(
      getCelanworksmithObjectMetadataState({
        ...readyState,
        celanworksmithObjects: {
          ...readyState.celanworksmithObjects,
          status: "error",
          error: { code: "REFRESH_ERROR", message: "Refresh failed" },
        },
      } as never),
    ).toEqual({
      status: "ready",
      isBound: true,
      applicationId: "app-1",
      error: { code: "REFRESH_ERROR", message: "Refresh failed" },
    });
  });

  it("returns no Property options for a missing Object Type", () => {
    expect(
      getCelanworksmithPropertyOptions(readyState as never, "deleted-type"),
    ).toEqual([]);
  });
});
