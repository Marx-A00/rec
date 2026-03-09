import { Metadata } from 'next';

import { HomePreview } from '@/components/uncover/HomePreview';

export const metadata: Metadata = {
  title: 'Home Preview | Uncover',
  description: 'Preview different home page styles for the Uncover game',
};

/**
 * Preview route for iterating on game home page styles.
 * Does NOT affect the live /game/play page.
 * Path: /game/home-preview
 */
export default function HomePreviewPage() {
  return <HomePreview />;
}
