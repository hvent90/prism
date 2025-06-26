import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { CodebaseAnalysisResult } from '../types/api';

interface UseCodebaseAnalysisReturn {
  result: CodebaseAnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyzeCodebase: (directoryPath: string, maxFiles?: number) => Promise<void>;
  clearResult: () => void;
}

export const useCodebaseAnalysis = (): UseCodebaseAnalysisReturn => {
  const [result, setResult] = useState<CodebaseAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCodebase = useCallback(async (directoryPath: string, maxFiles: number = 100) => {
    setLoading(true);
    setError(null);
    
    try {
      const analysisResult = await apiService.analyzeCodebase(directoryPath, maxFiles);
      setResult(analysisResult);
      
      if (!analysisResult.success && analysisResult.error) {
        setError(analysisResult.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during codebase analysis';
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    analyzeCodebase,
    clearResult,
  };
}; 