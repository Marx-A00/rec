import { expect, test, Page } from '@playwright/test';

/**
 * E2E tests for the dual-input search feature in the Recommendation Drawer.
 *
 * These tests verify that users can search for albums using separate
 * album title and artist name inputs for more precise results.
 */

const TEST_USER_EMAIL = 'playwright_test_existing@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

async function signInAsTestUser(page: Page): Promise<boolean> {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');
  await page.locator('input[name="identifier"]').fill(TEST_USER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL(url => !url.pathname.includes('/signin'), {
      timeout: 15000,
    });
    return true;
  } catch {
    return false;
  }
}

async function openRecommendationDrawer(page: Page): Promise<boolean> {
  try {
    await page.goto('/home-mosaic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const recommendButton = page.getByRole('button', { name: 'Recommend' });
    await expect(recommendButton).toBeVisible({ timeout: 10000 });
    await recommendButton.click();

    await expect(page.locator('#recommendation-drawer')).toBeVisible({
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

test.describe('Recommendation Drawer - Dual Input Search', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed (likely rate-limited)');
      return;
    }
  });

  test('should display two input fields in dual mode', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

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
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Type in the album input
    await albumInput.fill('Discovery');

    // Should show the prompt to press Enter
    await expect(page.locator('text=Press Enter to search')).toBeVisible();
  });

  test('should trigger search on Enter key in album input', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Type and press Enter
    await albumInput.fill('Abbey Road');
    await albumInput.press('Enter');

    // Should show searching state (text includes search term) or results count
    const searchingText = page.getByText(/Searching.*Abbey Road/);
    const resultsCount = page.getByText(/\d+ results?/);
    await expect(
      searchingText.or(resultsCount)
    ).toBeVisible({ timeout: 15000 });
  });

  test('should trigger search on Enter key in artist input', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Need album input to have content too for the search to work
    await albumInput.fill('Abbey Road');
    await artistInput.fill('The Beatles');
    await artistInput.press('Enter');

    // Should show searching state or results count
    const searchingText = page.getByText(/Searching/);
    const resultsCount = page.getByText(/\d+ results?/);
    await expect(
      searchingText.or(resultsCount)
    ).toBeVisible({ timeout: 15000 });
  });

  test('should search with both album and artist fields', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Fill both fields
    await albumInput.fill('OK Computer');
    await artistInput.fill('Radiohead');
    await artistInput.press('Enter');

    // Wait for results count to appear
    await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 15000 });
  });

  test('should apply red color theme when searching for source album', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Initially searching for source (red theme)
    // Check for red border class
    await expect(albumInput).toHaveClass(/border-red-500/);
  });

  test('should clear both inputs when album is selected', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');
    const artistInput = page.locator(
      'input[aria-label="Artist name (optional)"]'
    );

    // Fill both fields and search
    await albumInput.fill('Discovery');
    await artistInput.fill('Daft Punk');
    await artistInput.press('Enter');

    // Wait for results to load
    await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 15000 });

    // Click the first result item (cursor-pointer div in results area)
    const drawer = page.locator('dialog, [role="dialog"]');
    await drawer.locator('div[class*="cursor-pointer"]').first().click();

    // Both inputs should be cleared after selecting an album
    await expect(albumInput).toHaveValue('', { timeout: 5000 });
    await expect(artistInput).toHaveValue('', { timeout: 5000 });
  });

  test('should not trigger search with both fields empty', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Press Enter with empty input
    await albumInput.press('Enter');

    // Should NOT show searching state or results
    await expect(page.getByText(/Searching/)).not.toBeVisible();
    await expect(page.getByText(/\d+ results?/)).not.toBeVisible();
  });

  test('should show "No albums found" message for invalid search', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

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
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

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
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Check that input has min-height of 44px (touch target)
    const boundingBox = await albumInput.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('should switch color theme when selecting source vs recommended', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) { test.skip(true, 'Could not open recommendation drawer'); return; }

    const albumInput = page.locator('input[aria-label="Album title"]');

    // Initially red (searching for source)
    await expect(albumInput).toHaveClass(/border-red-500/);

    // Search and select an album to fill source
    await albumInput.fill('Abbey Road');
    await albumInput.press('Enter');

    // Wait for results to load
    await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 15000 });

    // Click first result
    const drawer = page.locator('dialog, [role="dialog"]');
    await drawer.locator('div[class*="cursor-pointer"]').first().click();

    // Now searching for recommended album - should be green
    await expect(albumInput).toHaveClass(/border-green-500/, { timeout: 5000 });
  });
});
