import React from 'react';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  controls,
  className = '',
  style,
}) => {
  return (
    <section className={`panel ${className}`} style={style}>
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {controls && (
          <div className="panel-controls">
            {controls}
          </div>
        )}
      </div>
      <div className="panel-content">
        {children}
      </div>
    </section>
  );
}; 