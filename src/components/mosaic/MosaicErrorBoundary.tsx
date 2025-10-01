'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MosaicErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mosaic error caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex flex-col items-center justify-center h-full p-8 bg-zinc-900/50 rounded-lg border border-zinc-800'>
          <div className='flex flex-col items-center max-w-md text-center space-y-4'>
            <div className='p-3 bg-red-900/20 rounded-full'>
              <AlertTriangle className='w-8 h-8 text-red-400' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-lg font-semibold text-zinc-100'>
                Something went wrong
              </h3>
              <p className='text-sm text-zinc-400'>
                {this.state.error?.message ||
                  'An unexpected error occurred in the mosaic panel'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className='flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors duration-200'
            >
              <RefreshCw className='w-4 h-4' />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MosaicErrorBoundary;
