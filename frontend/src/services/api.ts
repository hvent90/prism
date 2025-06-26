import { AnalysisResult, RAGResult, ComprehensiveAnalysisResult, CodebaseAnalysisResult, CodebaseRAGResult } from '../types/api';

const API_BASE_URL = 'http://localhost:5000';

class APIService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async analyzeCode(code: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>('/api/ast', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async queryRAG(query: string, codeContext?: string): Promise<RAGResult> {
    return this.request<RAGResult>('/api/rag-query', {
      method: 'POST',
      body: JSON.stringify({ query, code: codeContext }),
    });
  }

  async analyzeComprehensive(code: string): Promise<ComprehensiveAnalysisResult> {
    return this.request<ComprehensiveAnalysisResult>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async analyzeCodebase(directoryPath: string, maxFiles: number = 100): Promise<CodebaseAnalysisResult> {
    return this.request<CodebaseAnalysisResult>('/api/analyze-codebase', {
      method: 'POST',
      body: JSON.stringify({ 
        directory_path: directoryPath,
        max_files: maxFiles 
      }),
    });
  }

  async queryCodebaseRAG(directoryPath: string, query: string, maxFiles: number = 50): Promise<CodebaseRAGResult> {
    return this.request<CodebaseRAGResult>('/api/rag-query-codebase', {
      method: 'POST',
      body: JSON.stringify({ 
        directory_path: directoryPath,
        query: query,
        max_files: maxFiles 
      }),
    });
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/api/health');
  }
}

export const apiService = new APIService(); 