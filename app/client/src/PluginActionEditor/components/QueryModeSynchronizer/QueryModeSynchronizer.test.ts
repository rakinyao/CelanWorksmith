import fs from "fs";
import path from "path";
import React from "react";
import { render } from "@testing-library/react";
import i18n from "i18n";
import {
  getAdvancedToBuilderUpdates,
  getCapabilityAdvancedToBuilderUpdates,
  getOntologyQueryDefinitionUpdate,
  hydrateBuilderForm,
  OntologyQueryModeSynchronizer,
  type OntologyQuerySynchronizerInput,
} from "./QueryModeSynchronizer";
import type { OntologyQueryMetadata } from "./ontologyObjectQueryDefinition";
import type { OntologyCapabilityMetadata } from "./ontologyCapabilityQueryDefinition";

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
          mode: "LIMITED",
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
const mockToast = jest.requireMock("@appsmith/ads").toast.show as jest.Mock;

const builderFormData = {
  operation: { data: "OBJECT_QUERY" },
  queryMode: { data: "BUILDER" },
  objectTypeId: { data: "PurchaseOrder" },
  page: {
    data: {
      mode: "LIMITED",
      offset: "{{Table1.pageOffset}}",
      limit: "{{Table1.pageSize}}",
    },
  },
};

const formattedPageDefinition = JSON.stringify(
  {
    objectTypeId: "PurchaseOrder",
    page: {
      mode: "LIMITED",
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

const capabilityMetadata: OntologyCapabilityMetadata = {
  capabilities: [
    {
      id: "CalculateDelayDays",
      parameters: [{ id: "delayDays", required: true }],
    },
    {
      id: "ReschedulePurchaseOrder",
      parameters: [{ id: "newDeliveryDate", required: true }],
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

  it("formats an equivalent compact capability definition when entering Advanced", () => {
    const compactDefinition =
      '{"target":{"source":"SINGLE_OBJECT","objectId":"CTR-1"},"parameters":{}}';

    expect(
      getOntologyQueryDefinitionUpdate({
        pluginPackageName: "celanworksmith-ontology-plugin",
        previousQueryMode: "BUILDER",
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "ADVANCED" },
          target: {
            data: { source: "SINGLE_OBJECT", objectId: "CTR-1" },
          },
          parameters: { data: {} },
          definition: { data: compactDefinition },
        },
      }),
    ).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: `{
  "target": {
    "source": "SINGLE_OBJECT",
    "objectId": "CTR-1"
  },
  "parameters": {}
}`,
    });
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

  it.each([
    ["FUNCTION_QUERY", "functionId", "CalculateDelayDays", { delayDays: 5 }],
    [
      "ACTION_QUERY",
      "actionId",
      "ReschedulePurchaseOrder",
      { newDeliveryDate: "2026-08-30" },
    ],
  ])(
    "serializes %s Builder fields into the shared Advanced definition",
    (operation, capabilityField, capabilityId, parameters) => {
      expect(
        getOntologyQueryDefinitionUpdate({
          pluginPackageName: "celanworksmith-ontology-plugin",
          previousQueryMode: "BUILDER",
          capabilityMetadata,
          formData: {
            operation: { data: operation },
            queryMode: { data: "ADVANCED" },
            objectTypeId: { data: "PurchaseOrder" },
            [capabilityField]: { data: capabilityId },
            target: {
              data: {
                source: "SINGLE_OBJECT",
                objectId: "{{Table1.selectedRow.id}}",
              },
            },
            parameters: { data: parameters },
          },
        }),
      ).toEqual({
        field: "actionConfiguration.formData.definition.data",
        value: JSON.stringify(
          {
            target: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
            parameters,
          },
          null,
          2,
        ),
      });
    },
  );

  it("serializes a zero-parameter Function into Advanced when no parameter control value exists", () => {
    expect(
      getOntologyQueryDefinitionUpdate({
        pluginPackageName: "celanworksmith-ontology-plugin",
        previousQueryMode: "BUILDER",
        capabilityMetadata: {
          capabilities: [{ id: "CalculateDelayDays", parameters: [] }],
        },
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
          },
        },
      }),
    ).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: `{
  "target": {
    "source": "SINGLE_OBJECT",
    "objectId": "{{Table1.selectedRow.id}}"
  },
  "parameters": {}
}`,
    });
  });

  it("serializes a capability with absent Builder parameters before metadata loads", () => {
    expect(
      getOntologyQueryDefinitionUpdate({
        pluginPackageName: "celanworksmith-ontology-plugin",
        previousQueryMode: "BUILDER",
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "UnverifiedFunction" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
          },
        },
      }),
    ).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: `{
  "target": {
    "source": "SINGLE_OBJECT",
    "objectId": "{{Table1.selectedRow.id}}"
  },
  "parameters": {}
}`,
    });
  });

  it("keeps a structural Advanced draft when Builder capability validation fails", () => {
    expect(
      getOntologyQueryDefinitionUpdate({
        pluginPackageName: "celanworksmith-ontology-plugin",
        previousQueryMode: "BUILDER",
        capabilityMetadata,
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              source: "OBJECT_SET",
              objectIds: "{{Table1.selectedRows.map((row) => row.id)}}",
            },
          },
          parameters: { data: {} },
        },
      }),
    ).toEqual({
      field: "actionConfiguration.formData.definition.data",
      value: `{
  "target": {
    "source": "OBJECT_SET",
    "objectIds": "{{Table1.selectedRows.map((row) => row.id)}}"
  },
  "parameters": {}
}`,
    });
  });

  it("retains zero-parameter metadata while Builder enters Advanced", () => {
    mockEvaluationState = {
      "": {
        ONTOLOGY_FUNCTION_PARAMETERS: {
          fetchDynamicValues: { data: [] },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
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

    mockChange.mockClear();
    mockDispatch.mockClear();

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          queryMode: { data: "ADVANCED" },
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
      `{
  "target": {
    "source": "SINGLE_OBJECT",
    "objectId": "{{Table1.selectedRow.id}}"
  },
  "parameters": {}
}`,
    );
  });

  it("serializes a widget object-set binding when a Function enters Advanced", () => {
    mockEvaluationState = {
      "": {
        ONTOLOGY_FUNCTION_PARAMETERS: {
          fetchDynamicValues: { data: [] },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              source: "OBJECT_SET",
              objectIds: '{{Table1.selectedRows.map((row) => row["id"])}}',
            },
          },
          targetBinding: {
            data: {
              mode: "WIDGET",
              widgetId: "table-id",
              cardinality: "MANY",
              expression: '{{Table1.selectedRows.map((row) => row["id"])}}',
            },
          },
          parameters: { data: {} },
          definition: { data: "" },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockChange.mockClear();
    mockDispatch.mockClear();

    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          queryMode: { data: "ADVANCED" },
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
      `{
  "target": {
    "source": "OBJECT_SET",
    "objectIds": "{{Table1.selectedRows.map((row) => row[\\"id\\"])}}"
  },
  "parameters": {}
}`,
    );
  });

  it.each([
    ["FUNCTION_QUERY", "CalculateDelayDays", { delayDays: 5 }],
    [
      "ACTION_QUERY",
      "ReschedulePurchaseOrder",
      { newDeliveryDate: "2026-08-30" },
    ],
  ])(
    "hydrates %s Advanced definitions without changing target or parameters",
    (operation, capabilityId, parameters) => {
      const result = getCapabilityAdvancedToBuilderUpdates(
        JSON.stringify({
          target: {
            source: "SINGLE_OBJECT",
            objectId: "{{Table1.selectedRow.id}}",
          },
          parameters,
        }),
        operation as "FUNCTION_QUERY" | "ACTION_QUERY",
        capabilityId,
        capabilityMetadata,
      );

      expect(result).toEqual({
        updates: {
          "actionConfiguration.formData.target.data": {
            source: "SINGLE_OBJECT",
            objectId: "{{Table1.selectedRow.id}}",
          },
          "actionConfiguration.formData.targetBinding.data": {
            mode: "MANUAL",
            cardinality: "ONE",
            expression: "{{Table1.selectedRow.id}}",
          },
          "actionConfiguration.formData.parameters.data": parameters,
        },
      });
    },
  );

  it.each([
    [
      "a colon-containing owner and capability pair",
      "owner:a",
      "capability",
      "owner",
      "a:capability",
    ],
    [
      "an owner change while the capability remains selected",
      "PurchaseOrder",
      "sharedCapability",
      "Supplier",
      "sharedCapability",
    ],
  ])(
    "resets target and parameters when %s changes",
    (
      _reason,
      objectTypeId,
      capabilityId,
      nextObjectTypeId,
      nextCapabilityId,
    ) => {
      const definition = JSON.stringify({
        target: { source: "SINGLE_OBJECT", objectId: "PO002" },
        parameters: {},
      });

      mockCurrentFormValues = {
        pluginId: "ontology-plugin-id",
        actionConfiguration: {
          formData: {
            operation: { data: "FUNCTION_QUERY" },
            queryMode: { data: "BUILDER" },
            objectTypeId: { data: objectTypeId },
            functionId: { data: capabilityId },
            target: { data: { source: "SINGLE_OBJECT", objectId: "PO002" } },
            parameters: { data: {} },
            definition: { data: definition },
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
            ...mockCurrentFormValues.actionConfiguration.formData,
            objectTypeId: { data: nextObjectTypeId },
            functionId: { data: nextCapabilityId },
          },
        },
      };
      view.rerender(
        React.createElement(OntologyQueryModeSynchronizer, {
          enabled: true,
          formName: "QueryEditorForm",
        }),
      );

      expect(mockChange).toHaveBeenCalledTimes(4);
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.target.data",
        { source: "SINGLE_OBJECT", objectId: "" },
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.targetBinding.data",
        { mode: "MANUAL", cardinality: "ONE", expression: "" },
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.parameters.data",
        {},
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.definition.data",
        "",
      );
    },
  );

  it("resets capability state when operation changes with the same owner and capability IDs", () => {
    const definition = JSON.stringify({
      target: {
        source: "SINGLE_OBJECT",
        objectId: "{{Table1.selectedRow.id}}",
      },
      parameters: { delayDays: 5 },
    });

    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "SharedCapability" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
          },
          targetBinding: {
            data: {
              mode: "WIDGET",
              widgetId: "table-id",
              cardinality: "ONE",
              expression: "{{Table1.selectedRow.id}}",
            },
          },
          parameters: { data: { delayDays: 5 } },
          definition: { data: definition },
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
          ...mockCurrentFormValues.actionConfiguration.formData,
          operation: { data: "ACTION_QUERY" },
          actionId: { data: "SharedCapability" },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledTimes(4);
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.target.data",
      { source: "SINGLE_OBJECT", objectId: "" },
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.targetBinding.data",
      { mode: "MANUAL", cardinality: "ONE", expression: "" },
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.parameters.data",
      {},
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.definition.data",
      "",
    );
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

  it("removes stale numeric pagination fields when Builder selects Full mode", () => {
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          page: { data: { mode: "FULL", offset: 0, limit: 500 } },
        },
      },
    };

    render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.page.data",
      { mode: "FULL" },
    );
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
              mode: "LIMITED",
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
            mode: "LIMITED",
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
        mode: "LIMITED",
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
        mode: "LIMITED",
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
          mode: "LIMITED",
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
          mode: "LIMITED",
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
          mode: "LIMITED",
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
              page: { mode: "LIMITED", offset: 0, limit: 10 },
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
      { mode: "LIMITED", offset: 0, limit: 10 },
    );
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "unknown property",
      '{"objectTypeId":"PurchaseOrder","projection":["missing"]}',
    ],
    [
      "unsupported top-level field",
      '{"objectTypeId":"PurchaseOrder","includeDrafts":true}',
    ],
    [
      "unrepresentable nested field",
      '{"objectTypeId":"PurchaseOrder","page":{"offset":0,"limit":10,"cursor":"abc"}}',
    ],
  ])("returns a stable validation error for %s", (_name, text) => {
    expect(getAdvancedToBuilderUpdates(text, ontologyMetadata)).toEqual({
      error: { id: "invalidDefinition" },
    });
  });

  it("restores the last valid Advanced definition when switching with invalid JSON", () => {
    const validDefinition = JSON.stringify({
      objectTypeId: "PurchaseOrder",
      page: { mode: "LIMITED", offset: 0, limit: 10 },
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

  it("restores the Builder draft without clearing invalid Advanced capability text", () => {
    const builderTarget = {
      source: "SINGLE_OBJECT",
      objectId: "{{Table1.selectedRow.id}}",
    };
    const builderBinding = {
      mode: "MANUAL",
      cardinality: "ONE",
      expression: "{{Table1.selectedRow.id}}",
    };

    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: { data: builderTarget },
          targetBinding: { data: builderBinding },
          parameters: { data: { delayDays: 5 } },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockDispatch.mockClear();
    mockChange.mockClear();
    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          queryMode: { data: "ADVANCED" },
          definition: { data: "{" },
        },
      },
    };
    view.rerender(
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
      "actionConfiguration.formData.target.data",
      builderTarget,
    );
    expect(mockChange).toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.targetBinding.data",
      builderBinding,
    );
    expect(mockChange).not.toHaveBeenCalledWith(
      "QueryEditorForm",
      "actionConfiguration.formData.queryMode.data",
      "ADVANCED",
    );
  });

  it("restores a matching Widget target binding after a valid Advanced round trip", () => {
    const target = {
      source: "OBJECT_SET",
      objectIds: '{{ContractsTable.selectedRows.map((row) => row["id"])}}',
    };
    const widgetBinding = {
      mode: "WIDGET",
      widgetId: "contracts-table-id",
      cardinality: "MANY",
      expression: target.objectIds,
    };

    mockEvaluationState = {
      "": {
        ONTOLOGY_FUNCTION_PARAMETERS: {
          fetchDynamicValues: { data: { content: [] } },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "Contract" },
          functionId: { data: "CalculateContractGrossAmount" },
          target: { data: target },
          targetBinding: { data: widgetBinding },
          parameters: { data: {} },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockChange.mockClear();
    mockDispatch.mockClear();
    mockCurrentFormValues = {
      ...mockCurrentFormValues,
      actionConfiguration: {
        formData: {
          ...mockCurrentFormValues.actionConfiguration.formData,
          queryMode: { data: "ADVANCED" },
          definition: { data: JSON.stringify({ target, parameters: {} }) },
        },
      },
    };
    view.rerender(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockChange.mockClear();
    mockDispatch.mockClear();
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
      "actionConfiguration.formData.targetBinding.data",
      widgetBinding,
    );
  });

  it("restores a persisted Widget target binding after remounting in Advanced mode", () => {
    const target = {
      source: "OBJECT_SET" as const,
      objectIds: '{{ContractsTable.selectedRows.map((row) => row["id"])}}',
    };
    const widgetBinding = {
      mode: "WIDGET" as const,
      widgetId: "contracts-table-id",
      cardinality: "MANY" as const,
      expression: '{{ContractsTable.selectedRows.map((row) => row["id"])}}',
    };

    mockEvaluationState = {
      "": {
        ONTOLOGY_FUNCTION_PARAMETERS: {
          fetchDynamicValues: { data: { content: [] } },
        },
      },
    };
    mockCurrentFormValues = {
      pluginId: "ontology-plugin-id",
      actionConfiguration: {
        formData: {
          operation: { data: "FUNCTION_QUERY" },
          queryMode: { data: "ADVANCED" },
          objectTypeId: { data: "Contract" },
          functionId: { data: "CalculateContractGrossAmount" },
          target: { data: target },
          targetBinding: { data: widgetBinding },
          parameters: { data: {} },
          definition: { data: JSON.stringify({ target, parameters: {} }) },
        },
      },
    };

    const view = render(
      React.createElement(OntologyQueryModeSynchronizer, {
        enabled: true,
        formName: "QueryEditorForm",
      }),
    );

    mockChange.mockClear();
    mockDispatch.mockClear();
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
      "actionConfiguration.formData.targetBinding.data",
      widgetBinding,
    );
  });

  it.each([
    ["en-US", "Cannot switch to Builder: The Advanced definition is invalid."],
    ["zh-CN", "无法切换到构建器：高级定义无效。"],
  ])(
    "renders invalid Advanced definitions through the ontology query locale boundary in %s",
    async (locale, expectedMessage) => {
      await i18n.changeLanguage(locale);
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
            definition: {
              data: JSON.stringify({
                objectTypeId: "PurchaseOrder",
                page: { mode: "LIMITED", offset: 0, limit: 10 },
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

      mockToast.mockClear();
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

      expect(mockToast).toHaveBeenCalledWith(expectedMessage, {
        kind: "error",
      });
      view.unmount();
    },
  );

  it("retains the existing Advanced definition while metadata is unavailable", () => {
    const validDefinition = JSON.stringify({
      objectTypeId: "PurchaseOrder",
      page: { mode: "LIMITED", offset: 0, limit: 100 },
    });

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

  it.each([
    [
      "FUNCTION_QUERY",
      "functionId",
      "CalculateDelayDays",
      "CalculateDelayDaysV2",
    ],
    [
      "ACTION_QUERY",
      "actionId",
      "ReschedulePurchaseOrder",
      "ReschedulePurchaseOrderV2",
    ],
  ])(
    "resets %s target and parameters exactly once when its capability changes",
    (operation, capabilityField, capabilityId, nextCapabilityId) => {
      const definition = JSON.stringify({
        target: { source: "SINGLE_OBJECT", objectId: "PO002" },
        parameters: { delayDays: 5 },
      });

      mockCurrentFormValues = {
        pluginId: "ontology-plugin-id",
        actionConfiguration: {
          formData: {
            operation: { data: operation },
            queryMode: { data: "BUILDER" },
            objectTypeId: { data: "PurchaseOrder" },
            [capabilityField]: { data: capabilityId },
            target: { data: { source: "SINGLE_OBJECT", objectId: "PO002" } },
            parameters: { data: { delayDays: 5 } },
            definition: { data: definition },
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
            ...mockCurrentFormValues.actionConfiguration.formData,
            [capabilityField]: { data: nextCapabilityId },
          },
        },
      };
      view.rerender(
        React.createElement(OntologyQueryModeSynchronizer, {
          enabled: true,
          formName: "QueryEditorForm",
        }),
      );
      view.rerender(
        React.createElement(OntologyQueryModeSynchronizer, {
          enabled: true,
          formName: "QueryEditorForm",
        }),
      );

      expect(mockChange).toHaveBeenCalledTimes(4);
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.target.data",
        { source: "SINGLE_OBJECT", objectId: "" },
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.targetBinding.data",
        { mode: "MANUAL", cardinality: "ONE", expression: "" },
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.parameters.data",
        {},
      );
      expect(mockChange).toHaveBeenCalledWith(
        "QueryEditorForm",
        "actionConfiguration.formData.definition.data",
        "",
      );
    },
  );

  it.each([
    [
      "function-query.json",
      "functionId",
      "ONTOLOGY_FUNCTIONS",
      "ONTOLOGY_FUNCTION_PARAMETERS",
    ],
    [
      "action-query.json",
      "actionId",
      "ONTOLOGY_ACTIONS",
      "ONTOLOGY_ACTION_PARAMETERS",
    ],
  ])(
    "defines owner-scoped Builder and protected Advanced controls for %s",
    (
      fileName,
      capabilityField,
      capabilityRequestType,
      parameterRequestType,
    ) => {
      const editor = JSON.parse(
        fs.readFileSync(
          path.resolve(
            __dirname,
            `../../../../../server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/${fileName}`,
          ),
          "utf8",
        ),
      );
      const controls = editor.children[0].children as Array<{
        configProperty?: string;
        controlType?: string;
        maxItems?: number;
        functionMetadataConfigProperty?: string;
        conditionals?: { fetchDynamicValues?: { config: { params: unknown } } };
      }>;
      const objectType = controls.find(
        (control) =>
          control.configProperty ===
          "actionConfiguration.formData.objectTypeId.data",
      );
      const capability = controls.find(
        (control) =>
          control.configProperty ===
          `actionConfiguration.formData.${capabilityField}.data`,
      );
      const parameters = controls.find(
        (control) =>
          control.configProperty ===
          "actionConfiguration.formData.parameters.data",
      );
      const target = controls.find(
        (control) =>
          control.configProperty ===
          "actionConfiguration.formData.targetBinding.data",
      );
      const advancedDefinition = controls.find(
        (control) =>
          control.configProperty ===
          "actionConfiguration.formData.definition.data",
      );

      expect(objectType).toBeDefined();
      expect(
        capability?.conditionals?.fetchDynamicValues?.config.params,
      ).toEqual({
        requestType: capabilityRequestType,
        displayType: "DROP_DOWN",
        parameters: {
          objectTypeId: "{{actionConfiguration.formData.objectTypeId.data}}",
        },
      });
      expect(
        parameters?.conditionals?.fetchDynamicValues?.config.params,
      ).toEqual({
        requestType: parameterRequestType,
        displayType: "DROP_DOWN",
        parameters: {
          objectTypeId: "{{actionConfiguration.formData.objectTypeId.data}}",
          [capabilityField]: `{{actionConfiguration.formData.${capabilityField}.data}}`,
        },
      });
      expect(advancedDefinition).toMatchObject({
        controlType: "QUERY_DYNAMIC_INPUT_TEXT",
        inputType: "JSON",
        evaluationSubstitutionType: "TEMPLATE",
        placeholderText:
          fileName === "function-query.json"
            ? '{"target":{"source":"OBJECT_SET","objectIds":["PO001","PO002"]},"parameters":{}}'
            : '{"target":{"source":"SINGLE_OBJECT","objectId":"{{Table1.selectedRow.id}}"},"parameters":{}}',
      });
      expect(target).toMatchObject({
        controlType: "ONTOLOGY_CAPABILITY_TARGET",
        maxItems: 1,
        ownerObjectTypeConfigProperty:
          "actionConfiguration.formData.objectTypeId.data",
        primaryKeyConfigProperty:
          "actionConfiguration.formData.targetBinding.data",
        fetchOptionsConditionally: true,
        ...(fileName === "function-query.json"
          ? {
              functionMetadataConfigProperty:
                "actionConfiguration.formData.functionId.data",
            }
          : {}),
        conditionals: {
          show: "{{actionConfiguration.formData.queryMode.data === 'BUILDER'}}",
        },
      });
      expect(target?.conditionals?.fetchDynamicValues?.config.params).toEqual({
        requestType: "ONTOLOGY_OBJECT_PROPERTIES",
        displayType: "DROP_DOWN",
        parameters: {
          objectTypeId: "{{actionConfiguration.formData.objectTypeId.data}}",
        },
      });
      expect(target?.functionMetadataConfigProperty).toBe(
        fileName === "function-query.json"
          ? "actionConfiguration.formData.functionId.data"
          : undefined,
      );
      expect(
        controls.some(
          (control) =>
            control.configProperty ===
              `actionConfiguration.formData.definition.data.${capabilityField}` ||
            control.configProperty ===
              "actionConfiguration.formData.definition.data.objectTypeId",
        ),
      ).toBe(false);
    },
  );
});
