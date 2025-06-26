import React from 'react';
import { RAGResult, RAGItem } from '../../types/api';

interface ResultsListProps {
  results: RAGResult | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const ResultItem: React.FC<{ item: RAGItem }> = ({ item }) => {
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

  const getRelevanceColor = (relevance: number): string => {
    if (relevance >= 0.8) return 'high';
    if (relevance >= 0.6) return 'medium';
    return 'low';
  };

  return (
    <div className="rag-result-item">
      <div className="result-header">
        <span className="result-type">
          {getTypeIcon(item.type)} {item.type}
        </span>
        <span className={`result-relevance ${getRelevanceColor(item.relevance)}`}>
          {Math.round(item.relevance * 100)}%
        </span>
      </div>
      <div className="result-name">{item.name}</div>
      <div className="result-content">{item.content}</div>
      {item.context && (
        <div className="result-context">{item.context}</div>
      )}
      {item.line && (
        <div className="result-line">Line {item.line}</div>
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
        <h4>Results for: "{results.query}"</h4>
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