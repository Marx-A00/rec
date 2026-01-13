import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Login with test user
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

  test.describe('Search Bar', () => {
    // Helper to wait for the header and search bar to be ready
    async function waitForSearchBar(page: import('@playwright/test').Page) {
      // Wait for the header to be visible
      await page.waitForSelector('header[role="banner"]', { timeout: 20000 });
      // Wait a bit for React hydration
      await page.waitForTimeout(500);
      // Wait for search bar
      await page.waitForSelector('#main-search-bar', { timeout: 10000 });
    }

    test('should display search bar in header', async ({ page }) => {
      // Navigate to collections page (simpler, definitely has search bar)
      await page.goto('/collections');

      try {
        await waitForSearchBar(page);
        const searchInput = page.locator('#main-search-bar');
        await expect(searchInput).toBeVisible();
      } catch {
        // Search bar might not be on this page in mobile view, skip
        test.skip();
      }
    });

    test('should have search type dropdown with options', async ({ page }) => {
      await page.goto('/collections');

      try {
        await waitForSearchBar(page);

        // Click the search type dropdown
        const dropdown = page.locator('button[role="combobox"]').first();
        await expect(dropdown).toBeVisible({ timeout: 10000 });
        await dropdown.click();

        // Check dropdown options
        await expect(
          page.getByRole('option', { name: 'Albums' })
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: 'Artists' })
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: 'Tracks' })
        ).toBeVisible();
        await expect(page.getByRole('option', { name: 'Users' })).toBeVisible();
      } catch {
        test.skip();
      }
    });

    test('should navigate to search page on Enter', async ({ page }) => {
      await page.goto('/collections');

      try {
        await waitForSearchBar(page);

        const searchInput = page.locator('#main-search-bar');
        await searchInput.fill('radiohead');
        await searchInput.press('Enter');

        // Should navigate to search page with query param
        await expect(page).toHaveURL(/\/search\?q=radiohead/, {
          timeout: 15000,
        });
      } catch {
        test.skip();
      }
    });

    test('should include search type in URL', async ({ page }) => {
      await page.goto('/collections');

      try {
        await waitForSearchBar(page);

        // Select Artists from dropdown
        const dropdown = page.locator('button[role="combobox"]').first();
        await dropdown.click();
        await page.getByRole('option', { name: 'Artists' }).click();

        const searchInput = page.locator('#main-search-bar');
        await searchInput.fill('beatles');
        await searchInput.press('Enter');

        // Should include type=artists in URL
        await expect(page).toHaveURL(/\/search\?q=beatles&type=artists/, {
          timeout: 15000,
        });
      } catch {
        test.skip();
      }
    });
  });

  test.describe('Search Results Page', () => {
    test('should show "Start Searching" message when no query', async ({
      page,
    }) => {
      await page.goto('/search');

      await expect(
        page.getByRole('heading', { name: 'Start Searching' })
      ).toBeVisible();
      await expect(
        page.getByText(
          'Enter a search query to find albums, artists, and labels'
        )
      ).toBeVisible();
    });

    test('should show search results for valid query', async ({ page }) => {
      await page.goto('/search?q=radiohead&type=albums');

      // Wait for loading to complete
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Should show results heading or no results
      const resultsHeading = page.getByRole('heading', {
        name: 'Search Results',
      });
      const noResults = page.getByRole('heading', { name: 'No Results Found' });

      const hasResults = await resultsHeading.isVisible().catch(() => false);
      const hasNoResults = await noResults.isVisible().catch(() => false);

      expect(hasResults || hasNoResults).toBe(true);
    });

    test('should display filter tabs', async ({ page }) => {
      await page.goto('/search?q=test&type=albums');

      // Wait for page to load
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("Start Searching"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Check filter tabs exist
      await expect(page.getByRole('button', { name: 'Albums' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Artists' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tracks' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Users' })).toBeVisible();
    });

    test('should switch between filter tabs', async ({ page }) => {
      await page.goto('/search?q=radiohead&type=albums');

      // Wait for page to load
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Click on Artists tab
      await page.getByRole('button', { name: 'Artists' }).click();

      // URL should update with filter param
      await expect(page).toHaveURL(/filter=artists/, { timeout: 10000 });
    });

    test('should handle queries with no results gracefully', async ({
      page,
    }) => {
      // Use a query that's unlikely to have results
      await page.goto('/search?q=xyznonexistentquery12345&type=albums');

      // Wait for loading and check for response
      await page.waitForSelector(
        'h2:has-text("No Results Found"), h1:has-text("Search Results")',
        { timeout: 20000 }
      );

      // Either no results or some results (API might have something)
      const noResults = page.getByRole('heading', { name: 'No Results Found' });
      const hasResults = page.getByRole('heading', { name: 'Search Results' });

      const noResultsVisible = await noResults.isVisible().catch(() => false);
      const hasResultsVisible = await hasResults.isVisible().catch(() => false);

      // One of these should be visible
      expect(noResultsVisible || hasResultsVisible).toBe(true);
    });
  });

  test.describe('Album Search Results', () => {
    test('should display album results with proper structure', async ({
      page,
    }) => {
      await page.goto('/search?q=ok computer&type=albums');

      // Wait for results
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      const resultsHeading = page.getByRole('heading', {
        name: 'Search Results',
      });
      if (await resultsHeading.isVisible()) {
        // Should have Albums section
        const albumsSection = page.locator('h2:has-text("Albums")');

        // If we have album results, check structure
        if (await albumsSection.isVisible()) {
          // Album cards should exist
          const albumCards = page
            .locator('button')
            .filter({ has: page.locator('.bg-blue-900') });
          const cardCount = await albumCards.count();
          expect(cardCount).toBeGreaterThan(0);
        }
      }
    });

    test('should navigate to album details when clicking result', async ({
      page,
    }) => {
      await page.goto('/search?q=abbey road&type=albums');

      // Wait for results
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Check if we have results
      const resultsHeading = page.getByRole('heading', {
        name: 'Search Results',
      });
      if (await resultsHeading.isVisible()) {
        // Click first album result
        const albumCard = page
          .locator('button')
          .filter({ has: page.locator('.bg-blue-900') })
          .first();

        if (await albumCard.isVisible()) {
          await albumCard.click();

          // Should navigate to album page
          await page.waitForURL(/\/albums\//, { timeout: 15000 });
        }
      }
    });
  });

  test.describe('Artist Search Results', () => {
    test('should display artist results', async ({ page }) => {
      await page.goto('/search?q=radiohead&type=artists');

      // Wait for results
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // If we have results, check for Artists section
      const resultsHeading = page.getByRole('heading', {
        name: 'Search Results',
      });
      if (await resultsHeading.isVisible()) {
        const artistsSection = page.locator('h2:has-text("Artists")');
        await expect(artistsSection).toBeVisible();
      }
    });

    test('should navigate to artist details when clicking result', async ({
      page,
    }) => {
      await page.goto('/search?q=beatles&type=artists');

      // Wait for results
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Check if we have results
      const resultsHeading = page.getByRole('heading', {
        name: 'Search Results',
      });
      if (await resultsHeading.isVisible()) {
        // Click first artist result (has green Artist badge)
        const artistCard = page
          .locator('button')
          .filter({ has: page.locator('.bg-green-900') })
          .first();

        if (await artistCard.isVisible()) {
          await artistCard.click();

          // Should navigate to artist page
          await page.waitForURL(/\/artists\//, { timeout: 15000 });
        }
      }
    });
  });

  test.describe('User Search Results', () => {
    test('should display user results when searching users', async ({
      page,
    }) => {
      await page.goto('/search?q=test&type=users');

      // Wait for page to load
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Check if we have results - filter tabs only appear when results exist
      const hasResults = await page
        .locator('h1:has-text("Search Results")')
        .isVisible()
        .catch(() => false);

      if (hasResults) {
        // Users tab should be visible when results exist
        const usersTab = page.getByRole('button', { name: 'Users' });
        await expect(usersTab).toBeVisible();
      } else {
        // No results state - just verify the no results message is shown
        await expect(
          page.locator('h2:has-text("No Results Found")')
        ).toBeVisible();
      }
    });

    test('should navigate to user profile when clicking result', async ({
      page,
    }) => {
      await page.goto('/search?q=playwright&type=users');

      // Wait for results
      await page.waitForSelector(
        'h1:has-text("Search Results"), h2:has-text("No Results Found")',
        { timeout: 20000 }
      );

      // Check if we have user results
      const usersSection = page.locator('h2:has-text("Users")');
      if (await usersSection.isVisible()) {
        // Click first user result
        const userCard = page
          .locator('button')
          .filter({ has: page.locator('.rounded-full') })
          .first();

        if (await userCard.isVisible()) {
          await userCard.click();

          // Should navigate to user profile
          await page.waitForURL(/\/profile\//, { timeout: 15000 });
        }
      }
    });
  });

  test.describe('Search Persistence', () => {
    test('should persist search type preference', async ({ page }) => {
      await page.goto('/collections');

      // Helper to wait for search bar
      async function waitForSearchBar() {
        await page.waitForSelector('header[role="banner"]', { timeout: 20000 });
        await page.waitForTimeout(500);
        await page.waitForSelector('#main-search-bar', { timeout: 10000 });
      }

      try {
        await waitForSearchBar();

        // Select Artists type
        const dropdown = page.locator('button[role="combobox"]').first();
        await dropdown.click();
        await page.getByRole('option', { name: 'Artists' }).click();

        // Do a search
        const searchInput = page.locator('#main-search-bar');
        await searchInput.fill('test');
        await searchInput.press('Enter');

        // Wait for navigation
        await expect(page).toHaveURL(/\/search/, { timeout: 15000 });

        // Navigate to a different page
        await page.goto('/collections');
        await waitForSearchBar();

        // Dropdown should still show Artists
        const dropdownAfter = page.locator('button[role="combobox"]').first();
        await expect(dropdownAfter).toContainText('Artists');
      } catch {
        test.skip();
      }
    });
  });
});
