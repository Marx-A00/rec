import { expect, test } from '@playwright/test';

// Generate a unique email for each test run
const generateTestEmail = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  return `🎭PLAYWRIGHT_TEST-${timestamp}-${randomString}@example.com`;
};

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the registration page
    await page.goto('/register');
  });

  test('should display registration form with all required fields', async ({
    page,
  }) => {
    // Check page title
    await expect(page.locator('h2')).toContainText('Create your account');

    // Check all form fields are present
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Create account'
    );

    // Check sign in link
    await expect(page.locator('a[href="/signin"]').first()).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    // Test empty email
    await page.locator('input[name="email"]').click();
    await page.locator('input[name="password"]').click(); // Blur email field
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();

    // Test invalid email format
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="password"]').click();
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();

    // Test weak password
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('input[name="confirmPassword"]').click();
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();

    // Test password mismatch
    await page.locator('input[name="password"]').fill('StrongPass123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('DifferentPass123!');
    await page.locator('input[name="email"]').click(); // Blur confirm password field
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');

    // Test weak password
    await passwordInput.fill('weak');
    await expect(page.locator('text=Weak')).toBeVisible();

    // Test medium password
    await passwordInput.fill('medium123');
    await expect(page.locator('text=Medium')).toBeVisible();

    // Test strong password
    await passwordInput.fill('StrongPass123!');
    await expect(page.locator('text=Strong')).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    // Fill in the registration form
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for loading state
    await expect(page.locator('text=Creating account...')).toBeVisible();

    // Should redirect to home page after successful registration
    await page.waitForURL('/', { timeout: 10000 });

    // Verify user is logged in (you might need to adjust this based on your UI)
    // For example, check for a user menu or profile link
    await expect(page).toHaveURL('/');
  });

  test('should handle registration with existing email', async ({ page }) => {
    // Use a fixed email that we know exists (you might need to seed this in your test DB)
    const existingEmail = 'existing@example.com';
    const testPassword = 'TestPassword123!';

    // Fill in the registration form
    await page.locator('input[name="email"]').fill(existingEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(
      page.locator('text=/already exists|already registered/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should disable submit button while loading', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Fill in the registration form
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);

    // Click submit
    await page.locator('button[type="submit"]').click();

    // Check button is disabled during submission
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should clear server error when user starts typing', async ({
    page,
  }) => {
    // Submit with existing email to trigger server error
    const existingEmail = 'existing@example.com';
    await page.locator('input[name="email"]').fill(existingEmail);
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();

    // Wait for error
    const errorMessage = page.locator('.bg-red-100');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Start typing in email field
    await page.locator('input[name="email"]').fill('new');

    // Error should disappear
    await expect(errorMessage).not.toBeVisible();
  });

  test('should navigate to sign in page when clicking sign in link', async ({
    page,
  }) => {
    // Click the sign in link
    await page.locator('a[href="/signin"]').first().click();

    // Should navigate to sign in page
    await expect(page).toHaveURL('/signin');
  });

  test('should handle optional name field', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';

    // Fill in the form without name
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should still work without name
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.locator('input[name="password"]').fill('StrongPass123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('DifferentPass123!');
    await page.locator('input[name="email"]').click(); // Trigger validation

    await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register');

    // Use the recognizable test user
    await page
      .getByText('Email', { exact: true })
      .fill('PLAYWRIGHT_TEST_existing@example.com');
    await page.getByText('Password', { exact: true }).fill('NewPassword123!');
    await page
      .getByText('Confirm Password', { exact: true })
      .fill('NewPassword123!');

    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText(/email.*already.*use/i)).toBeVisible();
  });
});
