import React from 'react';
import { Button } from '../common/Button';

interface HeaderProps {
  analysisStatus: string;
  lineCount: number;
  onLayoutToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  analysisStatus,
  lineCount,
  onLayoutToggle,
}) => {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="dashboard-title">
          <span className="logo">🔮</span>
          Prism Dashboard
        </h1>
      </div>
      <div className="header-center">
        <div className="analysis-info">
          <span className="analysis-status">{analysisStatus}</span>
          <span className="line-count">{lineCount} lines</span>
        </div>
      </div>
      <div className="header-right">
        <Button
          variant="secondary"
          onClick={onLayoutToggle}
          title="Toggle Layout"
        >
          <span className="icon">⚡</span>
          Layout
        </Button>
      </div>
    </header>
  );
}; 