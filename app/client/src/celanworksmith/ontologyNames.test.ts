import {
  getOntologyNamePresentation,
  type OntologyNameMetadata,
} from "./ontologyNames";

describe("getOntologyNamePresentation", () => {
  it("builds a label and search text from display and localized names", () => {
    const metadata: OntologyNameMetadata = {
      id: "purchaseOrder",
      displayName: "Purchase Order",
      localizedName: "采购订单",
    };

    expect(getOntologyNamePresentation(metadata)).toEqual({
      id: "purchaseOrder",
      label: "Purchase Order / 采购订单",
      searchText: "Purchase Order 采购订单 purchaseOrder",
    });
  });

  it("trims blank aliases and does not repeat the display name", () => {
    expect(
      getOntologyNamePresentation({
        id: "status",
        displayName: " Status ",
        localizedName: "  ",
        chineseName: "状态",
        nameZh: " Status ",
      }),
    ).toEqual({
      id: "status",
      label: "Status / 状态",
      searchText: "Status 状态 status",
    });
  });

  it("keeps distinct metadata entries with duplicate display names distinct", () => {
    expect(
      [
        { id: "first", displayName: "Owner" },
        { id: "second", displayName: "Owner" },
      ].map(getOntologyNamePresentation),
    ).toEqual([
      { id: "first", label: "Owner", searchText: "Owner first" },
      { id: "second", label: "Owner", searchText: "Owner second" },
    ]);
  });
});
