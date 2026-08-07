import type { WidgetProps } from "widgets/BaseWidget";
import type { DSLWidget } from "WidgetProvider/types";
import { getObjectBindingModeProperty } from "celanworksmith/widgets/objectBinding/types";

/*
 * Function to traverse the DSL tree and execute the given migration function for each widget present in
 * the tree.
 */
export const traverseDSLAndMigrate = (
  DSL: DSLWidget,
  migrateFn: (widget: WidgetProps) => void,
) => {
  DSL.children = DSL.children?.map((widget: WidgetProps) => {
    migrateFn(widget);

    if (widget.children && widget.children.length > 0) {
      widget = traverseDSLAndMigrate(widget, migrateFn);
    }

    return widget;
  });

  return DSL;
};

const migrateLegacyObjectBindingMode = (widget: WidgetProps) => {
  const modeProperty = getObjectBindingModeProperty(widget.type);

  if (modeProperty && widget[modeProperty] === undefined) {
    widget[modeProperty] = "QUERY";
  }
};

export const migrateLegacyObjectBindingModes = (DSL: DSLWidget) => {
  migrateLegacyObjectBindingMode(DSL);

  return traverseDSLAndMigrate(DSL, migrateLegacyObjectBindingMode);
};
