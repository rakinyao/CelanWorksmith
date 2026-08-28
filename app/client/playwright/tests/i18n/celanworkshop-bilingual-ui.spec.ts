import { expect, test } from "@playwright/test";

test.use({
  storageState: { cookies: [], origins: [] },
});

const localeStorageKey = "appsmith.locale";

const clearStoredLocale = async (page: import("@playwright/test").Page) => {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, localeStorageKey);
};

const assertLocaleAndBrand = async (
  page: import("@playwright/test").Page,
  locale: "zh-CN" | "en-US",
  brand: string,
) => {
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.getByText(new RegExp(brand))).toBeVisible();
};

test.describe("CelanWorkshop bilingual authentication UI", () => {
  test("uses Chinese by default and renders desktop/mobile login evidence", async ({
    page,
  }, testInfo) => {
    await clearStoredLocale(page);
    await page.goto("/user/login");
    await assertLocaleAndBrand(page, "zh-CN", "沧澜工坊");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath("login-zh-CN-desktop-1440x900.png"),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath("login-zh-CN-mobile-390x844.png"),
    });
  });

  test("persists an English selection through reload", async ({ page }) => {
    await clearStoredLocale(page);
    await page.goto("/user/login");
    await assertLocaleAndBrand(page, "zh-CN", "沧澜工坊");

    const languageControl = page.getByRole("combobox", {
      name: /语言|Language/,
    });
    await expect(languageControl).toBeVisible();
    await languageControl.selectOption("en-US");
    await assertLocaleAndBrand(page, "en-US", "CelanWorkshop");
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), localeStorageKey),
      )
      .toBe("en-US");

    await page.goto("/user/login");
    await assertLocaleAndBrand(page, "en-US", "CelanWorkshop");
  });
});
