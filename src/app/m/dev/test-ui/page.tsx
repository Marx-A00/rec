import { Metadata } from 'next';

import { TestUIClient } from './TestUIClient';

export const metadata: Metadata = {
  title: 'Dev | UI Test',
  description: 'Test mobile button styles and variants',
};

export default function TestUIPage() {
  return <TestUIClient />;
}
