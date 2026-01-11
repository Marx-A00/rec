// src/scripts/fix-user-counts.ts
// Migration script to recalculate and fix all user follower/following/recommendation counts

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

interface UserCountStats {
  userId: string;
  username: string | null;
  currentFollowersCount: number;
  actualFollowersCount: number;
  currentFollowingCount: number;
  actualFollowingCount: number;
  currentRecommendationsCount: number;
  actualRecommendationsCount: number;
  needsUpdate: boolean;
}

async function fixUserCounts() {
  console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('User Counts Migration Script'));
  console.log(chalk.bold.cyan('='.repeat(60) + '\n'));

  try {
    // Step 1: Fetch all users with their current counts
    console.log(chalk.bold.blue('📊 Step 1: Fetching all users...'));
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        followersCount: true,
        followingCount: true,
        recommendationsCount: true,
      },
      orderBy: { username: 'asc' },
    });

    console.log(chalk.green(`✓ Found ${users.length} users\n`));

    // Step 2: Calculate actual counts for each user
    console.log(chalk.bold.blue('🔍 Step 2: Calculating actual counts...\n'));

    const stats: UserCountStats[] = [];
    let processedCount = 0;

    for (const user of users) {
      // Count actual followers (users who follow this user)
      const actualFollowersCount = await prisma.userFollow.count({
        where: { followedId: user.id },
      });

      // Count actual following (users this user follows)
      const actualFollowingCount = await prisma.userFollow.count({
        where: { followerId: user.id },
      });

      // Count actual recommendations
      const actualRecommendationsCount = await prisma.recommendation.count({
        where: { userId: user.id },
      });

      const needsUpdate =
        user.followersCount !== actualFollowersCount ||
        user.followingCount !== actualFollowingCount ||
        user.recommendationsCount !== actualRecommendationsCount;

      stats.push({
        userId: user.id,
        username: user.username,
        currentFollowersCount: user.followersCount,
        actualFollowersCount,
        currentFollowingCount: user.followingCount,
        actualFollowingCount,
        currentRecommendationsCount: user.recommendationsCount,
        actualRecommendationsCount,
        needsUpdate,
      });

      processedCount++;
      if (processedCount % 10 === 0 || processedCount === users.length) {
        const percentage = Math.round((processedCount / users.length) * 100);
        console.log(
          chalk.yellow(
            `   Progress: ${processedCount}/${users.length} (${percentage}%)`
          )
        );
      }
    }

    // Step 3: Display discrepancies
    console.log(chalk.bold.blue('\n📋 Step 3: Analyzing discrepancies...\n'));

    const usersNeedingUpdate = stats.filter(s => s.needsUpdate);

    if (usersNeedingUpdate.length === 0) {
      console.log(
        chalk.green(
          '✓ All user counts are already accurate! No updates needed.'
        )
      );
      return;
    }

    console.log(
      chalk.yellow(
        `⚠️  Found ${usersNeedingUpdate.length} users with incorrect counts:\n`
      )
    );

    // Display summary table
    for (const stat of usersNeedingUpdate) {
      console.log(chalk.bold(`   User: ${stat.username || 'Unknown'}`));
      console.log(chalk.gray(`   ID: ${stat.userId}`));

      if (stat.currentFollowersCount !== stat.actualFollowersCount) {
        console.log(
          `   • Followers: ${chalk.red(stat.currentFollowersCount)} → ${chalk.green(stat.actualFollowersCount)}`
        );
      }

      if (stat.currentFollowingCount !== stat.actualFollowingCount) {
        console.log(
          `   • Following: ${chalk.red(stat.currentFollowingCount)} → ${chalk.green(stat.actualFollowingCount)}`
        );
      }

      if (
        stat.currentRecommendationsCount !== stat.actualRecommendationsCount
      ) {
        console.log(
          `   • Recommendations: ${chalk.red(stat.currentRecommendationsCount)} → ${chalk.green(stat.actualRecommendationsCount)}`
        );
      }

      console.log('');
    }

    // Step 4: Ask for confirmation
    console.log(chalk.bold.blue('🔧 Step 4: Applying fixes...\n'));

    // Apply all updates in a single transaction
    let updatedCount = 0;

    for (const stat of usersNeedingUpdate) {
      await prisma.user.update({
        where: { id: stat.userId },
        data: {
          followersCount: stat.actualFollowersCount,
          followingCount: stat.actualFollowingCount,
          recommendationsCount: stat.actualRecommendationsCount,
        },
      });

      updatedCount++;
      console.log(
        chalk.green(
          `   ✓ Updated ${stat.username || 'Unknown'} (${updatedCount}/${usersNeedingUpdate.length})`
        )
      );
    }

    // Step 5: Verify updates
    console.log(chalk.bold.blue('\n✅ Step 5: Verifying updates...\n'));

    for (const stat of usersNeedingUpdate) {
      const updatedUser = await prisma.user.findUnique({
        where: { id: stat.userId },
        select: {
          followersCount: true,
          followingCount: true,
          recommendationsCount: true,
        },
      });

      if (
        updatedUser &&
        updatedUser.followersCount === stat.actualFollowersCount &&
        updatedUser.followingCount === stat.actualFollowingCount &&
        updatedUser.recommendationsCount === stat.actualRecommendationsCount
      ) {
        console.log(chalk.green(`   ✓ Verified ${stat.username || 'Unknown'}`));
      } else {
        console.log(
          chalk.red(
            `   ✗ Verification failed for ${stat.username || 'Unknown'}`
          )
        );
      }
    }

    // Final summary
    console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
    console.log(chalk.bold.green('✅ Migration Complete!'));
    console.log(chalk.bold.cyan('='.repeat(60)));
    console.log(chalk.white(`   Total users: ${users.length}`));
    console.log(chalk.white(`   Users updated: ${updatedCount}`));
    console.log(
      chalk.white(`   Users unchanged: ${users.length - updatedCount}`)
    );
    console.log(chalk.bold.cyan('='.repeat(60) + '\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error during migration:'), error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixUserCounts()
  .then(() => {
    console.log(chalk.green('Migration script completed successfully'));
    process.exit(0);
  })
  .catch(error => {
    console.error(chalk.red('Migration script failed:'), error);
    process.exit(1);
  });
