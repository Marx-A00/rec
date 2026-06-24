import { Mail, Github, MessageCircle } from 'lucide-react';

export default function MobileContactPage() {
  return (
    <div className='px-4 py-6 space-y-4'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Contact</h1>
        <p className='text-zinc-400 mt-1 text-sm'>
          Get in touch with the rec team
        </p>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-start gap-3'>
          <Mail className='w-5 h-5 text-emerald-400 mt-0.5 shrink-0' />
          <div>
            <h3 className='text-base font-medium text-white mb-1'>Email</h3>
            <p className='text-zinc-400 text-sm mb-2'>
              For general questions, feedback, or support.
            </p>
            <a
              href='mailto:support@recsmusic.com'
              className='text-emerald-400 text-sm'
            >
              support@recsmusic.com
            </a>
          </div>
        </div>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-start gap-3'>
          <Github className='w-5 h-5 text-emerald-400 mt-0.5 shrink-0' />
          <div>
            <h3 className='text-base font-medium text-white mb-1'>GitHub</h3>
            <p className='text-zinc-400 text-sm mb-2'>
              Found a bug or have a feature request? Open an issue on GitHub.
            </p>
            <a
              href='https://github.com/Marx-A00/rec'
              target='_blank'
              rel='noopener noreferrer'
              className='text-emerald-400 text-sm'
            >
              github.com/Marx-A00/rec
            </a>
          </div>
        </div>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-start gap-3'>
          <MessageCircle className='w-5 h-5 text-emerald-400 mt-0.5 shrink-0' />
          <div>
            <h3 className='text-base font-medium text-white mb-1'>Feedback</h3>
            <p className='text-zinc-400 text-sm'>
              We are always looking to improve rec. If you have suggestions or
              feedback about the platform, we would love to hear from you. Drop
              us an email or open a discussion on GitHub.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
