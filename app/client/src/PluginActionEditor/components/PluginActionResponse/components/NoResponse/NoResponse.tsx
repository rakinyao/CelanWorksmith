import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@appsmith/ads";
import NoResponseSVG from "assets/images/no-response.svg";
import {
  EDITOR_RUN_BUTTON,
  EMPTY_RESPONSE_RUN,
  createMessage,
} from "ee/constants/messages";

import * as Styled from "./styles";

interface NoResponseProps {
  isRunDisabled: boolean;
  isRunning: boolean;
  onRunClick: () => void;
}

export const NoResponse = ({
  isRunDisabled,
  isRunning,
  onRunClick,
}: NoResponseProps) => {
  useTranslation();

  return (
    <Styled.Container>
      <img alt="no-response-yet" src={NoResponseSVG} />
      <Styled.RunGroup>
        <Styled.Text>{createMessage(EMPTY_RESPONSE_RUN)}</Styled.Text>
        <Button
          isDisabled={isRunDisabled}
          isLoading={isRunning}
          onClick={onRunClick}
          size="sm"
        >
          {createMessage(EDITOR_RUN_BUTTON)}
        </Button>
      </Styled.RunGroup>
    </Styled.Container>
  );
};
