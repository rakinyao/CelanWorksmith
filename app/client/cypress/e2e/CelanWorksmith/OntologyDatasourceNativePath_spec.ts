import EditorNavigation, {
  EntityType,
} from "../../support/Pages/EditorNavigation";
import { agHelper, dataSources } from "../../support/Objects/ObjectsCore";

const datasourceName = `Ontology Demo ${Date.now()}`;
const queryName = "PurchaseOrdersQuery";

describe(
  "Ontology Datasource native execution path",
  { tags: ["@tag.Datasource", "@tag.Binding"] },
  () => {
    before(() => {
      agHelper.AddDsl("tableTextPaginationDsl");
    });

    it("executes one native query for table binding and one more for explicit Run", () => {
      cy.window().then((window) => {
        const workspaceId = window.localStorage.getItem("workspaceId");

        expect(workspaceId).to.be.a("string").and.not.empty;

        cy.request({
          method: "POST",
          url: "/api/v1/celanworksmith/ontology/datasources",
          body: {
            workspaceId,
            datasourceName,
            projectImportRequest: {
              sourceKind: "DEMO",
            },
          },
        }).then((importResponse) => {
          expect(importResponse.status).to.equal(201);

          const datasourceId = importResponse.body.data.datasourceId;
          let ontologyExecutions = 0;

          cy.intercept("POST", "/api/v1/actions/execute", (request) => {
            ontologyExecutions += 1;
          }).as("ontologyExecute");

          cy.reload();
          EditorNavigation.SelectEntityByName(
            datasourceName,
            EntityType.Datasource,
          );
          dataSources.CreateQueryAfterDSSaved("", queryName);
          dataSources.ValidateNSelectDropdown(
            "Object type",
            "",
            "Purchase Order",
          );

          EditorNavigation.SelectEntityByName("Table1", EntityType.Widget);
          cy.testJsontext("tabledata", `{{${queryName}.data}}`);
          cy.wait(1500);

          cy.wrap(null).should(() => {
            expect(ontologyExecutions).to.equal(0);
          });

          EditorNavigation.SelectEntityByName(queryName, EntityType.Query);
          dataSources.RunQuery();
          cy.wait("@ontologyExecute");

          cy.wrap(null).should(() => {
            expect(ontologyExecutions).to.equal(1);
          });
        });
      });
    });
  },
);
