import React from "react";
import styled from "styled-components";
import i18n from "i18n";
import CelanWorkshopMark from "assets/images/celanworkshop_logo_square.png";

const Wrapper = styled.span`
  border-radius: var(--ads-v2-border-radius);
  border: 1px solid var(--ads-v2-color-border);
  background-color: var(--ads-v2-color-bg);

  svg {
    margin-top: 2px;
  }
`;

function BrandingBadge() {
  const brandName = i18n.t("brand.name", { lng: "en-US" });
  const nativeBrandName = i18n.t("brand.name", { lng: "zh-CN" });

  return (
    <Wrapper className="flex items-center p-1 px-2 space-x-2 w-max backdrop-blur-xl backdrop-filter">
      <img
        alt="CelanWorkshop logo"
        className="w-3 h-3"
        src={CelanWorkshopMark}
      />
      <span>{brandName}</span>
      <span className="text-gray-500">{nativeBrandName}</span>
    </Wrapper>
  );
}

export function DesktopBrandingBadgeContainer() {
  return (
    <div className="hover:no-underline">
      <BrandingBadge />
    </div>
  );
}

export default BrandingBadge;
