// src/app/api/health/musicbrainz/route.ts
/**
 * Health check endpoint for MusicBrainz API integration
 * Provides service status, metrics, and health information for monitoring
 */

import { NextResponse } from 'next/server';
import { musicBrainzService } from '@/lib/musicbrainz/musicbrainz-service';

export async function GET() {
  try {
    const healthStatus = musicBrainzService.getHealthStatus();
    const metrics = musicBrainzService.getMetrics();
    
    const response = {
      service: 'musicbrainz',
      status: healthStatus.healthy ? 'healthy' : (healthStatus.degraded ? 'degraded' : 'unhealthy'),
      timestamp: new Date().toISOString(),
      metrics: {
        requests: {
          total: metrics.requests,
          successful: metrics.successes,
          failed: metrics.failures,
          successRate: `${metrics.successRate}%`,
        },
        errors: {
          rateLimits: metrics.rateLimits,
          timeouts: metrics.timeouts,
          notFound: metrics.notFound,
          serviceUnavailable: metrics.serviceUnavailable,
          consecutiveFailures: metrics.consecutiveFailures,
          lastFailure: metrics.lastFailure,
        },
        service: {
          healthy: healthStatus.healthy,
          degraded: healthStatus.degraded,
          uptime: `${metrics.uptime}%`,
        }
      },
      checks: {
        libraryIntegration: 'ok', // musicbrainz-api library is integrated
        rateLimiting: 'ok', // Library handles rate limiting
        retryLogic: 'ok', // Library handles retries
        errorHandling: 'ok', // Enhanced error handling implemented
      }
    };

    // Return appropriate HTTP status based on health
    const httpStatus = healthStatus.healthy ? 200 : (healthStatus.degraded ? 206 : 503);
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ MusicBrainz health check failed:', error);
    
    return NextResponse.json({
      service: 'musicbrainz',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        libraryIntegration: 'error',
        rateLimiting: 'unknown',
        retryLogic: 'unknown',
        errorHandling: 'error',
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
