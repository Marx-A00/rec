import { CheckCircle } from 'lucide-react';

export function AppliedSuccessState() {
  return (
    <div className='flex flex-col items-center justify-center h-[300px]'>
      <CheckCircle className='h-16 w-16 text-green-400 mb-4' />
      <p className='text-2xl font-semibold text-green-400'>Applied!</p>
    </div>
  );
}
