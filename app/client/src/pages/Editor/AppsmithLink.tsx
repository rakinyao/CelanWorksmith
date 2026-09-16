import React, { useCallback } from "react";
import { Link, Tooltip } from "@appsmith/ads";
import styled from "styled-components";
import { LOGO_TOOLTIP, createMessage } from "ee/constants/messages";
import { APPLICATIONS_URL } from "constants/routes";
import CelanWorkshopMark from "assets/images/celanworkshop_logo_square.png";
import history from "utils/history";
import { useSelector } from "react-redux";
import { getOrganizationConfig } from "ee/selectors/organizationSelectors";
import { getCurrentWorkspaceId } from "ee/selectors/selectedWorkspaceSelectors";

const LEGACY_DEFAULT_FAVICON_URL = [
  "https://assets.appsmith.com",
  ["appsmith", "favicon", "orange"].join("-") + ".ico",
].join("/");

export const StyledLink = styled((props) => {
  // we are removing non input related props before passing them in the components
  // eslint-disable @typescript-eslint/no-unused-vars
  return <Link {...props} />;
})`
  height: 24px;
  min-width: 24px;
  width: 24px;
  display: inline-block;

  img {
    min-width: 24px;
    width: 24px;
    height: 24px;
  }
`;

export const AppsmithLink = () => {
  const organizationConfig = useSelector(getOrganizationConfig);
  const currentWorkspaceId = useSelector(getCurrentWorkspaceId);
  const organizationFaviconUrl = organizationConfig?.brandFaviconUrl;
  const hasCustomFavicon =
    organizationFaviconUrl &&
    organizationFaviconUrl !== "/static/img/celanworkshop-favicon.ico" &&
    organizationFaviconUrl !== LEGACY_DEFAULT_FAVICON_URL;

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();

      const applicationsUrl = currentWorkspaceId
        ? `${APPLICATIONS_URL}?workspaceId=${currentWorkspaceId}`
        : APPLICATIONS_URL;

      if (e.ctrlKey || e.metaKey) {
        window.open(applicationsUrl, "_blank");
      } else {
        history.push(applicationsUrl);
      }
    },
    [currentWorkspaceId],
  );

  return (
    <Tooltip content={createMessage(LOGO_TOOLTIP)} placement="bottomLeft">
      <StyledLink onClick={handleOnClick}>
        <img
          alt="CelanWorkshop logo"
          className="t--appsmith-logo"
          src={hasCustomFavicon ? organizationFaviconUrl : CelanWorkshopMark}
        />
      </StyledLink>
    </Tooltip>
  );
};
