import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    // Wait for full page load including JS hydration
    await page.waitForLoadState('networkidle');
  });

  // TEST 1: Most Important - Successful Login
  test('should successfully log in with valid credentials', async ({
    page,
  }) => {
    // We'll use the test user from our global setup (lowercase email)
    const testEmail = 'playwright_test_existing@example.com';
    const testPassword = 'TestPassword123!';

    // Wait for form to be visible and interactive
    const identifierInput = page.locator('input[name="identifier"]');
    await expect(identifierInput).toBeVisible({ timeout: 10000 });

    // Fill in the login form (uses 'identifier' for email/username)
    await identifierInput.fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);

    // Click the login button
    await page.locator('button[type="submit"]').click();

    // Wait for navigation away from signin page
    // The app may redirect to / or /home-mosaic
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });

    // Verify we're NOT on the signin page anymore
    await expect(page).not.toHaveURL(/\/signin/);
  });
});
