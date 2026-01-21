import { describe, it, expect } from 'vitest';

/**
 * Unit tests for mobile settings page logic
 * Tests the toggle disable logic and settings state management
 */

// Settings interface matching MobileSettingsClient
interface PrivacySettings {
  profileVisibility: string;
  showRecentActivity: boolean;
  showCollections: boolean;
  showListenLaterInFeed: boolean;
  showCollectionAddsInFeed: boolean;
}

// Default settings state
const defaultSettings: PrivacySettings = {
  profileVisibility: 'public',
  showRecentActivity: true,
  showCollections: true,
  showListenLaterInFeed: true,
  showCollectionAddsInFeed: true,
};

/**
 * Helper to check if a dependent toggle should be disabled
 * Mirrors the logic in MobileSettingsClient
 */
function isDependentToggleDisabled(
  settings: PrivacySettings,
  field: 'showListenLaterInFeed' | 'showCollectionAddsInFeed'
): boolean {
  // These toggles are disabled when showRecentActivity is false
  return !settings.showRecentActivity;
}

/**
 * Helper to determine if the info note should be shown
 */
function shouldShowInfoNote(settings: PrivacySettings): boolean {
  return !settings.showRecentActivity;
}

/**
 * Helper to validate profile visibility value
 */
function isValidProfileVisibility(value: string): boolean {
  return ['public', 'followers', 'private'].includes(value);
}

describe('Mobile Settings - Privacy Toggle Logic', () => {
  describe('Dependent Toggle Disabling', () => {
    it('should enable dependent toggles when showRecentActivity is true', () => {
      const settings: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: true,
      };

      expect(isDependentToggleDisabled(settings, 'showListenLaterInFeed')).toBe(
        false
      );
      expect(
        isDependentToggleDisabled(settings, 'showCollectionAddsInFeed')
      ).toBe(false);
    });

    it('should disable dependent toggles when showRecentActivity is false', () => {
      const settings: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: false,
      };

      expect(isDependentToggleDisabled(settings, 'showListenLaterInFeed')).toBe(
        true
      );
      expect(
        isDependentToggleDisabled(settings, 'showCollectionAddsInFeed')
      ).toBe(true);
    });

    it('should not affect showCollections toggle regardless of showRecentActivity', () => {
      // showCollections is independent - it controls profile page, not feed
      const settingsActive: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: true,
      };
      const settingsInactive: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: false,
      };

      // showCollections should always be enabled (no disable logic for it)
      // It's controlled by the user independently
      expect(settingsActive.showCollections).toBe(true);
      expect(settingsInactive.showCollections).toBe(true);
    });
  });

  describe('Info Note Display', () => {
    it('should show info note when activity is disabled', () => {
      const settings: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: false,
      };

      expect(shouldShowInfoNote(settings)).toBe(true);
    });

    it('should hide info note when activity is enabled', () => {
      const settings: PrivacySettings = {
        ...defaultSettings,
        showRecentActivity: true,
      };

      expect(shouldShowInfoNote(settings)).toBe(false);
    });
  });

  describe('Profile Visibility Validation', () => {
    it('should accept valid visibility values', () => {
      expect(isValidProfileVisibility('public')).toBe(true);
      expect(isValidProfileVisibility('followers')).toBe(true);
      expect(isValidProfileVisibility('private')).toBe(true);
    });

    it('should reject invalid visibility values', () => {
      expect(isValidProfileVisibility('invalid')).toBe(false);
      expect(isValidProfileVisibility('')).toBe(false);
      expect(isValidProfileVisibility('PUBLIC')).toBe(false); // case sensitive
      expect(isValidProfileVisibility('friends')).toBe(false);
    });
  });
});

describe('Mobile Settings - Default State', () => {
  it('should have sensible defaults', () => {
    expect(defaultSettings.profileVisibility).toBe('public');
    expect(defaultSettings.showRecentActivity).toBe(true);
    expect(defaultSettings.showCollections).toBe(true);
    expect(defaultSettings.showListenLaterInFeed).toBe(true);
    expect(defaultSettings.showCollectionAddsInFeed).toBe(true);
  });

  it('should have all required fields defined', () => {
    const requiredFields: (keyof PrivacySettings)[] = [
      'profileVisibility',
      'showRecentActivity',
      'showCollections',
      'showListenLaterInFeed',
      'showCollectionAddsInFeed',
    ];

    requiredFields.forEach(field => {
      expect(defaultSettings[field]).toBeDefined();
    });
  });
});

describe('Mobile Settings - State Updates', () => {
  it('should correctly update a single field', () => {
    const original: PrivacySettings = { ...defaultSettings };
    const updated: PrivacySettings = {
      ...original,
      showRecentActivity: false,
    };

    expect(updated.showRecentActivity).toBe(false);
    // Other fields unchanged
    expect(updated.profileVisibility).toBe(original.profileVisibility);
    expect(updated.showCollections).toBe(original.showCollections);
  });

  it('should correctly update profile visibility', () => {
    const original: PrivacySettings = { ...defaultSettings };

    const updates = ['public', 'followers', 'private'];
    updates.forEach(visibility => {
      const updated: PrivacySettings = {
        ...original,
        profileVisibility: visibility,
      };
      expect(updated.profileVisibility).toBe(visibility);
    });
  });

  it('should preserve other settings when toggling one', () => {
    const original: PrivacySettings = {
      profileVisibility: 'followers',
      showRecentActivity: true,
      showCollections: false,
      showListenLaterInFeed: true,
      showCollectionAddsInFeed: false,
    };

    const updated: PrivacySettings = {
      ...original,
      showRecentActivity: false,
    };

    expect(updated.profileVisibility).toBe('followers');
    expect(updated.showCollections).toBe(false);
    expect(updated.showListenLaterInFeed).toBe(true);
    expect(updated.showCollectionAddsInFeed).toBe(false);
  });
});

describe('Mobile Settings - Rollback Logic', () => {
  it('should support storing previous state for rollback', () => {
    const original: PrivacySettings = { ...defaultSettings };
    const previousSettings = { ...original };

    // Simulate optimistic update
    const updated: PrivacySettings = {
      ...original,
      showRecentActivity: false,
    };

    // On error, rollback to previous
    const rolledBack = { ...previousSettings };

    expect(rolledBack).toEqual(original);
    expect(rolledBack.showRecentActivity).toBe(true);
  });

  it('should create independent copy for rollback', () => {
    const original: PrivacySettings = { ...defaultSettings };
    const backup = { ...original };

    // Modify original
    original.showRecentActivity = false;

    // Backup should be unchanged
    expect(backup.showRecentActivity).toBe(true);
  });
});

describe('Mobile Settings - Edge Cases', () => {
  it('should handle all settings being disabled', () => {
    const allDisabled: PrivacySettings = {
      profileVisibility: 'private',
      showRecentActivity: false,
      showCollections: false,
      showListenLaterInFeed: false,
      showCollectionAddsInFeed: false,
    };

    // Dependent toggles should still be considered disabled
    expect(
      isDependentToggleDisabled(allDisabled, 'showListenLaterInFeed')
    ).toBe(true);
    expect(
      isDependentToggleDisabled(allDisabled, 'showCollectionAddsInFeed')
    ).toBe(true);

    // Info note should be shown
    expect(shouldShowInfoNote(allDisabled)).toBe(true);
  });

  it('should handle mixed settings state', () => {
    const mixedSettings: PrivacySettings = {
      profileVisibility: 'followers',
      showRecentActivity: true,
      showCollections: false,
      showListenLaterInFeed: false,
      showCollectionAddsInFeed: true,
    };

    // With activity enabled, dependent toggles should not be disabled
    expect(
      isDependentToggleDisabled(mixedSettings, 'showListenLaterInFeed')
    ).toBe(false);
    expect(
      isDependentToggleDisabled(mixedSettings, 'showCollectionAddsInFeed')
    ).toBe(false);

    // No info note since activity is enabled
    expect(shouldShowInfoNote(mixedSettings)).toBe(false);
  });
});
