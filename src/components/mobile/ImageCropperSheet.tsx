'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

import { getCroppedImg } from '@/lib/crop-image';

import {
  MobileBottomSheet,
  MobileBottomSheetContent,
  MobileBottomSheetHeader,
  MobileBottomSheetBody,
  MobileBottomSheetFooter,
} from './MobileBottomSheet';
import { MobileButton } from './MobileButton';

interface ImageCropperSheetProps {
  /** Object URL or data URL of the image to crop */
  imageSrc: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the cropped image blob when user confirms */
  onCropComplete: (blob: Blob) => void;
  /** Called when user cancels cropping */
  onCancel: () => void;
}

export default function ImageCropperSheet({
  imageSrc,
  open,
  onOpenChange,
  onCropComplete,
  onCancel,
}: ImageCropperSheetProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((newCrop: Point) => setCrop(newCrop), []);

  const onZoomChange = useCallback((newZoom: number) => setZoom(newZoom), []);

  const onCropAreaComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } catch (error) {
      console.error('Crop error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete]);

  const handleCancel = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onCancel();
  }, [onCancel]);

  return (
    <MobileBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isProcessing}
    >
      <MobileBottomSheetContent
        maxHeight='max-h-[85vh]'
        showHandle={!isProcessing}
      >
        <MobileBottomSheetHeader
          title='Crop Photo'
          description='Pinch to zoom, drag to reposition'
        />

        <MobileBottomSheetBody scrollable={false} className='px-0'>
          {/* data-vaul-no-drag prevents the drawer from intercepting touch events in the crop area */}
          <div
            className='relative w-full touch-none'
            style={{ height: '55vh' }}
            data-vaul-no-drag
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape='round'
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaComplete}
              minZoom={1}
              maxZoom={4}
              style={{
                containerStyle: {
                  background: '#000',
                },
                cropAreaStyle: {
                  border: '2px solid rgba(255, 255, 255, 0.6)',
                },
              }}
            />
          </div>
        </MobileBottomSheetBody>

        <MobileBottomSheetFooter className='flex gap-3'>
          <MobileButton
            variant='ghost'
            size='lg'
            className='flex-1'
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </MobileButton>
          <MobileButton
            variant='primary'
            size='lg'
            className='flex-1'
            onClick={handleCrop}
            loading={isProcessing}
            disabled={isProcessing || !croppedAreaPixels}
          >
            Crop
          </MobileButton>
        </MobileBottomSheetFooter>
      </MobileBottomSheetContent>
    </MobileBottomSheet>
  );
}
