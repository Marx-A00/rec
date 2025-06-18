export default function Loading() {
  return (
    <div className='min-h-screen bg-black text-white flex items-center justify-center'>
      <div className='flex flex-col items-center space-y-4'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-red-500'></div>
        <p className='text-zinc-400 text-lg'>Loading...</p>
      </div>
    </div>
  );
}
