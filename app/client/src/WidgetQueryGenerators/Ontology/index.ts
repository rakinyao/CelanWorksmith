import { merge } from "lodash";
import { DatasourceConnectionMode } from "entities/Datasource";
import type {
  WidgetQueryGenerationConfig,
  WidgetQueryGenerationFormConfig,
} from "WidgetQueryGenerators/types";
import {
  QUERY_TYPE,
  QueryPaginationBindingMode,
} from "WidgetQueryGenerators/types";
import { removeSpecialChars } from "utils/helpers";
import { serializeBuilderForm } from "../../PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition";

interface OntologyPluginInitialValues {
  actionConfiguration?: {
    formData?: Record<string, unknown>;
  };
}

export default abstract class Ontology {
  private static buildFilter(
    select: NonNullable<WidgetQueryGenerationConfig["select"]>,
    formConfig: WidgetQueryGenerationFormConfig,
  ) {
    if (!formConfig.searchableColumn || !select.where) {
      return;
    }

    return {
      data: {
        conditions: [
          {
            propertyId: formConfig.searchableColumn,
            operator: "contains",
            value: `{{${select.where}}}`,
          },
        ],
      },
    };
  }

  private static buildSelect(
    widgetConfig: WidgetQueryGenerationConfig,
    formConfig: WidgetQueryGenerationFormConfig,
  ) {
    const { select } = widgetConfig;

    if (!select || !formConfig.tableName) {
      return;
    }

    const formData: Record<string, unknown> = {
      operation: { data: "OBJECT_QUERY" },
      queryMode: { data: "BUILDER" },
      objectTypeId: { data: formConfig.tableName },
      page: {
        data: {
          mode: "LIMITED",
          offset: 0,
          limit: 100,
        },
      },
    };
    const dynamicBindingPathList: { key: string }[] = [];

    const projection = formConfig.columns?.map((column) => column.name);

    if (projection?.length) {
      formData.projection = { data: projection };
    }

    const filter = this.buildFilter(select, formConfig);

    if (filter) {
      formData.filter = filter;
      dynamicBindingPathList.push({ key: "formData.filter.data" });
    }

    if (formConfig.primaryColumn) {
      formData.sort = {
        data: [
          {
            propertyId: formConfig.primaryColumn,
            direction: "ASC",
          },
        ],
      };
    }

    return {
      type: QUERY_TYPE.SELECT,
      name: `Query_${removeSpecialChars(formConfig.tableName)}`,
      payload: {
        formData,
      },
      dynamicBindingPathList,
      columnNameMap: Object.fromEntries(
        formConfig.columns
          .filter(
            (column) =>
              typeof column.displayName === "string" &&
              column.displayName.trim().length > 0,
          )
          .map((column) => [column.name, column.displayName!.trim()]),
      ),
      paginationBindingMode: QueryPaginationBindingMode.CLIENT_SIDE,
    };
  }

  static build(
    widgetConfig: WidgetQueryGenerationConfig,
    formConfig: WidgetQueryGenerationFormConfig,
    pluginInitialValues: OntologyPluginInitialValues,
  ) {
    const select = this.buildSelect(widgetConfig, formConfig);

    if (!select) {
      return [];
    }

    const initialFormData = pluginInitialValues?.actionConfiguration?.formData;
    const selectFormData = merge({}, initialFormData, select.payload.formData);

    selectFormData.definition = {
      data: serializeBuilderForm(selectFormData, true),
    };
    const actions = [
      {
        ...select,
        payload: {
          formData: selectFormData,
        },
      },
    ];

    return actions;
  }

  static getConnectionMode() {
    return DatasourceConnectionMode.READ_ONLY;
  }
}
