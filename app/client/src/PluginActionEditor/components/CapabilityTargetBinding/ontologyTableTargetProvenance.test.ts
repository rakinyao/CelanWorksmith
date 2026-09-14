import { resolveOntologyTableTargetProvenance } from "./ontologyTableTargetProvenance";

describe("resolveOntologyTableTargetProvenance", () => {
  it("recognizes a Table backed by an Ontology Object Query for its owner type", () => {
    expect(
      resolveOntologyTableTargetProvenance(
        {
          type: "TABLE_WIDGET",
          tableData: "{{CustomerQuery.data}}",
        },
        [
          {
            config: { name: "CustomerQuery" },
            actionConfiguration: {
              formData: {
                operation: { data: "OBJECT_QUERY" },
                objectTypeId: { data: "Customer" },
              },
            },
          },
        ],
      ),
    ).toEqual({ objectTypeId: "Customer" });
  });

  it.each(["TABLE_WIDGET_V2", "WDS_TABLE_WIDGET"])(
    "recognizes an Ontology Object Query for current Table type %s",
    (type) => {
      expect(
        resolveOntologyTableTargetProvenance(
          { type, tableData: "{{CustomerQuery.data}}" },
          [
            {
              config: { name: "CustomerQuery" },
              actionConfiguration: {
                formData: {
                  operation: { data: "OBJECT_QUERY" },
                  objectTypeId: { data: "Customer" },
                },
              },
            },
          ],
        ),
      ).toEqual({ objectTypeId: "Customer" });
    },
  );

  it("reads Object Query form data from the current-page ActionData config", () => {
    expect(
      resolveOntologyTableTargetProvenance(
        {
          type: "TABLE_WIDGET",
          tableData: "{{CustomerQuery.data}}",
        },
        [
          {
            config: {
              name: "CustomerQuery",
              actionConfiguration: {
                formData: {
                  operation: { data: "OBJECT_QUERY" },
                  objectTypeId: { data: "Customer" },
                },
              },
            },
          },
        ],
      ),
    ).toEqual({ objectTypeId: "Customer" });
  });

  it("exposes an explicit Advanced projection for primary-key availability checks", () => {
    expect(
      resolveOntologyTableTargetProvenance(
        { type: "TABLE_WIDGET", tableData: "{{CustomerQuery.data}}" },
        [
          {
            config: {
              name: "CustomerQuery",
              actionConfiguration: {
                formData: {
                  operation: { data: "OBJECT_QUERY" },
                  queryMode: { data: "ADVANCED" },
                  definition: {
                    data: '{"objectTypeId":"Customer","projection":["name"]}',
                  },
                },
              },
            },
          },
        ],
      ),
    ).toEqual({ objectTypeId: "Customer", projection: ["name"] });
  });

  it("rejects Tables whose source is not an Ontology Object Query", () => {
    expect(
      resolveOntologyTableTargetProvenance(
        { type: "TABLE_WIDGET", tableData: "{{RestQuery.data}}" },
        [
          {
            config: { name: "RestQuery" },
            actionConfiguration: { formData: {} },
          },
        ],
      ),
    ).toBeUndefined();
  });
});
