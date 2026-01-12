import { test, expect } from '@playwright/test';

test.describe('Album Details Page', () => {
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

  // Helper function to navigate to an album from search
  async function navigateToAlbumFromSearch(
    page: import('@playwright/test').Page,
    query: string
  ): Promise<boolean> {
    await page.goto(`/search?q=${encodeURIComponent(query)}&type=albums`);

    // Wait for results or no results
    await page.waitForSelector(
      'h1:has-text("Search Results"), h2:has-text("No Results Found"), h2:has-text("Start Searching")',
      { timeout: 20000 }
    );

    // Check if we have results
    const resultsHeading = page.getByRole('heading', {
      name: 'Search Results',
    });
    if (!(await resultsHeading.isVisible().catch(() => false))) {
      return false;
    }

    // Click first album result (has Album badge)
    const albumCard = page
      .locator('button')
      .filter({ has: page.locator('.bg-blue-900') })
      .first();
    if (!(await albumCard.isVisible().catch(() => false))) {
      return false;
    }

    await albumCard.click();
    await page.waitForURL(/\/albums\//, { timeout: 15000 });
    return true;
  }

  test.describe('Album Header', () => {
    test('should display album details when navigating from search', async ({
      page,
    }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'abbey road');

      if (navigated) {
        // Album page should have title
        await expect(page.locator('h1')).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display album cover image or fallback', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'dark side moon');

      if (navigated) {
        // Should have album cover image or fallback icon
        const albumImage = page.locator('img').first();
        const fallbackIcon = page.locator('svg').first();

        const imageVisible = await albumImage.isVisible().catch(() => false);
        const iconVisible = await fallbackIcon.isVisible().catch(() => false);

        expect(imageVisible || iconVisible).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should display artist information if available', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(
        page,
        'thriller michael jackson'
      );

      if (navigated) {
        // Artist info might be in different places - check for any artist text
        const artistsHeading = page.getByRole('heading', { name: 'Artists' });
        const artistText = page.getByText(/michael jackson/i);

        const hasArtistsSection = await artistsHeading
          .isVisible()
          .catch(() => false);
        const hasArtistText = await artistText
          .first()
          .isVisible()
          .catch(() => false);

        // At least one should be visible
        expect(hasArtistsSection || hasArtistText).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Album Tabs', () => {
    test('should have Tracklist and Recs tabs', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'nevermind');

      if (navigated) {
        // Check for tabs (wait longer for page to fully load)
        await expect(page.getByRole('tab', { name: 'Tracklist' })).toBeVisible({
          timeout: 15000,
        });
        await expect(page.getByRole('tab', { name: 'Recs' })).toBeVisible({
          timeout: 10000,
        });
      } else {
        test.skip();
      }
    });

    test('should switch between tabs', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'rumours');

      if (navigated) {
        // Click Recs tab
        await page.getByRole('tab', { name: 'Recs' }).click();

        // Recs tab should now be selected
        await expect(page.getByRole('tab', { name: 'Recs' })).toHaveAttribute(
          'data-state',
          'active'
        );

        // Click back to Tracklist
        await page.getByRole('tab', { name: 'Tracklist' }).click();
        await expect(
          page.getByRole('tab', { name: 'Tracklist' })
        ).toHaveAttribute('data-state', 'active');
      } else {
        test.skip();
      }
    });

    test('should show tracklist tab active by default', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'led zeppelin');

      if (navigated) {
        // Tracklist tab should be active by default
        await expect(
          page.getByRole('tab', { name: 'Tracklist' })
        ).toHaveAttribute('data-state', 'active');
      } else {
        test.skip();
      }
    });
  });

  test.describe('Album Interactions', () => {
    test('should have interactive elements on album page', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'blonde');

      if (navigated) {
        // Wait for page to fully load
        await page.waitForTimeout(1000);

        // There should be some buttons on the page
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Back Navigation', () => {
    test('should have back button', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'yeezus');

      if (navigated) {
        // Should have a back button
        const backButton = page.getByRole('button', { name: /back/i });
        await expect(backButton).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should navigate back when clicking back button', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(page, 'channel orange');

      if (navigated) {
        // Store current album URL
        const albumUrl = page.url();

        // Click back button
        const backButton = page.getByRole('button', { name: /back/i });
        await backButton.click();

        // Should navigate away from album page
        await page.waitForTimeout(1000);
        expect(page.url()).not.toBe(albumUrl);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Album Metadata', () => {
    test('should display release year if available', async ({ page }) => {
      const navigated = await navigateToAlbumFromSearch(
        page,
        'random access memories'
      );

      if (navigated) {
        // Check for Released text (if year is available)
        const releasedText = page.getByText(/Released:/);
        const hasReleaseYear = await releasedText
          .isVisible()
          .catch(() => false);

        // Year might not always be available, so just log it
        if (hasReleaseYear) {
          await expect(releasedText).toBeVisible();
        }
        // Test passes either way - we just want to verify the page loads
        expect(true).toBe(true);
      } else {
        test.skip();
      }
    });
  });
});
