-- Rename the 'name' column to 'username' in the User table
-- This is a safe rename operation that preserves all data

ALTER TABLE "User" RENAME COLUMN "name" TO "username";
