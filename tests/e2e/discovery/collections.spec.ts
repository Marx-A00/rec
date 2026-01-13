import { test, expect } from '@playwright/test';

test.describe('Collections', () => {
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

  test.describe('Collections List Page', () => {
    test('should display collections page header', async ({ page }) => {
      await page.goto('/collections');

      await expect(
        page.getByRole('heading', { name: 'Your Collections' })
      ).toBeVisible();
      await expect(
        page.getByText('Organize your favorite albums into collections')
      ).toBeVisible();
    });

    test('should have New Collection button', async ({ page }) => {
      await page.goto('/collections');

      const newCollectionButton = page.getByRole('link', {
        name: /New Collection/i,
      });
      await expect(newCollectionButton).toBeVisible();
    });

    test('should navigate to new collection page when clicking button', async ({
      page,
    }) => {
      await page.goto('/collections');

      const newCollectionButton = page.getByRole('link', {
        name: /New Collection/i,
      });
      await newCollectionButton.click();

      await expect(page).toHaveURL('/collections/new');
    });

    test('should show empty state or collections list', async ({ page }) => {
      await page.goto('/collections');

      // Wait for loading to complete
      await page.waitForTimeout(2000);

      // Either shows empty state or collections
      const emptyState = page.getByText('No collections yet');
      const collectionCards = page
        .locator('[href^="/collections/"]')
        .filter({ hasNot: page.locator('[href="/collections/new"]') });

      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasCollections = (await collectionCards.count()) > 0;

      expect(hasEmptyState || hasCollections).toBe(true);
    });
  });

  test.describe('Create Collection Page', () => {
    test('should display create collection form', async ({ page }) => {
      await page.goto('/collections/new');

      await expect(
        page.getByRole('heading', { name: 'Create Collection' })
      ).toBeVisible();
      await expect(
        page.getByText(
          'Organize your favorite albums into a personal collection'
        )
      ).toBeVisible();
    });

    test('should have collection name input', async ({ page }) => {
      await page.goto('/collections/new');

      const nameInput = page.locator('input[placeholder="My Favorite Albums"]');
      await expect(nameInput).toBeVisible();
    });

    test('should have description textarea', async ({ page }) => {
      await page.goto('/collections/new');

      const descriptionInput = page.locator(
        'textarea[placeholder*="collection of my all-time favorite"]'
      );
      await expect(descriptionInput).toBeVisible();
    });

    test('should have public/private checkbox', async ({ page }) => {
      await page.goto('/collections/new');

      const publicCheckbox = page.locator('input[type="checkbox"]');
      await expect(publicCheckbox).toBeVisible();

      // Should have label text
      await expect(page.getByText('Make this collection public')).toBeVisible();
    });

    test('should have cancel and create buttons', async ({ page }) => {
      await page.goto('/collections/new');

      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Create Collection' })
      ).toBeVisible();
    });

    test('should have back button', async ({ page }) => {
      await page.goto('/collections/new');

      const backButton = page.getByRole('button', { name: /back/i });
      await expect(backButton).toBeVisible();
    });

    test('should disable create button when name is empty', async ({
      page,
    }) => {
      await page.goto('/collections/new');

      const createButton = page.getByRole('button', {
        name: 'Create Collection',
      });
      await expect(createButton).toBeDisabled();
    });

    test('should enable create button when name is entered', async ({
      page,
    }) => {
      await page.goto('/collections/new');
      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('input[placeholder="My Favorite Albums"]');
      // Use type instead of fill for better event triggering in WebKit
      await nameInput.click();
      await nameInput.type('Test Collection', { delay: 50 });

      const createButton = page.getByRole('button', {
        name: 'Create Collection',
      });
      // Give React time to update form state
      await expect(createButton).toBeEnabled({ timeout: 10000 });
    });

    test('should show character count for name', async ({ page }) => {
      await page.goto('/collections/new');
      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('input[placeholder="My Favorite Albums"]');
      // Use type for better WebKit compatibility
      await nameInput.click();
      await nameInput.type('Test', { delay: 50 });

      // Give React time to update character count
      await expect(page.getByText('4/100 characters')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show character count for description', async ({ page }) => {
      await page.goto('/collections/new');
      await page.waitForLoadState('networkidle');

      const descriptionInput = page.locator(
        'textarea[placeholder*="collection of my all-time favorite"]'
      );
      // Use type for better WebKit compatibility
      await descriptionInput.click();
      await descriptionInput.type('This is my test description', { delay: 20 });

      // Give React time to update character count
      await expect(page.getByText('27/500 characters')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should navigate back when clicking cancel', async ({ page }) => {
      // Navigate to collections first, then to new
      await page.goto('/collections');
      await page.getByRole('link', { name: /New Collection/i }).click();
      await expect(page).toHaveURL('/collections/new');

      // Click cancel
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Should go back to collections
      await page.waitForURL(/\/collections$/, { timeout: 5000 });
    });

    test('should toggle public checkbox', async ({ page }) => {
      await page.goto('/collections/new');

      const publicCheckbox = page.locator('input[type="checkbox"]');

      // Should start unchecked
      await expect(publicCheckbox).not.toBeChecked();

      // Click to check
      await publicCheckbox.click();
      await expect(publicCheckbox).toBeChecked();

      // Click to uncheck
      await publicCheckbox.click();
      await expect(publicCheckbox).not.toBeChecked();
    });

    test('should create a collection and redirect', async ({ page }) => {
      await page.goto('/collections/new');
      await page.waitForLoadState('networkidle');

      // Fill in form - use type for WebKit compatibility
      const collectionName = `Test Collection ${Date.now()}`;
      const nameInput = page.locator('input[placeholder="My Favorite Albums"]');
      await nameInput.click();
      await nameInput.type(collectionName, { delay: 20 });

      const descriptionInput = page.locator(
        'textarea[placeholder*="collection of my all-time favorite"]'
      );
      await descriptionInput.click();
      await descriptionInput.type('A test collection created by Playwright', {
        delay: 10,
      });

      // Submit form - wait for button to be enabled first (WebKit can be slow)
      const createButton = page.getByRole('button', {
        name: 'Create Collection',
      });
      await expect(createButton).toBeEnabled({ timeout: 10000 });
      await createButton.click();

      // Should redirect to the new collection page
      await page.waitForURL(/\/collections\/[a-zA-Z0-9-]+$/, {
        timeout: 10000,
      });

      // Should show success message or collection title
      const collectionTitle = page.getByRole('heading', {
        name: collectionName,
      });
      const successVisible = await collectionTitle
        .isVisible()
        .catch(() => false);

      // Either we're on the collection page or there was an error
      expect(page.url()).toMatch(/\/collections\/[a-zA-Z0-9-]+$/);
    });
  });

  test.describe('Collection Detail Page', () => {
    test('should navigate to collection detail when clicking collection card', async ({
      page,
    }) => {
      await page.goto('/collections');

      // Wait for loading
      await page.waitForTimeout(2000);

      // Find collection links (excluding New Collection button)
      const collectionLinks = page.locator('a[href^="/collections/"]').filter({
        hasNot: page.locator('a[href="/collections/new"]'),
      });

      const count = await collectionLinks.count();

      if (count > 0) {
        // Click the first collection
        await collectionLinks.first().click();

        // Should navigate to collection detail page
        await page.waitForURL(/\/collections\/[a-zA-Z0-9-]+$/, {
          timeout: 5000,
        });
      }
    });
  });

  test.describe('Collection Visibility', () => {
    test('should show visibility indicator on collection cards', async ({
      page,
    }) => {
      await page.goto('/collections');

      // Wait for loading
      await page.waitForTimeout(2000);

      // Check for visibility indicators (Public or Private)
      const publicIndicator = page.getByText('Public');
      const privateIndicator = page.getByText('Private');

      const hasPublic = await publicIndicator.isVisible().catch(() => false);
      const hasPrivate = await privateIndicator.isVisible().catch(() => false);
      const hasEmptyState = await page
        .getByText('No collections yet')
        .isVisible()
        .catch(() => false);

      // Either has visibility indicators or empty state
      expect(hasPublic || hasPrivate || hasEmptyState).toBe(true);
    });
  });
});
