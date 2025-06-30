import Link from 'next/link';

export default function SignInButton() {
  return (
    <Link href='/signin'>
      <button
        type='button'
        className='w-full text-white bg-red-600 hover:bg-red-700 text-xs font-normal py-1.5 px-3 rounded-md'
      >
        Sign In
      </button>
    </Link>
  );
}
