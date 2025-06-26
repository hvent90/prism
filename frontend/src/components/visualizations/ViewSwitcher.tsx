import React from 'react';
import { ViewType, VIEW_TITLES } from '../../types/ui';
import { Button } from '../common/Button';

interface ViewSwitcherProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  activeView,
  onViewChange,
  className = '',
}) => {
  const views: ViewType[] = ['ast', 'inheritance', 'callgraph'];

  const getViewIcon = (view: ViewType): string => {
    switch (view) {
      case 'ast':
        return '📊';
      case 'inheritance':
        return '🏗️';
      case 'callgraph':
        return '🔗';
      default:
        return '📊';
    }
  };

  const getViewLabel = (view: ViewType): string => {
    switch (view) {
      case 'ast':
        return 'AST';
      case 'inheritance':
        return 'Inheritance';
      case 'callgraph':
        return 'Call Graph';
      default:
        return 'AST';
    }
  };

  return (
    <div className={`view-switcher ${className}`}>
      {views.map((view) => (
        <button
          key={view}
          className={`view-btn ${activeView === view ? 'active' : ''}`}
          onClick={() => onViewChange(view)}
          title={VIEW_TITLES[view]}
          data-view={view}
        >
          {getViewIcon(view)} {getViewLabel(view)}
        </button>
      ))}
    </div>
  );
}; 