'use client';

import { ArrowLeft, Building2, ExternalLink, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Label {
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
  profile?: string;
  contactinfo?: string;
  sublabels?: Label[];
  parent_label?: {
    name: string;
  };
  basic_information?: {
    profile?: string;
    contactinfo?: string;
    urls?: string[];
    sublabels?: Label[];
  };
}

export default function LabelDetailsPage() {
  const params = useParams();
  const labelId = params.id as string;

  const [label, setLabel] = useState<Label | null>(null);
  const [labelDetails, setLabelDetails] = useState<Label | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (labelId) {
      // First try to get label data from sessionStorage
      const storedLabel = sessionStorage.getItem(`label-${labelId}`);
      if (storedLabel) {
        try {
          const labelData = JSON.parse(storedLabel);
          console.log('Using stored label data:', labelData.title);
          setLabel(labelData);
          setIsLoading(false);

          // Fetch detailed label data in the background
          fetchDetailedLabelData(labelId);
        } catch (error) {
          console.error('Error parsing stored label data:', error);
          fetchLabelDetails(labelId);
        }
      } else {
        // Fallback to API fetch if no stored data
        fetchLabelDetails(labelId);
      }
    }
  }, [labelId]);

  const fetchLabelDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching label details for ID: ${id}`);
      const response = await fetch(`/api/labels/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch label details');
      }

      const data = await response.json();
      console.log(`Got details for: ${data.label?.name}`);
      setLabel(data.label);
      setLabelDetails(data.label);
    } catch (error) {
      console.error('Error fetching label:', error);
      setError(error instanceof Error ? error.message : 'Failed to load label');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedLabelData = async (id: string) => {
    try {
      console.log(`Fetching detailed label data for ID: ${id}`);
      const response = await fetch(`/api/labels/${id}`);

      if (!response.ok) {
        console.log('Could not fetch detailed label data');
        return;
      }

      const data = await response.json();
      if (data.label) {
        console.log(`Got detailed label data`);
        setLabelDetails(data.label);
      }
    } catch (error) {
      console.error('Error fetching label releases:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load releases'
      );
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center justify-center h-64'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-500'></div>
            <span className='ml-3 text-zinc-400'>Loading label details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !label) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <div className='container mx-auto px-4 py-8'>
          <Link
            href='/'
            className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Search
          </Link>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-red-500 mb-4'>
              Label Not Found
            </h1>
            <p className='text-zinc-400'>
              {error || 'The requested label could not be found.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Back Navigation */}
        <Link
          href='/'
          className='inline-flex items-center text-zinc-400 hover:text-white mb-6 transition-colors'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Search
        </Link>

        {/* Label Header */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Label Image */}
          <div className='lg:col-span-1'>
            <div className='relative aspect-square w-full max-w-md mx-auto'>
              {label.image?.url ? (
                <Image
                  src={label.image.url}
                  alt={label.image.alt || `${label.title} logo`}
                  fill
                  className='object-cover rounded-lg shadow-2xl'
                  sizes='(max-width: 768px) 100vw, 400px'
                  priority
                />
              ) : (
                <div className='w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center'>
                  <Building2 className='h-24 w-24 text-zinc-600' />
                </div>
              )}
            </div>
          </div>

          {/* Label Info */}
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <h1 className='text-4xl font-bold mb-2'>{label.title}</h1>
              <p className='text-xl text-zinc-300 mb-4'>Record Label</p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {labelDetails?.basic_information?.profile && (
                <div className='md:col-span-2'>
                  <h3 className='text-lg font-semibold mb-2'>About</h3>
                  <p className='text-zinc-300 text-sm leading-relaxed'>
                    {labelDetails.basic_information.profile}
                  </p>
                </div>
              )}

              {labelDetails?.basic_information?.contactinfo && (
                <div className='flex items-center space-x-2'>
                  <MapPin className='h-5 w-5 text-zinc-400' />
                  <span className='text-zinc-300'>
                    Contact: {labelDetails.basic_information.contactinfo}
                  </span>
                </div>
              )}

              {labelDetails?.basic_information?.urls &&
                labelDetails.basic_information.urls.length > 0 && (
                  <div className='flex items-center space-x-2'>
                    <ExternalLink className='h-5 w-5 text-zinc-400' />
                    <a
                      href={labelDetails.basic_information.urls[0]}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-400 hover:text-blue-300 text-sm truncate'
                    >
                      Official Website
                    </a>
                  </div>
                )}
            </div>

            {labelDetails?.basic_information?.sublabels &&
              labelDetails.basic_information.sublabels.length > 0 && (
                <div>
                  <h3 className='text-lg font-semibold mb-2'>Sub-labels</h3>
                  <div className='flex flex-wrap gap-2'>
                    {labelDetails.basic_information.sublabels.map(
                      (sublabel: Label, index: number) => (
                        <span
                          key={index}
                          className='bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm'
                        >
                          {sublabel.title}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {labelDetails?.parent_label && (
              <div>
                <h3 className='text-lg font-semibold mb-2'>Parent Label</h3>
                <span className='bg-purple-800 text-purple-200 px-3 py-1 rounded-full text-sm'>
                  {labelDetails.parent_label.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue='releases' className='w-full'>
          <TabsList className='grid w-full grid-cols-4 bg-zinc-900'>
            <TabsTrigger
              value='releases'
              className='data-[state=active]:bg-zinc-700'
            >
              Releases
            </TabsTrigger>
            <TabsTrigger
              value='artists'
              className='data-[state=active]:bg-zinc-700'
            >
              Artists
            </TabsTrigger>
            <TabsTrigger
              value='about'
              className='data-[state=active]:bg-zinc-700'
            >
              About
            </TabsTrigger>
            <TabsTrigger
              value='sublabels'
              className='data-[state=active]:bg-zinc-700'
            >
              Sub-labels
            </TabsTrigger>
          </TabsList>

          <TabsContent value='releases' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Label Releases</h3>
              <p className='text-zinc-400'>
                Label releases and catalog will appear here. This feature is
                coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value='artists' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Label Artists</h3>
              <p className='text-zinc-400'>
                Artists signed to this label will appear here. This feature is
                coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value='about' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>
                About {label.title}
              </h3>
              {labelDetails?.profile ? (
                <div className='text-zinc-300 leading-relaxed'>
                  {labelDetails.profile
                    .split('\n')
                    .map((paragraph: string, index: number) => (
                      <p key={index} className='mb-4'>
                        {paragraph}
                      </p>
                    ))}
                </div>
              ) : (
                <p className='text-zinc-400'>
                  No information available for this label.
                </p>
              )}

              {labelDetails?.contactinfo && (
                <div className='mt-6 p-4 bg-zinc-800 rounded-lg'>
                  <h4 className='font-semibold mb-2'>Contact Information</h4>
                  <p className='text-zinc-300 text-sm'>
                    {labelDetails.contactinfo}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value='sublabels' className='mt-6'>
            <div className='bg-zinc-900 rounded-lg p-6'>
              <h3 className='text-xl font-semibold mb-4'>Sub-labels</h3>
              {labelDetails?.sublabels && labelDetails.sublabels.length > 0 ? (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {labelDetails.sublabels.map(
                    (sublabel: Label, index: number) => (
                      <div key={index} className='bg-zinc-800 p-4 rounded-lg'>
                        <h4 className='font-semibold text-white'>
                          {sublabel.title}
                        </h4>
                        <p className='text-zinc-400 text-sm'>Sub-label</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className='text-zinc-400'>This label has no sub-labels.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
