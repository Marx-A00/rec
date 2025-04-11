import { signOut } from '@/../auth';

export default function SignOutButton() {
  return (
    <form action={async () => {
      'use server';
      await signOut();
    }}>
      <button
        type="submit"
        className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg"
      >
        Sign Out
      </button>
    </form>
  );
} 