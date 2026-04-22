-- Adjust denormalized follower/following counts when a User is soft-deleted or restored.
-- When deletedAt transitions NULL → timestamp, the user "disappears" so counts on
-- related users must be decremented. The reverse applies on restore.

-- ============================================================================
-- Trigger function: adjust counts on User soft-delete / restore
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_counts_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft-delete: NULL → timestamp
  IF OLD."deleted_at" IS NULL AND NEW."deleted_at" IS NOT NULL THEN
    -- Users that the deleted user was following lose a follower
    UPDATE "User" SET "followersCount" = GREATEST("followersCount" - 1, 0)
    WHERE id IN (SELECT "followedId" FROM user_follows WHERE "followerId" = NEW.id);

    -- Users who were following the deleted user lose a "following" entry
    UPDATE "User" SET "followingCount" = GREATEST("followingCount" - 1, 0)
    WHERE id IN (SELECT "followerId" FROM user_follows WHERE "followedId" = NEW.id);

  -- Restore: timestamp → NULL
  ELSIF OLD."deleted_at" IS NOT NULL AND NEW."deleted_at" IS NULL THEN
    -- Reverse: users the restored user follows gain a follower back
    UPDATE "User" SET "followersCount" = "followersCount" + 1
    WHERE id IN (SELECT "followedId" FROM user_follows WHERE "followerId" = NEW.id);

    -- Reverse: users who follow the restored user gain a "following" entry back
    UPDATE "User" SET "followingCount" = "followingCount" + 1
    WHERE id IN (SELECT "followerId" FROM user_follows WHERE "followedId" = NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on User table (fires on update of deleted_at column)
DROP TRIGGER IF EXISTS trigger_adjust_counts_on_soft_delete ON "User";
CREATE TRIGGER trigger_adjust_counts_on_soft_delete
  AFTER UPDATE OF "deleted_at" ON "User"
  FOR EACH ROW EXECUTE FUNCTION adjust_counts_on_soft_delete();


-- ============================================================================
-- One-time correction: fix counts for any already soft-deleted users
-- ============================================================================

-- Decrement followersCount for users followed by already-deleted users
UPDATE "User" u SET "followersCount" = GREATEST("followersCount" - sub.cnt, 0)
FROM (
  SELECT uf."followedId" AS uid, COUNT(*) AS cnt
  FROM user_follows uf
  JOIN "User" del ON del.id = uf."followerId" AND del."deleted_at" IS NOT NULL
  GROUP BY uf."followedId"
) sub
WHERE u.id = sub.uid;

-- Decrement followingCount for users who follow already-deleted users
UPDATE "User" u SET "followingCount" = GREATEST("followingCount" - sub.cnt, 0)
FROM (
  SELECT uf."followerId" AS uid, COUNT(*) AS cnt
  FROM user_follows uf
  JOIN "User" del ON del.id = uf."followedId" AND del."deleted_at" IS NOT NULL
  GROUP BY uf."followerId"
) sub
WHERE u.id = sub.uid;
