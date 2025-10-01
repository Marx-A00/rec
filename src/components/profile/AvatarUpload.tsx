'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Camera } from 'lucide-react';

import { getImageUrl } from '@/lib/cloudflare-images';

interface AvatarUploadProps {
  currentImage?: string | null;
  onUploadSuccess?: (url: string) => void;
}

export default function AvatarUpload({
  currentImage,
  onUploadSuccess,
}: AvatarUploadProps) {
  const { data: session, update } = useSession();
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImage);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const newImageUrl = getImageUrl(data.id, { width: 200, height: 200 });
        setImageUrl(newImageUrl);

        // Update session
        await update({
          ...session,
          user: { ...session?.user, image: newImageUrl },
        });

        onUploadSuccess?.(newImageUrl);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='relative group'>
      <div className='w-32 h-32 rounded-full overflow-hidden bg-zinc-800'>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt='Profile'
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-zinc-600'>
            <Camera size={32} />
          </div>
        )}
      </div>

      <label className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer'>
        <input
          type='file'
          accept='image/*'
          onChange={handleFileUpload}
          disabled={uploading}
          className='hidden'
        />
        <Camera className='text-white' size={24} />
      </label>

      {uploading && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
        </div>
      )}
    </div>
  );
}
