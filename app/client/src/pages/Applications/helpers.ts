import type { AppIconName } from "@appsmith/ads-old";
import type { AppColorCode } from "constants/DefaultTheme";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { SubmissionError } from "redux-form";

import { truncateString } from "utils/helpers";
import { getLocale, i18n } from "i18n";

export interface CreateApplicationFormValues {
  applicationName: string;
  workspaceId: string;
  colorCode?: AppColorCode;
  appName?: AppIconName;
}

export interface EditedByTextProps {
  modifiedAt?: string;
  modifiedBy?: string;
}

export const CREATE_APPLICATION_FORM_NAME_FIELD = "applicationName";

export const createApplicationFormSubmitHandler = async (
  values: CreateApplicationFormValues,
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any,
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const { applicationName, workspaceId } = values;

  return new Promise((resolve, reject) => {
    dispatch({
      type: ReduxActionTypes.CREATE_APPLICATION_INIT,
      payload: {
        resolve,
        reject,
        applicationName,
        workspaceId,
      },
    });
  }).catch((error) => {
    throw new SubmissionError(error);
  });
};

export const generateEditedByText = ({
  modifiedAt,
  modifiedBy,
}: EditedByTextProps) => {
  let editedBy = modifiedBy ? modifiedBy : "";
  const editedOn = modifiedAt ? modifiedAt : "";

  if (editedBy === "" && editedOn === "") return "";

  editedBy = editedBy.split("@")[0];
  editedBy = truncateString(editedBy, 9);

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(editedOn).getTime()) / 1000),
  );
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  const [unit, divisor] = units.find(
    ([, value]) => elapsedSeconds >= value,
  ) ?? ["second", 1];
  const relativeTime = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
    style: "short",
  }).format(-Math.floor(elapsedSeconds / divisor), unit);

  return i18n.t("application.editedBy", { user: editedBy, time: relativeTime });
};
