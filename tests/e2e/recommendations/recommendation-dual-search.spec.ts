import { expect, test } from '@playwright/test';

/**
 * E2E tests for the dual-input search feature in the Recommendation Drawer.
 *
 * These tests verify that users can search for albums using separate
 * album title and artist name inputs for more precise results.
 */
test.describe('Recommendation Drawer - Dual Input Search', () => {
  // Helper to open the recommendation drawer
  async function openRecommendationDrawer(
    page: import('@playwright/test').Page
  ) {
    // Navigate to home page first
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to find the Recommend button in the sidebar (has tooltip "Create Recommendation")
    // It's an icon button with aria-label or data attribute
    const recommendButton = page.locator(
      'button[aria-label*="Recommend"], a[aria-label*="Recommend"], [data-tooltip*="Recommend"]'
    );

    if ((await recommendButton.count()) > 0) {
      await recommendButton.first().click();
    } else {
      // Fallback: dispatch custom event to open drawer
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('open-recommendation-drawer'));
      });
    }

    // Wait for the drawer to be visible
    await expect(page.locator('#recommendation-drawer')).toBeVisible({
      timeout: 10000,
    });
  }

  test.beforeEach(async ({ page }) => {
    // Sign in with test user credentials
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Check if already signed in by looking for sign out button
    const signOutButton = page.locator('button', { hasText: 'Sign Out' });
    if (await signOutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Already signed in, navigate to home
      await page.goto('/');
      return;
    }

    // Sign in with test credentials
    await page
      .locator('input[name="identifier"]')
      .fill('playwright_test_existing@example.com');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect away from signin
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
  });

  test('should display two input fields in dual mode', async ({ page }) => {
    await openRecommendationDrawer(page);

    // Verify both inputs are visible with correct aria-labels
    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    await expect(albumInput).toBeVisible();
    await expect(artistInput).toBeVisible();

    // Verify placeholders
    await expect(albumInput).toHaveAttribute(
      'placeholder',
      'Search album title...'
    );
    await expect(artistInput).toHaveAttribute(
      'placeholder',
      'Filter by artist (optional)...'
    );
  });

  test('should show "Press Enter to search" message when typing', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Type in the album input
    await albumInput.fill('Discovery');

    // Should show the prompt to press Enter
    await expect(page.locator('text=Press Enter to search')).toBeVisible();
  });

  test('should trigger search on Enter key in album input', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Type and press Enter
    await albumInput.fill('Abbey Road');
    await albumInput.press('Enter');

    // Should show searching state or results
    // Either "Searching..." appears briefly, or results appear
    await expect(
      page.locator('text=Searching...').or(page.locator('.space-y-2 > div'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should trigger search on Enter key in artist input', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Type only in artist input and press Enter
    await artistInput.fill('The Beatles');
    await artistInput.press('Enter');

    // Should show searching state or results
    await expect(
      page.locator('text=Searching...').or(page.locator('.space-y-2 > div'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should search with both album and artist fields', async ({ page }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Fill both fields
    await albumInput.fill('OK Computer');
    await artistInput.fill('Radiohead');
    await artistInput.press('Enter');

    // Wait for results to load
    await page.waitForSelector('.space-y-2 > div', { timeout: 15000 });

    // Should have at least one result
    const results = await page.locator('.space-y-2 > div').count();
    expect(results).toBeGreaterThan(0);
  });

  test('should apply red color theme when searching for source album', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Initially searching for source (red theme)
    // Check for red border class
    await expect(albumInput).toHaveClass(/border-red-500/);
  });

  test('should clear both inputs when album is selected', async ({ page }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Fill both fields and search
    await albumInput.fill('Discovery');
    await artistInput.fill('Daft Punk');
    await artistInput.press('Enter');

    // Wait for results
    await page.waitForSelector('.space-y-2 > div', { timeout: 15000 });

    // Click the first result
    await page.locator('.space-y-2 > div').first().click();

    // Both inputs should be cleared
    await expect(albumInput).toHaveValue('');
    await expect(artistInput).toHaveValue('');
  });

  test('should not trigger search with both fields empty', async ({ page }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Press Enter with empty input
    await albumInput.press('Enter');

    // Should NOT show searching state
    await expect(page.locator('text=Searching...')).not.toBeVisible();

    // Should NOT show any results or "no results" message
    await expect(page.locator('.space-y-2 > div')).not.toBeVisible();
  });

  test('should show "No albums found" message for invalid search', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Search for something unlikely to exist
    await albumInput.fill('xyznonexistentalbum12345');
    await albumInput.press('Enter');

    // Wait for search to complete and show no results
    await expect(page.locator('text=/No albums found/i')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should have proper tab order between inputs', async ({ page }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Focus on album input
    await albumInput.focus();
    await expect(albumInput).toBeFocused();

    // Tab to artist input
    await page.keyboard.press('Tab');
    await expect(artistInput).toBeFocused();
  });

  test('should have minimum touch target size for mobile', async ({ page }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Check that input has min-height of 44px (touch target)
    const boundingBox = await albumInput.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('should switch color theme when selecting source vs recommended', async ({
    page,
  }) => {
    await openRecommendationDrawer(page);

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Initially red (searching for source)
    await expect(albumInput).toHaveClass(/border-red-500/);

    // Search and select an album to fill source
    await albumInput.fill('Abbey Road');
    await albumInput.press('Enter');

    // Wait for results and click first one
    await page.waitForSelector('.space-y-2 > div', { timeout: 15000 });
    await page.locator('.space-y-2 > div').first().click();

    // Now searching for recommended album - should be green
    await expect(albumInput).toHaveClass(/border-green-500/);
  });
});
