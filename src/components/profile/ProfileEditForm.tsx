'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { validateNameForProfile } from '@/lib/validations';

interface ProfileEditFormProps {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
  };
  onCancel: () => void;
  onSave: (updatedUser: { name: string; bio: string }) => void;
}

export default function ProfileEditForm({
  user,
  onCancel,
  onSave,
}: ProfileEditFormProps) {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const router = useRouter();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Validate name
    const validation = validateNameForProfile(value);
    setNameError(validation.isValid ? null : validation.message || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate before submitting
    const nameValidation = validateNameForProfile(name);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.message || 'Invalid name');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      const updatedUser = result.data?.user || result;
      onSave({ name: updatedUser.name || '', bio: updatedUser.bio || '' });
      router.refresh(); // Refresh to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4'>
      <div className='bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-700'>
        <h2 className='text-2xl font-bold mb-6 text-cosmic-latte'>
          Edit Profile
        </h2>

        {error && (
          <div className='mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='name'
              className='block text-sm font-medium text-zinc-300 mb-2'
            >
              Display Name
            </label>
            <input
              type='text'
              id='name'
              value={name}
              onChange={handleNameChange}
              maxLength={30}
              className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                nameError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-600 focus:ring-emeraled-green'
              }`}
              placeholder='Enter your display name'
              aria-invalid={nameError ? 'true' : 'false'}
              aria-describedby={nameError ? 'name-error' : undefined}
              required
            />
            {nameError ? (
              <p id='name-error' className='text-xs text-red-400 mt-1'>
                {nameError}
              </p>
            ) : (
              <p className='text-xs text-zinc-500 mt-1'>
                {name.length}/30 characters
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='bio'
              className='block text-sm font-medium text-zinc-300 mb-2'
            >
              Bio
            </label>
            <textarea
              id='bio'
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              className='w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emeraled-green focus:border-transparent resize-none'
              placeholder='Tell others about yourself and your music taste...'
            />
            <p className='text-xs text-zinc-500 mt-1'>
              {bio.length}/500 characters
            </p>
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={isLoading || !!nameError || name.trim().length === 0}
              className='flex-1 bg-emeraled-green text-black py-2 px-4 rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type='button'
              onClick={onCancel}
              disabled={isLoading}
              className='flex-1 bg-zinc-700 text-white py-2 px-4 rounded-lg font-medium hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
