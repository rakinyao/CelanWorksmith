import {
  Button,
  Divider,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@appsmith/ads";
import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";

import type { Workspace } from "ee/constants/workspaceConstants";
import type { LayoutSystemTypes } from "layoutSystems/types";
import { getIsCreatingApplicationByWorkspaceId } from "ee/selectors/applicationSelectors";
import { getIsFetchingApplications } from "ee/selectors/selectedWorkspaceSelectors";
import { hasCreateNewAppPermission } from "ee/utils/permissionHelpers";
import { isAirgapped } from "ee/utils/airgapHelpers";
import { useTranslation } from "react-i18next";

export interface WorkspaceActionProps {
  workspace: Workspace;
  isMobile: boolean;
  enableImportExport: boolean;
  workspaceId: string;
  onCreateNewApplication: (
    workspaceId: string,
    layoutSystemType?: LayoutSystemTypes,
  ) => void;
  onStartFromTemplate: (workspaceId: string) => void;
  setSelectedWorkspaceIdForImportApplication: (workspaceId?: string) => void;
}

function WorkspaceAction({
  enableImportExport,
  isMobile,
  onCreateNewApplication,
  onStartFromTemplate,
  setSelectedWorkspaceIdForImportApplication,
  workspace,
  workspaceId,
}: WorkspaceActionProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const { t } = useTranslation();
  const isFetchingApplications = useSelector(getIsFetchingApplications);
  const isCreatingApplication = Boolean(
    useSelector(getIsCreatingApplicationByWorkspaceId(workspace.id)),
  );
  const isAirgappedInstance = isAirgapped();

  const openActionMenu = useCallback(() => {
    setIsActionMenuOpen(true);
  }, []);

  const closeActionMenu = useCallback(() => {
    setIsActionMenuOpen(false);
  }, []);

  if (!workspace) return null;

  const hasCreateNewApplicationPermission =
    hasCreateNewAppPermission(workspace.userPermissions) && !isMobile;

  if (!hasCreateNewApplicationPermission || isFetchingApplications) return null;

  return (
    <Menu
      data-testid="t--workspace-action-menu"
      onOpenChange={setIsActionMenuOpen}
      open={isActionMenuOpen}
    >
      <MenuTrigger>
        <Button
          className="t--new-button createnew"
          endIcon="arrow-down-s-line"
          isLoading={isCreatingApplication}
          onClick={openActionMenu}
          size="md"
        >
          {t("workspace.createNew")}
        </Button>
      </MenuTrigger>
      <MenuContent
        align="end"
        onEscapeKeyDown={closeActionMenu}
        onInteractOutside={closeActionMenu}
      >
        <MenuItem
          data-testid="t--workspace-action-create-app"
          disabled={!hasCreateNewApplicationPermission}
          onSelect={() => onCreateNewApplication(workspace.id)}
          startIcon="apps-line"
        >
          {t("workspace.actions.newApplication")}
        </MenuItem>
        {<Divider className="!block mb-[2px]" />}

        {!isAirgappedInstance && (
          <MenuItem
            data-testid="t--workspace-action-create-app-from-template"
            disabled={!hasCreateNewApplicationPermission}
            onSelect={() => onStartFromTemplate(workspaceId)}
            startIcon="layout-2-line"
          >
            {t("workspace.actions.templates")}
          </MenuItem>
        )}

        {enableImportExport && hasCreateNewApplicationPermission && (
          <MenuItem
            data-testid="t--workspace-import-app"
            onSelect={() =>
              setSelectedWorkspaceIdForImportApplication(workspace.id)
            }
            startIcon="upload-cloud"
          >
            {t("workspace.actions.importApplication")}
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  );
}

export default WorkspaceAction;
