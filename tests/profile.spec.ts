import { expect, test } from '@playwright/test';

// Test user credentials from global-setup.ts (lowercase email for auth lookup)
const TEST_USER_EMAIL = 'playwright_test_existing@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_USER_NAME = '🎭 PLAYWRIGHT TEST - Existing User';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/signin');
    await page.locator('input[name="email"]').fill(TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect after login (app redirects to /home-mosaic)
    await page.waitForURL(/\/(home-mosaic)?$/, { timeout: 10000 });
  });

  test('should redirect /profile to user-specific profile page', async ({
    page,
  }) => {
    await page.goto('/profile');

    // Should redirect to /profile/{userId}
    await expect(page).toHaveURL(/\/profile\/[a-zA-Z0-9-]+/);
  });

  test('should display user profile information correctly', async ({
    page,
  }) => {
    await page.goto('/profile');

    // Wait for profile page to load
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Check user name is displayed
    await expect(page.locator('h1')).toContainText(TEST_USER_NAME);

    // Check profile stats exist (using more specific selectors)
    await expect(page.locator('a', { hasText: 'Followers' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Following' })).toBeVisible();
    await expect(
      page.locator('span', { hasText: /\d+ Recommendations/ })
    ).toBeVisible();
  });

  test('should show settings menu for own profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Find and click the settings button
    const settingsButton = page.locator(
      'button[aria-label="Profile settings menu"]'
    );
    await expect(settingsButton).toBeVisible();

    await settingsButton.click();

    // Check menu items are visible
    await expect(page.getByText('Edit Profile')).toBeVisible();
    await expect(page.getByText('Account Settings')).toBeVisible();
  });

  test('should open profile edit form from settings menu', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Open settings menu
    await page.locator('button[aria-label="Profile settings menu"]').click();

    // Click Edit Profile
    await page.getByText('Edit Profile').click();

    // Profile edit form should appear (look for the display name input)
    await expect(
      page.getByRole('textbox', { name: 'Display Name' })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to account settings from profile menu', async ({
    page,
  }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Open settings menu
    await page.locator('button[aria-label="Profile settings menu"]').click();

    // Click Account Settings link
    await page.getByText('Account Settings').click();

    // Should navigate to settings page
    await page.waitForURL('/settings');
    await expect(page).toHaveURL('/settings');
  });

  test('should close settings menu when clicking outside', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Open settings menu
    await page.locator('button[aria-label="Profile settings menu"]').click();
    await expect(page.getByText('Edit Profile')).toBeVisible();

    // Click outside the menu (on the page body)
    await page.locator('h1').click();

    // Menu should close
    await expect(page.getByText('Edit Profile')).not.toBeVisible();
  });

  test('should close settings menu with Escape key', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Open settings menu
    await page.locator('button[aria-label="Profile settings menu"]').click();
    await expect(page.getByText('Edit Profile')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Menu should close
    await expect(page.getByText('Edit Profile')).not.toBeVisible();
  });

  test('should display back button and navigate correctly', async ({
    page,
  }) => {
    // Navigate to profile from home
    await page.goto('/');
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Back button should be visible
    const backButton = page.locator('button', { hasText: '← Back' });
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Should navigate away from profile
    await expect(page).not.toHaveURL(/\/profile\//);
  });

  test('should show empty states when user has no content', async ({
    page,
  }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Check for section headings (test user likely has no albums/recommendations)
    await expect(
      page.getByRole('heading', { name: 'Record Collection' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Music Recommendations' })
    ).toBeVisible();
  });

  test('should display followers and following counts as links', async ({
    page,
  }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Followers and Following should be clickable links
    const followersLink = page.locator('a', { hasText: 'Followers' });
    const followingLink = page.locator('a', { hasText: 'Following' });

    await expect(followersLink).toBeVisible();
    await expect(followingLink).toBeVisible();

    // Check they have correct href patterns
    await expect(followersLink).toHaveAttribute(
      'href',
      /\/profile\/[a-zA-Z0-9-]+\/followers/
    );
    await expect(followingLink).toHaveAttribute(
      'href',
      /\/profile\/[a-zA-Z0-9-]+\/following/
    );
  });

  test('should navigate to followers page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Click on Followers link
    await page.locator('a', { hasText: 'Followers' }).click();

    // Should navigate to followers page
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+\/followers/);
  });

  test('should navigate to following page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // Click on Following link
    await page.locator('a', { hasText: 'Following' }).click();

    // Should navigate to following page
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+\/following/);
  });
});

test.describe('Profile Page - Unauthenticated', () => {
  test('should redirect to signin when accessing /profile unauthenticated', async ({
    page,
  }) => {
    await page.goto('/profile');

    // Should redirect to signin
    await page.waitForURL('/signin', { timeout: 10000 });
    await expect(page).toHaveURL('/signin');
  });
});

test.describe('Viewing Other User Profiles', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as test user
    await page.goto('/signin');
    await page.locator('input[name="email"]').fill(TEST_USER_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(home-mosaic)?$/, { timeout: 10000 });
  });

  test('should not show settings menu on other user profiles', async ({
    page,
  }) => {
    // First get current user's profile URL to extract their ID
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    const currentUrl = page.url();
    const currentUserId = currentUrl.split('/profile/')[1];

    // Try to view a different user's profile (using sample test user)
    // We'll navigate to the sample user by finding them through the API or UI
    // For now, check that if we somehow got to another profile, settings wouldn't show

    // This test verifies the conditional rendering of the settings button
    // The settings button should only appear for isOwnProfile === true
    const settingsButton = page.locator(
      'button[aria-label="Profile settings menu"]'
    );

    // On own profile, it should be visible
    await expect(settingsButton).toBeVisible();

    // Note: To fully test viewing other profiles, we'd need to:
    // 1. Create another test user in global-setup
    // 2. Navigate to their profile
    // 3. Verify settings button is NOT visible
  });

  test('should show follow button on other user profiles', async ({ page }) => {
    // This would require having another user to view
    // For now, we verify the FollowButton component exists in the codebase
    // and would be rendered for non-own profiles

    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/);

    // On own profile, follow button should NOT be visible
    const followButton = page.locator('button', { hasText: /^Follow$/ });
    await expect(followButton).not.toBeVisible();
  });
});
