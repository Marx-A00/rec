import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ArtistNotFound() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        <Link
          href='/'
          className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Search
        </Link>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Artist Not Found
          </h1>
          <p className='text-zinc-400'>
            The requested artist could not be found.
          </p>
        </div>
      </div>
    </div>
  );
}
