import { describe, it, expect } from 'vitest';
import { UserRole } from '@prisma/client';

import {
  isOwner,
  isAdmin,
  isModerator,
  hasRole,
  canManageContent,
  canManageUsers,
  canAccessAdmin,
  canEditUserContent,
  canDeleteContent,
} from '@/lib/permissions';

describe('isOwner', () => {
  it('should return true for OWNER role', () => {
    expect(isOwner(UserRole.OWNER)).toBe(true);
  });

  it('should return false for non-OWNER roles', () => {
    expect(isOwner(UserRole.ADMIN)).toBe(false);
    expect(isOwner(UserRole.MODERATOR)).toBe(false);
    expect(isOwner(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isOwner(null)).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });
});

describe('isAdmin', () => {
  it('should return true for ADMIN role', () => {
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
  });

  it('should return true for OWNER role (owner is also admin)', () => {
    expect(isAdmin(UserRole.OWNER)).toBe(true);
  });

  it('should return false for MODERATOR and USER roles', () => {
    expect(isAdmin(UserRole.MODERATOR)).toBe(false);
    expect(isAdmin(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('isModerator', () => {
  it('should return true for MODERATOR role', () => {
    expect(isModerator(UserRole.MODERATOR)).toBe(true);
  });

  it('should return true for ADMIN role', () => {
    expect(isModerator(UserRole.ADMIN)).toBe(true);
  });

  it('should return true for OWNER role', () => {
    expect(isModerator(UserRole.OWNER)).toBe(true);
  });

  it('should return false for USER role', () => {
    expect(isModerator(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isModerator(null)).toBe(false);
    expect(isModerator(undefined)).toBe(false);
  });
});

describe('hasRole', () => {
  describe('role hierarchy', () => {
    it('should return true when user has exact required role', () => {
      expect(hasRole(UserRole.USER, UserRole.USER)).toBe(true);
      expect(hasRole(UserRole.MODERATOR, UserRole.MODERATOR)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true);
      expect(hasRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
    });

    it('should return true when user has higher role than required', () => {
      // OWNER > ADMIN > MODERATOR > USER
      expect(hasRole(UserRole.OWNER, UserRole.ADMIN)).toBe(true);
      expect(hasRole(UserRole.OWNER, UserRole.MODERATOR)).toBe(true);
      expect(hasRole(UserRole.OWNER, UserRole.USER)).toBe(true);

      expect(hasRole(UserRole.ADMIN, UserRole.MODERATOR)).toBe(true);
      expect(hasRole(UserRole.ADMIN, UserRole.USER)).toBe(true);

      expect(hasRole(UserRole.MODERATOR, UserRole.USER)).toBe(true);
    });

    it('should return false when user has lower role than required', () => {
      expect(hasRole(UserRole.USER, UserRole.MODERATOR)).toBe(false);
      expect(hasRole(UserRole.USER, UserRole.ADMIN)).toBe(false);
      expect(hasRole(UserRole.USER, UserRole.OWNER)).toBe(false);

      expect(hasRole(UserRole.MODERATOR, UserRole.ADMIN)).toBe(false);
      expect(hasRole(UserRole.MODERATOR, UserRole.OWNER)).toBe(false);

      expect(hasRole(UserRole.ADMIN, UserRole.OWNER)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false when userRole is null or undefined', () => {
      expect(hasRole(null, UserRole.USER)).toBe(false);
      expect(hasRole(undefined, UserRole.USER)).toBe(false);
    });

    it('should return false when requiredRole is undefined', () => {
      expect(hasRole(UserRole.OWNER, undefined)).toBe(false);
    });

    it('should return false when both are null/undefined', () => {
      expect(hasRole(null, undefined)).toBe(false);
      expect(hasRole(undefined, undefined)).toBe(false);
    });
  });
});

describe('canManageContent', () => {
  it('should return true for MODERATOR, ADMIN, and OWNER', () => {
    expect(canManageContent(UserRole.MODERATOR)).toBe(true);
    expect(canManageContent(UserRole.ADMIN)).toBe(true);
    expect(canManageContent(UserRole.OWNER)).toBe(true);
  });

  it('should return false for USER role', () => {
    expect(canManageContent(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(canManageContent(null)).toBe(false);
    expect(canManageContent(undefined)).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('should return true for ADMIN and OWNER', () => {
    expect(canManageUsers(UserRole.ADMIN)).toBe(true);
    expect(canManageUsers(UserRole.OWNER)).toBe(true);
  });

  it('should return false for MODERATOR and USER', () => {
    expect(canManageUsers(UserRole.MODERATOR)).toBe(false);
    expect(canManageUsers(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(canManageUsers(null)).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });
});

describe('canAccessAdmin', () => {
  it('should return true for ADMIN and OWNER', () => {
    expect(canAccessAdmin(UserRole.ADMIN)).toBe(true);
    expect(canAccessAdmin(UserRole.OWNER)).toBe(true);
  });

  it('should return false for MODERATOR and USER', () => {
    expect(canAccessAdmin(UserRole.MODERATOR)).toBe(false);
    expect(canAccessAdmin(UserRole.USER)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(canAccessAdmin(null)).toBe(false);
    expect(canAccessAdmin(undefined)).toBe(false);
  });
});

describe('canEditUserContent', () => {
  const ownerId = 'user-123';
  const otherId = 'user-456';

  describe('ownership-based editing', () => {
    it('should return true when user edits their own content', () => {
      expect(canEditUserContent(UserRole.USER, ownerId, ownerId)).toBe(true);
    });

    it('should return true for own content regardless of role', () => {
      expect(canEditUserContent(UserRole.USER, ownerId, ownerId)).toBe(true);
      expect(canEditUserContent(UserRole.MODERATOR, ownerId, ownerId)).toBe(
        true
      );
      expect(canEditUserContent(UserRole.ADMIN, ownerId, ownerId)).toBe(true);
      expect(canEditUserContent(UserRole.OWNER, ownerId, ownerId)).toBe(true);
    });
  });

  describe('role-based editing of others content', () => {
    it('should return true for MODERATOR editing others content', () => {
      expect(canEditUserContent(UserRole.MODERATOR, otherId, ownerId)).toBe(
        true
      );
    });

    it('should return true for ADMIN editing others content', () => {
      expect(canEditUserContent(UserRole.ADMIN, otherId, ownerId)).toBe(true);
    });

    it('should return true for OWNER editing others content', () => {
      expect(canEditUserContent(UserRole.OWNER, otherId, ownerId)).toBe(true);
    });

    it('should return false for USER editing others content', () => {
      expect(canEditUserContent(UserRole.USER, otherId, ownerId)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null/undefined role when not owner', () => {
      expect(canEditUserContent(null, otherId, ownerId)).toBe(false);
      expect(canEditUserContent(undefined, otherId, ownerId)).toBe(false);
    });

    it('should still allow owner even with null role', () => {
      expect(canEditUserContent(null, ownerId, ownerId)).toBe(true);
    });

    it('should return true when both targetUserId and currentUserId are undefined (undefined === undefined)', () => {
      // JavaScript: undefined === undefined is true, so ownership check passes
      expect(canEditUserContent(UserRole.USER, undefined, undefined)).toBe(
        true
      );
    });
  });
});

describe('canDeleteContent', () => {
  const ownerId = 'user-123';
  const otherId = 'user-456';

  describe('ownership-based deletion', () => {
    it('should return true when user deletes their own content', () => {
      expect(canDeleteContent(UserRole.USER, ownerId, ownerId)).toBe(true);
    });

    it('should return true for own content regardless of role', () => {
      expect(canDeleteContent(UserRole.USER, ownerId, ownerId)).toBe(true);
      expect(canDeleteContent(UserRole.MODERATOR, ownerId, ownerId)).toBe(true);
      expect(canDeleteContent(UserRole.ADMIN, ownerId, ownerId)).toBe(true);
      expect(canDeleteContent(UserRole.OWNER, ownerId, ownerId)).toBe(true);
    });
  });

  describe('role-based deletion of others content', () => {
    it('should return true for MODERATOR deleting others content', () => {
      expect(canDeleteContent(UserRole.MODERATOR, otherId, ownerId)).toBe(true);
    });

    it('should return true for ADMIN deleting others content', () => {
      expect(canDeleteContent(UserRole.ADMIN, otherId, ownerId)).toBe(true);
    });

    it('should return true for OWNER deleting others content', () => {
      expect(canDeleteContent(UserRole.OWNER, otherId, ownerId)).toBe(true);
    });

    it('should return false for USER deleting others content', () => {
      expect(canDeleteContent(UserRole.USER, otherId, ownerId)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null/undefined role when not owner', () => {
      expect(canDeleteContent(null, otherId, ownerId)).toBe(false);
      expect(canDeleteContent(undefined, otherId, ownerId)).toBe(false);
    });

    it('should still allow owner even with null role', () => {
      expect(canDeleteContent(null, ownerId, ownerId)).toBe(true);
    });
  });
});
