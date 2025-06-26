import React from 'react';
import { AnalysisMode, ANALYSIS_MODE_TITLES } from '../../types/ui';
import { Button } from '../common/Button';

interface ModeSelectorProps {
  activeMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  activeMode, 
  onModeChange, 
  disabled = false 
}) => {
  return (
    <div className="mode-selector">
      <div className="mode-label">Analysis Mode:</div>
      <div className="mode-buttons">
        {(Object.keys(ANALYSIS_MODE_TITLES) as AnalysisMode[]).map((mode) => (
          <Button
            key={mode}
            onClick={() => onModeChange(mode)}
            variant={activeMode === mode ? 'primary' : 'secondary'}
            size="sm"
            disabled={disabled}
            title={`Switch to ${ANALYSIS_MODE_TITLES[mode]}`}
          >
            {ANALYSIS_MODE_TITLES[mode]}
          </Button>
        ))}
      </div>
    </div>
  );
}; 