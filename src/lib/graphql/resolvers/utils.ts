import { GraphQLError } from 'graphql';
import type { User, UserRole } from '@prisma/client';

import { isOwner } from '@/lib/permissions';
import type { GraphQLContext } from '@/lib/graphql/context';

/**
 * Validates that the caller is an authenticated OWNER and is not targeting themselves.
 * Also verifies the target user exists and is not an OWNER.
 * Returns the target user record on success.
 *
 * Used by: softDeleteUser, hardDeleteUser, restoreUser
 */
export async function requireOwnerNotSelf(
  context: GraphQLContext,
  targetUserId: string
): Promise<User> {
  const { user, prisma } = context;

  if (!user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  if (!isOwner(user.role as UserRole)) {
    throw new GraphQLError('Unauthorized: Owner access required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  if (targetUserId === user.id) {
    throw new GraphQLError('Cannot perform this action on your own account', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new GraphQLError('User not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (targetUser.role === 'OWNER') {
    throw new GraphQLError('Cannot perform this action on another owner', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return targetUser;
}
