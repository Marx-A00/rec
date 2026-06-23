import Link from 'next/link';

interface ContentRowProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  seeAllHref?: string;
}

export function ContentRow({
  title,
  subtitle,
  icon,
  children,
  seeAllHref,
}: ContentRowProps) {
  return (
    <section className='space-y-6'>
      {/* Header */}
      <div className='px-4 md:px-8 lg:px-12'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div className='text-cosmic-latte p-3 bg-cosmic-latte/10 rounded-xl border border-cosmic-latte/20'>
              {icon}
            </div>
            <div>
              <h2 className='text-3xl font-semibold text-white'>{title}</h2>
              <p className='text-lg text-zinc-400 mt-2 leading-relaxed'>
                {subtitle}
              </p>
            </div>
          </div>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className='text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group'
            >
              See all
              <svg
                className='w-4 h-4 group-hover:translate-x-0.5 transition-transform'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </Link>
          )}
        </div>
      </div>
      {/* Children - full width, left-aligned with header */}
      <div className='pl-4 md:pl-8 lg:pl-12'>
        {children}
      </div>
    </section>
  );
}
