export default function AuthLoading() {
  return (
    <div className='min-h-screen bg-black flex items-center justify-center'>
      <div className='w-full max-w-md px-6 py-8'>
        <div className='bg-zinc-900 rounded-lg p-8'>
          <div className='flex flex-col items-center space-y-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-500'></div>
            <p className='text-zinc-400'>Loading authentication...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
