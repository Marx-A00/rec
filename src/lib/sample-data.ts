// Utility for using sample data in development
import { getAllSampleData, getSampleDataStats } from '../../data';

export const useSampleData = process.env.NODE_ENV === 'development';

export const getSampleData = () => {
  if (!useSampleData) {
    throw new Error('Sample data should only be used in development');
  }
  return getAllSampleData();
};

export const getSampleStats = () => {
  if (!useSampleData) {
    throw new Error('Sample data should only be used in development');
  }
  return getSampleDataStats();
};

// Helper to check if we should use sample data
export const shouldUseSampleData = () => {
  return process.env.NODE_ENV === 'development' && process.env.USE_SAMPLE_DATA !== 'false';
};

// Mock API responses using sample data (useful for development)
export const mockApiResponse = <T>(data: T, delay: number = 500): Promise<T> => {
  if (!useSampleData) {
    throw new Error('Mock API responses should only be used in development');
  }
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}; 