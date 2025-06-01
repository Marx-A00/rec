import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateRecommendationRequest } from "@/types/recommendation";
import { Album } from "@/types/album";
import { useState } from "react";

async function createRecommendation(data: CreateRecommendationRequest) {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create recommendation');
  }
  
  return response.json();
}

interface CreateRecommendationFormProps {
  basisAlbum: Album | null;
  recommendedAlbum: Album | null;
  onSuccess?: () => void;
}

export default function CreateRecommendationForm({ 
  basisAlbum, 
  recommendedAlbum, 
  onSuccess 
}: CreateRecommendationFormProps) {
  const [score, setScore] = useState(7);
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: createRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!basisAlbum || !recommendedAlbum) {
      return;
    }

    const request: CreateRecommendationRequest = {
      basisAlbumDiscogsId: basisAlbum.id,
      recommendedAlbumDiscogsId: recommendedAlbum.id,
      score,
      basisAlbumTitle: basisAlbum.title,
      basisAlbumArtist: basisAlbum.artist,
      basisAlbumImageUrl: basisAlbum.image.url,
      basisAlbumYear: basisAlbum.year?.toString(),
      recommendedAlbumTitle: recommendedAlbum.title,
      recommendedAlbumArtist: recommendedAlbum.artist,
      recommendedAlbumImageUrl: recommendedAlbum.image.url,
      recommendedAlbumYear: recommendedAlbum.year?.toString(),
    };

    createMutation.mutate(request);
  };

  const isDisabled = !basisAlbum || !recommendedAlbum || createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {createMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {createMutation.error?.message}
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="score" className="block text-lg font-semibold text-white">
          Score: {score}/10
        </label>
        <input 
          type="range" 
          id="score"
          min="1" 
          max="10" 
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          disabled={isDisabled}
        />
        <div className="flex justify-between text-xs text-gray-400">
          {Array.from({length: 10}, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
      </div>
      
      <button 
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        disabled={isDisabled}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Recommendation'}
      </button>
    </form>
  );
} 