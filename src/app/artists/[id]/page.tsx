"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, User, Calendar, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Artist {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  image: {
    url: string;
    width: number;
    height: number;
    alt?: string;
  };
  _discogs?: {
    type: string;
    uri: string;
    resource_url: string;
  };
}

export default function ArtistDetailsPage() {
  const params = useParams();
  const artistId = params.id as string;
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistDetails, setArtistDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (artistId) {
      // First try to get artist data from sessionStorage
      const storedArtist = sessionStorage.getItem(`artist-${artistId}`);
      if (storedArtist) {
        try {
          const artistData = JSON.parse(storedArtist);
          console.log('Using stored artist data:', artistData.title);
          setArtist(artistData);
          setIsLoading(false);
          
          // Fetch detailed artist data in the background
          fetchDetailedArtistData(artistId);
        } catch (error) {
          console.error('Error parsing stored artist data:', error);
          fetchArtistDetails(artistId);
        }
      } else {
        // Fallback to API fetch if no stored data
        fetchArtistDetails(artistId);
      }
    }
  }, [artistId]);

  const fetchArtistDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching artist details for ID: ${id}`);
      const response = await fetch(`/api/artists/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch artist details');
      }
      
      const data = await response.json();
      console.log(`Got details for: ${data.artist?.name}`);
      setArtist(data.artist);
      setArtistDetails(data.artist);
    } catch (err: any) {
      console.error('Error fetching artist details:', err);
      setError(`Failed to fetch artist details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedArtistData = async (id: string) => {
    try {
      console.log(`Fetching detailed artist data for ID: ${id}`);
      const response = await fetch(`/api/artists/${id}`);
      
      if (!response.ok) {
        console.log('Could not fetch detailed artist data');
        return;
      }
      
      const data = await response.json();
      if (data.artist) {
        console.log(`Got detailed artist data`);
        setArtistDetails(data.artist);
      }
    } catch (err: any) {
      console.log('Error fetching detailed artist data:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            <span className="ml-3 text-zinc-400">Loading artist details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Artist Not Found</h1>
            <p className="text-zinc-400">{error || "The requested artist could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link 
          href="/" 
          className="inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Link>

        {/* Artist Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Artist Image */}
          <div className="lg:col-span-1">
            <div className="relative aspect-square w-full max-w-md mx-auto">
              {artist.image?.url ? (
                <Image
                  src={artist.image.url}
                  alt={artist.image.alt || `${artist.title} photo`}
                  fill
                  className="object-cover rounded-lg shadow-2xl"
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center">
                  <User className="h-24 w-24 text-zinc-600" />
                </div>
              )}
            </div>
          </div>

          {/* Artist Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{artist.title}</h1>
              <p className="text-xl text-zinc-300 mb-4">Artist</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artistDetails?.profile && (
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold mb-2">Biography</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {artistDetails.profile}
                  </p>
                </div>
              )}

              {artistDetails?.realname && (
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-zinc-400" />
                  <span className="text-zinc-300">Real Name: {artistDetails.realname}</span>
                </div>
              )}

              {artistDetails?.urls && artistDetails.urls.length > 0 && (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5 text-zinc-400" />
                  <a 
                    href={artistDetails.urls[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm truncate"
                  >
                    Official Website
                  </a>
                </div>
              )}
            </div>

            {artistDetails?.aliases && artistDetails.aliases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Also Known As</h3>
                <div className="flex flex-wrap gap-2">
                  {artistDetails.aliases.map((alias: any, index: number) => (
                    <span
                      key={index}
                      className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm"
                    >
                      {alias.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="discography" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-900">
            <TabsTrigger value="discography" className="data-[state=active]:bg-zinc-700">
              Discography
            </TabsTrigger>
            <TabsTrigger value="biography" className="data-[state=active]:bg-zinc-700">
              Biography
            </TabsTrigger>
            <TabsTrigger value="collaborations" className="data-[state=active]:bg-zinc-700">
              Collaborations
            </TabsTrigger>
            <TabsTrigger value="similar" className="data-[state=active]:bg-zinc-700">
              Similar Artists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discography" className="mt-6">
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Albums & Releases</h3>
              <p className="text-zinc-400">
                Artist discography will appear here. This feature is coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="biography" className="mt-6">
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Biography</h3>
              {artistDetails?.profile ? (
                <div className="text-zinc-300 leading-relaxed">
                  {artistDetails.profile.split('\n').map((paragraph: string, index: number) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400">
                  No biography information available for this artist.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="collaborations" className="mt-6">
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Collaborations</h3>
              <p className="text-zinc-400">
                Artist collaborations and featured works will appear here. This feature is coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="similar" className="mt-6">
            <div className="bg-zinc-900 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Similar Artists</h3>
              <p className="text-zinc-400">
                Similar artists and recommendations will appear here. This feature is coming soon!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 