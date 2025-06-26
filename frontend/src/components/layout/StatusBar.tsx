import React from 'react';

interface StatusBarProps {
  statusMessage: string;
  connectionStatus: 'Connected' | 'Disconnected' | 'Connecting';
  version?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  statusMessage,
  connectionStatus,
  version = 'v1.0',
}) => {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'Connected':
        return '🟢';
      case 'Connecting':
        return '🟡';
      case 'Disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-message">{statusMessage}</span>
      </div>
      <div className="status-right">
        <span className="status-item">Prism {version}</span>
        <span className="status-item">
          {getConnectionIcon()} {connectionStatus}
        </span>
      </div>
    </footer>
  );
}; 