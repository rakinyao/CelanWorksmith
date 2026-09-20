import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { get } from "lodash";
import { hideByColumnType } from "../../propertyUtils";
import { getTableV2CommonValidations } from "./Validations/Common";
import { getTableV2NumberValidations } from "./Validations/Number";
import { getTableV2DateValidations } from "./Validations/Date";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnValidationConfig() {
  return {
    sectionName: tableV2Text("validation.validation"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      const isEditable = get(props, `${propertyPath}.isEditable`, "");

      return (
        !isEditable ||
        hideByColumnType(
          props,
          propertyPath,
          [
            ColumnTypes.TEXT,
            ColumnTypes.NUMBER,
            ColumnTypes.DATE,
            ColumnTypes.CURRENCY,
            ColumnTypes.SELECT,
          ],
          true,
        )
      );
    },
    children: [
      ...getTableV2NumberValidations(),
      ...getTableV2DateValidations(),
      ...getTableV2CommonValidations(),
    ],
  };
}
