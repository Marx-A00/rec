/**
 * Uploads help-page demo videos from public/help/ to the Cloudflare R2 bucket
 * under the `help/` prefix, so they can be served from R2 in production
 * (Railway builds from the git tree, which does not include these large MP4s).
 *
 * Usage: tsx scripts/upload-help-media.ts [file1.mp4 file2.mp4 ...]
 *   - No args: uploads every .mp4 referenced by the help page (see HELP_VIDEOS).
 *   - Args: uploads only the named files (must exist in public/help/).
 *
 * Requires R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 * CLOUDFLARE_ACCOUNT_ID, R2_PUBLIC_URL in the environment (.env.local).
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

config({ path: '.env.local' });

const HELP_VIDEOS = [
  'recommend-album-real.mp4',
  'rec-artists-recommendations.mp4',
  'rec-albums-recommendations.mp4',
  'rec-following-friends.mp4',
  'add-album-to-collection-fixed-hopeful.mp4',
  'add-album-to-listen-later.mp4',
  'browse-latest-releases.mp4',
];

const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
const bucket = requireEnv('R2_BUCKET_NAME');
const publicUrl = requireEnv('R2_PUBLIC_URL').replace(/\/$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  },
});

async function main() {
  const files = process.argv.slice(2);
  const targets = files.length > 0 ? files : HELP_VIDEOS;

  for (const file of targets) {
    const localPath = join('public', 'help', file);
    const sizeMb = (statSync(localPath).size / 1024 / 1024).toFixed(1);
    const key = `help/${file}`;

    process.stdout.write(`Uploading ${file} (${sizeMb} MB) -> ${key} ... `);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: readFileSync(localPath),
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    // Confirm it landed.
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`done  ${publicUrl}/${key}`);
  }

  console.log(`\n✅ Uploaded ${targets.length} file(s) to ${bucket}.`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

main().catch(err => {
  console.error('\n❌ Upload failed:', err);
  process.exit(1);
});
