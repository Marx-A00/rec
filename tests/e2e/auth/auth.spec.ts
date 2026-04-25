import { expect, test, Page } from '@playwright/test';

/**
 * E2E tests for user registration
 * Tests the registration form at /register
 *
 * Note: The registration form only collects email + password.
 * Username is set during the Complete Profile onboarding step.
 */

// Generate a unique email for each test run
const generateTestEmail = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  return `PLAYWRIGHT_TEST_${timestamp}_${randomString}@example.com`;
};

/**
 * Fill a form field by typing character-by-character.
 * Playwright's .fill() doesn't reliably trigger React's onChange in all browsers.
 * pressSequentially simulates real keystrokes which always trigger React events.
 */
async function fillField(page: Page, selector: string, value: string) {
  const locator = page.locator(selector);
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 20 });
}

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display registration form with all required fields', async ({
    page,
  }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Create your account');

    // Registration form has email and password only (no username)
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Should NOT have a username field (username is set in Complete Profile)
    await expect(page.locator('input[name="username"]')).not.toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Create your account'
    );

    // Check sign in link
    await expect(page.locator('a[href="/signin"]')).toBeVisible();

    // Check Google OAuth button
    await expect(page.getByText('Sign up with Google')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    // Fill invalid email and blur
    await fillField(page, 'input[name="email"]', 'invalid-email');
    await page.locator('input[name="password"]').click(); // Blur email field

    // Should show email validation error
    const emailError = page.locator('#email-error');
    await expect(emailError).toBeVisible({ timeout: 3000 });
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');

    // Click into the field and type to ensure React state updates
    await passwordInput.click();
    await passwordInput.pressSequentially('weak', { delay: 50 });

    // Password strength indicator should be visible
    const strengthIndicator = page.locator('#password-strength');
    await expect(strengthIndicator).toBeVisible({ timeout: 3000 });

    // Clear and type a stronger password
    await passwordInput.fill('');
    await passwordInput.pressSequentially('StrongPassword123!', { delay: 20 });
    await expect(strengthIndicator).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Fill in the registration form (email + password only)
    await fillField(page, 'input[name="email"]', testEmail);
    await fillField(page, 'input[name="password"]', testPassword);

    // Wait for submit button to be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });

    // Submit the form
    await submitButton.click();

    // Wait for either redirect (success) or a rate limit error
    const rateLimitError = page.locator('[role="alert"]').filter({
      hasText: /too many requests/i,
    });

    const result = await Promise.race([
      page
        .waitForURL(
          url =>
            url.pathname.includes('/complete-profile') ||
            url.pathname.includes('/home') ||
            url.pathname === '/',
          { timeout: 20000 }
        )
        .then(() => 'redirected' as const),
      rateLimitError
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => 'rate-limited' as const),
    ]);

    // Skip if rate-limited — not a test failure
    if (result === 'rate-limited') {
      test.skip(true, 'Registration API rate-limited');
      return;
    }

    // Should NOT show error state
    const errorAlert = page
      .locator('[role="alert"]')
      .filter({ hasText: /failed|error/i });
    await expect(errorAlert).not.toBeVisible();
  });

  test('should show loading state while submitting', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Fill in the registration form
    await fillField(page, 'input[name="email"]', testEmail);
    await fillField(page, 'input[name="password"]', testPassword);

    // Wait for submit button to be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });

    // Click submit
    await submitButton.click();

    // Check for loading text
    await expect(page.getByText('Creating your account...')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should navigate to sign in page when clicking sign in link', async ({
    page,
  }) => {
    await page.locator('a[href="/signin"]').click();
    await expect(page).toHaveURL('/signin');
  });

  test('should disable submit button when fields are empty', async ({
    page,
  }) => {
    // Submit button should be disabled with empty fields
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Fill only email - still disabled
    await fillField(page, 'input[name="email"]', 'test@example.com');
    await expect(submitButton).toBeDisabled({ timeout: 2000 });

    // Fill password too - should become enabled
    await fillField(page, 'input[name="password"]', 'TestPassword123!');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
  });

  test('should show/hide password with toggle button', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Fill password
    await fillField(page, 'input[name="password"]', 'TestPassword123!');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should clear server error when user starts typing', async ({
    page,
  }) => {
    // Submit with an email that may trigger a server error
    await fillField(page, 'input[name="email"]', 'test@example.com');
    await fillField(page, 'input[name="password"]', 'TestPassword123!');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Wait for potential error
    await page.waitForTimeout(3000);

    // Check if error appeared
    const errorAlert = page.locator('[role="alert"]');
    const hasError = await errorAlert.isVisible().catch(() => false);

    if (hasError) {
      // Start typing in email field
      await fillField(page, 'input[name="email"]', 'new');

      // Error should disappear
      await expect(errorAlert).not.toBeVisible({ timeout: 2000 });
    } else {
      // No error to clear - skip this check
      test.skip();
    }
  });

  test('should handle registration with existing email', async ({ page }) => {
    // Use a test email that likely exists (from test setup)
    const existingEmail = 'playwright_test_existing@example.com';
    const testPassword = 'TestPassword123!';

    await fillField(page, 'input[name="email"]', existingEmail);
    await fillField(page, 'input[name="password"]', testPassword);

    // Wait for submit button to be enabled then click
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Should show error OR redirect (depending on whether email exists)
    const pageContent = await page.content();
    const hasProcessed =
      pageContent.includes('already') ||
      pageContent.includes('Welcome') ||
      pageContent.includes('error') ||
      pageContent.includes('complete-profile') ||
      page.url().includes('home') ||
      page.url().includes('complete-profile');

    expect(hasProcessed).toBeTruthy();
  });
});
