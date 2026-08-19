import React from "react";
import { render } from "@testing-library/react";
import {
  getAdvancedToBuilderUpdates,
  getOntologyQueryDefinitionUpdate,
  hydrateBuilderForm,
  OntologyQueryModeSynchronizer,
  type OntologyQuerySynchronizerInput,
} from "./QueryModeSynchronizer";
import type { OntologyQueryMetadata } from "./ontologyObjectQueryDefinition";

const mockDispatch = jest.fn();
const mockInitialFormValues = {
  pluginId: "ontology-plugin-id",
  actionConfiguration: {
    formData: {
      operation: { data: "OBJECT_QUERY" },
      queryMode: { data: "ADVANCED" },
      objectTypeId: { data: "PurchaseOrder" },
      page: {
        data: {
          offset: "{{Table1.pageOffset}}",
          limit: "{{Table1.pageSize}}",
        },
      },
    },
  },
};
let mockCurrentFormValues = mockInitialFormValues;
let mockPluginPackage = "celanworksmith-ontology-plugin";
let mockEvaluationState: Record<string, unknown> = {};

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ evaluations: { formEvaluation: mockEvaluationState } }),
}));

jest.mock("redux-form", () => ({
  change: jest.fn((formName: string, field: string, value: string) => ({
    type: "CHANGE",
    payload: { formName, field, value },
  })),
  getFormValues: () => () => mockCurrentFormValues,
}));

jest.mock("ee/selectors/entitiesSelector", () => ({
  getPlugin: () => ({ packageName: mockPluginPackage }),
}));

jest.mock("@appsmith/ads", () => ({
  toast: { show: jest.fn() },
}));

const mockChange = jest.requireMock("redux-form").change as jest.Mock;

const builderFormData = {
  operation: { data: "OBJECT_QUERY" },
  queryMode: { data: "BUILDER" },
  objectTypeId: { data: "PurchaseOrder" },
  page: {
    data: {
      offset: "{{Table1.pageOffset}}",
      limit: "{{Table1.pageSize}}",
    },
  },
};

const formattedPageDefinition = JSON.stringify(
  {
    objectTypeId: "PurchaseOrder",
    page: {
      offset: "{{Table1.pageOffset}}",
      limit: "{{Table1.pageSize}}",
    },
  },
  null,
  2,
);

const ontologyMetadata: OntologyQueryMetadata = {
  objectTypes: [
    {
      id: "PurchaseOrder",
      properties: [
        { id: "id", operators: [{ value: "eq" }] },
        {
          id: "delayDays",
          operators: [{ value: "gt" }, { value: "isEmpty" }],
        },
      ],
    },
  ],
};

describe("OntologyQueryModeSynchronizer", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockChange.mockClear();
    mockCurrentFormValues = mockInitialFormValues;
    mockPluginPackage = "celanworksmith-ontology-plugin";
    mockEvaluationState = {};
  });

  it("serializes Builder data when entering Advanced", () => {
    const input: OntologyQuerySynchronizerInput = {
      pluginPackageName: "celanworksmith-ontology-plugin",
      formData: {
        ...builderFormData,
        queryMode: { data: "ADVANCED" },
      },
      previousQueryMode: "BUILDER",
    };

    expect(getOntologyQueryDefinitionUpdate(input)).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: formattedPageDefinition,
    });
  });

  it("updates the definition while Builder fields change", () => {
    const input: OntologyQuerySynchronizerInput = {
      pluginPackageName: "celanworksmith-ontology-plugin",
      formData: builderFormData,
      previousQueryMode: "BUILDER",
    };

    expect(getOntologyQueryDefinitionUpdate(input)).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: formattedPageDefinition,
    });
  });

  it("does not rewrite an Advanced definition after the mode switch", () => {
    const input: OntologyQuerySynchronizerInput = {
      pluginPackageName: "celanworksmith-ontology-plugin",
      formData: {
        ...builderFormData,
        queryMode: { data: "ADVANCED" },
        definition: { data: '{"objectTypeId":"Supplier"}' },
      },
      previousQueryMode: "ADVANCED",
    };

    expect(getOntologyQueryDefinitionUpdate(input)).toBeUndefined();
  });

  it("ignores non-ontology plugins without creating a network or form update", () => {
    expect(
      getOntologyQueryDefinitionUpdate({
        pluginPackageName: "mongo-plugin",
        formData: builderFormData,
        previousQueryMode: "BUILDER",
      }),
    ).toBeUndefined();
  });

  it("writes the generated JSON when the Query Mode control enters Advanced", () => {
    const request = jest.fn();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: request,
    });

    render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.definition.data",
      formattedPageDefinition,
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it("does not dispatch a second definition update when unchanged Builder state rerenders", () => {
    const builderDefinition = formattedPageDefinition;
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          ...builderFormData,
          definition: { data: builderDefinition },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).not.toHaveBeenCalled();

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...builderFormData,
          definition: { data: builderDefinition },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).not.toHaveBeenCalled();
  });

  it("does not loop after Redux Form writes the dispatched definition back", () => {
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: builderFormData,
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatchedDefinition = mockChange.mock.calls[0][2] as string;

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...builderFormData,
          definition: { data: dispatchedDefinition },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it("dispatches exactly one definition update when a Builder page binding changes", () => {
    const initialDefinition = formattedPageDefinition;
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          ...builderFormData,
          definition: { data: initialDefinition },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );
    expect(mockChange).not.toHaveBeenCalled();

    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          ...builderFormData,
          page: {
            data: {
              offset: "{{Table1.pageOffset}}",
              limit: "{{Table1.pageSize + 10}}",
            },
          },
          definition: { data: initialDefinition },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledTimes(1);
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.definition.data",
      JSON.stringify(
        {
          objectTypeId: "PurchaseOrder",
          page: {
            offset: "{{Table1.pageOffset}}",
            limit: "{{Table1.pageSize + 10}}",
          },
        },
        null,
        2,
      ),
    );
  });

  it("does not synchronize a non-ontology plugin component", () => {
    mockPluginPackage = "mongo-plugin";
    mockCurrentFormValues = {
      ...mockInitialFormValues,
      actionConfiguration: {
        formData: {
          ...builderFormData,
        },
      },
    };

    render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("hydrates all Builder controls from a valid Advanced definition", () => {
    const definition = {
      objectTypeId: "PurchaseOrder",
      projection: ["id", "delayDays"],
      filter: {
        conditions: [{ propertyId: "delayDays", operator: "gt", value: 0 }],
      },
      sort: [{ propertyId: "delayDays", direction: "DESC" as const }],
      page: {
        offset: "{{Table1.pageOffset}}",
        limit: "{{Table1.pageSize}}",
      },
    };

    expect(hydrateBuilderForm(definition)).toEqual({
      "actionConfiguration.formData.objectTypeId.data": "PurchaseOrder",
      "actionConfiguration.formData.resultMode.data": "ROWS",
      "actionConfiguration.formData.projection.data": ["id", "delayDays"],
      "actionConfiguration.formData.filter.data.conditions": [
        { propertyId: "delayDays", operator: "gt", value: 0 },
      ],
      "actionConfiguration.formData.sort.data": [
        { propertyId: "delayDays", direction: "DESC" },
      ],
      "actionConfiguration.formData.page.data": {
        offset: "{{Table1.pageOffset}}",
        limit: "{{Table1.pageSize}}",
      },
    });
  });

  it("returns canonical definition and full Builder updates for valid Advanced JSON", () => {
    const result = getAdvancedToBuilderUpdates(
      JSON.stringify({
        objectTypeId: "PurchaseOrder",
        projection: ["id", "delayDays"],
        filter: {
          conditions: [
            {
              propertyId: "delayDays",
              operator: "gt",
              value: "{{SearchInput.text}}",
            },
          ],
        },
        sort: [{ propertyId: "delayDays", direction: "ASC" }],
        page: {
          offset: "{{Table1.pageOffset}}",
          limit: "{{Table1.pageSize}}",
        },
      }),
      ontologyMetadata,
    );

    expect(result).toEqual({
      definition: {
        objectTypeId: "PurchaseOrder",
        projection: ["id", "delayDays"],
        filter: {
          conditions: [
            {
              propertyId: "delayDays",
              operator: "gt",
              value: "{{SearchInput.text}}",
            },
          ],
        },
        sort: [{ propertyId: "delayDays", direction: "ASC" }],
        page: {
          offset: "{{Table1.pageOffset}}",
          limit: "{{Table1.pageSize}}",
        },
      },
      updates: {
        "actionConfiguration.formData.objectTypeId.data": "PurchaseOrder",
        "actionConfiguration.formData.resultMode.data": "ROWS",
        "actionConfiguration.formData.projection.data": ["id", "delayDays"],
        "actionConfiguration.formData.filter.data.conditions": [
          {
            propertyId: "delayDays",
            operator: "gt",
            value: "{{SearchInput.text}}",
          },
        ],
        "actionConfiguration.formData.sort.data": [
          { propertyId: "delayDays", direction: "ASC" },
        ],
        "actionConfiguration.formData.page.data": {
          offset: "{{Table1.pageOffset}}",
          limit: "{{Table1.pageSize}}",
        },
      },
    });
  });

  it("hydrates Builder controls when the component switches from Advanced", () => {
    mockEvaluationState = {
      "": {
        ONTOLOGY_FILTER_PROPERTY: {
          fetchDynamicValues: {
            data: {
              content: [
                { value: "id", operators: [{ value: "eq" }] },
                { value: "delayDays", operators: [{ value: "gt" }] },
              ],
            },
          },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "PurchaseOrder" },
          definition: {
            data: JSON.stringify({
              objectTypeId: "PurchaseOrder",
              projection: ["id", "delayDays"],
              filter: {
                conditions: [
                  { propertyId: "delayDays", operator: "gt", value: 0 },
                ],
              },
              sort: [{ propertyId: "delayDays", direction: "DESC" }],
              page: { offset: 0, limit: 10 },
            }),
          },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          queryMode: { data: "BUILDER" },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.filter.data.conditions",
      [{ propertyId: "delayDays", operator: "gt", value: 0 }],
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.page.data",
      { offset: 0, limit: 10 },
    );
  });

  it.each([
    ["malformed JSON", "{", "Advanced JSON definition must be valid JSON"],
    [
      "unknown property",
      '{"objectTypeId":"PurchaseOrder","projection":["missing"]}',
      "Unknown Property ID in projection: missing",
    ],
    [
      "unsupported top-level field",
      '{"objectTypeId":"PurchaseOrder","includeDrafts":true}',
      "Unsupported field in ontology query definition: includeDrafts",
    ],
    [
      "unrepresentable nested field",
      '{"objectTypeId":"PurchaseOrder","page":{"offset":0,"limit":10,"cursor":"abc"}}',
      "Unsupported field in pagination: cursor",
    ],
  ])("returns an error for %s", (_name, text, error) => {
    expect(getAdvancedToBuilderUpdates(text, ontologyMetadata)).toEqual({
      error,
    });
  });

  it("restores the last valid Advanced definition when switching with invalid JSON", () => {
    const validDefinition = JSON.stringify({
      objectTypeId: "PurchaseOrder",
      page: { offset: 0, limit: 10 },
    });
    mockEvaluationState = {
      "": {
        ONTOLOGY_FILTER_PROPERTY: {
          fetchDynamicValues: {
            data: {
              content: [{ value: "id", operators: [{ value: "eq" }] }],
            },
          },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "PurchaseOrder" },
          definition: { data: validDefinition },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          definition: { data: "{" },
          queryMode: { data: "BUILDER" },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.definition.data",
      validDefinition,
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.queryMode.data",
      "ADVANCED",
    );
  });

  it("retains the existing Advanced definition while metadata is unavailable", () => {
    const validDefinition = '{"objectTypeId":"PurchaseOrder"}';
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "ADVANCED" },
          definition: { data: validDefinition },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          definition: { data: "{" },
          queryMode: { data: "BUILDER" },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.definition.data",
      validDefinition,
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.queryMode.data",
      "ADVANCED",
    );
  });
});
