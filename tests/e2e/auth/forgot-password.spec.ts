import { expect, test, Page } from '@playwright/test';

/**
 * Fill a form field by typing character-by-character.
 * pressSequentially simulates real keystrokes which always trigger React events.
 */
async function fillField(page: Page, selector: string, value: string) {
  const locator = page.locator(selector);
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 20 });
}

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display forgot password form with all elements', async ({
    page,
  }) => {
    // Check heading
    await expect(page.locator('h1')).toContainText('Forgot your password?');

    // Check subtitle
    await expect(
      page.getByText('Enter your email and we will send you a reset link')
    ).toBeVisible();

    // Check email input
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Send reset link'
    );

    // Check back to sign in link
    await expect(page.locator('a[href="/signin"]')).toBeVisible();
  });

  test('should disable submit button when email is empty', async ({
    page,
  }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Fill email — should become enabled
    await fillField(page, 'input[name="email"]', 'test@example.com');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await fillField(page, 'input[name="email"]', 'not-an-email');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Should show validation error (filter out Next.js route announcer)
    const errorAlert = page
      .locator('[role="alert"]')
      .filter({ hasText: /valid email/i });
    await expect(errorAlert).toBeVisible({ timeout: 3000 });
  });

  test('should submit and show success state', async ({ page }) => {
    await fillField(page, 'input[name="email"]', 'test@example.com');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Wait for either success state or rate limit error
    const rateLimitError = page
      .locator('[role="alert"]')
      .filter({ hasText: /rate limit/i });

    const result = await Promise.race([
      page
        .locator('h1')
        .filter({ hasText: 'Check your email' })
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'success' as const),
      rateLimitError
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'rate-limited' as const),
    ]);

    if (result === 'rate-limited') {
      test.skip(true, 'Forgot password API rate-limited');
      return;
    }

    // Success state should show confirmation text
    await expect(
      page.getByText('If an account exists with that email')
    ).toBeVisible();

    // Should show expiry notice
    await expect(
      page.getByText('The link will expire in 1 hour')
    ).toBeVisible();

    // Should have a back to sign in link
    await expect(page.locator('a[href="/signin"]')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.locator('a[href="/signin"]').click();
    await expect(page).toHaveURL('/signin');
  });
});
