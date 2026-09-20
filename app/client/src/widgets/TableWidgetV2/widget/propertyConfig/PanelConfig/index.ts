import { updateCustomColumnAliasOnLabelChange } from "../../propertyUtils";
import { getTableV2ColumnAlignmentConfig } from "./Alignment";
import { getTableV2ColumnBasicConfig } from "./Basic";
import { getTableV2ColumnBorderAndShadowConfig } from "./BorderAndShadow";
import { getTableV2ColumnColorConfig } from "./Color";
import { getTableV2ColumnDataConfig } from "./Data";
import { getTableV2ColumnDatePropertiesConfig } from "./DateProperties";
import {
  getTableV2ColumnDiscardButtonPropertiesConfig,
  getTableV2ColumnDiscardButtonStyleConfig,
} from "./DiscardButtonproperties";
import { getTableV2ColumnEventsConfig } from "./Events";
import {
  getTableV2ColumnGeneralConfig,
  getTableV2ColumnGeneralStyleConfig,
} from "./General";
import { getTableV2ColumnIconConfig } from "./Icon";
import {
  getTableV2ColumnSaveButtonPropertiesConfig,
  getTableV2ColumnSaveButtonStyleConfig,
} from "./SaveButtonProperties";
import { getTableV2ColumnSelectConfig } from "./Select";
import { getTableV2ColumnTextFormattingConfig } from "./TextFormatting";
import { getTableV2ColumnValidationConfig } from "./Validation";

export function getTableV2ColumnPanelConfig() {
  return {
    editableTitle: true,
    titlePropertyName: "label",
    panelIdPropertyName: "id",
    dependencies: ["primaryColumns", "columnOrder"],
    contentChildren: [
      getTableV2ColumnDataConfig(),
      getTableV2ColumnBasicConfig(),
      getTableV2ColumnGeneralConfig(),
      getTableV2ColumnValidationConfig(),
      getTableV2ColumnSaveButtonPropertiesConfig(),
      getTableV2ColumnDiscardButtonPropertiesConfig(),
      getTableV2ColumnSelectConfig(),
      getTableV2ColumnEventsConfig(),
      getTableV2ColumnDatePropertiesConfig(),
    ],
    styleChildren: [
      getTableV2ColumnGeneralStyleConfig(),
      getTableV2ColumnIconConfig(),
      getTableV2ColumnAlignmentConfig(),
      getTableV2ColumnTextFormattingConfig(),
      getTableV2ColumnColorConfig(),
      getTableV2ColumnSaveButtonStyleConfig(),
      getTableV2ColumnDiscardButtonStyleConfig(),
      getTableV2ColumnBorderAndShadowConfig(),
    ],
    updateHook: updateCustomColumnAliasOnLabelChange,
  };
}

export default getTableV2ColumnPanelConfig();
