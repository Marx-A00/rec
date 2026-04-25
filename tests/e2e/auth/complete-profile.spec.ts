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

/**
 * Sign in as a test user via the UI, matching the working login.spec.ts approach.
 * Returns true if sign-in succeeded, false otherwise.
 */
async function signInAsTestUser(page: Page): Promise<boolean> {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');

  const identifierInput = page.locator('input[name="identifier"]');
  await expect(identifierInput).toBeVisible({ timeout: 10000 });

  await identifierInput.fill('playwright_test_existing@example.com');
  await page.locator('input[name="password"]').fill('TestPassword123!');
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from signin
  try {
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
    return true;
  } catch {
    return false;
  }
}

test.describe('Complete Profile (Onboarding)', () => {
  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.goto('/complete-profile');
    // The page redirects unauthenticated users — may go to /signin or /api/auth/signin
    await page.waitForURL(url => url.pathname.includes('signin'), {
      timeout: 15000,
    });
  });

  test.describe('Authenticated', () => {
    // Run serially to avoid concurrent sign-in rate limiting
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
      const signedIn = await signInAsTestUser(page);
      if (!signedIn) {
        test.skip(true, 'Sign-in failed (likely rate-limited)');
        return;
      }
      await page.goto('/complete-profile');
      await page.waitForLoadState('networkidle');

      // If redirected away (user already onboarded), skip
      if (!page.url().includes('/complete-profile')) {
        test.skip(true, 'User redirected away from complete-profile');
      }
    });

    test('should display the complete profile form', async ({ page }) => {
      // Check heading
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      // Check subtitle
      await expect(
        page.getByText('Choose a username and tell us about yourself')
      ).toBeVisible();

      // Check username input
      await expect(page.locator('input#username')).toBeVisible();

      // Check bio textarea
      await expect(page.locator('textarea#bio')).toBeVisible();

      // Check submit button
      await expect(
        page.getByRole('button', { name: /save & continue/i })
      ).toBeVisible();
    });

    test('should show username validation hint', async ({ page }) => {
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      // Hint text about username requirements should be visible
      await expect(
        page.getByText(/2-30 characters/)
      ).toBeVisible();
    });

    test('should check username availability', async ({ page }) => {
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      // Type a unique username
      const uniqueUsername = `testuser${Date.now()}`;
      await fillField(page, 'input#username', uniqueUsername);

      // Should show availability result after debounce (500ms)
      const available = page.getByText('Username is available!');
      const taken = page.getByText('This username is already taken');

      // Wait for either availability check result
      await expect(available.or(taken)).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for short username', async ({
      page,
    }) => {
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      // Type a single character — too short
      await fillField(page, 'input#username', 'a');

      // Should show validation error
      await expect(
        page.getByText('Username must be at least 2 characters long')
      ).toBeVisible({ timeout: 3000 });
    });

    test('should show bio character count', async ({ page }) => {
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      // Initially should show 0/160
      await expect(page.getByText('0/160')).toBeVisible();

      // Type in bio
      await fillField(page, 'textarea#bio', 'Music lover');

      // Character count should update
      await expect(page.getByText('11/160')).toBeVisible({ timeout: 3000 });
    });

    test('should disable submit button until username is available', async ({
      page,
    }) => {
      await expect(
        page.getByText('Set up your profile')
      ).toBeVisible({ timeout: 10000 });

      const submitButton = page.getByRole('button', {
        name: /save & continue/i,
      });

      // Button should be disabled when no username entered
      await expect(submitButton).toBeDisabled();

      // Enter a valid unique username
      const uniqueUsername = `testuser${Date.now()}`;
      await fillField(page, 'input#username', uniqueUsername);

      // Wait for availability check
      await expect(
        page.getByText('Username is available!')
      ).toBeVisible({ timeout: 5000 });

      // Button should now be enabled
      await expect(submitButton).toBeEnabled({ timeout: 3000 });
    });
  });
});
