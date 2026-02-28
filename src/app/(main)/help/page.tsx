import {
  HelpCircle,
  Search,
  Disc3,
  Users,
  Library,
  Star,
  MessageCircle,
} from 'lucide-react';

import BackButton from '@/components/ui/BackButton';

const sections = [
  {
    icon: Search,
    title: 'Searching for Music',
    description:
      'Use the search bar at the top of any page to find albums, artists, tracks, or other users. Results are grouped by type so you can quickly find what you need.',
  },
  {
    icon: Star,
    title: 'Creating Recommendations',
    description:
      'Click "Recommend" in the sidebar to create a recommendation. Pick a basis album (what you like) and a recommended album (what you suggest), then rate their similarity. Your recommendations help others discover great music.',
  },
  {
    icon: Library,
    title: 'Building Collections',
    description:
      'Organize albums into collections from any album page using the "Add to Collection" button. Create themed collections, mark albums as "Listen Later", and share your collections with others.',
  },
  {
    icon: Disc3,
    title: 'Exploring Albums & Artists',
    description:
      'Browse album details including tracklists, recommendations, and related artists. Artist pages show full discographies, biographies, and all recommendations involving their albums.',
  },
  {
    icon: Users,
    title: 'Social Features',
    description:
      'Follow other users to see their activity in your feed. Visit user profiles to explore their recommendations, collections, and music taste. Your followers can see your public activity too.',
  },
  {
    icon: MessageCircle,
    title: 'Need More Help?',
    description:
      'If you have questions or run into any issues, visit the Contact page to get in touch with us. We are happy to help.',
  },
];

export default function HelpPage() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <BackButton />
        <div>
          <h1 className='text-3xl font-bold text-white'>Help</h1>
          <p className='text-zinc-400 mt-2'>
            Learn how to get the most out of rec
          </p>
        </div>
      </div>

      {/* Getting Started */}
      <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <HelpCircle className='w-6 h-6 text-cosmic-latte' />
          <h2 className='text-xl font-semibold text-white'>Getting Started</h2>
        </div>
        <p className='text-zinc-300 leading-relaxed'>
          rec is a platform for sharing and discovering music recommendations.
          Search for albums, create recommendations, build collections, and
          connect with other music lovers. Here is a quick guide to the main
          features.
        </p>
      </div>

      {/* Feature Sections */}
      <div className='space-y-4'>
        {sections.map(section => (
          <div
            key={section.title}
            className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'
          >
            <div className='flex items-start gap-4'>
              <div className='mt-0.5'>
                <section.icon className='w-5 h-5 text-cosmic-latte' />
              </div>
              <div>
                <h3 className='text-lg font-medium text-white mb-2'>
                  {section.title}
                </h3>
                <p className='text-zinc-400 leading-relaxed'>
                  {section.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
