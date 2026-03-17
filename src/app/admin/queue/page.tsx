// src/app/admin/queue/page.tsx
'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QueueDashboard } from '@/components/admin/QueueDashboard';
import { JobHistoryPanel } from '@/components/admin/JobHistoryPanel';

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div className='p-8'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-white'>Queue</h1>
        <p className='text-zinc-400 mt-1'>
          Manage the job queue and view processing history
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='bg-zinc-900 border border-zinc-800'>
          <TabsTrigger value='queue'>Queue</TabsTrigger>
          <TabsTrigger value='history'>Job History</TabsTrigger>
        </TabsList>

        <TabsContent value='queue'>
          <QueueDashboard
            isActive={activeTab === 'queue'}
            onSwitchToHistory={() => setActiveTab('history')}
          />
        </TabsContent>

        <TabsContent value='history'>
          <JobHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
