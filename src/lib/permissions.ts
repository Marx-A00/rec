// Permission checking utilities for role-based access control
import { UserRole } from '@prisma/client';

/**
 * Check if a user has admin privileges
 */
export function isAdmin(role?: UserRole | null): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Check if a user has moderator privileges or higher
 */
export function isModerator(role?: UserRole | null): boolean {
  return role === UserRole.MODERATOR || role === UserRole.ADMIN;
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userRole?: UserRole | null, requiredRole?: UserRole): boolean {
  if (!userRole || !requiredRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.USER]: 0,
    [UserRole.MODERATOR]: 1,
    [UserRole.ADMIN]: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user can manage content (moderator or admin)
 */
export function canManageContent(role?: UserRole | null): boolean {
  return isModerator(role);
}

/**
 * Check if a user can manage users (admin only)
 */
export function canManageUsers(role?: UserRole | null): boolean {
  return isAdmin(role);
}

/**
 * Check if a user can view admin pages
 */
export function canAccessAdmin(role?: UserRole | null): boolean {
  return isAdmin(role);
}

/**
 * Check if a user can edit another user's content
 */
export function canEditUserContent(
  currentUserRole?: UserRole | null,
  targetUserId?: string,
  currentUserId?: string
): boolean {
  // Users can edit their own content
  if (targetUserId === currentUserId) return true;

  // Moderators and admins can edit any content
  return isModerator(currentUserRole);
}

/**
 * Check if a user can delete content
 */
export function canDeleteContent(
  currentUserRole?: UserRole | null,
  contentOwnerId?: string,
  currentUserId?: string
): boolean {
  // Users can delete their own content
  if (contentOwnerId === currentUserId) return true;

  // Moderators and admins can delete any content
  return isModerator(currentUserRole);
}
