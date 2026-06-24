'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ExternalLink, RefreshCw, Download } from 'lucide-react';

import { TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import ArtistPicker from '@/components/taste/ArtistPicker';
import AlbumImportDialog from '@/components/lastfm/AlbumImportDialog';
import { SelectedArtist } from '@/components/taste/SortableArtistItem';
import {
  useGetMySettingsQuery,
  useUpdateUserSettingsMutation,
  useConnectLastfmMutation,
  useConfirmLastfmConnectionMutation,
  useDisconnectLastfmMutation,
  useTriggerLastfmSyncMutation,
  useGetUserTasteProfileQuery,
  useSetTasteProfileMutation,
  useGetUserLastfmStatsQuery,
} from '@/generated/graphql';

export default function PreferencesTab() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingSettings } = useGetMySettingsQuery();
  const updateSettings = useUpdateUserSettingsMutation();
  const connectLastfm = useConnectLastfmMutation();
  const confirmConnection = useConfirmLastfmConnectionMutation();
  const disconnectLastfm = useDisconnectLastfmMutation();
  const triggerSync = useTriggerLastfmSyncMutation();

  // Last.fm connection flow state
  const [lastfmInput, setLastfmInput] = useState('');
  const [preview, setPreview] = useState<{
    username: string;
    profileImage?: string | null;
    totalPlaycount?: number | null;
    registeredAt?: string | null;
  } | null>(null);
  const [connectError, setConnectError] = useState('');

  // Settings state
  const [showLastfmStats, setShowLastfmStats] = useState(true);
  const [lastfmSyncEnabled, setLastfmSyncEnabled] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Taste profile state
  const setTasteProfile = useSetTasteProfileMutation();
  const userId = session?.user?.id ?? '';
  const { data: tasteData } = useGetUserTasteProfileQuery(
    { userId },
    { enabled: !!userId }
  );
  const [tasteArtists, setTasteArtists] = useState<SelectedArtist[]>([]);
  const [showTasteProfile, setShowTasteProfile] = useState(true);
  const [tasteDirty, setTasteDirty] = useState(false);

  // Last.fm top artists for taste profile population
  const { data: lastfmData } = useGetUserLastfmStatsQuery(
    { userId },
    { enabled: !!userId && !!data?.mySettings?.lastfmUsername }
  );

  const isConnected = !!data?.mySettings?.lastfmUsername;
  const connectedUsername = data?.mySettings?.lastfmUsername;

  useEffect(() => {
    if (data?.mySettings) {
      setShowLastfmStats(data.mySettings.showLastfmStats ?? true);
      setLastfmSyncEnabled(data.mySettings.lastfmSyncEnabled ?? true);
      setShowTasteProfile(data.mySettings.showTasteProfile ?? true);
    }
  }, [data]);

  // Populate taste artists from loaded profile
  useEffect(() => {
    if (tasteData?.userTasteProfile) {
      const mapped: SelectedArtist[] = tasteData.userTasteProfile.map(fav => ({
        id: fav.artist.id,
        name: fav.artist.name,
        imageUrl: fav.artist.imageUrl,
        cloudflareImageId: fav.artist.cloudflareImageId,
        source: 'local' as const,
      }));
      setTasteArtists(mapped);
      setTasteDirty(false);
    }
  }, [tasteData]);

  const handleConnect = async () => {
    if (!lastfmInput.trim()) return;
    setConnectError('');
    setPreview(null);

    try {
      const result = await connectLastfm.mutateAsync({
        username: lastfmInput.trim(),
      });
      const conn = result.connectLastfm;
      if (conn.success) {
        setPreview({
          username: conn.username!,
          profileImage: conn.profileImage,
          totalPlaycount: conn.totalPlaycount,
          registeredAt: conn.registeredAt ? String(conn.registeredAt) : null,
        });
      } else {
        setConnectError(conn.error || 'Could not find that Last.fm user');
      }
    } catch {
      setConnectError('Failed to connect. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    try {
      await confirmConnection.mutateAsync({ username: preview.username });
      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      setPreview(null);
      setLastfmInput('');
      showToast(`Connected to Last.fm as ${preview.username}`, 'success');
    } catch {
      showToast('Failed to confirm connection', 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectLastfm.mutateAsync({});
      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      showToast('Last.fm disconnected', 'success');
    } catch {
      showToast('Failed to disconnect', 'error');
    }
  };

  const handleSync = async () => {
    try {
      await triggerSync.mutateAsync({});
      showToast('Sync started', 'success');
    } catch {
      showToast('Failed to start sync', 'error');
    }
  };

  const handleToggle = async (
    field: 'showLastfmStats' | 'lastfmSyncEnabled',
    value: boolean
  ) => {
    const prev = { showLastfmStats, lastfmSyncEnabled };
    if (field === 'showLastfmStats') setShowLastfmStats(value);
    if (field === 'lastfmSyncEnabled') setLastfmSyncEnabled(value);

    try {
      await updateSettings.mutateAsync({ [field]: value });
      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      showToast('Settings updated', 'success');
    } catch {
      if (field === 'showLastfmStats') setShowLastfmStats(prev.showLastfmStats);
      if (field === 'lastfmSyncEnabled')
        setLastfmSyncEnabled(prev.lastfmSyncEnabled);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleTasteSave = async () => {
    if (tasteArtists.length === 0) return;
    try {
      await setTasteProfile.mutateAsync({
        artistIds: tasteArtists.map(a => a.id),
      });
      queryClient.invalidateQueries({
        queryKey: ['GetUserTasteProfile'],
      });
      setTasteDirty(false);
      showToast('Taste profile updated', 'success');
    } catch {
      showToast('Failed to update taste profile', 'error');
    }
  };

  const lastfmTopArtists = lastfmData?.user?.lastfmStats?.topArtists ?? [];
  const lastfmArtistsWithIds = lastfmTopArtists.filter(a => a.artistId);

  const handlePopulateFromLastfm = () => {
    const mapped: SelectedArtist[] = lastfmArtistsWithIds
      .slice(0, 5)
      .map(a => ({
        id: a.artistId!,
        name: a.name,
        imageUrl: a.imageUrl ?? undefined,
        cloudflareImageId: a.cloudflareImageId ?? undefined,
        source: 'local' as const,
      }));
    if (mapped.length > 0) {
      setTasteArtists(mapped);
      setTasteDirty(true);
      showToast(`Populated ${mapped.length} artists from Last.fm`, 'success');
    }
  };

  const handleTasteToggle = async (value: boolean) => {
    const prev = showTasteProfile;
    setShowTasteProfile(value);
    try {
      await updateSettings.mutateAsync({ showTasteProfile: value });
      queryClient.invalidateQueries({ queryKey: ['GetMySettings'] });
      showToast('Settings updated', 'success');
    } catch {
      setShowTasteProfile(prev);
      showToast('Failed to update settings', 'error');
    }
  };

  if (isLoadingSettings) {
    return (
      <TabsContent value='preferences' className='p-6'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-6 h-6 animate-spin text-cosmic-latte' />
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value='preferences' className='p-6 space-y-8'>
      {/* Last.fm Integration */}
      <div className='space-y-4'>
        <div>
          <h3 className='text-xl font-semibold text-white'>
            Last.fm Integration
          </h3>
          <p className='text-zinc-400 text-sm mt-1'>
            Connect your Last.fm account to import listening history and display
            stats on your profile
          </p>
        </div>

        {isConnected ? (
          <>
            {/* Connected state */}
            <div className='bg-zinc-800/50 border border-zinc-700 rounded-lg p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 rounded-full bg-[#D51007] flex items-center justify-center'>
                    <span className='text-white text-xs font-bold'>fm</span>
                  </div>
                  <div>
                    <p className='text-white font-medium'>
                      Connected as{' '}
                      <a
                        href={`https://www.last.fm/user/${connectedUsername}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-cosmic-latte hover:underline inline-flex items-center gap-1'
                      >
                        {connectedUsername}
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </p>
                    {data?.mySettings?.lastfmConnectedAt && (
                      <p className='text-xs text-zinc-500'>
                        Connected{' '}
                        {new Date(
                          data.mySettings.lastfmConnectedAt
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type='button'
                  onClick={handleDisconnect}
                  disabled={disconnectLastfm.isPending}
                  className='text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50'
                >
                  {disconnectLastfm.isPending
                    ? 'Disconnecting...'
                    : 'Disconnect'}
                </button>
              </div>
            </div>

            {/* Toggles */}
            <ToggleRow
              title='Show listening stats on profile'
              description='Display your top artists and scrobble counts on your public profile'
              checked={showLastfmStats}
              onChange={v => handleToggle('showLastfmStats', v)}
              disabled={updateSettings.isPending}
            />

            <ToggleRow
              title='Keep listening data synced'
              description='Automatically sync your Last.fm data periodically'
              checked={lastfmSyncEnabled}
              onChange={v => handleToggle('lastfmSyncEnabled', v)}
              disabled={updateSettings.isPending}
            />

            {/* Refresh button */}
            <div className='flex items-center justify-between py-3 border-b border-zinc-800'>
              <div>
                <h4 className='font-medium text-white'>Refresh data</h4>
                <p className='text-sm text-zinc-400'>
                  Manually sync your latest listening data
                </p>
              </div>
              <button
                type='button'
                onClick={handleSync}
                disabled={triggerSync.isPending}
                className='flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors disabled:opacity-50'
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${triggerSync.isPending ? 'animate-spin' : ''}`}
                />
                {triggerSync.isPending ? 'Syncing...' : 'Refresh Now'}
              </button>
            </div>

            {/* Import Albums */}
            <div className='flex items-center justify-between py-3 border-b border-zinc-800'>
              <div>
                <h4 className='font-medium text-white'>Import albums</h4>
                <p className='text-sm text-zinc-400'>
                  Add your most-played Last.fm albums to your collection
                </p>
              </div>
              <button
                type='button'
                onClick={() => setShowImportDialog(true)}
                className='flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors'
              >
                <Download className='w-3.5 h-3.5' />
                Import Albums
              </button>
            </div>

            <AlbumImportDialog
              open={showImportDialog}
              onOpenChange={setShowImportDialog}
              onComplete={() => {
                queryClient.invalidateQueries({
                  queryKey: ['GetMyCollections'],
                });
              }}
            />
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div className='space-y-3'>
              <label className='block text-sm font-medium text-zinc-300'>
                Last.fm username
              </label>
              <div className='flex gap-3'>
                <input
                  type='text'
                  placeholder='Enter your Last.fm username'
                  value={lastfmInput}
                  onChange={e => {
                    setLastfmInput(e.target.value);
                    setConnectError('');
                    setPreview(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleConnect();
                  }}
                  className='flex-1 px-4 h-11 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cosmic-latte/50 focus:border-transparent text-sm'
                />
                <button
                  type='button'
                  onClick={handleConnect}
                  disabled={!lastfmInput.trim() || connectLastfm.isPending}
                  className='px-5 h-11 bg-cosmic-latte text-black font-medium rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm'
                >
                  {connectLastfm.isPending ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>

              {connectError && (
                <p className='text-sm text-red-400'>{connectError}</p>
              )}
            </div>

            {/* Preview card */}
            {preview && (
              <div className='bg-zinc-800/50 border border-green-700/30 rounded-lg p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-zinc-700' />
                    <div>
                      <p className='text-white font-semibold'>
                        {preview.username}
                      </p>
                      <p className='text-sm text-zinc-400'>
                        {preview.totalPlaycount?.toLocaleString() ?? 0}{' '}
                        scrobbles
                        {preview.registeredAt &&
                          ` · Member since ${new Date(preview.registeredAt).getFullYear()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={handleConfirm}
                    disabled={confirmConnection.isPending}
                    className='px-4 py-2 bg-cosmic-latte text-black font-medium rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 transition-colors text-sm'
                  >
                    {confirmConnection.isPending ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Taste Profile */}
      <div className='space-y-4'>
        <div>
          <h3 className='text-xl font-semibold text-white'>Taste Profile</h3>
          <p className='text-zinc-400 text-sm mt-1'>
            Pick your favorite artists to help us match you with like-minded
            listeners
          </p>
        </div>

        <ToggleRow
          title='Show taste profile on your profile'
          description='Let others see your favorite artists'
          checked={showTasteProfile}
          onChange={handleTasteToggle}
          disabled={updateSettings.isPending}
        />

        {isConnected && lastfmArtistsWithIds.length > 0 && (
          <div className='bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between'>
            <div>
              <h4 className='font-medium text-white text-sm'>
                Populate from Last.fm
              </h4>
              <p className='text-xs text-zinc-400 mt-0.5'>
                Use your top {Math.min(lastfmArtistsWithIds.length, 5)} Last.fm
                artists as your taste profile
              </p>
            </div>
            <button
              type='button'
              onClick={handlePopulateFromLastfm}
              className='flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors'
            >
              <Download className='w-3.5 h-3.5' />
              Populate
            </button>
          </div>
        )}

        <ArtistPicker
          preSelectedArtists={tasteArtists}
          onSelectionChange={artists => {
            setTasteArtists(artists);
            setTasteDirty(true);
          }}
        />

        {tasteDirty && tasteArtists.length > 0 && (
          <button
            type='button'
            onClick={handleTasteSave}
            disabled={setTasteProfile.isPending}
            className='px-6 py-2.5 bg-cosmic-latte text-black font-semibold rounded-lg hover:bg-cosmic-latte/90 disabled:opacity-50 transition-colors text-sm'
          >
            {setTasteProfile.isPending ? (
              <Loader2 className='w-4 h-4 animate-spin inline mr-2' />
            ) : null}
            Save Taste Profile
          </button>
        )}
      </div>
    </TabsContent>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className='flex items-center justify-between py-3 border-b border-zinc-800'>
      <div className='flex-1'>
        <h4
          className={`font-medium ${disabled ? 'text-zinc-500' : 'text-white'}`}
        >
          {title}
        </h4>
        <p className='text-sm text-zinc-400'>{description}</p>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cosmic-latte focus:ring-offset-2 focus:ring-offset-zinc-900
          ${checked ? 'bg-emeraled-green' : 'bg-zinc-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
