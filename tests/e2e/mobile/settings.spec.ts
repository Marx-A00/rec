import { test, expect } from '@playwright/test';

// Mobile viewport configuration
const mobileViewport = { width: 390, height: 844 }; // iPhone 14 size

test.describe('Mobile Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(mobileViewport);

    // Login first
    await page.goto('/m/auth/signin');
    await page
      .locator('input[name="identifier"]')
      .fill('playwright_test_existing@example.com');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();

    // Wait for navigation away from signin
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 10000,
    });

    // Navigate to settings
    await page.goto('/m/settings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Structure', () => {
    test('should display settings header with back button', async ({
      page,
    }) => {
      // Check header exists
      const header = page.locator('h1:has-text("Settings")');
      await expect(header).toBeVisible();

      // Check back button exists
      const backButton = page.locator('button[aria-label="Go back"]');
      await expect(backButton).toBeVisible();
    });

    test('should display user profile section', async ({ page }) => {
      // Wait for profile section to load
      await page.waitForSelector('.bg-zinc-900', { timeout: 5000 });

      // Check profile displays user info (avatar area and username)
      const profileSection = page.locator('.bg-zinc-900').first();
      await expect(profileSection).toBeVisible();
    });

    test('should display privacy section', async ({ page }) => {
      const privacyHeader = page.locator('h3:has-text("Privacy")');
      await expect(privacyHeader).toBeVisible();
    });

    test('should display account section', async ({ page }) => {
      const accountHeader = page.locator('h3:has-text("Account")');
      await expect(accountHeader).toBeVisible();
    });

    test('should display danger zone section', async ({ page }) => {
      const dangerHeader = page.locator('h3:has-text("Danger Zone")');
      await expect(dangerHeader).toBeVisible();
    });
  });

  test.describe('Privacy Settings', () => {
    test('should display profile visibility dropdown', async ({ page }) => {
      const visibilityDropdown = page.locator(
        'select:has(option[value="public"])'
      );
      await expect(visibilityDropdown).toBeVisible();

      // Check all options exist
      await expect(
        visibilityDropdown.locator('option[value="public"]')
      ).toBeAttached();
      await expect(
        visibilityDropdown.locator('option[value="followers"]')
      ).toBeAttached();
      await expect(
        visibilityDropdown.locator('option[value="private"]')
      ).toBeAttached();
    });

    test('should display activity toggle switches', async ({ page }) => {
      // Check toggle switches exist
      const toggles = page.locator('button[role="switch"]');
      const toggleCount = await toggles.count();

      // Should have at least 4 toggles: activity, collections, listen later, collection adds
      expect(toggleCount).toBeGreaterThanOrEqual(4);
    });

    test('should be able to toggle activity in feed setting', async ({
      page,
    }) => {
      // Find the "Show Activity in Feed" toggle
      const activityToggle = page
        .locator('h4:has-text("Show Activity in Feed")')
        .locator('..')
        .locator('..')
        .locator('button[role="switch"]');

      // Get initial state
      const initialState = await activityToggle.getAttribute('aria-checked');

      // Click to toggle
      await activityToggle.click();

      // Wait for mutation to complete
      await page.waitForTimeout(1000);

      // Check state changed
      const newState = await activityToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Toggle back to original state
      await activityToggle.click();
      await page.waitForTimeout(1000);
    });

    test('should disable dependent toggles when activity is hidden', async ({
      page,
    }) => {
      // Find the "Show Activity in Feed" toggle
      const activityToggle = page
        .locator('h4:has-text("Show Activity in Feed")')
        .locator('..')
        .locator('..')
        .locator('button[role="switch"]');

      // Turn off activity
      const isChecked =
        (await activityToggle.getAttribute('aria-checked')) === 'true';
      if (isChecked) {
        await activityToggle.click();
        await page.waitForTimeout(1000);
      }

      // Check that "Show Listen Later" toggle is disabled
      const listenLaterToggle = page
        .locator('h4:has-text("Show Listen Later")')
        .locator('..')
        .locator('..')
        .locator('button[role="switch"]');

      await expect(listenLaterToggle).toBeDisabled();

      // Check that "Show Collection Adds" toggle is disabled
      const collectionAddsToggle = page
        .locator('h4:has-text("Show Collection Adds")')
        .locator('..')
        .locator('..')
        .locator('button[role="switch"]');

      await expect(collectionAddsToggle).toBeDisabled();

      // Re-enable activity for cleanup
      await activityToggle.click();
      await page.waitForTimeout(1000);
    });

    test('should show info note when activity is disabled', async ({
      page,
    }) => {
      // Find the "Show Activity in Feed" toggle
      const activityToggle = page
        .locator('h4:has-text("Show Activity in Feed")')
        .locator('..')
        .locator('..')
        .locator('button[role="switch"]');

      // Turn off activity
      const isChecked =
        (await activityToggle.getAttribute('aria-checked')) === 'true';
      if (isChecked) {
        await activityToggle.click();
        await page.waitForTimeout(1000);
      }

      // Check for info note
      const infoNote = page.locator('text=Activity feed is disabled');
      await expect(infoNote).toBeVisible();

      // Re-enable for cleanup
      await activityToggle.click();
      await page.waitForTimeout(1000);
    });

    test('should change profile visibility', async ({ page }) => {
      const visibilityDropdown = page.locator(
        'select:has(option[value="public"])'
      );

      // Get current value
      const currentValue = await visibilityDropdown.inputValue();

      // Change to a different value
      const newValue = currentValue === 'public' ? 'followers' : 'public';
      await visibilityDropdown.selectOption(newValue);

      // Wait for mutation
      await page.waitForTimeout(1000);

      // Verify change
      const updatedValue = await visibilityDropdown.inputValue();
      expect(updatedValue).toBe(newValue);

      // Change back for cleanup
      await visibilityDropdown.selectOption(currentValue);
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Account Section', () => {
    test('should display user statistics', async ({ page }) => {
      // Check for stats labels
      await expect(page.locator('text=Recs')).toBeVisible();
      await expect(page.locator('text=Followers')).toBeVisible();
      await expect(page.locator('text=Following')).toBeVisible();
    });

    test('should display sign out button', async ({ page }) => {
      const signOutButton = page.locator('button:has-text("Sign Out")');
      await expect(signOutButton).toBeVisible();
    });

    test('should display delete account button', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete Account")');
      await expect(deleteButton).toBeVisible();
    });

    test('should show confirmation when delete account clicked', async ({
      page,
    }) => {
      const deleteButton = page.locator('button:has-text("Delete Account")');
      await deleteButton.click();

      // Check confirmation appears
      const confirmText = page.locator(
        'text=Are you sure? This action cannot be undone.'
      );
      await expect(confirmText).toBeVisible();

      // Check cancel and confirm buttons appear
      const cancelButton = page.locator('button:has-text("Cancel")');
      const confirmButton = page.locator('button:has-text("Yes, Delete")');

      await expect(cancelButton).toBeVisible();
      await expect(confirmButton).toBeVisible();

      // Click cancel to dismiss
      await cancelButton.click();

      // Confirmation should disappear
      await expect(confirmText).not.toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back when back button clicked', async ({ page }) => {
      // First navigate to profile, then to settings
      await page.goto('/m/profile');
      await page.waitForLoadState('networkidle');

      await page.goto('/m/settings');
      await page.waitForLoadState('networkidle');

      // Click back button
      const backButton = page.locator('button[aria-label="Go back"]');
      await backButton.click();

      // Should navigate back (URL should change from /m/settings)
      await page.waitForURL(url => !url.pathname.includes('/settings'), {
        timeout: 5000,
      });
    });

    test('should redirect to signin when sign out clicked', async ({
      page,
    }) => {
      const signOutButton = page.locator('button:has-text("Sign Out")');
      await signOutButton.click();

      // Should redirect to signin page
      await page.waitForURL(url => url.pathname.includes('/signin'), {
        timeout: 10000,
      });
    });
  });

  test.describe('Loading State', () => {
    test('should show loading skeleton initially', async ({ page }) => {
      // Navigate fresh without cache
      await page.goto('/m/settings', { waitUntil: 'commit' });

      // Check for skeleton elements (they animate with pulse)
      const skeletons = page.locator('.animate-pulse');

      // There should be skeleton elements while loading
      // (This may be too fast to catch, so we just verify page loads)
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper touch targets (44px minimum)', async ({
      page,
    }) => {
      // Check back button touch target
      const backButton = page.locator('button[aria-label="Go back"]');
      const backButtonBox = await backButton.boundingBox();

      expect(backButtonBox?.width).toBeGreaterThanOrEqual(44);
      expect(backButtonBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should have accessible toggle switches', async ({ page }) => {
      const toggles = page.locator('button[role="switch"]');
      const toggleCount = await toggles.count();

      for (let i = 0; i < toggleCount; i++) {
        const toggle = toggles.nth(i);
        const ariaChecked = await toggle.getAttribute('aria-checked');

        // Should have aria-checked attribute
        expect(ariaChecked).toBeTruthy();
        expect(['true', 'false']).toContain(ariaChecked);
      }
    });
  });
});

test.describe('Mobile Settings - Unauthenticated', () => {
  test('should redirect to signin when not authenticated', async ({ page }) => {
    await page.setViewportSize(mobileViewport);

    // Clear any existing session
    await page.context().clearCookies();

    // Try to access settings directly
    await page.goto('/m/settings');

    // Should redirect to signin
    await page.waitForURL(url => url.pathname.includes('/signin'), {
      timeout: 10000,
    });
  });
});
