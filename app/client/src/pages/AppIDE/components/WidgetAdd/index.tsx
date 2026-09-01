import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Flex,
  Tab,
  TabPanel,
  Tabs,
  TabsList,
  Text,
} from "@appsmith/ads";
import { useSelector } from "react-redux";
import styled from "styled-components";

import history from "utils/history";
import { widgetListURL } from "ee/RouteBuilder";
import {
  EDITOR_CLOSE_PANE,
  EDITOR_MODULES_TAB,
  EDITOR_PANE_TEXTS,
  EDITOR_WIDGETS_TAB,
  createMessage,
} from "ee/constants/messages";
import { getCurrentBasePageId } from "selectors/editorSelectors";
import UIModulesList from "ee/pages/AppIDE/components/WidgetAdd/UIModulesList";
import WidgetsList from "./WidgetsList";
import { showUIModulesList } from "ee/selectors/modulesSelector";

const Container = styled(Flex)`
  padding-right: var(--ads-v2-spaces-2);
  background-color: var(--ads-v2-color-gray-50);
`;

const WidgetsAdd = (props: { focusSearchInput?: boolean }) => {
  useTranslation();
  const basePageId = useSelector(getCurrentBasePageId) as string;
  const showUIModules = useSelector(showUIModulesList);

  const closeButtonClickHandler = useCallback(() => {
    history.push(widgetListURL({ basePageId }));
  }, [basePageId]);

  return (
    <>
      <Container
        alignItems="center"
        borderBottom={"1px solid var(--ads-v2-color-border)"}
        data-testid="t--ide-add-pane"
        justifyContent="space-between"
        px="spaces-4"
        py="spaces-2"
      >
        <Text color="var(--ads-v2-color-fg)" kind="heading-xs">
          {createMessage(EDITOR_PANE_TEXTS.widgets_create_tab_title)}
        </Text>
        <Button
          aria-label={createMessage(EDITOR_CLOSE_PANE)}
          data-testid="t--add-pane-close-icon"
          isIconButton
          kind={"tertiary"}
          onClick={closeButtonClickHandler}
          size={"sm"}
          startIcon={"close-line"}
        />
      </Container>
      <Flex flexDirection="column" gap="spaces-3" overflowX="auto">
        {showUIModules && (
          <Tabs defaultValue="widgets">
            <TabsList>
              <Tab value="widgets">{createMessage(EDITOR_WIDGETS_TAB)}</Tab>
              <Tab value="modules">{createMessage(EDITOR_MODULES_TAB)}</Tab>
            </TabsList>
            <TabPanel className="TabsContent" value="widgets">
              <WidgetsList focusSearchInput={props.focusSearchInput} />
            </TabPanel>
            <TabPanel className="TabsContent" value="modules">
              <UIModulesList focusSearchInput={props.focusSearchInput} />
            </TabPanel>
          </Tabs>
        )}
        {!showUIModules && (
          <WidgetsList focusSearchInput={props.focusSearchInput} />
        )}
      </Flex>
    </>
  );
};

export default WidgetsAdd;
