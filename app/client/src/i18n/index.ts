import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./resources/en-US";
import zhCN from "./resources/zh-CN";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type Locale,
} from "./types";

const resources = {
  "en-US": { translation: enUS },
  "zh-CN": { translation: zhCN },
} as const;

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const storedLocale = normalizeLocale(
      window.localStorage.getItem(LOCALE_STORAGE_KEY),
    );

    if (storedLocale) {
      return storedLocale;
    }

    const browserLocale = normalizeLocale(
      window.navigator.languages?.[0] || window.navigator.language,
    );

    if (browserLocale) {
      return browserLocale;
    }
  }

  return DEFAULT_LOCALE;
}

function updateDocumentLocale(locale: Locale) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ["en-US", "zh-CN"],
  interpolation: {
    escapeValue: false,
  },
});

updateDocumentLocale(normalizeLocale(i18n.language) || DEFAULT_LOCALE);

i18n.on("languageChanged", (language) => {
  const locale = normalizeLocale(language) || DEFAULT_LOCALE;

  updateDocumentLocale(locale);
});

export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

export function getLocale(): Locale {
  return normalizeLocale(i18n.language) || DEFAULT_LOCALE;
}

export { i18n };
export * from "./types";
export default i18n;
