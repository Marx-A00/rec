import { redirect } from 'next/navigation';

import UncoverVisionClient from './UncoverVisionClient';

export default function UncoverVisionPage() {
  // Guard: dev only
  if (process.env.NODE_ENV !== 'development') {
    redirect('/');
  }

  return <UncoverVisionClient />;
}
