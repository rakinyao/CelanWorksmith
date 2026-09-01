import { test as setup, expect } from "@playwright/test";
import { ROUTES } from "../constants/routes";

/**
 * Ensures the Playwright test user exists by completing signup / first-time setup when needed.
 * Runs before auth.setup so login can succeed on a fresh instance.
 *
 * Fresh (empty) instances redirect from /user/signup to /setup/welcome with the super-user
 * onboarding form (account details + Continue, then profiling + Get started).
 * Non-empty instances keep the legacy /user/signup email + password + Sign up flow.
 * If the account already exists, the server redirects back to signup with an error — that is treated as success.
 */
setup("sign up with configured credentials", async ({ page }) => {
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  if (!username || !password) {
    throw new Error(
      "USERNAME and PASSWORD environment variables are required for signup setup",
    );
  }

  await page.goto(ROUTES.signup);

  const emptyInstanceForm = page.locator("#super-user-form");
  const emptyInstanceFirstName = emptyInstanceForm.locator(
    '[data-testid="firstName"]',
  );
  const legacySignupForm = page.locator("#signup-form");
  const legacySignupEmail = legacySignupForm.locator('input[name="email"]');

  await expect(emptyInstanceFirstName.or(legacySignupEmail)).toBeVisible({
    timeout: 60_000,
  });

  const isEmptyInstanceSetup = await emptyInstanceFirstName.isVisible();

  if (isEmptyInstanceSetup) {
    await emptyInstanceFirstName.fill("Playwright");
    await emptyInstanceForm.locator('[data-testid="lastName"]').fill("User");
    await emptyInstanceForm.locator('[data-testid="email"]').fill(username);
    await emptyInstanceForm.locator('[data-testid="password"]').fill(password);
    await emptyInstanceForm
      .locator('[data-testid="verifyPassword"]')
      .fill(password);
    await emptyInstanceForm
      .locator("button.t--welcome-form-continue-button")
      .click();
  } else {
    await legacySignupEmail.fill(username);
    await legacySignupForm.locator('input[name="password"]').fill(password);
    await legacySignupForm.locator('button[type="submit"]').click();

    await page.waitForURL(
      (url) => {
        const path = url.pathname;
        if (path.includes("/user/signup") && url.search.includes("error=")) {
          return true;
        }
        if (path.includes("/signup-success")) {
          return true;
        }
        if (path.includes("/applications")) {
          return true;
        }
        return false;
      },
      { timeout: 60_000 },
    );

    const url = new URL(page.url());
    if (
      url.pathname.includes("/user/signup") &&
      url.searchParams.has("error")
    ) {
      const err = url.searchParams.get("error") ?? "";
      if (/already|sign in instead/i.test(err)) {
        return;
      }
      throw new Error(`Signup failed: ${err}`);
    }

    if (url.pathname.includes("/applications")) {
      return;
    }
  }

  await expect(page.getByTestId("t--user-proficiency")).toBeVisible({
    timeout: 60_000,
  });

  const fullName = page.getByTestId("t--user-full-name");
  if (await fullName.isVisible()) {
    await fullName.fill("Playwright User");
  }

  await page
    .getByTestId("t--user-proficiency")
    .getByRole("radio")
    .first()
    .click();
  await page.getByTestId("t--user-use-case").getByRole("radio").first().click();
  await page.locator("button.t--welcome-form-submit-button").click();

  await expect(page).toHaveURL(/\/applications/, { timeout: 60_000 });
});
