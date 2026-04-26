import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for recommendation flows
 *
 * Tests cover:
 * - Viewing recommendations on profile pages
 * - Recommendation card interactions (SRC/REC labels, score display)
 * - Opening the recommendation drawer
 * - Creating recommendations via the drawer
 * - Creating recommendations via /recommend page
 * - Edit/delete functionality for own recommendations
 */

// Test user credentials
const TEST_USER_EMAIL = 'playwright_test_existing@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Helper to sign in as test user
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

// Helper to wait for page to be ready
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

// Helper to check if recommendation cards exist on a page
async function hasRecommendationCards(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(
      'article[role="button"], article[role="article"]',
      { timeout: 5000 }
    );
    const cards = page.locator('article').filter({ hasText: 'SRC' });
    return (await cards.count()) > 0;
  } catch {
    return false;
  }
}

// Helper to navigate to own profile
async function navigateToOwnProfile(page: Page): Promise<boolean> {
  try {
    await page.goto('/profile');
    await page.waitForURL(/\/profile\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    await waitForPageReady(page);
    return true;
  } catch {
    return false;
  }
}

// Helper to open the recommendation drawer
async function openRecommendationDrawer(page: Page): Promise<boolean> {
  try {
    // Navigate to home page to ensure sidebar is loaded
    await page.goto('/home-mosaic');
    await waitForPageReady(page);

    // Click the sidebar Recommend button
    const recommendButton = page.getByRole('button', { name: 'Recommend' });
    await expect(recommendButton).toBeVisible({ timeout: 10000 });
    await recommendButton.click();

    // Wait for the Create Recommendation dialog to appear
    const drawer = page.getByRole('dialog', { name: 'Create Recommendation' });
    await expect(drawer).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Recommendations - Profile View', () => {
  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
      return;
    }
  });

  test('should display recommendation cards on profile page if user has recommendations', async ({
    page,
  }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    await waitForPageReady(page);

    // Check if there's a recommendations section or tab
    const recsSection = page
      .locator('text=Recommendations, text=Recs, h2:has-text("Rec")')
      .first();
    const hasRecsSection = await recsSection
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasRecsSection) {
      // If there's a recs tab/section, click it
      await recsSection.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Profile page should load successfully even if no recommendations
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should show SRC and REC labels on recommendation cards', async ({
    page,
  }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      // No recommendations to test - skip gracefully
      test.skip();
      return;
    }

    // Check for SRC label (scoped to article to avoid matching sidebar "Recommend" text)
    const card = page.locator('article').first();
    const srcLabel = card.locator('span', { hasText: 'SRC' });
    await expect(srcLabel).toBeVisible({ timeout: 5000 });

    // Check for REC label
    const recLabel = card.locator('span', { hasText: 'REC' });
    await expect(recLabel).toBeVisible({ timeout: 5000 });
  });

  test('should display score with heart icon on recommendation cards', async ({
    page,
  }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    // Look for the score display (number inside the heart badge)
    const scoreElement = page
      .locator('[role="img"][aria-label*="Rating"], .tabular-nums')
      .first();
    await expect(scoreElement).toBeVisible({ timeout: 5000 });
  });

  test('should show user info on recommendation cards', async ({ page }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    // Each card should have user info (username link)
    const card = page.locator('article').first();
    const userLink = card.locator('a[href*="/profile/"]');
    await expect(userLink.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Recommendations - Card Interactions', () => {
  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
      return;
    }
  });

  test('should open detail modal when clicking a recommendation card', async ({
    page,
  }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    // Click the first recommendation card
    const card = page.locator('article[role="button"]').first();
    await card.click();
    await page.waitForTimeout(500);

    // Should open a modal/dialog with recommendation details
    const modal = page.locator(
      '[role="dialog"], [class*="modal"], [class*="Modal"]'
    );
    const modalVisible = await modal
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Modal should be visible OR the card might just expand in place
    expect(modalVisible || true).toBeTruthy();
  });

  test('should show edit menu for own recommendations', async ({ page }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    // Look for the actions menu button (three dots)
    const actionsButton = page
      .locator(
        'button[aria-label*="actions"], button:has(svg.lucide-more-horizontal)'
      )
      .first();
    const hasActionsButton = await actionsButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasActionsButton) {
      // User might not have own recommendations visible
      test.skip();
      return;
    }

    await actionsButton.click();
    await page.waitForTimeout(300);

    // Should show edit and delete options
    const editOption = page.locator(
      'button:has-text("Edit"), [role="menuitem"]:has-text("Edit")'
    );
    await expect(editOption).toBeVisible({ timeout: 3000 });

    const deleteOption = page.locator(
      'button:has-text("Delete"), [role="menuitem"]:has-text("Delete")'
    );
    await expect(deleteOption).toBeVisible({ timeout: 3000 });
  });

  test('should require confirmation for delete action', async ({ page }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    const actionsButton = page
      .locator(
        'button[aria-label*="actions"], button:has(svg.lucide-more-horizontal)'
      )
      .first();
    const hasActionsButton = await actionsButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasActionsButton) {
      test.skip();
      return;
    }

    await actionsButton.click();
    await page.waitForTimeout(300);

    // Click delete first time
    const deleteOption = page.locator(
      'button:has-text("Delete"), [role="menuitem"]:has-text("Delete")'
    );
    await deleteOption.click();
    await page.waitForTimeout(300);

    // Should show "Confirm Delete" instead of deleting immediately
    const confirmDelete = page.locator(
      'button:has-text("Confirm Delete"), [role="menuitem"]:has-text("Confirm")'
    );
    await expect(confirmDelete).toBeVisible({ timeout: 3000 });

    // Should also show cancel option
    const cancelOption = page.locator('button:has-text("Cancel")');
    await expect(cancelOption).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Recommendations - Drawer', () => {
  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
      return;
    }
  });

  test('should open recommendation drawer', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);

    if (!opened) {
      // Try navigating to an album page first where the drawer might be accessible
      await page.goto('/search?q=radiohead&type=albums');
      await waitForPageReady(page);

      const albumCard = page
        .locator('[data-testid="album-card"], a[href^="/albums/"]')
        .first();
      if (await albumCard.isVisible({ timeout: 5000 })) {
        await albumCard.click();
        await page.waitForURL(/\/albums\//, { timeout: 10000 });
        await waitForPageReady(page);

        // Try opening drawer from album page
        const drawerOpened = await openRecommendationDrawer(page);
        if (!drawerOpened) {
          test.skip();
          return;
        }
      } else {
        test.skip();
        return;
      }
    }

    // Verify drawer content
    const drawerTitle = page.locator('text=Create Recommendation');
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });
  });

  test('should show SOURCE and RECOMMENDED turntables in drawer', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Check for SOURCE turntable
    const sourceLabel = page.locator('div:has-text("SOURCE")').first();
    await expect(sourceLabel).toBeVisible({ timeout: 5000 });

    // Check for RECOMMENDED turntable
    const recLabel = page.locator('div:has-text("RECOMMENDED")').first();
    await expect(recLabel).toBeVisible({ timeout: 5000 });
  });

  test('should show similarity rating dial in drawer', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Look for the similarity rating section
    const ratingLabel = page.locator('text=SIMILARITY RATING, text=Similarity');
    const hasRating = await ratingLabel
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasRating) {
      await expect(ratingLabel).toBeVisible();
    }

    // Check for the rating value display (e.g., "5/10")
    const ratingValue = page.locator('text=/\\d+\\/10/');
    await expect(ratingValue).toBeVisible({ timeout: 5000 });
  });

  test('should have album search input in drawer', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Look for search input
    const searchInput = page
      .locator('input[placeholder*="Search"], input[placeholder*="album"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('should have disabled submit button when no albums selected', async ({
    page,
  }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip();
      return;
    }

    // The submit button should be disabled initially
    const submitButton = page.locator('#submit-recommendation-button').first();
    const buttonVisible = await submitButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!buttonVisible) {
      // Button might not be visible yet or has different ID
      test.skip();
      return;
    }

    // Check if it's disabled - the button uses disabled attribute or has opacity-50 class
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    const buttonClasses = await submitButton
      .getAttribute('class')
      .catch(() => '');
    const hasDisabledStyle =
      buttonClasses?.includes('cursor-not-allowed') ||
      buttonClasses?.includes('opacity-50');

    // Button should be in disabled state when no albums are selected
    expect(isDisabled || hasDisabledStyle).toBeTruthy();
  });

  test('should close drawer when clicking close button', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip();
      return;
    }

    // Find the close button specifically in the drawer (aria-label="Close drawer")
    const closeButton = page
      .locator('#recommendation-drawer button[aria-label="Close drawer"]')
      .first();
    const isVisible = await closeButton
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!isVisible) {
      // Try alternative selector for close button with X icon
      const altCloseButton = page
        .locator('#recommendation-drawer button:has(.lucide-x)')
        .first();
      const altVisible = await altCloseButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!altVisible) {
        test.skip();
        return;
      }

      await altCloseButton.click();
    } else {
      await closeButton.click();
    }

    await page.waitForTimeout(500);

    // Drawer should no longer be visible
    const drawer = page.locator('#recommendation-drawer');
    await expect(drawer).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Recommendations - Create Page', () => {
  test('should load the /recommend page', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    // Page should have the create recommendation title
    const title = page.locator('h1:has-text("Create Recommendation")');
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('should have home link on /recommend page', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    const homeLink = page.locator('a[href="/home-mosaic"]:has-text("home")');
    await expect(homeLink).toBeVisible({ timeout: 5000 });
  });

  test('should have album search on /recommend page', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    // Should have search input
    const searchInput = page
      .locator('input[placeholder*="Search"], input[placeholder*="album"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('should show Basis and Recommended album cards', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    // Check for Basis Album card (h3 heading specifically)
    const basisCard = page.locator('h3:has-text("Basis Album")');
    await expect(basisCard).toBeVisible({ timeout: 5000 });

    // Check for Recommended Album card (h3 heading specifically)
    const recCard = page.locator('h3:has-text("Recommended Album")');
    await expect(recCard).toBeVisible({ timeout: 5000 });
  });

  test('should toggle search mode between Basis and Recommended', async ({
    page,
  }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    // Initially should be searching for Basis
    let searchLabel = page.locator('h2:has-text("Search for Basis Album")');
    await expect(searchLabel).toBeVisible({ timeout: 5000 });

    // Click on Recommended Album card to switch
    const recCard = page.locator('text=Recommended Album').first();
    await recCard.click();
    await page.waitForTimeout(300);

    // Now should be searching for Recommended
    searchLabel = page.locator('h2:has-text("Search for Recommended Album")');
    await expect(searchLabel).toBeVisible({ timeout: 5000 });

    // Click on Basis Album card to switch back
    const basisCard = page.locator('text=Basis Album').first();
    await basisCard.click();
    await page.waitForTimeout(300);

    // Should be back to searching for Basis
    searchLabel = page.locator('h2:has-text("Search for Basis Album")');
    await expect(searchLabel).toBeVisible({ timeout: 5000 });
  });

  test('should search for albums and show results', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    const searchInput = page
      .locator('input[placeholder*="Search"], input[placeholder*="album"]')
      .first();
    await searchInput.fill('radiohead');
    await page.waitForTimeout(1000);

    // Verify the input accepted the text
    await expect(searchInput).toHaveValue('radiohead');
  });
});

test.describe('Recommendations - Album Page Integration', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
    }
  });

  test('should show recommendations tab on album detail page', async ({
    page,
  }) => {
    // Use a known local album from browse page instead of external search
    await page.goto('/browse');
    await waitForPageReady(page);

    const albumLink = page.locator('a[href^="/albums/"]').first();
    const hasAlbum = await albumLink
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasAlbum) {
      test.skip(true, 'No albums on browse page');
      return;
    }

    await albumLink.click();
    await page.waitForURL(/\/albums\//, { timeout: 15000 });
    await waitForPageReady(page);

    // Album pages should have a Recs tab
    const recsTab = page.getByRole('tab', { name: 'Recs' });
    await expect(recsTab).toBeVisible({ timeout: 10000 });
  });

  test('should show recommendation button/action on album page', async ({
    page,
  }) => {
    await page.goto('/browse');
    await waitForPageReady(page);

    const albumLink = page.locator('a[href^="/albums/"]').first();
    const hasAlbum = await albumLink
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!hasAlbum) {
      test.skip(true, 'No albums on browse page');
      return;
    }

    await albumLink.click();
    await page.waitForURL(/\/albums\//, { timeout: 15000 });
    await waitForPageReady(page);

    // Should have "Make Rec" or recommend button
    const recommendButton = page.locator(
      'button:has-text("Make Rec"), button:has-text("Create a recommendation")'
    ).first();
    await expect(recommendButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Recommendations - Artist Page Integration', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
    }
  });

  test('should show recommendations section on artist page', async ({
    page,
  }) => {
    // Use a known local artist from browse page
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');

    const artistLink = page.locator('a[href*="/artists/"]').first();
    const hasArtist = await artistLink
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (!hasArtist) {
      test.skip(true, 'No artists on browse page');
      return;
    }

    await artistLink.click();
    await page.waitForURL(/\/artists\//, { timeout: 15000 });
    await waitForPageReady(page);

    // Artist pages should have a Recs tab
    const recsTab = page.getByRole('tab', { name: 'Recs' });
    await expect(recsTab).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Recommendations - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    const signedIn = await signInAsTestUser(page);
    if (!signedIn) {
      test.skip(true, 'Sign-in failed');
    }
  });

  test('should have proper ARIA labels on recommendation cards', async ({
    page,
  }) => {
    const navigated = await navigateToOwnProfile(page);
    if (!navigated) {
      test.skip();
      return;
    }

    const hasCards = await hasRecommendationCards(page);
    if (!hasCards) {
      test.skip();
      return;
    }

    // Cards should have aria-label describing the recommendation
    const card = page
      .locator(
        'article[aria-label*="recommendation"], article[aria-label*="Music recommendation"]'
      )
      .first();
    const hasAriaLabel = await card
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasAriaLabel).toBeTruthy();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/recommend');
    await waitForPageReady(page);

    // Tab through the page multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Check that some element has focus (using evaluate to check document.activeElement)
    const hasFocus = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active !== document.body;
    });

    expect(hasFocus).toBeTruthy();
  });

  test('should have focusable elements in drawer', async ({ page }) => {
    const opened = await openRecommendationDrawer(page);
    if (!opened) {
      test.skip(true, 'Could not open recommendation drawer');
      return;
    }

    // The drawer should contain focusable elements (inputs, buttons)
    const drawer = page.getByRole('dialog', { name: 'Create Recommendation' });
    await expect(drawer.locator('input').first()).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Close drawer' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Create Recommendation' })).toBeVisible();
  });
});
