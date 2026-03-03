'use client';

import { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, X } from 'lucide-react';

import { getImageUrl } from '@/lib/cloudflare-images';
import ImageCropperSheet from '@/components/mobile/ImageCropperSheet';

interface AvatarUploadProps {
  currentImage?: string | null;
  onUploadSuccess?: (url: string) => void;
  onClear?: () => void;
}

export default function AvatarUpload({
  currentImage,
  onUploadSuccess,
  onClear,
}: AvatarUploadProps) {
  const { data: session, update } = useSession();
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImage);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for the cropper preview
    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setCropperOpen(true);

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      // Close the cropper
      setCropperOpen(false);

      // Revoke the object URL
      if (rawImageSrc) {
        URL.revokeObjectURL(rawImageSrc);
        setRawImageSrc(null);
      }

      // Upload the cropped blob
      setUploading(true);
      try {
        const croppedFile = new File([blob], 'avatar.jpg', {
          type: 'image/jpeg',
        });

        const formData = new FormData();
        formData.append('file', croppedFile);
        formData.append('type', 'avatar');

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          const newImageUrl = getImageUrl(data.id, {
            width: 200,
            height: 200,
          });
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
    },
    [rawImageSrc, session, update, onUploadSuccess]
  );

  const handleCropCancel = useCallback(() => {
    setCropperOpen(false);
    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
    }
  }, [rawImageSrc]);

  const handleClear = async () => {
    if (!session?.user?.id) return;

    setClearing(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: null }),
      });

      if (response.ok) {
        setImageUrl(null);

        await update({
          ...session,
          user: { ...session?.user, image: null },
        });

        onClear?.();
      }
    } catch (error) {
      console.error('Clear avatar error:', error);
    } finally {
      setClearing(false);
    }
  };

  const isBusy = uploading || clearing;

  return (
    <>
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
            ref={fileInputRef}
            type='file'
            accept='image/*'
            onChange={handleFileSelect}
            disabled={isBusy}
            className='hidden'
          />
          <Camera className='text-white' size={24} />
        </label>

        {/* Clear button - only show when there's an image */}
        {imageUrl && !isBusy && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute -top-1 -right-1 w-8 h-8 rounded-full bg-zinc-700 hover:bg-red-600 flex items-center justify-center transition-colors border-2 border-black'
            title='Remove profile picture'
          >
            <X className='text-white' size={14} />
          </button>
        )}

        {isBusy && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
          </div>
        )}
      </div>

      {/* Image Cropper Sheet */}
      {rawImageSrc && (
        <ImageCropperSheet
          imageSrc={rawImageSrc}
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
