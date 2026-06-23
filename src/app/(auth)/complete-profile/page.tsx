// src/app/(auth)/complete-profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import AvatarUpload from '@/components/profile/AvatarUpload';
import ArtistPicker from '@/components/taste/ArtistPicker';
import AlbumImportDialog from '@/components/lastfm/AlbumImportDialog';
import { SelectedArtist } from '@/components/taste/SortableArtistItem';
import { uploadAvatar } from '@/lib/upload-avatar';
import { validateUsernameForRegistration } from '@/lib/validations';
import {
  useConnectLastfmMutation,
  useConfirmLastfmConnectionMutation,
  useSetTasteProfileMutation,
  useGetTasteMatchesQuery,
  useGetUserLastfmStatsQuery,
  useEnsureArtistsFromMbidsMutation,
} from '@/generated/graphql';

const STEPS = ['Profile', 'Integrations', 'Taste', 'Follow'] as const;

export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const devMode = searchParams.get('dev') === 'true';
  const [currentStep, setCurrentStep] = useState(0);

  // === Step 1: Profile ===
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarCleared, setAvatarCleared] = useState(false);

  // === Step 2: Last.fm ===
  const [lastfmInput, setLastfmInput] = useState('');
  const [lastfmPreview, setLastfmPreview] = useState<{
    username: string;
    totalPlaycount?: number | null;
    registeredAt?: string | null;
  } | null>(null);
  const [lastfmError, setLastfmError] = useState('');
  const [lastfmConnected, setLastfmConnected] = useState(false);
  const [lastfmSyncing, setLastfmSyncing] = useState(false);
  const [lastfmPollingImages, setLastfmPollingImages] = useState(false);
  const connectLastfm = useConnectLastfmMutation();
  const confirmLastfm = useConfirmLastfmConnectionMutation();

  // === Step 2b: Poll for sync completion + image resolution ===
  const isPolling = lastfmSyncing || lastfmPollingImages;
  const { data: lastfmSyncData } = useGetUserLastfmStatsQuery(
    { userId: session?.user?.id ?? '' },
    {
      enabled: isPolling && !!session?.user?.id,
      refetchInterval: isPolling ? 2000 : false,
    }
  );

  // When sync delivers top artists, pre-fill and advance.
  // Keep polling until allImagesResolved is true.
  useEffect(() => {
    if (!isPolling) return;

    const lastfmStats = lastfmSyncData?.user?.lastfmStats;
    const topArtists = lastfmStats?.topArtists;

    if (topArtists && topArtists.length > 0) {
      // Build/update pre-filled artists with latest image data
      const preFilled: SelectedArtist[] = topArtists
        .filter(a => a.mbid || a.artistId)
        .slice(0, 5)
        .map(a => ({
          id: a.artistId || `lastfm:${a.mbid}`,
          name: a.name,
          imageUrl: a.imageUrl,
          cloudflareImageId: a.cloudflareImageId,
          source: 'local' as const,
          preFilledFromLastfm: true,
          mbid: a.mbid ?? undefined,
        }));
      setSelectedArtists(preFilled);

      // Advance to taste step (only on first arrival)
      if (lastfmSyncing) {
        setLastfmSyncing(false);
        setLastfmPollingImages(true);
        setCurrentStep(2);
        // Safety: stop image polling after 20s max
        setTimeout(() => setLastfmPollingImages(false), 20000);
      }

      // Stop polling once all image lookups are done
      if (lastfmStats?.allImagesResolved) {
        setLastfmPollingImages(false);
      }
      return;
    }

    // Timeout: if sync takes >15s, advance with empty picker
    const timeout = setTimeout(() => {
      if (lastfmSyncing) {
        setLastfmSyncing(false);
        setLastfmPollingImages(false);
        setCurrentStep(2);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isPolling, lastfmSyncing, lastfmSyncData]);

  // === Step 3: Taste ===
  const [selectedArtists, setSelectedArtists] = useState<SelectedArtist[]>([]);
  const setTasteProfile = useSetTasteProfileMutation();
  const ensureArtists = useEnsureArtistsFromMbidsMutation();

  // === Step 4: Follow ===
  const { data: matchesData } = useGetTasteMatchesQuery(
    { limit: 6 },
    { enabled: currentStep === 3 && selectedArtists.length > 0 }
  );
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [showAlbumImport, setShowAlbumImport] = useState(false);

  // Redirect if already onboarded (only on initial load, not mid-stepper)
  // ?dev=true skips the redirect for testing
  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.user?.profileUpdatedAt &&
      currentStep === 0 &&
      !devMode
    ) {
      router.replace('/home-mosaic');
    }
  }, [status, session, router, currentStep, devMode]);

  // Username availability check
  useEffect(() => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      return;
    }

    const validation = validateUsernameForRegistration(username);
    if (!validation.isValid) {
      setValidationError(validation.message || 'Invalid username');
      setIsAvailable(null);
      return;
    }
    setValidationError('');

    const timeoutId = setTimeout(async () => {
      setIsCheckingAvailability(true);
      try {
        const response = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        setIsAvailable(data.available);
      } catch {
        setIsAvailable(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleImageSelect = useCallback((blob: Blob) => {
    setAvatarBlob(blob);
    setAvatarCleared(false);
  }, []);

  const handleImageClear = useCallback(() => {
    setAvatarBlob(null);
    setAvatarCleared(true);
  }, []);

  // === Step 1: Save profile and advance ===
  const handleProfileSubmit = async () => {
    setIsLoading(true);
    setError('');

    const validation = validateUsernameForRegistration(username);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid username');
      setIsLoading(false);
      return;
    }

    if (!isAvailable) {
      setError('This username is not available');
      setIsLoading(false);
      return;
    }

    try {
      let imageUrl: string | undefined;
      if (avatarBlob) {
        imageUrl = await uploadAvatar(avatarBlob);
      } else if (avatarCleared) {
        imageUrl = '';
      }

      const body: Record<string, string | null | undefined> = {
        username: username.trim(),
        bio: bio.trim() || undefined,
      };
      if (imageUrl !== undefined) {
        body.image = imageUrl || null;
      }

      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to set username');
      }

      await update();
      setCurrentStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // === Step 2: Last.fm connect ===
  const handleLastfmConnect = async () => {
    if (!lastfmInput.trim()) return;
    setLastfmError('');
    setLastfmPreview(null);

    try {
      const result = await connectLastfm.mutateAsync({
        username: lastfmInput.trim(),
      });
      const conn = result.connectLastfm;
      if (conn.success) {
        setLastfmPreview({
          username: conn.username!,
          totalPlaycount: conn.totalPlaycount,
          registeredAt: conn.registeredAt ? String(conn.registeredAt) : null,
        });
      } else {
        setLastfmError(conn.error || 'Could not find that Last.fm user');
      }
    } catch {
      setLastfmError('Failed to connect. Please try again.');
    }
  };

  const handleLastfmConfirmAndContinue = async () => {
    if (!lastfmPreview) return;
    try {
      await confirmLastfm.mutateAsync({ username: lastfmPreview.username });
      setLastfmConnected(true);
      setLastfmSyncing(true);
      // Polling effect will advance to Step 3 once topArtists arrive
    } catch {
      setLastfmError('Failed to confirm connection');
    }
  };

  // === Step 3: Save taste and advance ===
  const handleTasteContinue = async () => {
    if (selectedArtists.length > 0) {
      try {
        // Separate local (real DB IDs) from non-local (lastfm:mbid temp IDs)
        const localArtists = selectedArtists.filter(
          a => !a.id.startsWith('lastfm:')
        );
        const nonLocalArtists = selectedArtists.filter(
          a => a.id.startsWith('lastfm:') && a.mbid
        );

        let allArtistIds = localArtists.map(a => a.id);

        // Create DB records for non-local artists
        if (nonLocalArtists.length > 0) {
          const result = await ensureArtists.mutateAsync({
            artists: nonLocalArtists.map(a => ({
              name: a.name,
              mbid: a.mbid!,
            })),
          });
          const createdIds = result.ensureArtistsFromMbids.map(a => a.id);
          allArtistIds = [...allArtistIds, ...createdIds];
        }

        await setTasteProfile.mutateAsync({ artistIds: allArtistIds });
      } catch {
        // Non-blocking — still advance
      }
    }
    setCurrentStep(3);
  };

  // === Step 4: Follow users ===
  const handleFollow = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
      setFollowedUsers(prev => new Set([...prev, userId]));
    } catch {
      // Silently fail
    }
  };

  const handleFinish = async () => {
    await update();
    if (lastfmConnected) {
      setShowAlbumImport(true);
    } else {
      router.replace('/home-mosaic');
    }
  };

  // === Step navigation ===
  const handleStepClick = (step: number) => {
    // Only allow going back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-black'>
        <Loader2 className='w-8 h-8 animate-spin text-cosmic-latte' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/signin');
    return null;
  }

  return (
    <div className='bg-black/80 backdrop-blur-xs rounded-2xl border border-zinc-800/50 overflow-hidden max-w-md w-full'>
      {/* Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        onStepClick={handleStepClick}
        steps={STEPS}
      />

      {/* Step Content */}
      <div className='px-8 pb-8'>
        {/* === STEP 1: Profile === */}
        {currentStep === 0 && (
          <div className='space-y-5'>
            <div className='flex items-center gap-5'>
              <div className='shrink-0'>
                <AvatarUpload
                  currentImage={session?.user?.image}
                  onImageSelect={handleImageSelect}
                  onImageClear={handleImageClear}
                  size='default'
                />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-white mb-1'>
                  Complete your profile
                </h1>
                <p className='text-sm text-zinc-400'>
                  Tell us a bit about yourself
                </p>
              </div>
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='username'
                className='text-sm font-medium text-zinc-200'
              >
                Username
              </label>
              <div className='relative'>
                <input
                  id='username'
                  type='text'
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder='yourname'
                  autoComplete='username'
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck='false'
                  autoFocus
                  className='w-full px-4 h-12 bg-zinc-900 border border-zinc-700 rounded-lg text-base text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-cosmic-latte focus:border-transparent pr-12'
                />
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  {isCheckingAvailability && (
                    <Loader2 className='w-5 h-5 animate-spin text-zinc-400' />
                  )}
                  {!isCheckingAvailability && isAvailable === true && (
                    <CheckCircle className='w-5 h-5 text-green-500' />
                  )}
                  {!isCheckingAvailability && isAvailable === false && (
                    <XCircle className='w-5 h-5 text-red-500' />
                  )}
                </div>
              </div>
              {validationError ? (
                <p className='text-xs text-red-400'>{validationError}</p>
              ) : isAvailable === false ? (
                <p className='text-xs text-red-400'>
                  This username is already taken
                </p>
              ) : isAvailable === true ? (
                <p className='text-xs text-green-400'>Username is available!</p>
              ) : (
                <p className='text-xs text-zinc-500'>
                  2-30 characters. Letters, numbers, hyphens, underscores, and
                  periods only.
                </p>
              )}
            </div>

            <div className='space-y-1.5'>
              <label
                htmlFor='bio'
                className='text-sm font-medium text-zinc-200'
              >
                Bio{' '}
                <span className='text-zinc-500 font-normal'>(optional)</span>
              </label>
              <textarea
                id='bio'
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder='Tell us a little about yourself...'
                maxLength={160}
                rows={3}
                className='w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-base text-white placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-cosmic-latte focus:border-transparent resize-none'
              />
              <p className='text-xs text-zinc-500 text-right'>
                {bio.length}/160
              </p>
            </div>

            {error && (
              <div className='p-2.5 rounded-lg bg-red-500/10 border border-red-500/20'>
                <p className='text-sm text-red-400'>{error}</p>
              </div>
            )}

            <Button
              type='button'
              disabled={isLoading || !isAvailable || !!validationError}
              onClick={handleProfileSubmit}
              className='w-full py-3 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        )}

        {/* === STEP 2: Integrations (Last.fm) === */}
        {currentStep === 1 && (
          <div className='space-y-5'>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <div className='w-7 h-7 rounded-full bg-[#D51007] flex items-center justify-center'>
                  <span className='text-white text-[9px] font-bold'>fm</span>
                </div>
                <h1 className='text-xl font-bold text-white'>
                  Connect your Last.fm
                </h1>
              </div>
              <div className='flex items-center gap-2 mb-3'>
                <span className='text-[11px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full'>
                  Optional
                </span>
              </div>
              <p className='text-sm text-zinc-400'>
                Import your listening history to get personalized
                recommendations and pre-fill your taste profile.
              </p>
            </div>

            {!lastfmPreview && (
              <div className='space-y-2'>
                <label className='text-sm font-medium text-zinc-300'>
                  Last.fm username
                </label>
                <div className='flex gap-3'>
                  <input
                    type='text'
                    placeholder='Enter your Last.fm username'
                    value={lastfmInput}
                    onChange={e => {
                      setLastfmInput(e.target.value);
                      setLastfmError('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleLastfmConnect();
                    }}
                    className='flex-1 px-4 h-11 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-transparent text-sm'
                  />
                  <button
                    type='button'
                    onClick={handleLastfmConnect}
                    disabled={!lastfmInput.trim() || connectLastfm.isPending}
                    className='px-4 h-11 bg-cosmic-latte text-black font-medium rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 transition-colors text-sm'
                  >
                    {connectLastfm.isPending ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
                {lastfmError && (
                  <p className='text-sm text-red-400'>{lastfmError}</p>
                )}
              </div>
            )}

            {/* Preview card */}
            {lastfmPreview && (
              <div className='bg-zinc-800/50 border border-green-700/30 rounded-lg p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-zinc-700' />
                    <div>
                      <p className='text-white font-semibold'>
                        {lastfmPreview.username}
                      </p>
                      <p className='text-sm text-zinc-400'>
                        {lastfmPreview.totalPlaycount?.toLocaleString() ?? 0}{' '}
                        scrobbles
                        {lastfmPreview.registeredAt &&
                          ` · Member since ${new Date(lastfmPreview.registeredAt).getFullYear()}`}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className='w-5 h-5 text-green-400' />
                </div>
              </div>
            )}

            {/* Action buttons / syncing state */}
            {lastfmSyncing ? (
              <div className='flex flex-col items-center gap-3 py-6'>
                <Loader2 className='w-6 h-6 animate-spin text-cosmic-latte' />
                <p className='text-sm text-zinc-400'>
                  Syncing your listening history...
                </p>
              </div>
            ) : (
              <div className='space-y-3 pt-2'>
                {lastfmPreview ? (
                  <Button
                    type='button'
                    onClick={handleLastfmConfirmAndContinue}
                    disabled={confirmLastfm.isPending}
                    className='w-full py-3 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50'
                  >
                    {confirmLastfm.isPending ? (
                      <Loader2 className='w-5 h-5 animate-spin' />
                    ) : (
                      'Connect & Continue'
                    )}
                  </Button>
                ) : (
                  <div />
                )}
                <button
                  type='button'
                  onClick={() => setCurrentStep(2)}
                  className='w-full text-center text-sm text-zinc-500 hover:text-zinc-400 transition-colors py-2'
                >
                  Skip this step
                </button>
              </div>
            )}
          </div>
        )}

        {/* === STEP 3: Taste Profile === */}
        {currentStep === 2 && (
          <div className='space-y-5'>
            {lastfmConnected && (
              <div className='flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2'>
                <span className='text-amber-400 text-xs'>✦</span>
                <span className='text-xs font-medium text-amber-400'>
                  Pre-filled from your Last.fm top artists
                </span>
              </div>
            )}

            <ArtistPicker
              preSelectedArtists={lastfmConnected ? selectedArtists : undefined}
              onSelectionChange={setSelectedArtists}
            />

            <div className='space-y-3 pt-2'>
              <Button
                type='button'
                onClick={handleTasteContinue}
                disabled={setTasteProfile.isPending}
                className='w-full py-3 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50'
              >
                {setTasteProfile.isPending ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  'Continue'
                )}
              </Button>
              <button
                type='button'
                onClick={() => {
                  // Skip taste → skip follow too → go home
                  router.replace('/home-mosaic');
                }}
                className='w-full text-center text-sm text-zinc-500 hover:text-zinc-400 transition-colors py-2'
              >
                Skip this step
              </button>
            </div>
          </div>
        )}

        {/* === STEP 4: Follow Suggestions === */}
        {currentStep === 3 && (
          <div className='space-y-5'>
            <div>
              <h1 className='text-xl font-bold text-white mb-1'>
                People with similar taste
              </h1>
              <p className='text-sm text-zinc-400'>
                Follow people who share your music taste to discover new
                recommendations.
              </p>
            </div>

            <div className='space-y-2'>
              {matchesData?.tasteMatches?.map(match => {
                const isFollowed = followedUsers.has(match.user.id);
                return (
                  <div
                    key={match.user.id}
                    className='flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg'
                  >
                    <div className='w-10 h-10 rounded-full bg-zinc-700 shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold text-white'>
                          {match.user.username}
                        </span>
                        <span className='text-[10px] font-semibold text-green-400 bg-green-900/40 px-1.5 py-0.5 rounded-full'>
                          {match.overlapCount} shared
                        </span>
                      </div>
                      <p className='text-xs text-zinc-400 truncate'>
                        {match.sharedArtists.map(sa => sa.artist.name).join(', ')}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={() => handleFollow(match.user.id)}
                      disabled={isFollowed}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                        isFollowed
                          ? 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                          : 'bg-cosmic-latte text-black hover:bg-cosmic-latte/90'
                      }`}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}

              {(!matchesData?.tasteMatches ||
                matchesData.tasteMatches.length === 0) && (
                <div className='text-center py-8'>
                  <p className='text-sm text-zinc-500'>
                    No taste matches found yet — they&apos;ll appear as more
                    users set up their profiles.
                  </p>
                </div>
              )}
            </div>

            <Button
              type='button'
              onClick={handleFinish}
              className='w-full py-3 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90'
            >
              Finish Setup
            </Button>
          </div>
        )}
      </div>

      {/* Album import dialog (shown after Finish if Last.fm connected) */}
      <AlbumImportDialog
        open={showAlbumImport}
        onOpenChange={open => {
          setShowAlbumImport(open);
          if (!open) router.replace('/home-mosaic');
        }}
        onComplete={() => {}}
      />
    </div>
  );
}
