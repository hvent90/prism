import React, { useEffect } from 'react';
import { RAGResult, RAGItem } from '../../types/api';

interface ResultsListProps {
  results: RAGResult | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const ResultItem: React.FC<{ item: any }> = ({ item }) => {
  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'class':
        return '🏛️';
      case 'function':
        return '⚙️';
      case 'variable':
        return '📦';
      case 'import':
        return '📂';
      default:
        return '📄';
    }
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  const handleMouseEnter = () => {
    const event = new CustomEvent('rag-result-hover', {
      detail: {
        action: 'enter',
        result: item
      }
    });
    document.dispatchEvent(event);
  };

  const handleMouseLeave = () => {
    const event = new CustomEvent('rag-result-hover', {
      detail: {
        action: 'leave',
        result: item
      }
    });
    document.dispatchEvent(event);
  };

  // Handle both the expected format and the actual API response format
  const score = item.score || item.relevance || 0;
  const content = item.snippet || item.content || '';
  const lineStart = item.line_start || item.line;
  const lineEnd = item.line_end;

  return (
    <div 
      className="rag-result-item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="result-header">
        <span className="result-type">
          {getTypeIcon(item.type)} {item.type}
        </span>
        <span className={`result-relevance ${getRelevanceColor(score)}`}>
          {Math.round(score * 100)}%
        </span>
      </div>
      <div className="result-name">{item.name}</div>
      <div className="result-content">
        <pre><code>{content}</code></pre>
      </div>
      {lineStart && (
        <div className="result-line">
          {lineEnd && lineEnd !== lineStart 
            ? `Lines ${lineStart}-${lineEnd}` 
            : `Line ${lineStart}`}
        </div>
      )}
    </div>
  );
};

const PlaceholderContent: React.FC = () => (
  <div className="rag-placeholder">
    <h4>Ready for your questions</h4>
    <p>Try asking:</p>
    <ul>
      <li>"Find all classes"</li>
      <li>"Show functions that call helper_function"</li>
      <li>"How do I create objects?"</li>
      <li>"What error handling is implemented?"</li>
    </ul>
  </div>
);

export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  loading = false,
  error,
  className = '',
}) => {
  // Handle visualization highlighting when results change
  useEffect(() => {
    if (results && results.results.length > 0) {
      // Store visualization data globally for the AST coordinator
      if (results.visualization_data) {
        (window as any).ragVisualizationData = results.visualization_data;
      }
      
      // Dispatch event for AST coordinator to highlight matching nodes
      const event = new CustomEvent('rag-results-displayed', {
        detail: {
          results: results.results,
          visualizationData: results.visualization_data
        }
      });
      document.dispatchEvent(event);
    } else if (results && results.results.length === 0) {
      // Clear highlights when no results
      const event = new CustomEvent('rag-results-cleared');
      document.dispatchEvent(event);
    }
    
    // Cleanup: clear highlights when component unmounts or results change to null
    return () => {
      if (!results) {
        const event = new CustomEvent('rag-results-cleared');
        document.dispatchEvent(event);
      }
    };
  }, [results]);

  if (loading) {
    return (
      <div className={`rag-results loading ${className}`}>
        <div className="loading-indicator">
          <span className="spinner"></span>
          Searching...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rag-results error ${className}`}>
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={`rag-results ${className}`}>
        <PlaceholderContent />
      </div>
    );
  }

  return (
    <div className={`rag-results ${className}`}>
      <div className="results-header">
        <h4>Search Results</h4>
        <span className="results-count">
          {results.results.length} result{results.results.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="results-list">
        {results.results.length === 0 ? (
          <div className="no-results">
            <p>No results found for your query.</p>
            <p>Try rephrasing your question or asking about different code elements.</p>
          </div>
        ) : (
          results.results.map((item, index) => (
            <ResultItem key={index} item={item} />
          ))
        )}
      </div>
    </div>
  );
}; 