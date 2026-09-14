import { getOntologyColumnLabels } from "./ontologyColumnLabels";

describe("getOntologyColumnLabels", () => {
  it("reads the ontology column labels returned with a query response", () => {
    expect(
      getOntologyColumnLabels({
        "X-CELANWORKSHOP-COLUMN-LABELS": [
          '{"customer_name":"客户名称","signed_amount":"签约金额"}',
        ],
      }),
    ).toEqual({
      customer_name: "客户名称",
      signed_amount: "签约金额",
    });
  });
});
