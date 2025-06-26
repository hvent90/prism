import { useState, useCallback } from 'react';
import { RAGResult } from '../types/api';
import { apiService } from '../services/api';

interface UseRAGQueryReturn {
  query: string;
  setQuery: (query: string) => void;
  results: RAGResult | null;
  loading: boolean;
  error: string | null;
  executeQuery: (queryInput?: string, context?: string) => Promise<void>;
  clearResults: () => void;
  queryHistory: string[];
}

export const useRAGQuery = (): UseRAGQueryReturn => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAGResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const executeQuery = useCallback(async (queryInput?: string, context?: string) => {
    const queryToExecute = queryInput ?? query;
    if (!queryToExecute.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.queryRAG(queryToExecute, context);
      setResults(result);
      
      // Add to history if not already present
      setQueryHistory(prev => {
        const filtered = prev.filter(q => q !== queryToExecute);
        return [queryToExecute, ...filtered].slice(0, 10); // Keep last 10 queries
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute query';
      setError(errorMessage);
      console.error('RAG query error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    executeQuery,
    clearResults,
    queryHistory,
  };
}; 