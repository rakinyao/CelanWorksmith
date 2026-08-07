import {
  getCelanworksmithObjectMetadataState,
  getCelanworksmithObjectTypeOptions,
  getCelanworksmithPropertyOptions,
} from "./celanworksmithObjectMetadataSelectors";

const readyState = {
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
          displayName: "Customer / 客户",
          properties: [
            {
              id: "name",
              displayName: "Name / 名称",
              dataType: "STRING",
              required: true,
              readOnly: false,
              derived: false,
            },
            {
              id: "name",
              displayName: "Duplicate name / 重复名称",
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
          displayName: "Account / 账户",
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
        searchText: "Account / 账户 account",
      },
      {
        value: "customer",
        label: "Customer / 客户",
        description: "customer",
        searchText: "Customer / 客户 customer",
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
        dataType: "STRING",
        readOnly: false,
        derived: false,
      },
      {
        value: "score",
        label: "Score / 分数",
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

  it("returns no Property options for a missing Object Type", () => {
    expect(
      getCelanworksmithPropertyOptions(readyState as never, "deleted-type"),
    ).toEqual([]);
  });
});
