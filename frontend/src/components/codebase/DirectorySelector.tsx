import React, { useState } from 'react';
import { Button } from '../common/Button';

interface DirectorySelectorProps {
  onDirectorySelected: (directoryPath: string, maxFiles: number) => void;
  loading?: boolean;
  error?: string;
}

export const DirectorySelector: React.FC<DirectorySelectorProps> = ({
  onDirectorySelected,
  loading = false,
  error
}) => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [maxFiles, setMaxFiles] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (directoryPath.trim()) {
      onDirectorySelected(directoryPath.trim(), maxFiles);
    }
  };

  return (
    <div className="directory-selector">
      <form onSubmit={handleSubmit} className="directory-form">
        <div className="form-group">
          <label htmlFor="directory-path" className="form-label">
            Directory Path
          </label>
          <input
            id="directory-path"
            type="text"
            value={directoryPath}
            onChange={(e) => setDirectoryPath(e.target.value)}
            placeholder="Enter the full path to your Python codebase..."
            className="form-input"
            disabled={loading}
          />
          <small className="form-hint">
            Provide the absolute path to the directory containing Python files you want to analyze
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="max-files" className="form-label">
            Max Files
          </label>
          <input
            id="max-files"
            type="number"
            value={maxFiles}
            onChange={(e) => setMaxFiles(parseInt(e.target.value) || 100)}
            min="1"
            max="500"
            className="form-input form-input-small"
            disabled={loading}
          />
          <small className="form-hint">
            Maximum number of Python files to analyze (1-500)
          </small>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-actions">
          <Button
            type="submit"
            disabled={!directoryPath.trim() || loading}
          >
            {loading ? 'Analyzing...' : 'Analyze Codebase'}
          </Button>
        </div>
      </form>

      <div className="help-section">
        <h4>Tips:</h4>
        <ul>
          <li>Use absolute paths (e.g., <code>/home/user/project</code> or <code>C:\Users\user\project</code>)</li>
          <li>The analyzer will recursively find all Python (.py) files</li>
          <li>Large codebases may take longer to analyze</li>
          <li>Common directories like <code>__pycache__</code>, <code>.git</code>, and <code>node_modules</code> are automatically skipped</li>
        </ul>
      </div>
    </div>
  );
}; 