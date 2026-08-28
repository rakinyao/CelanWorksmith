import { LOCALE_STORAGE_KEY } from "./types";

describe("initial locale", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  function loadI18n() {
    return require("./index") as typeof import("./index");
  }

  it("uses Chinese when no user or stored locale is configured", () => {
    expect(loadI18n().getInitialLocale()).toBe("zh-CN");
  });

  it("keeps an explicit stored English preference", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
    expect(loadI18n().getInitialLocale()).toBe("en-US");
  });

  it("does not let an unsupported browser locale replace the product default", () => {
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["fr-FR"],
    });
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "fr-FR",
    });

    expect(loadI18n().getInitialLocale()).toBe("zh-CN");
  });

  it("keeps English as the missing-key fallback", () => {
    expect(loadI18n().i18n.options.fallbackLng).toEqual(["en-US"]);
  });
});
