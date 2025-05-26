'use client';

import { useState, useEffect } from 'react';
import { Star, Plus, Loader2, X } from 'lucide-react';
import { Album } from '@/types/album';

interface Collection {
  id: string;
  name: string;
  description?: string;
  _count: { albums: number };
}

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  onSuccess?: (message: string) => void;
}

export default function AddToCollectionModal({
  isOpen,
  onClose,
  album,
  onSuccess
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's collections when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    setError(null);
    
    try {
      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      
      const data = await response.json();
      setCollections(data.collections || []);
      
      // Auto-select first collection if available
      if (data.collections && data.collections.length > 0) {
        setSelectedCollection(data.collections[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching collections:', err);
      setError('Failed to load collections');
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        collectionId: isCreatingNew ? undefined : selectedCollection,
        createNew: isCreatingNew,
        collectionName: isCreatingNew ? newCollectionName : undefined,
        personalRating: personalRating || undefined,
        personalNotes: personalNotes.trim() || undefined
      };

      const response = await fetch(`/api/albums/${album.id}/add-to-collection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add album to collection');
      }

      onSuccess?.(data.message || 'Album added to collection successfully!');
      onClose();
      
      // Reset form
      setSelectedCollection('');
      setIsCreatingNew(false);
      setNewCollectionName('');
      setPersonalRating(null);
      setPersonalNotes('');
    } catch (err: any) {
      console.error('Error adding album to collection:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setPersonalRating(personalRating === rating ? null : rating);
  };

  const canSubmit = () => {
    if (isCreatingNew) {
      return newCollectionName.trim().length > 0;
    }
    return selectedCollection.length > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-zinc-900 text-white border border-zinc-700 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-bold">
            Add "{album.title}" to Collection
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Collection Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium">Choose Collection</label>
            
            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="ml-2 text-zinc-400">Loading collections...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={collection.id}
                      name="collection"
                      value={collection.id}
                      checked={!isCreatingNew && selectedCollection === collection.id}
                      onChange={(e) => {
                        setIsCreatingNew(false);
                        setSelectedCollection(e.target.value);
                      }}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor={collection.id} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span>{collection.name}</span>
                        <span className="text-xs text-zinc-400">
                          {collection._count.albums} albums
                        </span>
                      </div>
                      {collection.description && (
                        <p className="text-xs text-zinc-400 mt-1">
                          {collection.description}
                        </p>
                      )}
                    </label>
                  </div>
                ))}
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="new"
                    name="collection"
                    value="new"
                    checked={isCreatingNew}
                    onChange={() => {
                      setIsCreatingNew(true);
                      setSelectedCollection('');
                    }}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="new" className="flex items-center cursor-pointer">
                    <Plus className="h-4 w-4 mr-1" />
                    Create new collection
                  </label>
                </div>
              </div>
            )}

            {/* New Collection Name Input */}
            {isCreatingNew && (
              <div className="ml-6 space-y-2">
                <label htmlFor="newCollectionName" className="block text-sm">
                  Collection Name
                </label>
                <input
                  id="newCollectionName"
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required={isCreatingNew}
                />
              </div>
            )}
          </div>

          {/* Personal Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Personal Rating (Optional)</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingClick(rating)}
                  className={`p-1 rounded transition-colors ${
                    personalRating && rating <= personalRating
                      ? 'text-yellow-400'
                      : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <Star className="h-4 w-4 fill-current" />
                </button>
              ))}
              {personalRating && (
                <span className="ml-2 text-sm text-zinc-400">
                  {personalRating}/10
                </span>
              )}
            </div>
          </div>

          {/* Personal Notes */}
          <div className="space-y-2">
            <label htmlFor="personalNotes" className="block text-sm font-medium">
              Personal Notes (Optional)
            </label>
            <textarea
              id="personalNotes"
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="Add your thoughts about this album..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit() || isLoading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Adding...
                </>
              ) : (
                'Add to Collection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 