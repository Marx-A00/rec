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

    // ARRANGE: Start on registration page
    await page.goto('/register');

    // ACT: Complete registration form
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for loading state
    await expect(page.locator('text=Creating your account...')).toBeVisible();

    // ASSERT: Verify complete success flow
    
    // 1. Should show success modal with proper messaging
    await expect(page.locator('text=Welcome to the community!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=automatically signed in')).toBeVisible();
    await expect(page.locator(`text=${testName}`)).toBeVisible(); // User name should appear
    
    // 2. Should NOT show any error messages during success flow
    await expect(page.locator('.bg-red-500\\/10')).not.toBeVisible();
    await expect(page.locator('text=/sign in failed|failed to create/i')).not.toBeVisible();
    
    // 3. Click continue to proceed
    await page.locator('button', { hasText: 'Start discovering music' }).click();
    
    // 4. Should redirect to home page  
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page).toHaveURL('/');
    
    // 5. CRITICAL: Verify user is actually authenticated
    // Using real selectors from NavigationSidebar.tsx
    
    // Check for Sign Out button (only visible when authenticated)
    await expect(page.locator('button', { hasText: 'Sign Out' })).toBeVisible({ timeout: 5000 });
    
    // Check that Sign In button is NOT visible (only shows when not authenticated)
    await expect(page.locator('button', { hasText: 'Sign In' })).not.toBeVisible();
    
    // Check user name appears in the hover card
    await page.locator('button[aria-label*="User profile:"]').hover();
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    
    // 6. Verify user can access authenticated pages
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    // Should not redirect to sign in page
    await expect(page).not.toHaveURL('/signin');
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

  test('should handle registration success but auto-login failure gracefully', async ({ page }) => {
    // This test specifically targets the bug you're experiencing:
    // Registration API succeeds, but NextAuth signIn fails, showing error instead of success
    
    const testEmail = generateTestEmail();
    const testPassword = 'TestPassword123!';
    const testName = 'Auto-Login Test User';

    await page.goto('/register');
    
    // Fill and submit registration form
    await page.locator('input[name="name"]').fill(testName);
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="confirmPassword"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // Wait for loading
    await expect(page.locator('text=Creating account...')).toBeVisible();

    // Current bug behavior: Shows error message instead of success
    // This test should FAIL initially, then PASS after you fix the auto-login issue
    
    // Should NOT show error messages (this will fail with current bug)
    await expect(page.locator('text=/Account created but sign in failed/i')).not.toBeVisible();
    await expect(page.locator('text=/Please try signing in manually/i')).not.toBeVisible();
    await expect(page.locator('.bg-red-500\\/10')).not.toBeVisible();
    
    // Should show success flow instead (this will also fail initially)
    await expect(page.locator('text=Welcome to the community!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=automatically signed in')).toBeVisible();
    
    // After clicking continue, user should be logged in
    await page.locator('button', { hasText: 'Start discovering music' }).click();
    await page.waitForURL('/', { timeout: 10000 });
    
    // User should be authenticated (this will fail if auto-login doesn't work)
    await expect(page.locator('button', { hasText: 'Sign Out' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button', { hasText: 'Sign In' })).not.toBeVisible();
  });
});
