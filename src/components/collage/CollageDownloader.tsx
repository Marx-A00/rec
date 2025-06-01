'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Album } from '@/types/album';

interface CollageDownloaderProps {
  selectedAlbums: (Album | null)[];
  disabled: boolean;
}

export default function CollageDownloader({ selectedAlbums, disabled }: CollageDownloaderProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownload = async () => {
    if (disabled) return;

    setIsGenerating(true);
    
    try {
      // Import html2canvas dynamically to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      const gridElement = document.getElementById('collage-grid');
      if (!gridElement) {
        throw new Error('Grid element not found');
      }

      // Generate canvas with high quality settings
      const canvas = await html2canvas(gridElement, {
        width: 1500,  // High resolution
        height: 1500,
        scale: 3,     // 3x scale for crisp images
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        imageTimeout: 15000,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to generate image');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `album-collage-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('Error generating collage:', error);
      alert('Failed to generate collage. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateAndDownload}
      disabled={disabled || isGenerating}
      className="bg-emeraled-green text-black hover:bg-emeraled-green/90 font-semibold"
    >
      {isGenerating ? 'Generating...' : 'Download Collage'}
    </Button>
  );
} 