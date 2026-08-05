import { useEffect } from "react";
import { useSelector } from "react-redux";
import { getCurrentUser } from "selectors/usersSelectors";
import { changeLocale, getLocale, normalizeLocale } from ".";

export default function LocaleSync() {
  const currentUser = useSelector(getCurrentUser);
  const userLocale = normalizeLocale(currentUser?.locale);

  useEffect(
    function syncLocale() {
      if (userLocale && userLocale !== getLocale()) {
        void changeLocale(userLocale);
      }
    },
    [userLocale],
  );

  return null;
}
