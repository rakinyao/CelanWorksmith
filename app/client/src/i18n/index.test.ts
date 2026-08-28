import { getInitialLocale } from "./index";
import { LOCALE_STORAGE_KEY } from "./types";

describe("initial locale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses Chinese when no user or stored locale is configured", () => {
    expect(getInitialLocale()).toBe("zh-CN");
  });

  it("keeps an explicit stored English preference", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
    expect(getInitialLocale()).toBe("en-US");
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

    expect(getInitialLocale()).toBe("zh-CN");
  });
});
