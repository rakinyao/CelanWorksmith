import type { WidgetProps } from "widgets/BaseWidget";
import type { ContainerStyle } from "widgets/ContainerWidget/component";

export interface ListWidgetProps<T extends WidgetProps> extends WidgetProps {
  dataMode?: "QUERY" | "OBJECT";
  objectTypeId?: string;
  children?: T[];
  containerStyle?: ContainerStyle;
  shouldScrollContents?: boolean;
  onListItemClick?: string;
  listData: Array<Record<string, unknown>>;
  currentItemStructure?: Record<string, string>;
}
