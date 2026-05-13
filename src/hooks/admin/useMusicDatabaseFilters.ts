import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebounce } from '@/lib/hooks/useDebounce';

type SearchType = 'albums' | 'artists' | 'tracks';

interface Filters {
  dataQuality: string;
  enrichmentStatus: string;
  needsEnrichment: boolean;
}

export function useMusicDatabaseFilters() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const targetType = searchParams.get('type') as SearchType | null;

  const [activeTab, setActiveTab] = useState<SearchType>(
    targetType || 'albums'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({
    dataQuality: 'all',
    enrichmentStatus: 'all',
    needsEnrichment: false,
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const itemsPerPage = 50;
  const skip = (page - 1) * itemsPerPage;

  const hasProcessedTargetId = useRef(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Auto-search target row from URL parameter (INITIAL LOAD ONLY)
  useEffect(() => {
    if (!targetId || hasProcessedTargetId.current) return;
    setIdSearch(targetId);
  }, [targetId]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setExpandedRows(new Set());
  };

  const handleTabChange = (newTab: SearchType) => {
    setActiveTab(newTab);
    setPage(1);
    setExpandedRows(new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return {
    // URL params
    targetId,
    hasProcessedTargetId,

    // Search
    searchQuery,
    setSearchQuery,
    idSearch,
    setIdSearch,
    debouncedSearchQuery,

    // Filters
    filters,
    setFilters,
    sourceFilter,
    setSourceFilter,

    // Sort
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Pagination
    page,
    itemsPerPage,
    skip,
    handlePageChange,

    // Tabs
    activeTab,
    handleTabChange,

    // Row expansion
    expandedRows,
    setExpandedRows,
    toggleExpanded,
  };
}
