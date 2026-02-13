-- Add PostgreSQL triggers for automatic user count synchronization
-- This maintains followersCount, followingCount, and recommendationsCount in real-time

-- ============================================================================
-- Trigger function for follower/following counts (UserFollow table)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment followersCount for the followed user
    UPDATE "User" SET "followersCount" = "followersCount" + 1 WHERE id = NEW."followedId";
    -- Increment followingCount for the follower
    UPDATE "User" SET "followingCount" = "followingCount" + 1 WHERE id = NEW."followerId";
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement followersCount for the followed user (prevent negative)
    UPDATE "User" SET "followersCount" = GREATEST("followersCount" - 1, 0) WHERE id = OLD."followedId";
    -- Decrement followingCount for the follower (prevent negative)
    UPDATE "User" SET "followingCount" = GREATEST("followingCount" - 1, 0) WHERE id = OLD."followerId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_follows table
DROP TRIGGER IF EXISTS user_follow_count_trigger ON user_follows;
CREATE TRIGGER user_follow_count_trigger
AFTER INSERT OR DELETE ON user_follows
FOR EACH ROW EXECUTE FUNCTION update_follower_counts();


-- ============================================================================
-- Trigger function for recommendations count (Recommendation table)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_recommendations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment recommendationsCount for the user
    UPDATE "User" SET "recommendationsCount" = "recommendationsCount" + 1 WHERE id = NEW."userId";
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement recommendationsCount for the user (prevent negative)
    UPDATE "User" SET "recommendationsCount" = GREATEST("recommendationsCount" - 1, 0) WHERE id = OLD."userId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on Recommendation table
DROP TRIGGER IF EXISTS recommendation_count_trigger ON "Recommendation";
CREATE TRIGGER recommendation_count_trigger
AFTER INSERT OR DELETE ON "Recommendation"
FOR EACH ROW EXECUTE FUNCTION update_recommendations_count();
