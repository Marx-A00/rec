import { signIn } from '@/../auth';

export default function SignInButton() {
  return (
    <form action={async () => {
      'use server';
      await signIn('google');
    }}>
      <button
        type="submit"
        className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg"
      >
        Sign In with Google
      </button>
    </form>
  );
} 