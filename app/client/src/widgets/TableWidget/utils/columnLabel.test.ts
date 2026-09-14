import { getColumnLabel } from "./columnLabel";

describe("getColumnLabel", () => {
  it("uses a supplied semantic label for a table column", () => {
    expect(getColumnLabel({ customer_name: "客户名称" }, "customer_name")).toBe(
      "客户名称",
    );
  });

  it("keeps the stable field name when no semantic label exists", () => {
    expect(getColumnLabel({}, "customer_name")).toBe("customer_name");
  });
});
