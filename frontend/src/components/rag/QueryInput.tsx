import React, { useState, KeyboardEvent } from 'react';
import { Button } from '../common/Button';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = "Ask about the code: 'find classes', 'how to create objects', 'error handling'...",
  className = '',
}) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`query-input-section ${className}`}>
      <label htmlFor="rag-query-input" className="query-label">
        Ask about your code:
      </label>
      <div className="query-input-wrapper">
        <textarea
          id="rag-query-input"
          className="query-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          rows={3}
          disabled={loading}
        />
        <div className="query-input-footer">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !value.trim()}
            title="Execute Query (Ctrl+Enter)"
            className="query-submit-btn"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}; 