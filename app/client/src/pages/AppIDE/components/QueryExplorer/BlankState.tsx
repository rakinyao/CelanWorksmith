import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { getHasCreateActionPermission } from "ee/utils/BusinessFeatures/permissionPageHelpers";
import { getPagePermissions } from "selectors/editorSelectors";
import { useFeatureFlag } from "utils/hooks/useFeatureFlag";
import { FEATURE_FLAG } from "ee/entities/FeatureFlag";
import { EmptyState } from "@appsmith/ads";
import { useQueryAdd } from "../QueryAdd";

const BlankState: React.FC = () => {
  const { t } = useTranslation();
  const pagePermissions = useSelector(getPagePermissions);
  const isFeatureEnabled = useFeatureFlag(FEATURE_FLAG.license_gac_enabled);
  const canCreateActions = getHasCreateActionPermission(
    isFeatureEnabled,
    pagePermissions,
  );
  const { openAddQuery } = useQueryAdd();

  const buttonProps = useMemo(
    () => ({
      className: "t--add-item",
      testId: "t--add-item",
      text: t("editor.queryAddButton"),
      onClick: canCreateActions ? openAddQuery : undefined,
    }),
    [canCreateActions, openAddQuery, t],
  );

  return (
    <EmptyState
      button={buttonProps}
      description={t("editor.queryBlankDescription")}
      icon={"queries-v3"}
    />
  );
};

export { BlankState };
