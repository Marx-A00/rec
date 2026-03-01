import type { User } from '@prisma/client';

import type { Recommendation } from '@/types';

function getBaseUrl() {
  // In server components, use the internal URL
  if (typeof window === 'undefined') {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }
  // In client components, use relative URLs
  return '';
}

export async function getUsers(): Promise<User[]> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/users`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/recommendations`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return data.recommendations || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}
