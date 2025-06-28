'use client';

import { Plus, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';
import { useCollectionToastContext } from '@/components/ui/CollectionToastProvider';
import { useAddToCollectionMutation, useUserCollectionStatus } from '@/hooks';

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
  const { showCollectionToast } = useCollectionToastContext();
  const router = useRouter();
  const { data: session } = useSession();
  const { isInCollection, isLoading: statusLoading } = useUserCollectionStatus(
    album.id
  );

  const addToCollectionMutation = useAddToCollectionMutation({
    onSuccess: message => {
      showCollectionToast(message, 'success', {
        showNavigation: true,
        navigationLabel: 'View My Collection',
        navigationUrl: '/profile',
      });
    },
    onError: message => showCollectionToast(message, 'error'),
  });

  const handleAddToCollection = () => {
    // Check if user is authenticated
    if (!session?.user) {
      showCollectionToast(
        'Please sign in to add albums to your collection',
        'error',
        {
          showNavigation: true,
          navigationLabel: 'Sign In',
          navigationUrl: '/signin',
        }
      );
      return;
    }

    if (isInCollection) {
      // Navigate to profile to view collection
      router.push('/profile');
      return;
    }
    addToCollectionMutation.mutate(album);
  };

  // Determine button state
  const isAdding = addToCollectionMutation.isPending;
  const isCheckingStatus = statusLoading && !!session?.user; // Only show checking for authenticated users
  const isDisabled = isAdding || isCheckingStatus;

  // Button text and icon based on state
  const getButtonContent = () => {
    if (isCheckingStatus) {
      return {
        icon: <Loader2 className='h-4 w-4 animate-spin' />,
        text: 'Checking...',
      };
    }

    if (isAdding) {
      return {
        icon: <Loader2 className='h-4 w-4 animate-spin' />,
        text: 'Adding...',
      };
    }

    if (isInCollection && session?.user) {
      return {
        icon: <Check className='h-4 w-4' />,
        text: 'In Collection',
      };
    }

    return {
      icon: <Plus className='h-4 w-4' />,
      text: 'Add to Collection',
    };
  };

  // Button variant based on state
  const getButtonVariant = () => {
    if (isInCollection && session?.user) {
      return 'success';
    }
    return variant;
  };

  const { icon, text } = getButtonContent();

  return (
    <Button
      size={size}
      variant={getButtonVariant()}
      onClick={handleAddToCollection}
      disabled={isDisabled}
      className='flex items-center gap-2'
      aria-label={
        !session?.user
          ? 'Sign in to add album to collection'
          : isInCollection
            ? 'View collection in profile'
            : 'Add album to collection'
      }
    >
      {icon}
      {text}
    </Button>
  );
}
