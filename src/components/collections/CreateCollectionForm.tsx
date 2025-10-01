'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useCreateCollectionMutation,
  useGetUserCollectionListQuery,
} from '@/generated/graphql';

interface CreateCollectionFormData {
  name: string;
  description: string;
  isPublic: boolean;
}

export default function CreateCollectionForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateCollectionFormData>({
    name: '',
    description: '',
    isPublic: false,
  });
  const [errors, setErrors] = useState<Partial<CreateCollectionFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateCollectionFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Collection name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Collection name must be 100 characters or less';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useCreateCollectionMutation({
    onSuccess: data => {
      const collection = data.createCollection;
      showToast('Collection created successfully!', 'success');
      router.push(`/collections/${collection.id}`);
    },
    onError: error => {
      console.error('Error creating collection:', error);
      const message =
        (error as Error)?.message || 'Failed to create collection';
      showToast(message, 'error');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isPublic: formData.isPublic,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateCollectionFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* Collection Name */}
      <div>
        <label className='block text-sm font-medium text-white mb-2'>
          Collection Name *
        </label>
        <input
          type='text'
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          placeholder='My Favorite Albums'
          className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-zinc-600'
          }`}
          maxLength={100}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className='text-red-400 text-sm mt-1'>{errors.name}</p>
        )}
        <p className='text-zinc-500 text-xs mt-1'>
          {formData.name.length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label className='block text-sm font-medium text-white mb-2'>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => handleInputChange('description', e.target.value)}
          placeholder='A collection of my all-time favorite albums...'
          rows={4}
          className={`w-full px-4 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
            errors.description ? 'border-red-500' : 'border-zinc-600'
          }`}
          maxLength={500}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className='text-red-400 text-sm mt-1'>{errors.description}</p>
        )}
        <p className='text-zinc-500 text-xs mt-1'>
          {formData.description.length}/500 characters
        </p>
      </div>

      {/* Privacy Setting */}
      <div>
        <label className='flex items-center space-x-3'>
          <input
            type='checkbox'
            checked={formData.isPublic}
            onChange={e => handleInputChange('isPublic', e.target.checked)}
            className='w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500 focus:ring-2'
            disabled={isSubmitting}
          />
          <div>
            <span className='text-white font-medium'>
              Make this collection public
            </span>
            <p className='text-zinc-400 text-sm'>
              Other users will be able to discover and view this collection
            </p>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <div className='flex gap-4 pt-4'>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.back()}
          disabled={isSubmitting}
          className='flex-1'
        >
          Cancel
        </Button>
        <Button
          type='submit'
          disabled={isSubmitting || !formData.name.trim()}
          className='flex-1 flex items-center justify-center gap-2'
        >
          {isSubmitting ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Save className='h-4 w-4' />
          )}
          {isSubmitting ? 'Creating...' : 'Create Collection'}
        </Button>
      </div>
    </form>
  );
}
