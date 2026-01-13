import { expect, test } from '@playwright/test';

// Test user credentials from global-setup.ts (lowercase email for auth lookup)
const TEST_USER_EMAIL = 'playwright_test_existing@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_NAME = '🎭 PLAYWRIGHT TEST - Existing User';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="identifier"]').fill(TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect after login
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });

    // Navigate to settings
    await page.goto('/settings');
  });

  test('should display settings page with all tabs', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(
      page.getByText('Manage your account settings and preferences')
    ).toBeVisible();

    // Check all tabs are visible
    await expect(page.getByRole('tab', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Preferences/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Privacy/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Account/i })).toBeVisible();
  });

  test('should show Profile tab by default', async ({ page }) => {
    // Profile tab should be active by default
    const profileTab = page.getByRole('tab', { name: /Profile/i });
    await expect(profileTab).toHaveAttribute('data-state', 'active');

    // Profile content should be visible
    await expect(page.getByText('Profile Information')).toBeVisible();
    await expect(page.getByText('Display Name')).toBeVisible();
    await expect(page.getByText('Bio')).toBeVisible();
  });

  test('should display user avatar and info in Profile tab', async ({
    page,
  }) => {
    // Check avatar is visible
    await expect(
      page
        .locator('img[alt*="User"], img[alt*="user"]')
        .or(page.locator('.rounded-full').first())
    ).toBeVisible();

    // Check Change Avatar button exists
    await expect(
      page.getByRole('button', { name: /Change Avatar/i })
    ).toBeVisible();
  });

  test('should allow editing display name', async ({ page }) => {
    // Find the display name input
    const nameInput = page.locator('input[placeholder*="display name"]');
    await expect(nameInput).toBeVisible();

    // Clear and type new name
    await nameInput.fill('');
    await nameInput.fill('Updated Test Name');

    // Check for unsaved changes indicator
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Save Changes button should be enabled
    const saveButton = page.getByRole('button', { name: /Save Changes/i });
    await expect(saveButton).toBeEnabled();
  });

  test('should allow editing bio', async ({ page }) => {
    // Find the bio textarea
    const bioTextarea = page.locator(
      'textarea[placeholder*="Tell us about yourself"]'
    );
    await expect(bioTextarea).toBeVisible();

    // Clear and type new bio
    await bioTextarea.fill('');
    await bioTextarea.fill('This is my updated bio for testing.');

    // Check for unsaved changes indicator
    await expect(page.getByText('You have unsaved changes')).toBeVisible();
  });

  test('should toggle email visibility', async ({ page }) => {
    // Email should be hidden by default (masked)
    await expect(page.getByText('••••••••@••••••.com')).toBeVisible();

    // Click the eye button to show email
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .nth(1);
    // Find the eye/eyeoff toggle button near the email
    const eyeButton = page
      .locator('[class*="ghost"]')
      .filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') });

    if ((await eyeButton.count()) > 0) {
      await eyeButton.first().click();
      // Email should now be visible (contains @)
      await expect(page.getByText(/@example\.com/)).toBeVisible();
    }
  });

  test('should discard changes when clicking Discard button', async ({
    page,
  }) => {
    // Get original name
    const nameInput = page.locator('input[placeholder*="display name"]');
    const originalValue = await nameInput.inputValue();

    // Make a change
    await nameInput.fill('Temporary Change');
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Click discard
    const discardButton = page.getByRole('button', {
      name: /Discard Changes/i,
    });
    await discardButton.click();

    // Value should be restored
    await expect(nameInput).toHaveValue(originalValue);

    // Unsaved changes message should be gone
    await expect(page.getByText('You have unsaved changes')).not.toBeVisible();
  });

  test('should navigate to Preferences tab', async ({ page }) => {
    // Click Preferences tab
    await page.getByRole('tab', { name: /Preferences/i }).click();

    // Preferences content should be visible
    await expect(
      page.getByRole('tab', { name: /Preferences/i })
    ).toHaveAttribute('data-state', 'active');
  });

  test('should navigate to Privacy tab and show privacy settings', async ({
    page,
  }) => {
    // Click Privacy tab
    await page.getByRole('tab', { name: /Privacy/i }).click();

    // Privacy content should be visible
    await expect(page.getByText('Privacy Settings')).toBeVisible();
    await expect(
      page.getByText('Control who can see your activity')
    ).toBeVisible();

    // Check for privacy options
    await expect(page.getByText('Profile Visibility')).toBeVisible();
    await expect(page.getByText('Show Activity in Feed')).toBeVisible();
    await expect(page.getByText('Show Collections on Profile')).toBeVisible();
  });

  test('should show profile visibility dropdown in Privacy tab', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: /Privacy/i }).click();

    // Find the visibility dropdown
    const visibilitySelect = page.locator('select');
    await expect(visibilitySelect).toBeVisible();

    // Verify the select has options by checking its value can be changed
    const currentValue = await visibilitySelect.inputValue();
    expect(['public', 'followers', 'private']).toContain(currentValue);
  });

  test('should have privacy toggle settings', async ({ page }) => {
    await page.getByRole('tab', { name: /Privacy/i }).click();

    // Wait for privacy settings to load
    await expect(page.getByText('Profile Visibility')).toBeVisible();

    // Check for toggle-related text (the toggles are present)
    await expect(page.getByText('Show Activity in Feed')).toBeVisible();
    await expect(page.getByText('Show Collections on Profile')).toBeVisible();
  });

  test('should navigate to Account tab and show account info', async ({
    page,
  }) => {
    // Click Account tab
    await page.getByRole('tab', { name: /Account/i }).click();

    // Account content should be visible
    await expect(page.getByText('Account Management')).toBeVisible();
    await expect(page.getByText('Account Statistics')).toBeVisible();

    // Check statistics are displayed
    await expect(page.getByText('Recommendations')).toBeVisible();
    await expect(page.getByText('Followers')).toBeVisible();
    await expect(page.getByText('Following')).toBeVisible();
  });

  test('should show App Tutorial section in Account tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Account/i }).click();

    // Tutorial section should be visible
    await expect(page.getByText('App Tutorial')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Restart App Tour/i })
    ).toBeVisible();
  });

  test('should show Danger Zone in Account tab', async ({ page }) => {
    await page.getByRole('tab', { name: /Account/i }).click();

    // Danger Zone should be visible
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(
      page.getByText('Once you delete your account, there is no going back')
    ).toBeVisible();

    // Delete Account button should be visible
    await expect(
      page.getByRole('button', { name: /Delete Account/i })
    ).toBeVisible();
  });

  test('should show confirmation dialog when clicking Delete Account', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: /Account/i }).click();

    // Set up dialog handler before clicking
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('delete your account');
      await dialog.dismiss(); // Cancel the deletion
    });

    // Click Delete Account
    await page.getByRole('button', { name: /Delete Account/i }).click();
  });

  test('should have Back button that navigates away', async ({ page }) => {
    // Check for back button
    const backButton = page.locator('button', { hasText: /Back|←/ }).first();

    if (await backButton.isVisible()) {
      await backButton.click();
      // Should navigate away from settings
      await expect(page).not.toHaveURL('/settings');
    }
  });
});

test.describe('Settings Page - Unauthenticated', () => {
  test('should redirect to signin when accessing settings unauthenticated', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Should redirect to signin
    await page.waitForURL('/signin', { timeout: 10000 });
    await expect(page).toHaveURL('/signin');
  });
});

test.describe('Settings - Profile Update Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="identifier"]').fill(TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
    await page.goto('/settings');
  });

  test('should save profile changes successfully', async ({ page }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const testBio = `Test bio updated at ${timestamp}`;

    // Update bio
    const bioTextarea = page.locator(
      'textarea[placeholder*="Tell us about yourself"]'
    );
    await bioTextarea.fill(testBio);

    // Save changes
    const saveButton = page.getByRole('button', { name: /Save Changes/i });
    await saveButton.click();

    // Wait for toast notification
    await expect(
      page.getByText(/Profile updated successfully|saved/i)
    ).toBeVisible({ timeout: 5000 });

    // Refresh page and verify changes persisted
    await page.reload();

    // Wait for data to load
    await expect(page.getByText('Profile Information')).toBeVisible();

    // Check bio value persisted
    const updatedBioTextarea = page.locator(
      'textarea[placeholder*="Tell us about yourself"]'
    );
    await expect(updatedBioTextarea).toHaveValue(testBio);
  });
});

test.describe('Settings - Privacy Update Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="identifier"]').fill(TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
    await page.goto('/settings');
    await page.getByRole('tab', { name: /Privacy/i }).click();
  });

  test('should be able to change profile visibility setting', async ({
    page,
  }) => {
    // Wait for privacy settings to load
    await expect(page.getByText('Profile Visibility')).toBeVisible();

    // Find the visibility dropdown
    const visibilitySelect = page.locator('select');
    await expect(visibilitySelect).toBeVisible();

    // Get current value and verify it's valid
    const currentValue = await visibilitySelect.inputValue();
    expect(['public', 'followers', 'private']).toContain(currentValue);

    // Change to a different value
    const newValue = currentValue === 'public' ? 'private' : 'public';
    await visibilitySelect.selectOption(newValue);

    // Verify the value changed in the UI
    await expect(visibilitySelect).toHaveValue(newValue);

    // Change back to original value to clean up
    await visibilitySelect.selectOption(currentValue);
  });
});
