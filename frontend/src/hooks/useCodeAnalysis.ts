import { useState, useCallback } from 'react';
import { AnalysisResult } from '../types/api';
import { apiService } from '../services/api';

interface UseCodeAnalysisReturn {
  code: string;
  setCode: (code: string) => void;
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  analyzeCode: (codeInput?: string) => Promise<void>;
  clearAnalysis: () => void;
}

export const useCodeAnalysis = (initialCode: string = ''): UseCodeAnalysisReturn => {
  const [code, setCode] = useState(initialCode);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCode = useCallback(async (codeInput?: string) => {
    const codeToAnalyze = codeInput ?? code;
    if (!codeToAnalyze.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.analyzeCode(codeToAnalyze);
      setAnalysis(result);
      
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze code';
      setError(errorMessage);
      console.error('Code analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    code,
    setCode,
    analysis,
    loading,
    error,
    analyzeCode,
    clearAnalysis,
  };
}; 