import { signIn } from '@/../auth';

export default function SignInButton() {
  return (
    <form action={async () => {
      'use server';
      await signIn('google');
    }}>
      <button
        type="submit"
        className="w-full text-white bg-red-500 hover:bg-red-600 text-xs font-medium py-2 px-3 rounded-md"
      >
        Sign In with Google
      </button>
    </form>
  );
} 