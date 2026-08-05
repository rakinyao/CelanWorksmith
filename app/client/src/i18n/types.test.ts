import {
  DEFAULT_LOCALE,
  isLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "./types";

describe("locale utilities", () => {
  it("accepts the supported locale values", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en-US", "zh-CN"]);
    expect(isLocale("en-US")).toBe(true);
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("fr-FR")).toBe(false);
  });

  it("normalizes language families from browser and persisted values", () => {
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLocale("fr-FR")).toBeUndefined();
    expect(normalizeLocale(null)).toBeUndefined();
  });

  it("keeps English as the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("en-US");
  });
});
