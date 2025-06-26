import { useState, useCallback } from 'react';
import { AnalysisResult, ComprehensiveAnalysisResult } from '../types/api';
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
      const result = await apiService.analyzeComprehensive(codeToAnalyze);
      
      if (result.success) {
        // Transform the comprehensive result to match the expected AnalysisResult format
        const transformedResult: AnalysisResult = {
          ast: result.ast || [],
          inheritance: {
            classes: result.inheritance?.classes || [],
            relationships: [] // Transform this if needed
          },
          callGraph: {
            functions: result.callgraph?.functions || [],
            calls: result.callgraph?.calls || []
          }
        };
        
        setAnalysis(transformedResult);
      } else {
        setError(result.error || 'Analysis failed');
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