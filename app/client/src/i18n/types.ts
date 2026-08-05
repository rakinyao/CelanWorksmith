export const SUPPORTED_LOCALES = ["en-US", "zh-CN"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";
export const LOCALE_STORAGE_KEY = "appsmith.locale";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function normalizeLocale(value?: string | null): Locale | undefined {
  if (isLocale(value)) {
    return value;
  }

  if (value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  if (value?.toLowerCase().startsWith("en")) {
    return "en-US";
  }

  return undefined;
}
