import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  // TEST 1: Most Important - Successful Login
  test('should successfully log in with valid credentials', async ({
    page,
  }) => {
    // We'll use the test user from our global setup
    const testEmail = 'PLAYWRIGHT_TEST_existing@example.com';
    const testPassword = 'TestPassword123!';

    // Fill in the login form
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);

    // Click the login button
    await page.locator('button[type="submit"]').click();

    // Should redirect to home page after successful login
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
  });
});
