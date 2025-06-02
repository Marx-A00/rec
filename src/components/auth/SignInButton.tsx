import Link from 'next/link';

export default function SignInButton() {
  return (
    <Link href='/auth/signin'>
      <button
        type='button'
        className='w-full text-white bg-blue-600 hover:bg-blue-700 text-xs font-medium py-2 px-3 rounded-md'
      >
        Sign In
      </button>
    </Link>
  );
}
