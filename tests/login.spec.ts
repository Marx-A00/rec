import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  // TEST 1: Most Important - Successful Login
  test('should successfully log in with valid credentials', async ({
    page,
  }) => {
    // We'll use the test user from our global setup (lowercase email)
    const testEmail = 'playwright_test_existing@example.com';
    const testPassword = 'TestPassword123!';

    // Fill in the login form
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);

    // Click the login button
    await page.locator('button[type="submit"]').click();

    // Should redirect to home page after successful login
    // App redirects authenticated users from / to /home-mosaic
    await page.waitForURL(/\/(home-mosaic)?$/, { timeout: 10000 });

    // Verify we're NOT on the signin page anymore
    await expect(page).not.toHaveURL('/signin');
  });
});
