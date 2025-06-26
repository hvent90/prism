import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/layout/Dashboard';
import { StatusBar } from './components/layout/StatusBar';
import { apiService } from './services/api';
import './styles/globals.css';

const App: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Connecting'>('Connecting');
  const [analysisStatus, setAnalysisStatus] = useState('No analysis');
  const [lineCount, setLineCount] = useState(0);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await apiService.getHealth();
        setConnectionStatus('Connected');
        setStatusMessage('Connected to backend');
      } catch (error) {
        setConnectionStatus('Disconnected');
        setStatusMessage('Backend not available');
      }
    };

    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for code changes to update line count
  useEffect(() => {
    const handleCodeChange = (event: CustomEvent) => {
      const code = event.detail?.code || '';
      const lines = code.split('\n').length;
      setLineCount(lines);
    };

    const handleAnalysisStart = () => {
      setAnalysisStatus('Analyzing...');
      setStatusMessage('Code analysis in progress');
    };

    const handleAnalysisComplete = () => {
      setAnalysisStatus('Analysis complete');
      setStatusMessage('Analysis completed successfully');
    };

    const handleAnalysisError = (event: CustomEvent) => {
      setAnalysisStatus('Analysis failed');
      setStatusMessage(`Analysis error: ${event.detail?.message || 'Unknown error'}`);
    };

    // These would be dispatched by the components
    document.addEventListener('codeChange', handleCodeChange as EventListener);
    document.addEventListener('analysisStart', handleAnalysisStart);
    document.addEventListener('analysisComplete', handleAnalysisComplete);
    document.addEventListener('analysisError', handleAnalysisError as EventListener);

    return () => {
      document.removeEventListener('codeChange', handleCodeChange as EventListener);
      document.removeEventListener('analysisStart', handleAnalysisStart);
      document.removeEventListener('analysisComplete', handleAnalysisComplete);
      document.removeEventListener('analysisError', handleAnalysisError as EventListener);
    };
  }, []);

  const handleLayoutToggle = () => {
    // This could toggle between different layout orientations
    setStatusMessage('Layout toggle not yet implemented');
  };

  return (
    <div className="app">
      <Header
        analysisStatus={analysisStatus}
        lineCount={lineCount}
        onLayoutToggle={handleLayoutToggle}
      />
      <Dashboard />
      <StatusBar
        statusMessage={statusMessage}
        connectionStatus={connectionStatus}
      />
    </div>
  );
};

export default App; 