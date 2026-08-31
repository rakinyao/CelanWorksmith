import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { getPagePermissions } from "selectors/editorSelectors";
import { useFeatureFlag } from "utils/hooks/useFeatureFlag";
import { getHasCreateActionPermission } from "ee/utils/BusinessFeatures/permissionPageHelpers";
import { FEATURE_FLAG } from "ee/entities/FeatureFlag";
import { useJSAdd } from "../JSAdd";
import { EmptyState } from "@appsmith/ads";

const BlankState: React.FC = () => {
  const { t } = useTranslation();
  const pagePermissions = useSelector(getPagePermissions);
  const isFeatureEnabled = useFeatureFlag(FEATURE_FLAG.license_gac_enabled);
  const canCreateActions = getHasCreateActionPermission(
    isFeatureEnabled,
    pagePermissions,
  );
  const { openAddJS } = useJSAdd();

  const buttonProps = useMemo(
    () => ({
      className: "t--add-item",
      testId: "t--add-item",
      text: t("editor.newJsObject"),
      onClick: canCreateActions ? openAddJS : undefined,
    }),
    [canCreateActions, openAddJS, t],
  );

  return (
    <EmptyState
      button={buttonProps}
      description={t("editor.jsBlankDescription")}
      icon={"js-square-v3"}
    />
  );
};

export { BlankState };
