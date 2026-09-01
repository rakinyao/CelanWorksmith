import React, { useMemo } from "react";
import { useHotkeys, type HotkeyConfig } from "@blueprintjs/core";
import type { SearchItem, SelectEvent } from "./utils";
import { useTranslation } from "react-i18next";

interface Props {
  modalOpen: boolean;
  toggleShow: () => void;
  handleUpKey: () => void;
  handleDownKey: () => void;
  handleItemLinkClick: (
    event: SelectEvent,
    item?: SearchItem,
    source?: string,
  ) => void;
  children: React.ReactNode;
}

const GlobalSearchHotKeys: React.FC<Props> = ({
  children,
  handleDownKey,
  handleItemLinkClick,
  handleUpKey,
  modalOpen,
}) => {
  const { t } = useTranslation();
  const hotkeys: HotkeyConfig[] = useMemo(
    () =>
      [
        {
          combo: "up",
          onKeyDown: handleUpKey,
          hideWhenModalClosed: true,
          allowInInput: true,
          group: "Omnibar",
          label: t("search.moveUpList"),
          global: false,
        },
        {
          combo: "down",
          onKeyDown: handleDownKey,
          hideWhenModalClosed: true,
          allowInInput: true,
          group: "Omnibar",
          label: t("search.moveDownList"),
          global: false,
        },
        {
          combo: "return",
          onKeyDown: (event: KeyboardEvent) => {
            // TODO: Fix this the next time the file is edited
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeElement = document.activeElement as any;

            activeElement?.blur(); // scroll into view doesn't work with the search input focused
            handleItemLinkClick(event, null, "ENTER_KEY");
          },
          hideWhenModalClosed: true,
          allowInInput: true,
          group: "Omnibar",
          label: t("search.hotkeyNavigate"),
          global: false,
        },
      ].filter(
        ({ hideWhenModalClosed }) =>
          !hideWhenModalClosed || (hideWhenModalClosed && modalOpen),
      ),
    [handleUpKey, handleDownKey, handleItemLinkClick, modalOpen, t],
  );

  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  return (
    <div onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      {children}
    </div>
  );
};

export default GlobalSearchHotKeys;
