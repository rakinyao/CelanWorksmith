import { updateCustomColumnAliasOnLabelChange } from "../../propertyUtils";
import Alignment from "./Alignment";
import { getTableV2ColumnBasicConfig } from "./Basic";
import BorderAndShadow from "./BorderAndShadow";
import Color from "./Color";
import { getTableV2ColumnDataConfig } from "./Data";
import DateProperties from "./DateProperties";
import DiscardButtonproperties, {
  discardButtonStyleConfig,
} from "./DiscardButtonproperties";
import { getTableV2ColumnEventsConfig } from "./Events";
import { getTableV2ColumnGeneralConfig, GeneralStyle } from "./General";
import Icon from "./Icon";
import SaveButtonProperties, {
  saveButtonStyleConfig,
} from "./SaveButtonProperties";
import { getTableV2ColumnSelectConfig } from "./Select";
import TextFormatting from "./TextFormatting";
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
      SaveButtonProperties,
      DiscardButtonproperties,
      getTableV2ColumnSelectConfig(),
      getTableV2ColumnEventsConfig(),
      DateProperties,
    ],
    styleChildren: [
      GeneralStyle,
      Icon,
      Alignment,
      TextFormatting,
      Color,
      saveButtonStyleConfig,
      discardButtonStyleConfig,
      BorderAndShadow,
    ],
    updateHook: updateCustomColumnAliasOnLabelChange,
  };
}

export default getTableV2ColumnPanelConfig();
