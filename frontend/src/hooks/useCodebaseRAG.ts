import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { CodebaseRAGResult } from '../types/api';

interface UseCodebaseRAGReturn {
  query: string;
  setQuery: (query: string) => void;
  result: CodebaseRAGResult | null;
  loading: boolean;
  error: string | null;
  queryCodebase: (directoryPath: string, query: string, maxFiles?: number) => Promise<void>;
  clearResult: () => void;
  queryHistory: string[];
  clearHistory: () => void;
}

export const useCodebaseRAG = (): UseCodebaseRAGReturn => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CodebaseRAGResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const queryCodebase = useCallback(async (directoryPath: string, searchQuery: string, maxFiles: number = 50) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ragResult = await apiService.queryCodebaseRAG(directoryPath, searchQuery, maxFiles);
      setResult(ragResult);
      
      if (!ragResult.success && ragResult.error) {
        setError(ragResult.error);
      }
      
      // Add to history if successful and not already in history
      if (ragResult.success && !queryHistory.includes(searchQuery.trim())) {
        setQueryHistory(prev => [searchQuery.trim(), ...prev.slice(0, 9)]); // Keep last 10 queries
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during codebase query';
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [queryHistory]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setQueryHistory([]);
  }, []);

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    queryCodebase,
    clearResult,
    queryHistory,
    clearHistory,
  };
}; 