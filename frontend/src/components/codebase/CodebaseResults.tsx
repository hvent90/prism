import React from 'react';
import { CodebaseAnalysisResult } from '../../types/api';

interface CodebaseResultsProps {
  result: CodebaseAnalysisResult;
}

export const CodebaseResults: React.FC<CodebaseResultsProps> = ({ result }) => {
  if (!result.success) {
    return (
      <div className="codebase-results error">
        <h3>Analysis Failed</h3>
        <p>{result.error || 'An unknown error occurred'}</p>
      </div>
    );
  }

  return (
    <div className="codebase-results">
      <div className="results-header">
        <h3>Codebase Analysis Results</h3>
        <div className="directory-info">
          <strong>Directory:</strong> <code>{result.directory_path}</code>
        </div>
      </div>

      <div className="results-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{result.files_analyzed}</div>
            <div className="stat-label">Files Analyzed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.statistics.total_classes}</div>
            <div className="stat-label">Classes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.statistics.total_functions}</div>
            <div className="stat-label">Functions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{result.statistics.total_calls}</div>
            <div className="stat-label">Function Calls</div>
          </div>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="results-errors">
          <h4>Errors ({result.errors.length})</h4>
          <div className="error-list">
            {result.errors.map((error, index) => (
              <div key={index} className="error-item">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.skipped_directories.length > 0 && (
        <div className="results-skipped">
          <h4>Skipped Directories ({result.skipped_directories.length})</h4>
          <div className="skipped-list">
            {result.skipped_directories.map((dir, index) => (
              <div key={index} className="skipped-item">
                <code>{dir}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-files">
        <h4>Analyzed Files ({result.files.length})</h4>
        <div className="files-list">
          {result.files.map((file, index) => {
            // Determine if the file processing was successful
            const isSuccess = file.success !== false && (!file.error || file.error.trim() === '');
            
            return (
              <div key={index} className={`file-item ${isSuccess ? 'success' : 'error'}`}>
                <div className="file-path">
                  <code>{file.file_path}</code>
                </div>
                <div className="file-stats">
                  {isSuccess ? (
                    <>
                      <span className="file-stat">
                        {file.classes?.length || 0} classes
                      </span>
                      <span className="file-stat">
                        {file.functions?.length || 0} functions
                      </span>
                    </>
                  ) : (
                    <span className="file-error">
                      Error: {file.error || 'Unknown error'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {result.message && (
        <div className="results-message">
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}; 