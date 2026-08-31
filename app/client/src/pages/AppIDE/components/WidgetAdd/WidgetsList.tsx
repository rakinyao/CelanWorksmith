import React from "react";
import { useTranslation } from "react-i18next";

import { useUIExplorerItems } from "pages/Editor/widgetSidebar/hooks";
import UIEntitySidebar from "pages/Editor/widgetSidebar/UIEntitySidebar";

interface WidgetsListProps {
  focusSearchInput?: boolean;
}

function WidgetsList({ focusSearchInput }: WidgetsListProps) {
  const { t } = useTranslation();
  const { cards, entityLoading, groupedCards } = useUIExplorerItems();

  return (
    <UIEntitySidebar
      cards={cards}
      emptyMessage={t("editor.widgetPanelEmpty")}
      entityLoading={entityLoading}
      focusSearchInput={focusSearchInput}
      groupedCards={groupedCards}
      isActive
      searchPlaceholderText={t("editor.searchWidgets")}
    />
  );
}

export default WidgetsList;
