'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';
import { useToast } from '@/components/ui/toast';
import { useAddToCollectionMutation } from '@/hooks';

interface AddToCollectionButtonProps {
  album: Album;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export default function AddToCollectionButton({
  album,
  size = 'sm',
  variant = 'outline',
}: AddToCollectionButtonProps) {
  const { showToast } = useToast();

  const addToCollectionMutation = useAddToCollectionMutation({
    onSuccess: message => showToast(message, 'success'),
    onError: message => showToast(message, 'error'),
  });

  const handleAddToCollection = () => {
    addToCollectionMutation.mutate(album);
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleAddToCollection}
      disabled={addToCollectionMutation.isPending}
      className='flex items-center gap-1'
    >
      <Plus className='h-4 w-4' />
      {addToCollectionMutation.isPending ? 'Adding...' : 'Add to Collection'}
    </Button>
  );
}
