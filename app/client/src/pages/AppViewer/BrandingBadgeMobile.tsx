import React from "react";
import i18n from "i18n";
import CelanWorkshopMark from "assets/images/celanworkshop_logo_square.png";

function BrandingBadge() {
  const brandName = i18n.t("brand.name", { lng: "en-US" });
  const nativeBrandName = i18n.t("brand.name", { lng: "zh-CN" });

  return (
    <span className="flex items-center p-1 px-2 space-x-2 bg-white rounded-md md:border md:flex z-3">
      <img
        alt="CelanWorkshop logo"
        className="w-3 h-3"
        src={CelanWorkshopMark}
      />
      <span className="text-xs text-gray-700">{brandName}</span>
      <span className="text-xs text-gray-500">{nativeBrandName}</span>
    </span>
  );
}

export function MobileBrandingBadgeContainer() {
  return (
    <div className="flex mt-2">
      <BrandingBadge />
    </div>
  );
}

export default BrandingBadge;
