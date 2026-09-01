import { test as setup, expect } from "@playwright/test";
import { ROUTES } from "../constants/routes";

const authFile = "playwright/auth/user.json";

setup("authenticate", async ({ page }) => {
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  if (!username || !password) {
    throw new Error(
      "USERNAME and PASSWORD environment variables are required for auth setup",
    );
  }

  await page.goto(ROUTES.login);
  const loginForm = page.locator(".t--login-container form");
  await loginForm.locator('input[name="username"]').fill(username);
  await loginForm.locator('input[name="password"]').fill(password);
  await loginForm.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.includes("/login"));
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: authFile });
});
