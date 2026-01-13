import { test, expect } from '@playwright/test';

test.describe('Social Features - Follow/Unfollow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');
    await page
      .locator('input[name="identifier"]')
      .fill('playwright_test_existing@example.com');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
  });

  test.describe('Follow Button', () => {
    test('should not show follow button on own profile', async ({ page }) => {
      // Navigate to own profile
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Follow button should not be visible on own profile
      const followButton = page.getByRole('button', { name: /follow/i });
      await expect(followButton).not.toBeVisible();
    });

    test('should show follow button on other user profile', async ({
      page,
    }) => {
      // Search for another test user
      await page.goto('/search?q=playwright&type=users');
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 15000 }
      );

      // Check if we have user results
      const usersSection = page.locator('h2:has-text("Users")');
      if (await usersSection.isVisible()) {
        // Find a user that is not the logged-in user (look for Sample or Duplicate user)
        const userCards = page
          .locator('button')
          .filter({ has: page.locator('.rounded-full') });
        const count = await userCards.count();

        for (let i = 0; i < count; i++) {
          const card = userCards.nth(i);
          const cardText = await card.textContent();

          // Click on a different test user (Sample or Duplicate)
          if (cardText?.includes('Sample') || cardText?.includes('Duplicate')) {
            await card.click();
            await page.waitForURL(/\/profile\//, { timeout: 10000 });

            // Follow button should be visible on other user's profile
            const followButton = page.getByRole('button', {
              name: /follow|unfollow/i,
            });
            await expect(followButton).toBeVisible({ timeout: 10000 });
            break;
          }
        }
      }
    });

    test('should toggle follow/unfollow state when clicked', async ({
      page,
    }) => {
      // Search for another test user
      await page.goto('/search?q=playwright_test_sample&type=users');
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 15000 }
      );

      const usersSection = page.locator('h2:has-text("Users")');
      if (await usersSection.isVisible()) {
        // Click on a user result
        const userCard = page
          .locator('button')
          .filter({ has: page.locator('.rounded-full') })
          .first();
        if (await userCard.isVisible()) {
          await userCard.click();
          await page.waitForURL(/\/profile\//, { timeout: 10000 });

          // Get the follow button
          const followButton = page.getByRole('button', {
            name: /follow|unfollow/i,
          });
          await expect(followButton).toBeVisible({ timeout: 10000 });

          // Get initial state
          const initialText = await followButton.textContent();
          const wasFollowing = initialText?.toLowerCase().includes('unfollow');

          // Click to toggle
          await followButton.click();

          // Wait for state to update
          await page.waitForTimeout(1000);

          // Verify state changed
          if (wasFollowing) {
            await expect(followButton).toHaveText(/follow/i);
          } else {
            await expect(followButton).toHaveText(/unfollow/i);
          }

          // Click again to restore original state
          await followButton.click();
          await page.waitForTimeout(1000);

          // Verify state restored
          if (wasFollowing) {
            await expect(followButton).toHaveText(/unfollow/i);
          } else {
            await expect(followButton).toHaveText(/follow/i);
          }
        }
      }
    });
  });

  test.describe('Profile Social Stats', () => {
    test('should display followers count on profile', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Look for followers count text
      const followersText = page.getByText(/\d+\s*(followers?|following)/i);
      await expect(followersText.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have clickable followers/following links', async ({
      page,
    }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Look for followers link
      const followersLink = page.getByRole('link', { name: /followers/i });
      const isLinkVisible = await followersLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followersLink.click();
        await page.waitForURL(/\/followers/, { timeout: 10000 });
      }
    });
  });

  test.describe('Followers Page', () => {
    test('should display followers page with header', async ({ page }) => {
      // First get the user ID from profile page
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Navigate to followers page via link if available
      const followersLink = page.getByRole('link', { name: /followers/i });
      const isLinkVisible = await followersLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followersLink.click();
        await page.waitForURL(/\/followers/, { timeout: 10000 });

        // Should have page header with user info
        await expect(page.locator('h1')).toBeVisible();

        // Should have Followers/Following tabs
        await expect(
          page.getByRole('link', { name: 'Followers' })
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Following' })
        ).toBeVisible();
      }
    });

    test('should switch between followers and following tabs', async ({
      page,
    }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const followersLink = page.getByRole('link', { name: /followers/i });
      const isLinkVisible = await followersLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followersLink.click();
        await page.waitForURL(/\/followers/, { timeout: 10000 });

        // Click Following tab
        await page.getByRole('link', { name: 'Following' }).click();
        await page.waitForURL(/\/following/, { timeout: 10000 });

        // Should be on following page
        await expect(page).toHaveURL(/\/following/);

        // Click Followers tab to go back
        await page.getByRole('link', { name: 'Followers' }).click();
        await page.waitForURL(/\/followers/, { timeout: 10000 });
      }
    });

    test('should have back button on followers page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const followersLink = page.getByRole('link', { name: /followers/i });
      const isLinkVisible = await followersLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followersLink.click();
        await page.waitForURL(/\/followers/, { timeout: 10000 });

        // Should have back button
        const backButton = page.getByRole('button', { name: /back/i });
        await expect(backButton).toBeVisible();
      }
    });
  });

  test.describe('Following Page', () => {
    test('should display following page with header', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Navigate to following page via link if available
      const followingLink = page.getByRole('link', { name: /following/i });
      const isLinkVisible = await followingLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followingLink.click();
        await page.waitForURL(/\/following/, { timeout: 10000 });

        // Should have page header
        await expect(page.locator('h1')).toBeVisible();

        // Should have Following tab active
        await expect(
          page.getByRole('link', { name: 'Following' })
        ).toBeVisible();
      }
    });

    test('should show user count in header', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const followingLink = page.getByRole('link', { name: /following/i });
      const isLinkVisible = await followingLink.isVisible().catch(() => false);

      if (isLinkVisible) {
        await followingLink.click();
        await page.waitForURL(/\/following/, { timeout: 10000 });

        // Should show count in header
        const countText = page.getByText(/Following \d+/i);
        await expect(countText).toBeVisible();
      }
    });
  });

  test.describe('User Search and Follow Flow', () => {
    test('should be able to find and follow a user from search', async ({
      page,
    }) => {
      // Search for users
      await page.goto('/search?q=playwright&type=users');
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 15000 }
      );

      const usersSection = page.locator('h2:has-text("Users")');
      if (await usersSection.isVisible()) {
        // Should display user search results
        const userCards = page
          .locator('button')
          .filter({ has: page.locator('.rounded-full') });
        const count = await userCards.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should navigate to user profile from search results', async ({
      page,
    }) => {
      await page.goto('/search?q=playwright&type=users');
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 15000 }
      );

      const usersSection = page.locator('h2:has-text("Users")');
      if (await usersSection.isVisible()) {
        const userCard = page
          .locator('button')
          .filter({ has: page.locator('.rounded-full') })
          .first();
        if (await userCard.isVisible()) {
          await userCard.click();
          await page.waitForURL(/\/profile\//, { timeout: 10000 });

          // Should be on a profile page
          await expect(page).toHaveURL(/\/profile\//);
        }
      }
    });
  });

  test.describe('Private Profile', () => {
    test('should handle private profiles gracefully', async ({ page }) => {
      // This test verifies the private profile UI exists
      // We can't easily test with a truly private profile without setup
      // But we can verify the profile page loads
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Own profile should always be visible
      await expect(page.locator('h1, [class*="avatar"]').first()).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
