import { Mail, Github, MessageCircle } from 'lucide-react';

import BackButton from '@/components/ui/BackButton';

export default function ContactPage() {
  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <BackButton />
        <div>
          <h1 className='text-3xl font-bold text-white'>Contact</h1>
          <p className='text-zinc-400 mt-2'>Get in touch with the rec team</p>
        </div>
      </div>

      {/* Contact Options */}
      <div className='space-y-4'>
        <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
          <div className='flex items-start gap-4'>
            <div className='mt-0.5'>
              <Mail className='w-5 h-5 text-cosmic-latte' />
            </div>
            <div>
              <h3 className='text-lg font-medium text-white mb-2'>Email</h3>
              <p className='text-zinc-400 mb-3'>
                For general questions, feedback, or support.
              </p>
              <a
                href='mailto:support@recsmusic.com'
                className='text-cosmic-latte hover:underline'
              >
                support@recsmusic.com
              </a>
            </div>
          </div>
        </div>

        <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
          <div className='flex items-start gap-4'>
            <div className='mt-0.5'>
              <Github className='w-5 h-5 text-cosmic-latte' />
            </div>
            <div>
              <h3 className='text-lg font-medium text-white mb-2'>GitHub</h3>
              <p className='text-zinc-400 mb-3'>
                Found a bug or have a feature request? Open an issue on GitHub.
              </p>
              <a
                href='https://github.com/Marx-A00/rec'
                target='_blank'
                rel='noopener noreferrer'
                className='text-cosmic-latte hover:underline'
              >
                github.com/Marx-A00/rec
              </a>
            </div>
          </div>
        </div>

        <div className='bg-zinc-900 border border-zinc-700 rounded-lg p-6'>
          <div className='flex items-start gap-4'>
            <div className='mt-0.5'>
              <MessageCircle className='w-5 h-5 text-cosmic-latte' />
            </div>
            <div>
              <h3 className='text-lg font-medium text-white mb-2'>Feedback</h3>
              <p className='text-zinc-400'>
                We are always looking to improve rec. If you have suggestions or
                feedback about the platform, we would love to hear from you.
                Drop us an email or open a discussion on GitHub.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
