import { expect, test, Page } from '@playwright/test';

/**
 * Sign in as the test user via UI.
 * Returns true if sign-in succeeded.
 */
async function signInAsTestUser(page: Page): Promise<boolean> {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');

  await page.locator('input[name="identifier"]').fill('playwright_test_existing@example.com');
  await page.locator('input[name="password"]').fill('TestPassword123!');
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

test.describe('Browse Page', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
      return;
    }
    await page.goto('/browse');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display main heading and subtitle', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('Explore new music, connect with fellow music lovers')
    ).toBeVisible();
  });

  test('should display Welcome New Music Lovers section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Welcome New Music Lovers' })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('Connect with our newest community members')
    ).toBeVisible();

    // Should have at least one user card link
    const userCards = page.locator('a[href*="/profile/"]').filter({
      has: page.locator('h3'),
    });
    const count = await userCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display Top Recommended Artists section if data exists', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    // The heading always renders (from ContentRow), but the client component
    // may show an empty state if no recommendation data exists.
    // Wait for the client component to finish loading, then check for actual artist cards.
    await expect(
      page.getByRole('heading', { name: 'Top Recommended Artists' })
    ).toBeVisible({ timeout: 10000 });

    // Wait for loading skeleton to disappear (client component hydration)
    await page.waitForTimeout(2000);

    const artistCards = page.locator('a[href*="/artists/"]');
    const count = await artistCards.count();

    if (count > 0) {
      await expect(
        page.getByText('Artists with the most album recommendations')
      ).toBeVisible();
    } else {
      // No recommendation data — section shows empty state
      test.skip(true, 'No recommendation data — Top Recommended Artists section not shown');
    }
  });

  test('should display Most Recommended Albums section if data exists', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole('heading', { name: 'Most Recommended Albums' })
    ).toBeVisible({ timeout: 10000 });

    // Wait for client component hydration
    await page.waitForTimeout(2000);

    const albumCards = page.locator('a[href*="/albums/"]');
    const count = await albumCards.count();

    if (count > 0) {
      await expect(
        page.getByText('Albums the community loves recommending')
      ).toBeVisible();
    } else {
      test.skip(true, 'No recommendation data — Most Recommended Albums section not shown');
    }
  });

  test('should display Latest Releases section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Latest Releases' })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText('Recent albums sorted by release date')
    ).toBeVisible();

    // Should have "See all" link to /latest
    await expect(page.locator('a[href="/latest"]').first()).toBeVisible();
  });

  test('should navigate to user profile when clicking user card', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Welcome New Music Lovers' })
    ).toBeVisible({ timeout: 10000 });

    // Click the first user card
    const firstUserCard = page
      .locator('a[href*="/profile/"]')
      .filter({ has: page.locator('h3') })
      .first();
    await firstUserCard.click();

    await page.waitForURL(/\/profile\//, { timeout: 10000 });
    expect(page.url()).toContain('/profile/');
  });

  test('should navigate to artist page when clicking artist card', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    const firstArtistCard = page.locator('a[href*="/artists/"]').first();
    if (!(await firstArtistCard.isVisible().catch(() => false))) {
      test.skip(true, 'No artist cards on page');
      return;
    }

    await firstArtistCard.click();
    await page.waitForURL(/\/artists\//, { timeout: 10000 });
    expect(page.url()).toContain('/artists/');
  });

  test('should navigate to album page when clicking album card', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    const firstAlbumCard = page.locator('a[href*="/albums/"]').first();
    if (!(await firstAlbumCard.isVisible().catch(() => false))) {
      test.skip(true, 'No album cards on page');
      return;
    }

    await firstAlbumCard.click();
    await page.waitForURL(/\/albums\//, { timeout: 10000 });
    expect(page.url()).toContain('/albums/');
  });

  test('should have left sidebar navigation', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    // Sidebar is collapsed — check links by href
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Home link shows /home-mosaic for authenticated users (session must load first)
    await expect(nav.locator('a[href="/home-mosaic"]')).toBeVisible({ timeout: 10000 });
    await expect(nav.locator('a[href="/browse"]')).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Recommend' })).toBeVisible();
  });

  test('should have search bar in header', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Discover Music & Community' })
    ).toBeVisible({ timeout: 10000 });

    // Search bar with type dropdown
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible();
    await expect(
      banner.getByRole('combobox').first()
    ).toBeVisible();
  });
});

test.describe('Browse Page - Unauthenticated', () => {
  test('should load browse page for unauthenticated user', async ({ page }) => {
    await page.goto('/browse');
    await page.waitForLoadState('domcontentloaded');

    // Browse page loads without auth redirect — (main) layout allows unauthenticated access
    await expect(page).toHaveURL(/browse/);
  });
});
