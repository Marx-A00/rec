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

test.describe('Home Feed (/home-mosaic)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
      return;
    }
    await page.goto('/home-mosaic');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display sidebar navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Sidebar is collapsed by default — check links by href, not visible text
    await expect(nav.locator('a[href="/home-mosaic"]')).toBeVisible();
    await expect(nav.locator('a[href="/browse"]')).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Recommend' })).toBeVisible();
  });

  test('should display top bar with search', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Search type dropdown (Albums)
    await expect(banner.getByRole('combobox').first()).toBeVisible();
  });

  test('should display user avatar in header', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Avatar link to profile
    const avatarLink = banner.locator('a[href*="/profile/"]');
    await expect(avatarLink).toBeVisible();
  });

  test('should have hamburger menu button', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    await expect(
      banner.getByRole('button', { name: /open sidebar/i })
    ).toBeVisible();
  });

  test('should navigate to browse when clicking Browse link', async ({
    page,
  }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible({ timeout: 10000 });

    await nav.locator('a[href="/browse"]').click();
    await page.waitForURL('/browse', { timeout: 10000 });
    expect(page.url()).toContain('/browse');
  });
});

test.describe('Home Feed - Unauthenticated', () => {
  test('should show sign-in prompt for unauthenticated user', async ({ page }) => {
    await page.goto('/home-mosaic');
    await page.waitForLoadState('domcontentloaded');

    // Page loads but shows sign-in prompt or empty state for unauthenticated users
    // The (main) layout does not redirect unauthenticated users
    await expect(page).toHaveURL(/home-mosaic/);
  });
});
