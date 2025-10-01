'use client';

import { useState } from 'react';

import { getImageUrl } from '@/lib/cloudflare-images';

export default function ImageUploadTest() {
  const [uploading, setUploading] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'test');

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImageId(data.id);
        console.log('Upload successful!', data);
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='p-4 bg-zinc-900 rounded-lg'>
      <h2 className='text-xl font-bold mb-4 text-cosmic-latte'>
        Image Upload Test
      </h2>

      <input
        type='file'
        accept='image/*'
        onChange={handleFileUpload}
        disabled={uploading}
        className='mb-4'
      />

      {uploading && <p className='text-emeraled-green'>Uploading...</p>}

      {imageId && (
        <div className='mt-4 space-y-4'>
          <p className='text-cosmic-latte'>Image uploaded! ID: {imageId}</p>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-sm text-zinc-400'>Thumbnail (150x150)</p>
              <img
                src={getImageUrl(imageId, { width: 150, height: 150 })}
                alt='Thumbnail'
                className='rounded'
              />
            </div>

            <div>
              <p className='text-sm text-zinc-400'>Medium (400x400)</p>
              <img
                src={getImageUrl(imageId, { width: 400, height: 400 })}
                alt='Medium'
                className='rounded'
              />
            </div>
          </div>

          <div>
            <p className='text-sm text-zinc-400'>With blur effect</p>
            <img
              src={getImageUrl(imageId, { width: 400, height: 400, blur: 20 })}
              alt='Blurred'
              className='rounded'
            />
          </div>
        </div>
      )}
    </div>
  );
}
