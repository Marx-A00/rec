'use client';

import { TabsContent } from '@/components/ui/tabs';

interface PreferencesData {
  profileVisibility: string;
  followersVisible: boolean;
  collectionsVisible: boolean;
  recommendationsVisible: boolean;
  allowFollows: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface PreferencesTabProps {
  preferences: PreferencesData;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesData>>;
  isLoading: boolean;
  onSave: () => Promise<void>;
}

export default function PreferencesTab({
  preferences: _preferences,
  setPreferences: _setPreferences,
  isLoading: _isLoading,
  onSave: _onSave,
}: PreferencesTabProps) {
  return (
    <TabsContent value='preferences' className='p-6 space-y-6'>
      <div className='space-y-6'>
        <h3 className='text-xl font-semibold text-white'>Preferences</h3>

        {/* Coming Soon Notice */}
        <div className='bg-blue-900/20 border border-blue-700 rounded-lg p-4'>
          <h4 className='text-blue-400 font-medium mb-2'>Coming Soon</h4>
          <p className='text-zinc-400 text-sm'>
            Profile visibility, notification preferences, and privacy controls
            are currently in development. Check back soon for these features!
          </p>
        </div>

        {/*
        TODO: Implement privacy enforcement
        These settings save to the database but are not currently enforced:
        - profileVisibility: "public" | "followers" | "private"
        - emailNotifications: boolean
        - pushNotifications: boolean
        - showCollections: boolean
        - showRecommendations: boolean
        - allowFollows: boolean
        */}
      </div>
    </TabsContent>
  );
}
