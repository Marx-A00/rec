import prisma from '@/lib/prisma';

/**
 * Initializes a new user account with default collections and settings.
 * Idempotent — safe to call multiple times for the same user.
 *
 * Called from both OAuth (auth.ts createUser event) and
 * email/password (register route) signup paths.
 */
export async function initializeNewUser(userId: string): Promise<void> {
  await prisma.$transaction(async tx => {
    // 1. Create default collections (if they don't already exist)
    const existingCollection = await tx.collection.findFirst({
      where: { userId },
    });

    if (!existingCollection) {
      await tx.collection.createMany({
        data: [
          {
            userId,
            name: 'My Collection',
            description: 'My music collection',
            isPublic: false,
          },
          {
            userId,
            name: 'Listen Later',
            description: 'Albums to listen to later',
            isPublic: false,
          },
        ],
      });
      console.log(
        `[user-init] Created default collections for user: ${userId}`
      );
    }

    // 2. Create default user settings (upsert to be idempotent)
    await tx.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        theme: 'dark',
        language: 'en',
        profileVisibility: 'public',
        showRecentActivity: true,
        showCollections: true,
        showListenLaterInFeed: true,
        showCollectionAddsInFeed: true,
        showOnboardingTour: true,
        emailNotifications: true,
        recommendationAlerts: true,
        followAlerts: true,
        defaultCollectionView: 'grid',
        autoplayPreviews: false,
      },
    });
    console.log(`[user-init] Ensured user settings exist for user: ${userId}`);
  });

  console.log(`[user-init] User initialization complete: ${userId}`);
}
