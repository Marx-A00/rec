import type { Area } from 'react-easy-crop';

const MAX_OUTPUT_SIZE = 800;

/**
 * Creates a cropped image blob from a source image and crop area.
 * Output is capped at 800x800 and exported as JPEG for avatar use.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Cap output size to keep file size reasonable for avatars
  const outputSize = Math.min(
    pixelCrop.width,
    pixelCrop.height,
    MAX_OUTPUT_SIZE
  );
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}
