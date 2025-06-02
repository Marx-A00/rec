import { signOut } from '@/../auth';

export default function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button
        type='submit'
        className='w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 px-3 rounded-md font-normal'
      >
        Sign Out
      </button>
    </form>
  );
}
