'use client';

import { useState, useCallback, useRef } from 'react';
import { Camera, X } from 'lucide-react';

import ImageCropperSheet from '@/components/mobile/ImageCropperSheet';

interface AvatarUploadProps {
  currentImage?: string | null;
  onImageSelect?: (blob: Blob) => void;
  onImageClear?: () => void;
  /** 'sm' = 80px, default = 128px */
  size?: 'sm' | 'default';
}

export default function AvatarUpload({
  currentImage,
  onImageSelect,
  onImageClear,
  size = 'default',
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The displayed image: local preview takes priority, then current image (unless cleared)
  const displayImage = previewUrl ?? (cleared ? null : currentImage);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setCropperOpen(false);

      // Revoke the raw image object URL
      if (rawImageSrc) {
        URL.revokeObjectURL(rawImageSrc);
        setRawImageSrc(null);
      }

      // Create a local preview URL for the cropped image
      const preview = URL.createObjectURL(blob);
      setPreviewUrl(preview);
      setCleared(false);

      onImageSelect?.(blob);
    },
    [rawImageSrc, onImageSelect]
  );

  const handleCropCancel = useCallback(() => {
    setCropperOpen(false);
    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
    }
  }, [rawImageSrc]);

  const handleClear = () => {
    // Revoke preview URL if we had one
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCleared(true);
    onImageClear?.();
  };

  const isSmall = size === 'sm';

  return (
    <>
      <div className='relative group'>
        <div
          className={`${isSmall ? 'w-20 h-20' : 'w-32 h-32'} rounded-full overflow-hidden bg-zinc-800`}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt='Profile'
              className='w-full h-full object-cover'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-zinc-600'>
              <Camera size={isSmall ? 24 : 32} />
            </div>
          )}
        </div>

        <label className='absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer'>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Camera className='text-white' size={isSmall ? 18 : 24} />
        </label>

        {/* Clear button - only show when there's an image displayed */}
        {displayImage && (
          <button
            type='button'
            onClick={handleClear}
            className={`absolute -top-1 -right-1 ${isSmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-zinc-700 hover:bg-red-600 flex items-center justify-center transition-colors border-2 border-black`}
            title='Remove profile picture'
          >
            <X className='text-white' size={isSmall ? 10 : 14} />
          </button>
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
