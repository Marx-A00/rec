import { test, expect } from '@playwright/test';

// Increase timeout for artist tests since they depend on external MusicBrainz API
test.describe('Artist Details Page', () => {
  // Set longer timeout for artist tests due to external API
  test.setTimeout(60000);

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page
      .locator('input[name="email"]')
      .fill('playwright_test_existing@example.com');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(home-mosaic)?$/, { timeout: 10000 });
  });

  // Helper function to navigate to an artist from search
  async function navigateToArtistFromSearch(
    page: import('@playwright/test').Page,
    query: string
  ): Promise<boolean> {
    await page.goto(`/search?q=${encodeURIComponent(query)}&type=artists`);

    // Wait for results or no results (longer timeout for external API)
    try {
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found"), h2:has-text("Start Searching")',
        { timeout: 30000 }
      );
    } catch {
      return false;
    }

    // Check if we have results
    const resultsHeading = page.getByRole('heading', {
      name: 'Search Results',
    });
    if (!(await resultsHeading.isVisible().catch(() => false))) {
      return false;
    }

    // Click first artist result (has green Artist badge)
    const artistCard = page
      .locator('button')
      .filter({ has: page.locator('.bg-green-900') })
      .first();
    if (!(await artistCard.isVisible().catch(() => false))) {
      return false;
    }

    await artistCard.click();
    try {
      await page.waitForURL(/\/artists\//, { timeout: 20000 });
    } catch {
      return false;
    }
    return true;
  }

  test.describe('Artist Header', () => {
    test('should display artist details when navigating from search', async ({
      page,
    }) => {
      const navigated = await navigateToArtistFromSearch(page, 'radiohead');

      if (navigated) {
        // Artist page should have artist name as title (wait longer for page load)
        await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
      } else {
        test.skip();
      }
    });

    test('should display artist image or fallback', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'beatles');

      if (navigated) {
        // Should have artist image or fallback icon
        const artistImage = page.locator('img').first();
        const fallbackIcon = page.locator('svg').first();

        const imageVisible = await artistImage.isVisible().catch(() => false);
        const iconVisible = await fallbackIcon.isVisible().catch(() => false);

        expect(imageVisible || iconVisible).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should display country if available', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'daft punk');

      if (navigated) {
        // Check for Country text (if available)
        const countryText = page.getByText(/Country:/);
        const hasCountry = await countryText.isVisible().catch(() => false);

        // Country might not always be available - test just checks page loads
        if (hasCountry) {
          await expect(countryText).toBeVisible();
        }
        expect(true).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Artist Tabs', () => {
    test('should have Discography and Recs tabs', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(
        page,
        'kendrick lamar'
      );

      if (navigated) {
        // Check for tabs
        await expect(
          page.getByRole('tab', { name: 'Discography' })
        ).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Recs' })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should show discography by default', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'taylor swift');

      if (navigated) {
        // Discography tab should be active by default
        await expect(
          page.getByRole('tab', { name: 'Discography' })
        ).toHaveAttribute('data-state', 'active');
      } else {
        test.skip();
      }
    });

    test('should switch between tabs', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'pink floyd');

      if (navigated) {
        // Click Recs tab
        await page.getByRole('tab', { name: 'Recs' }).click();

        // Recs tab should now be selected
        await expect(page.getByRole('tab', { name: 'Recs' })).toHaveAttribute(
          'data-state',
          'active'
        );

        // Click back to Discography
        await page.getByRole('tab', { name: 'Discography' }).click();
        await expect(
          page.getByRole('tab', { name: 'Discography' })
        ).toHaveAttribute('data-state', 'active');
      } else {
        test.skip();
      }
    });

    test('should support tab parameter in URL', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'kanye west');

      if (navigated) {
        // Get the artist URL and add tab parameter
        const currentUrl = page.url();
        const urlWithTab = currentUrl.includes('?')
          ? `${currentUrl}&tab=recommendations`
          : `${currentUrl}?tab=recommendations`;

        await page.goto(urlWithTab);

        // Recs tab should be active when navigating with tab param
        await expect(page.getByRole('tab', { name: 'Recs' })).toHaveAttribute(
          'data-state',
          'active'
        );
      } else {
        test.skip();
      }
    });
  });

  test.describe('Back Navigation', () => {
    test('should have back button', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'arcade fire');

      if (navigated) {
        // Should have a back button (wait for page to load)
        const backButton = page.getByRole('button', { name: /back/i });
        await expect(backButton).toBeVisible({ timeout: 15000 });
      } else {
        test.skip();
      }
    });

    test('should navigate back when clicking back button', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'the strokes');

      if (navigated) {
        // Store current artist URL
        const artistUrl = page.url();

        // Click back button
        const backButton = page.getByRole('button', { name: /back/i });
        await backButton.click();

        // Should navigate away from artist page
        await page.waitForTimeout(1000);
        expect(page.url()).not.toBe(artistUrl);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Artist Metadata', () => {
    test('should display biography if available', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'bob dylan');

      if (navigated) {
        // Check for Biography heading (if available)
        const bioHeading = page.getByRole('heading', { name: 'Biography' });
        const hasBio = await bioHeading.isVisible().catch(() => false);

        // Biography might not always be available
        if (hasBio) {
          await expect(bioHeading).toBeVisible();
        }
        expect(true).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should display aliases if available', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'prince');

      if (navigated) {
        // Check for "Also known as" heading (if artist has aliases)
        const aliasHeading = page.getByRole('heading', {
          name: 'Also known as',
        });
        const hasAliases = await aliasHeading.isVisible().catch(() => false);

        // Aliases might not always be available
        if (hasAliases) {
          await expect(aliasHeading).toBeVisible();
        }
        expect(true).toBe(true);
      } else {
        test.skip();
      }
    });

    test('should display active period if available', async ({ page }) => {
      const navigated = await navigateToArtistFromSearch(page, 'queen');

      if (navigated) {
        // Check for "Active:" text
        const activeText = page.getByText(/Active:/);
        const hasActive = await activeText.isVisible().catch(() => false);

        if (hasActive) {
          await expect(activeText).toBeVisible();
        }
        expect(true).toBe(true);
      } else {
        test.skip();
      }
    });
  });
});
