import { merge } from "lodash";
import { DatasourceConnectionMode } from "entities/Datasource";
import type {
  WidgetQueryGenerationConfig,
  WidgetQueryGenerationFormConfig,
} from "WidgetQueryGenerators/types";
import { QUERY_TYPE } from "WidgetQueryGenerators/types";
import { removeSpecialChars } from "utils/helpers";

interface OntologyPluginInitialValues {
  actionConfiguration?: {
    formData?: Record<string, unknown>;
  };
}

export default abstract class Ontology {
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
          offset: select.offset ? `{{${select.offset}}}` : 0,
          limit: select.limit ? `{{${select.limit}}}` : 50,
        },
      },
    };
    const dynamicBindingPathList = [
      { key: "formData.page.data" },
    ];

    const projection = formConfig.columns?.map((column) => column.name);
    if (projection?.length) {
      formData.projection = { data: projection };
    }

    if (formConfig.searchableColumn && select.where) {
      formData.filter = {
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
      dynamicBindingPathList.push({ key: "formData.filter.data" });
    }

    if (select.orderBy && formConfig.primaryColumn) {
      formData.sort = {
        data: [
          {
            propertyId: `{{${select.orderBy} || "${formConfig.primaryColumn}"}}`,
            direction: select.sortOrder
              ? `{{${select.sortOrder} ? "ASC" : "DESC"}}`
              : "ASC",
          },
        ],
      };
      dynamicBindingPathList.push({ key: "formData.sort.data" });
    }

    return {
      type: QUERY_TYPE.SELECT,
      name: `Query_${removeSpecialChars(formConfig.tableName)}`,
      payload: {
        formData,
      },
      dynamicBindingPathList,
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

    return [
      {
        ...select,
        payload: {
          formData: merge({}, initialFormData, select.payload.formData),
        },
      },
    ];
  }

  static getConnectionMode() {
    return DatasourceConnectionMode.READ_ONLY;
  }
}
