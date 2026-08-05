import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { updateUserDetails } from "actions/userActions";
import { ANONYMOUS_USERNAME } from "constants/userConstants";
import { getCurrentUser } from "selectors/usersSelectors";
import { changeLocale, getLocale, type Locale } from "./index";

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(getCurrentUser);
  const currentLocale = getLocale();

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const locale = event.target.value as Locale;

      if (locale === currentLocale) {
        return;
      }

      await changeLocale(locale);

      if (
        currentUser &&
        currentUser.username !== ANONYMOUS_USERNAME &&
        currentUser.locale !== locale
      ) {
        dispatch(updateUserDetails({ locale }));
      }
    },
    [currentLocale, currentUser, dispatch],
  );

  return (
    <label>
      <span className="sr-only">{t("language.switchTo")}</span>
      <select
        aria-label={t("language.label")}
        onChange={handleChange}
        value={currentLocale}
      >
        <option value="en-US">{t("language.english")}</option>
        <option value="zh-CN">{t("language.chinese")}</option>
      </select>
    </label>
  );
}
