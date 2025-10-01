# Prisma Database Migration Playbook (Dev → Prod)

This playbook explains how to promote your current dev schema to production using Prisma migrations. It is safe-by-default (no `db push` to prod) and includes drift handling and data backfill patterns.

## TL;DR

1. Finalize dev migrations
   ```bash
   pnpm prisma migrate status
   pnpm prisma migrate dev --name "finalize_schema_v1"
   git add prisma/schema.prisma prisma/migrations && git commit -m "chore(db): finalize schema v1"
   ```
2. Dry-run on a prod clone (recommended)
   ```bash
   export DATABASE_URL="postgres://user:pass@host/prod_clone"
   pnpm prisma migrate deploy
   pnpm prisma migrate status
   ```
3. Backup real prod
   ```bash
   # Postgres custom-format dump
   pg_dump --no-owner --no-privileges -Fc "$PROD_DATABASE_URL" > prod_$(date +%F).dump
   ```
4. Apply to prod
   ```bash
   export DATABASE_URL="$PROD_DATABASE_URL"
   pnpm prisma migrate deploy
   pnpm prisma migrate status
   ```

## Why migrations (not db push)?

`prisma migrate` creates versioned SQL in `prisma/migrations/**` and records them in `_prisma_migrations`. This produces a reproducible, auditable history and safe prod deploys. `db push` is for dev; don’t use it on prod.

## Detailed Steps

### 1) Finalize dev migrations

Ensure your dev changes are captured as migration files.

```bash
pnpm prisma migrate status
pnpm prisma migrate dev --name "finalize_schema_v1"
```

Commit both `prisma/schema.prisma` and the new `prisma/migrations/**` folder.

### 2) Dry-run on a production clone

Point `DATABASE_URL` to a clone/snapshot of prod and run:

```bash
export DATABASE_URL="postgres://user:pass@host/prod_clone"
pnpm prisma migrate deploy
pnpm prisma migrate status
```

Fix any errors here before touching real prod.

### 3) Backup production

Take a snapshot or a dump first (Postgres example):

```bash
pg_dump --no-owner --no-privileges -Fc "$PROD_DATABASE_URL" > prod_$(date +%F).dump
```

Store it in a safe place (e.g., S3, backups folder).

### 4) Deploy to prod

Run only pending migrations in order:

```bash
export DATABASE_URL="$PROD_DATABASE_URL"
pnpm prisma migrate deploy
pnpm prisma migrate status
```

If your app is containerized/CI-driven, run the same command in your release job with prod secrets.

## Handling Schema Drift (if you used db push or manual SQL)

Symptoms: `migrate status` reports drift or prod differs from tracked migrations.

Options:

- Preferred: generate proper migrations now on dev

  ```bash
  pnpm prisma migrate dev --name "align_schema_to_migrations"
  # retest on clone → deploy with migrate deploy
  ```

- Advanced: generate reviewed SQL diff from prod → schema
  ```bash
  pnpm prisma migrate diff \
    --from-url "$PROD_DATABASE_URL" \
    --to-schema-datamodel prisma/schema.prisma \
    --script > review_and_apply.sql
  ```
  Review/apply on staging, then on prod. If needed, align migration history (use with care):
  ```bash
  pnpm prisma migrate resolve --applied <migration_id>
  ```

## Data Backfill Patterns (safe column changes)

For non-null columns or renames, avoid destructive changes. Use multi-step migrations:

1. Add nullable column/new table shape
2. Backfill data
3. Set NOT NULL / drop old column

Example (Postgres) inside a migration SQL:

```sql
-- 1) Add new nullable column
ALTER TABLE recommendations ADD COLUMN similarity_score NUMERIC NULL;

-- 2) Backfill
UPDATE recommendations SET similarity_score = 0 WHERE similarity_score IS NULL;

-- 3) Enforce constraint
ALTER TABLE recommendations ALTER COLUMN similarity_score SET NOT NULL;
```

Test backfills on the prod clone before real prod.

## Rollback Strategy

- Use the snapshot you took before deploy to restore the database, or use cloud provider point-in-time recovery.
- Migrations are forward-only. If you need to revert, restore the backup, then deploy the prior app build.

## Common Pitfalls

- Using `prisma db push` on prod → untracked changes; avoid.
- Adding NOT NULL columns without defaults/backfill → deploy fails.
- Renames treated as drop+add without backfill → data loss.
- Skipping backups → hard to recover.

## Quick Verification

```bash
pnpm prisma migrate status
pnpm prisma studio # optional: spot-check tables/data
```

---

If you share your exact deploy method (CI, Docker, Fly, Render, etc.), you can adapt this to a pre-deploy step and a health-check script.
