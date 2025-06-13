import { expect, test } from '@playwright/test';

test.describe('Registration Page UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
  });

  test('should display all registration form elements', async ({ page }) => {
    // Check page heading
    await expect(page.locator('h2')).toContainText('Create your account');

    // Check form fields
    await expect(
      page.locator('label:has-text("Name (optional)")')
    ).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();

    await expect(page.locator('label:has-text("Email address")')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();

    await expect(page.locator('label:has-text("Password")')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    await expect(
      page.locator('label:has-text("Confirm Password")')
    ).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toContainText(
      'Create account'
    );

    // Check links
    await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible();
  });

  test('should show real-time validation for email field', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');

    // Type invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Should show error
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();

    // Type valid email
    await emailInput.fill('valid@email.com');
    await emailInput.blur();

    // Error should disappear
    await expect(
      page.locator('text=Please enter a valid email')
    ).not.toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');

    // Weak password
    await passwordInput.fill('weak');
    await expect(page.locator('text=Weak').first()).toBeVisible();

    // Medium password
    await passwordInput.fill('medium123');
    await expect(page.locator('text=Medium').first()).toBeVisible();

    // Strong password
    await passwordInput.fill('StrongPass123!');
    await expect(page.locator('text=Strong').first()).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('DifferentPassword123!');
    await page.locator('input[name="confirmPassword"]').blur();

    await expect(page.locator('text=Passwords do not match')).toBeVisible();

    // Fix the mismatch
    await page
      .locator('input[name="confirmPassword"]')
      .fill('TestPassword123!');
    await page.locator('input[name="confirmPassword"]').blur();

    await expect(page.locator('text=Passwords do not match')).not.toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.locator('a[href="/auth/signin"]').first().click();
    await expect(page).toHaveURL('/auth/signin');
  });

  test('should show loading state when submitting', async ({ page }) => {
    // Fill form with valid data
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('TestPassword123!');

    // Click submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show loading state
    await expect(submitButton).toContainText('Creating account...');
    await expect(submitButton).toBeDisabled();
  });
});
