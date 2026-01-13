// src/app/admin/help/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  Database,
  Users,
  Clock,
  Music,
  FileText,
  HelpCircle,
  Terminal,
  Code,
  AlertCircle,
} from 'lucide-react';

export default function AdminHelpPage() {
  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white flex items-center gap-3'>
          <HelpCircle className='h-8 w-8' />
          Admin Dashboard Help
        </h1>
        <p className='text-zinc-400 mt-1'>
          Documentation and guidance for system administration
        </p>
      </div>

      {/* Quick Reference */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>Quick Reference</CardTitle>
          <CardDescription className='text-zinc-400'>
            Essential information at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h3 className='text-sm font-semibold text-white mb-3 flex items-center gap-2'>
                <Terminal className='h-4 w-4' />
                Development Commands
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm dev</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Start Next.js dev server (localhost:3000)
                  </p>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm queue:dev</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Start BullMQ dashboard + worker (localhost:3001)
                  </p>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm db:reset</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Reset and re-seed database
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className='text-sm font-semibold text-white mb-3 flex items-center gap-2'>
                <Code className='h-4 w-4' />
                GraphQL Development
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm codegen</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Generate TypeScript types and React Query hooks
                  </p>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm codegen:watch</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Watch mode for GraphQL changes
                  </p>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <code className='text-emerald-400'>pnpm prisma generate</code>
                  <p className='text-zinc-400 text-xs mt-1'>
                    Generate Prisma client after schema changes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Pages */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>Dashboard Pages</CardTitle>
          <CardDescription className='text-zinc-400'>
            Overview of available admin pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <Activity className='h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Overview</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  System health monitoring, queue metrics, and quick actions.
                  View real-time stats for jobs, errors, and performance.
                </p>
              </div>
            </div>

            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <Database className='h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Queue Management</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  Monitor BullMQ job queues, view active/pending/failed jobs,
                  and manage queue operations.
                </p>
              </div>
            </div>

            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <Music className='h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Music Database</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  Browse and manage albums, artists, and MusicBrainz data. View
                  enrichment status and metadata.
                </p>
              </div>
            </div>

            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <Clock className='h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Job History</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  View detailed job execution history, completion times, and
                  error logs for troubleshooting.
                </p>
              </div>
            </div>

            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <Users className='h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Users</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  Manage user accounts, roles, and permissions. View user
                  activity and statistics.
                </p>
              </div>
            </div>

            <div className='flex gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700'>
              <FileText className='h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5' />
              <div>
                <h3 className='text-white font-medium'>Testing</h3>
                <p className='text-sm text-zinc-400 mt-1'>
                  Test data management, view and delete test recommendations,
                  and database seeding tools.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Architecture */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>System Architecture</CardTitle>
          <CardDescription className='text-zinc-400'>
            Understanding the application stack
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h3 className='text-white font-medium mb-2'>Technology Stack</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>
                    Framework:
                  </span>
                  <span className='text-zinc-300 ml-2'>Next.js 15</span>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>
                    Database:
                  </span>
                  <span className='text-zinc-300 ml-2'>
                    PostgreSQL + Prisma ORM
                  </span>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>API:</span>
                  <span className='text-zinc-300 ml-2'>
                    GraphQL (Apollo Server)
                  </span>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>Queue:</span>
                  <span className='text-zinc-300 ml-2'>BullMQ + Redis</span>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>Auth:</span>
                  <span className='text-zinc-300 ml-2'>NextAuth.js v5</span>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <span className='text-emerald-400 font-medium'>State:</span>
                  <span className='text-zinc-300 ml-2'>TanStack Query v5</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className='text-white font-medium mb-2'>Data Flow</h3>
              <div className='bg-zinc-800/50 p-4 rounded border border-zinc-700 font-mono text-xs text-zinc-300 space-y-1'>
                <div>[React Components]</div>
                <div className='pl-4'>↓ use generated hooks</div>
                <div>[Generated GraphQL Hooks]</div>
                <div className='pl-4'>↓ queries/mutations</div>
                <div>[Apollo GraphQL Server]</div>
                <div className='pl-4'>↓ resolvers</div>
                <div>[Prisma ORM]</div>
                <div className='pl-4'>↓</div>
                <div>[PostgreSQL Database]</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MusicBrainz Integration */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>MusicBrainz Integration</CardTitle>
          <CardDescription className='text-zinc-400'>
            Rate-limited API integration via BullMQ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='bg-zinc-800/50 p-4 rounded border border-zinc-700'>
              <h3 className='text-white font-medium mb-2'>Rate Limiting</h3>
              <p className='text-sm text-zinc-400'>
                MusicBrainz API is rate-limited to{' '}
                <span className='text-emerald-400 font-medium'>
                  1 request/second
                </span>
                . All requests are queued via BullMQ to ensure compliance.
              </p>
            </div>

            <div className='bg-zinc-800/50 p-4 rounded border border-zinc-700'>
              <h3 className='text-white font-medium mb-2'>Job Types</h3>
              <div className='space-y-2 text-sm mt-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-emerald-400 font-mono text-xs'>
                    search-artists
                  </span>
                  <span className='text-zinc-500'>—</span>
                  <span className='text-zinc-400'>
                    Search for artists by name
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-emerald-400 font-mono text-xs'>
                    search-releases
                  </span>
                  <span className='text-zinc-500'>—</span>
                  <span className='text-zinc-400'>
                    Search for albums/releases
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-emerald-400 font-mono text-xs'>
                    get-artist
                  </span>
                  <span className='text-zinc-500'>—</span>
                  <span className='text-zinc-400'>Fetch artist details</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-emerald-400 font-mono text-xs'>
                    get-release
                  </span>
                  <span className='text-zinc-500'>—</span>
                  <span className='text-zinc-400'>
                    Fetch album/release details
                  </span>
                </div>
              </div>
            </div>

            <div className='bg-zinc-800/50 p-4 rounded border border-zinc-700'>
              <h3 className='text-white font-medium mb-2'>
                Monitoring Queue Jobs
              </h3>
              <p className='text-sm text-zinc-400'>
                Use the{' '}
                <a
                  href='http://localhost:3001/admin/queues'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-emerald-400 hover:text-emerald-300 underline'
                >
                  Bull Board Dashboard
                </a>{' '}
                to monitor MusicBrainz job queues in real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Tasks */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>Common Admin Tasks</CardTitle>
          <CardDescription className='text-zinc-400'>
            Frequently performed operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h3 className='text-white font-medium mb-2'>
                Syncing Spotify Data
              </h3>
              <ol className='list-decimal list-inside space-y-2 text-sm text-zinc-400 ml-2'>
                <li>Navigate to Overview page</li>
                <li>Scroll to &quot;Quick Actions&quot; section</li>
                <li>
                  Click appropriate sync button:
                  <ul className='list-disc list-inside ml-6 mt-1 space-y-1'>
                    <li>
                      <span className='text-emerald-400'>
                        Sync New Releases
                      </span>{' '}
                      - Latest Spotify releases
                    </li>
                    <li>
                      <span className='text-emerald-400'>
                        Sync Featured Playlists
                      </span>{' '}
                      - Curated playlists
                    </li>
                    <li>
                      <span className='text-emerald-400'>
                        Sync All Spotify Data
                      </span>{' '}
                      - Both sources
                    </li>
                  </ul>
                </li>
                <li>Monitor progress in Queue Management page</li>
              </ol>
            </div>

            <div>
              <h3 className='text-white font-medium mb-2'>
                Troubleshooting Failed Jobs
              </h3>
              <ol className='list-decimal list-inside space-y-2 text-sm text-zinc-400 ml-2'>
                <li>Go to Job History page</li>
                <li>Filter by &quot;Failed&quot; status</li>
                <li>Click on failed job to view error details</li>
                <li>Check error message and stack trace</li>
                <li>
                  Common fixes:
                  <ul className='list-disc list-inside ml-6 mt-1 space-y-1'>
                    <li>Retry the job from Bull Board</li>
                    <li>Check Redis connection</li>
                    <li>Verify MusicBrainz API is accessible</li>
                    <li>Check rate limiting compliance</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 className='text-white font-medium mb-2'>
                Managing Test Data
              </h3>
              <ol className='list-decimal list-inside space-y-2 text-sm text-zinc-400 ml-2'>
                <li>Navigate to Testing page</li>
                <li>View all test recommendations</li>
                <li>Delete individual recommendations using trash icon</li>
                <li>
                  Or reset entire database:
                  <div className='bg-zinc-800/50 p-2 rounded border border-zinc-700 mt-2'>
                    <code className='text-emerald-400 text-xs'>
                      pnpm db:reset
                    </code>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment & Deployment */}
      <Card className='bg-zinc-900 border-zinc-800 mb-6'>
        <CardHeader>
          <CardTitle className='text-white'>Environment & Deployment</CardTitle>
          <CardDescription className='text-zinc-400'>
            Configuration and deployment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div>
              <h3 className='text-white font-medium mb-2'>
                Required Environment Variables
              </h3>
              <div className='bg-zinc-800/50 p-4 rounded border border-zinc-700 font-mono text-xs text-zinc-300 space-y-1'>
                <div>DATABASE_URL — PostgreSQL connection string</div>
                <div>NEXTAUTH_SECRET — NextAuth encryption key</div>
                <div>NEXTAUTH_URL — Application URL</div>
                <div>REDIS_URL — Redis connection for BullMQ</div>
                <div>GOOGLE_CLIENT_ID/SECRET — Google OAuth</div>
                <div>SPOTIFY_CLIENT_ID/SECRET — Spotify OAuth</div>
                <div>AWS S3 credentials — Image storage</div>
              </div>
            </div>

            <div>
              <h3 className='text-white font-medium mb-2'>
                Development vs Production
              </h3>
              <p className='text-sm text-zinc-400 mb-3'>
                The admin dashboard shows different features based on
                environment:
              </p>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <h4 className='text-emerald-400 font-medium mb-2'>
                    Development
                  </h4>
                  <ul className='space-y-1 text-zinc-400 text-xs'>
                    <li>• Real-time monitoring metrics</li>
                    <li>• Component health status</li>
                    <li>• Performance indicators</li>
                    <li>• Bull Board integration</li>
                  </ul>
                </div>
                <div className='bg-zinc-800/50 p-3 rounded border border-zinc-700'>
                  <h4 className='text-blue-400 font-medium mb-2'>Production</h4>
                  <ul className='space-y-1 text-zinc-400 text-xs'>
                    <li>• Simplified admin view</li>
                    <li>• Quick actions only</li>
                    <li>• Database management</li>
                    <li>• User management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className='bg-zinc-900 border-zinc-800'>
        <CardHeader>
          <CardTitle className='text-white'>Troubleshooting</CardTitle>
          <CardDescription className='text-zinc-400'>
            Common issues and solutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='bg-red-950/20 border border-red-900/50 p-4 rounded-lg'>
              <h3 className='text-red-400 font-medium mb-2 flex items-center gap-2'>
                <AlertCircle className='h-4 w-4' />
                Queue not processing jobs
              </h3>
              <ul className='space-y-1 text-sm text-zinc-400 ml-6 list-disc'>
                <li>Ensure Redis is running</li>
                <li>
                  Check worker is started:{' '}
                  <code className='text-emerald-400'>pnpm queue:dev</code>
                </li>
                <li>Verify REDIS_URL in .env</li>
                <li>Check worker logs for errors</li>
              </ul>
            </div>

            <div className='bg-yellow-950/20 border border-yellow-900/50 p-4 rounded-lg'>
              <h3 className='text-yellow-400 font-medium mb-2 flex items-center gap-2'>
                <AlertCircle className='h-4 w-4' />
                GraphQL types out of sync
              </h3>
              <ul className='space-y-1 text-sm text-zinc-400 ml-6 list-disc'>
                <li>
                  Run: <code className='text-emerald-400'>pnpm codegen</code>
                </li>
                <li>Restart dev server</li>
                <li>Check for TypeScript errors</li>
                <li>Verify schema.graphql changes</li>
              </ul>
            </div>

            <div className='bg-orange-950/20 border border-orange-900/50 p-4 rounded-lg'>
              <h3 className='text-orange-400 font-medium mb-2 flex items-center gap-2'>
                <AlertCircle className='h-4 w-4' />
                Database migration issues
              </h3>
              <ul className='space-y-1 text-sm text-zinc-400 ml-6 list-disc'>
                <li>
                  Generate client:{' '}
                  <code className='text-emerald-400'>pnpm prisma generate</code>
                </li>
                <li>
                  Push changes:{' '}
                  <code className='text-emerald-400'>pnpm prisma db push</code>
                </li>
                <li>
                  Reset if needed:{' '}
                  <code className='text-emerald-400'>pnpm db:reset</code>
                </li>
                <li>Check DATABASE_URL is correct</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className='mt-8 text-center text-sm text-zinc-500'>
        <p>
          For more detailed documentation, see{' '}
          <code className='text-emerald-400'>CLAUDE.md</code> in the project
          root.
        </p>
        <p className='mt-2'>
          Task Master documentation:{' '}
          <code className='text-emerald-400'>.taskmaster/docs/procedures/</code>
        </p>
      </div>
    </div>
  );
}
