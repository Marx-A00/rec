"use client";

import Image from "next/image";
import Link from 'next/link';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';

interface Track {
  id: string;
  title: string;
  duration: number; // in seconds
  trackNumber: number;
}

interface Recommendation {
  id: string;
  raitingOwner: string;
  basisAlbum: Album;
  recommendedAlbum: Album;
  score: number;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  releaseDate: string; // ISO 8601 format: "YYYY-MM-DD"
  genre: string[];
  label: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
  tracks: Track[];
  metadata?: {
    totalDuration: number; // in seconds
    numberOfTracks: number;
    format?: string; // e.g., "CD", "Vinyl", "Digital"
    barcode?: string;
  };
}

// Sample albums for initial state
const defaultAlbum: Album = {
  id: "",
  title: "",
  artist: "",
  releaseDate: "",
  genre: [],
  label: "",
  image: {
    url: "https://via.placeholder.com/400x400?text=No+Image",
    width: 400,
    height: 400,
    alt: "Album placeholder",
  },
  tracks: [],
  metadata: {
    totalDuration: 0,
    numberOfTracks: 0,
  },
};

export default function CreateRecommendationPage() {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [score, setScore] = useState<number>(7);
    const [selectedBasisAlbum, setSelectedBasisAlbum] = useState<Album | null>(null);
    const [selectedRecommendedAlbum, setSelectedRecommendedAlbum] = useState<Album | null>(null);
    const [searchResults, setSearchResults] = useState<Album[]>([]);
    const [isSearchingForBasis, setIsSearchingForBasis] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search function
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length > 2) {
                searchAlbums(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const searchAlbums = async (query: string) => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log(`Searching for: ${query}`);
            const response = await fetch(`/api/albums/search?query=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to search albums');
            }
            
            const data = await response.json();
            console.log(`Found ${data.albums?.length || 0} albums`);
            setSearchResults(data.albums || []);
        } catch (err: any) {
            console.error('Error searching albums:', err);
            setError(`Failed to search albums: ${err.message}`);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAlbumDetails = async (albumId: string): Promise<Album | null> => {
        setIsLoading(true);
        try {
            console.log(`Fetching details for album ID: ${albumId}`);
            const response = await fetch(`/api/albums/${albumId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch album details');
            }
            
            const data = await response.json();
            console.log(`Got details for: ${data.album?.title}`);
            return data.album || null;
        } catch (err: any) {
            console.error('Error fetching album details:', err);
            setError(`Failed to fetch album details: ${err.message}`);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleScoreChange = (e: ChangeEvent<HTMLInputElement>) => {
        setScore(Number(e.target.value));
    };

    const handleAlbumSelect = async (album: Album) => {
        // Fetch detailed album information
        const detailedAlbum = await fetchAlbumDetails(album.id);
        
        if (detailedAlbum) {
            if (isSearchingForBasis) {
                setSelectedBasisAlbum(detailedAlbum);
            } else {
                setSelectedRecommendedAlbum(detailedAlbum);
            }
        } else {
            // If we couldn't get detailed info, use the search result
            if (isSearchingForBasis) {
                setSelectedBasisAlbum(album);
            } else {
                setSelectedRecommendedAlbum(album);
            }
        }
        
        setSearchQuery('');
        setSearchResults([]);
    };

    const toggleSearchMode = () => {
        setIsSearchingForBasis(!isSearchingForBasis);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        if (!selectedBasisAlbum || !selectedRecommendedAlbum) {
            setError('Please select both a basis album and a recommended album');
            return;
        }
        
        // Create the recommendation object
        const recommendation: Recommendation = {
            id: Date.now().toString(), // Generate a temporary ID
            raitingOwner: "current-user", // In a real app, this would be the logged-in user
            basisAlbum: selectedBasisAlbum,
            recommendedAlbum: selectedRecommendedAlbum,
            score,
        };
        
        // Log the recommendation data
        console.log('Recommendation created:', recommendation);
        
        // In a real app, you would send this data to your backend
        alert('Recommendation created! Check the console for details.');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="flex flex-col gap-4 items-center max-w-4xl w-full">
                <Link href="/"
                    className="text-white bg-red-500 hover:bg-red-700 font-bold mb-10 py-4 px-8 rounded-full text-lg shadow-lg"
                >home</Link>
                <h1 className="text-4xl font-bold text-center pb-6">Create Recommendation</h1>
                
                {error && (
                    <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">
                                {isSearchingForBasis ? "Search for Basis Album" : "Search for Recommended Album"}
                            </h2>
                            <button 
                                type="button"
                                onClick={toggleSearchMode}
                                className="text-blue-500 hover:text-blue-700"
                            >
                                Switch to {isSearchingForBasis ? "Recommended" : "Basis"} Album
                            </button>
                        </div>
                        
                        <div className="relative">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search for an album by title or artist" 
                                className="border-2 border-gray-300 p-2 rounded-lg w-full text-gray-800"
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                </div>
                            )}
                        </div>
                        
                        {searchResults.length > 0 && (
                            <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                {searchResults.map(album => (
                                    <div 
                                        key={album.id}
                                        onClick={() => handleAlbumSelect(album)}
                                        className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <div className="w-12 h-12 relative mr-3">
                                            <Image 
                                                src={album.image.url} 
                                                alt={album.image.alt || ''} 
                                                width={48}
                                                height={48}
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium">{album.title}</div>
                                            <div className="text-sm text-gray-600">{album.artist}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 justify-center">
                        <div className="flex-1 border p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-2">Basis Album</h3>
                            {selectedBasisAlbum ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-full aspect-square mb-2">
                                        <Image 
                                            src={selectedBasisAlbum.image.url} 
                                            alt={selectedBasisAlbum.image.alt || ''} 
                                            width={400}
                                            height={400}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold">{selectedBasisAlbum.title}</div>
                                        <div className="text-gray-600">{selectedBasisAlbum.artist}</div>
                                        {selectedBasisAlbum.releaseDate && (
                                            <div className="text-sm text-gray-500">{selectedBasisAlbum.releaseDate}</div>
                                        )}
                                        {selectedBasisAlbum.genre.length > 0 && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {selectedBasisAlbum.genre.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-10">No album selected</div>
                            )}
                        </div>
                        
                        <div className="flex-1 border p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-2">Recommended Album</h3>
                            {selectedRecommendedAlbum ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-full aspect-square mb-2">
                                        <Image 
                                            src={selectedRecommendedAlbum.image.url} 
                                            alt={selectedRecommendedAlbum.image.alt || ''} 
                                            width={400}
                                            height={400}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold">{selectedRecommendedAlbum.title}</div>
                                        <div className="text-gray-600">{selectedRecommendedAlbum.artist}</div>
                                        {selectedRecommendedAlbum.releaseDate && (
                                            <div className="text-sm text-gray-500">{selectedRecommendedAlbum.releaseDate}</div>
                                        )}
                                        {selectedRecommendedAlbum.genre.length > 0 && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {selectedRecommendedAlbum.genre.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-10">No album selected</div>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="score" className="block text-lg font-semibold">
                            Score: {score}/10
                        </label>
                        <input 
                            type="range" 
                            id="score"
                            min="1" 
                            max="10" 
                            value={score}
                            onChange={handleScoreChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                            <span>6</span>
                            <span>7</span>
                            <span>8</span>
                            <span>9</span>
                            <span>10</span>
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors"
                        disabled={!selectedBasisAlbum || !selectedRecommendedAlbum}
                    >
                        Create Recommendation
                    </button>
                </form>
            </div>
        </div>
    );
}
