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

test.describe('Reset Password', () => {
  test.describe('Invalid link (no token/email)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should show invalid reset link state', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Invalid reset link');

      await expect(
        page.getByText(
          'This password reset link is invalid or incomplete. Please request a new one.'
        )
      ).toBeVisible();

      // Should show request new link button
      await expect(
        page.locator('a[href="/forgot-password"]')
      ).toContainText('Request new reset link');
    });

    test('should navigate to forgot-password from invalid link', async ({
      page,
    }) => {
      await page.locator('a[href="/forgot-password"]').click();
      await expect(page).toHaveURL('/forgot-password');
    });
  });

  test.describe('Valid link (with token/email params)', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate with fake token/email so the form renders
      await page.goto(
        '/reset-password?token=fake-token-123&email=test@example.com'
      );
      await page.waitForLoadState('domcontentloaded');
    });

    test('should display reset password form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Set new password');

      await expect(
        page.getByText('Choose a strong password for your account')
      ).toBeVisible();

      // Password and confirm password fields
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(
        page.locator('input[name="confirmPassword"]')
      ).toBeVisible();

      // Submit button
      await expect(page.locator('button[type="submit"]')).toContainText(
        'Reset password'
      );
    });

    test('should disable submit button when fields are empty', async ({
      page,
    }) => {
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();

      // Fill only password — still disabled
      await fillField(page, 'input[name="password"]', 'NewPassword123!');
      await expect(submitButton).toBeDisabled({ timeout: 2000 });

      // Fill confirm password too — should become enabled
      await fillField(
        page,
        'input[name="confirmPassword"]',
        'NewPassword123!'
      );
      await expect(submitButton).toBeEnabled({ timeout: 3000 });
    });

    test('should show password strength indicator', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.click();
      await passwordInput.pressSequentially('weak', { delay: 50 });

      // Password strength component should be visible
      await expect(page.getByText('Password strength')).toBeVisible({
        timeout: 3000,
      });
    });

    test('should show error when passwords do not match', async ({ page }) => {
      await fillField(page, 'input[name="password"]', 'NewPassword123!');
      await fillField(
        page,
        'input[name="confirmPassword"]',
        'DifferentPassword456!'
      );

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled({ timeout: 3000 });
      await submitButton.click();

      // Should show mismatch error
      await expect(
        page.getByText('Passwords do not match')
      ).toBeVisible({ timeout: 3000 });
    });

    test('should show/hide password with toggle', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('button[aria-label*="password"]');

      await expect(passwordInput).toHaveAttribute('type', 'password');

      await fillField(page, 'input[name="password"]', 'NewPassword123!');

      // Toggle to show
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Toggle to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should show error for invalid/expired token on submit', async ({
      page,
    }) => {
      await fillField(page, 'input[name="password"]', 'NewPassword123!');
      await fillField(
        page,
        'input[name="confirmPassword"]',
        'NewPassword123!'
      );

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled({ timeout: 3000 });
      await submitButton.click();

      // Should show an error (either invalid token or rate limit)
      const errorAlert = page
        .locator('[role="alert"]')
        .filter({
          hasText: /wrong|invalid|expired|something went wrong|rate limit/i,
        });
      await expect(errorAlert).toBeVisible({ timeout: 10000 });
    });
  });
});
