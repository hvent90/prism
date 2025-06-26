import React, { useState, useEffect, useCallback } from 'react';
import { ViewType, DEFAULT_PANEL_SIZES, PanelSizes, VIEW_TITLES, AnalysisMode } from '../../types/ui';
import { useCodeAnalysis } from '../../hooks/useCodeAnalysis';
import { useRAGQuery } from '../../hooks/useRAGQuery';
import { useCodebaseAnalysis } from '../../hooks/useCodebaseAnalysis';
import { useCodebaseRAG } from '../../hooks/useCodebaseRAG';
import { Panel } from '../common/Panel';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CodeEditor } from '../editor/CodeEditor';
import { ViewSwitcher } from '../visualizations/ViewSwitcher';
import { D3Visualization } from '../visualizations/D3Visualization';
import { QueryInput } from '../rag/QueryInput';
import { ResultsList } from '../rag/ResultsList';
import { DirectorySelector } from '../codebase/DirectorySelector';
import { CodebaseResults } from '../codebase/CodebaseResults';
import { ModeSelector } from './ModeSelector';
import { D3Visualizations } from '../../d3-visualizations';
import { VisualizationCoordinator } from '../../ast-coordinator';
import * as d3 from 'd3';

interface DashboardProps {
  className?: string;
}

const WelcomeMessage: React.FC<{ mode: AnalysisMode }> = ({ mode }) => (
  <div className="welcome-message">
    <h3>Welcome to Prism Dashboard</h3>
    {mode === 'code' ? (
      <>
        <p>Enter Python code in the left panel and click "Analyze Code" to get started.</p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🏗️</div>
            <h4>Inheritance</h4>
            <p>Explore class hierarchies</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h4>Call Graph</h4>
            <p>Understand function relationships</p>
          </div>
        </div>
      </>
    ) : (
      <>
        <p>Specify a directory path to analyze an entire Python codebase.</p>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h4>Codebase Analysis</h4>
            <p>Analyze entire Python projects</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h4>Semantic Search</h4>
            <p>Query your codebase with natural language</p>
          </div>
        </div>
      </>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<ViewType>('inheritance');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('code');
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  
  // Initialize AST visualization coordinator
  useEffect(() => {
    const coordinator = new VisualizationCoordinator();
    
    // Store reference globally for access by other components
    (window as any).astCoordinator = coordinator;
    
    return () => {
      // Cleanup if needed
      delete (window as any).astCoordinator;
    };
    }, []);

  // Code analysis hooks
  const {
    code,
    setCode,
    analysis,
    loading: analysisLoading,
    error: analysisError,
    analyzeCode,
    clearAnalysis,
  } = useCodeAnalysis();

  const {
    query,
    setQuery,
    results: ragResults,
    loading: ragLoading,
    error: ragError,
    executeQuery,
    clearResults,
    queryHistory,
    clearHistory,
  } = useRAGQuery();

  // Codebase analysis hooks
  const {
    result: codebaseResult,
    loading: codebaseLoading,
    error: codebaseError,
    analyzeCodebase,
    clearResult: clearCodebaseResult,
  } = useCodebaseAnalysis();

  const {
    query: codebaseQuery,
    setQuery: setCodebaseQuery,
    result: codebaseRAGResult,
    loading: codebaseRAGLoading,
    error: codebaseRAGError,
    queryCodebase,
    clearResult: clearCodebaseRAGResult,
    queryHistory: codebaseQueryHistory,
    clearHistory: clearCodebaseQueryHistory,
  } = useCodebaseRAG();

  // Handle mode switching
  const handleModeChange = useCallback((mode: AnalysisMode) => {
    setAnalysisMode(mode);
    // Clear previous results when switching modes
    if (mode === 'code') {
      clearCodebaseResult();
      clearCodebaseRAGResult();
    } else {
      clearAnalysis();
      clearResults();
    }
  }, [clearAnalysis, clearResults, clearCodebaseResult, clearCodebaseRAGResult]);

  // Handle codebase directory selection
  const handleDirectorySelected = useCallback((directoryPath: string, maxFiles: number) => {
    setCurrentDirectory(directoryPath);
    analyzeCodebase(directoryPath, maxFiles);
  }, [analyzeCodebase]);

  // Handle codebase RAG query
  const handleCodebaseRAGQuery = useCallback(() => {
    if (codebaseQuery.trim() && currentDirectory) {
      queryCodebase(currentDirectory, codebaseQuery);
    }
  }, [codebaseQuery, currentDirectory, queryCodebase]);

  // Get current analysis data for visualizations
  const getCurrentAnalysisData = useCallback(() => {
    if (analysisMode === 'code') {
      return analysis;
    } else if (codebaseResult?.success) {
      return {
        inheritance: codebaseResult.combined_analysis.inheritance,
        callGraph: codebaseResult.combined_analysis.callgraph,
      };
    }
    return null;
  }, [analysisMode, analysis, codebaseResult]);

  // Handle view switching for AST coordinator
  useEffect(() => {
    const currentData = getCurrentAnalysisData();
    const event = new CustomEvent('visualization-view-switched', {
      detail: {
        newView: activeView,
        previousView: activeView,
        data: currentData
      }
    });
    document.dispatchEvent(event);
  }, [activeView, getCurrentAnalysisData]);

  // Store analysis data globally for AST coordinator
  useEffect(() => {
    const currentData = getCurrentAnalysisData();
    if (currentData) {
      (window as any).prismDashboard = {
        getAnalysisData: () => currentData
      };
    }
  }, [getCurrentAnalysisData]);

  // Handle visualization rendering
  useEffect(() => {
    const currentData = getCurrentAnalysisData();
    if (currentData && activeView === 'inheritance' && currentData.inheritance) {
      const element = document.getElementById('inheritance-visualization');
      if (element) {
        element.innerHTML = '';
        
        setTimeout(() => {
          D3Visualizations.renderInheritance('inheritance-visualization', currentData.inheritance);
          
          const event = new CustomEvent('visualization-data-updated', {
            detail: {
              view: 'inheritance',
              data: currentData.inheritance
            }
          });
          document.dispatchEvent(event);
        }, 0);
      }
    }
  }, [getCurrentAnalysisData, activeView]);

  useEffect(() => {
    const currentData = getCurrentAnalysisData();
    if (currentData && activeView === 'callgraph' && currentData.callGraph) {
      const element = document.getElementById('callgraph-visualization');
      if (element) {
        element.innerHTML = '';
        
        setTimeout(() => {
          D3Visualizations.renderCallGraph('callgraph-visualization', currentData.callGraph);
          
          const event = new CustomEvent('visualization-data-updated', {
            detail: {
              view: 'callgraph',
              data: currentData.callGraph
            }
          });
          document.dispatchEvent(event);
        }, 0);
      }
    }
  }, [getCurrentAnalysisData, activeView]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (analysisMode === 'code' && code.trim()) {
              analyzeCode();
            }
            break;
          case 'k':
            e.preventDefault();
            if (analysisMode === 'code') {
              setCode('');
              clearAnalysis();
            }
            break;
        }
      }
    };

    const handleAnalyzeCodeEvent = () => {
      if (analysisMode === 'code' && code.trim()) {
        analyzeCode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('analyzeCode', handleAnalyzeCodeEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('analyzeCode', handleAnalyzeCodeEvent);
    };
  }, [analysisMode, code, analyzeCode, setCode, clearAnalysis]);

  const handleFormatCode = useCallback(() => {
    const formatted = code
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
    setCode(formatted);
  }, [code, setCode]);

  const handleClearCode = useCallback(() => {
    setCode('');
    clearAnalysis();
    clearResults();
  }, [setCode, clearAnalysis, clearResults]);

  const handleRAGQuery = useCallback(() => {
    if (query.trim()) {
      executeQuery(query, code);
    }
  }, [query, executeQuery, code]);

  // Controls for different modes
  const codeControls = (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleFormatCode}
        title="Format Code (Ctrl+Shift+F)"
      >
        Format
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleClearCode}
        title="Clear Code (Ctrl+K)"
      >
        Clear
      </Button>
      <Button
        onClick={() => analyzeCode()}
        disabled={analysisLoading || !code.trim()}
        title="Analyze Code (Ctrl+Enter)"
      >
        <span className="icon">🔍</span>
        {analysisLoading ? 'Analyzing...' : 'Analyze'}
      </Button>
    </>
  );

  const [showHistory, setShowHistory] = useState(false);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showHistory && !target.closest('.history-dropdown-container')) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showHistory]);

  const getCurrentRAGResults = () => {
    if (analysisMode === 'code') {
      return ragResults;
    } else if (codebaseRAGResult) {
      return {
        success: codebaseRAGResult.success,
        results: codebaseRAGResult.results,
        visualization_data: codebaseRAGResult.visualization_data
      };
    }
    return null;
  };

  const getRagQuery = () => {
    return analysisMode === 'code' ? query : codebaseQuery;
  };

  const setRagQuery = (q: string) => {
    if (analysisMode === 'code') {
      setQuery(q);
    } else {
      setCodebaseQuery(q);
    }
  };

  const getRagHistory = () => {
    return analysisMode === 'code' ? queryHistory : codebaseQueryHistory;
  };

  const clearRagHistory = () => {
    if (analysisMode === 'code') {
      clearHistory();
    } else {
      clearCodebaseQueryHistory();
    }
  };

  const getCurrentRAGLoading = () => {
    return analysisMode === 'code' ? ragLoading : codebaseRAGLoading;
  };

  const getCurrentRAGError = (): string | null => {
    return analysisMode === 'code' ? ragError : codebaseRAGError;
  };

  const handleCurrentRAGQuery = () => {
    if (analysisMode === 'code') {
      handleRAGQuery();
    } else {
      handleCodebaseRAGQuery();
    }
  };

  const ragControls = (
    <div className="rag-controls">
      <div className="history-dropdown-container">
        <Button
          variant="secondary"
          size="sm"
          title="Query History"
          onClick={() => setShowHistory(!showHistory)}
          className={showHistory ? 'active' : ''}
        >
          History {getRagHistory().length > 0 && `(${getRagHistory().length})`}
        </Button>
        {showHistory && (
          <div className="history-dropdown">
            {getRagHistory().length === 0 ? (
              <div className="history-empty">No query history yet</div>
            ) : (
              <>
                <div className="history-header">Recent Queries</div>
                {getRagHistory().map((historyQuery, index) => (
                  <button
                    key={index}
                    className="history-item"
                    onClick={() => {
                      setRagQuery(historyQuery);
                      setShowHistory(false);
                    }}
                    title={`Click to use: ${historyQuery}`}
                  >
                    {historyQuery}
                  </button>
                ))}
                <div className="history-footer">
                  <button
                    className="history-clear"
                    onClick={() => {
                      clearRagHistory();
                      setShowHistory(false);
                    }}
                    title="Clear all history"
                  >
                    Clear History
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const getCurrentAnalysisLoading = () => {
    return analysisMode === 'code' ? analysisLoading : codebaseLoading;
  };

  const getCurrentAnalysisError = () => {
    return analysisMode === 'code' ? analysisError : codebaseError;
  };

  const hasCurrentAnalysisData = () => {
    return getCurrentAnalysisData() !== null;
  };

  return (
    <div className={`dashboard-container ${className}`}>
      {/* Mode Selector */}
      <div className="mode-selector-container">
        <ModeSelector
          activeMode={analysisMode}
          onModeChange={handleModeChange}
          disabled={getCurrentAnalysisLoading()}
        />
      </div>

      {/* Main Dashboard Grid */}
      <main className="dashboard-grid">
        {/* Input Panel */}
        <Panel
          title={analysisMode === 'code' ? '📝 Code Input' : '📁 Codebase Selection'}
          controls={analysisMode === 'code' ? codeControls : undefined}
          className={analysisMode === 'code' ? 'code-panel' : 'input-panel'}
          style={{ flexBasis: `${panelSizes.code}%` }}
        >
          {analysisMode === 'code' ? (
            <CodeEditor
              value={code}
              onChange={setCode}
              height="100%"
            />
          ) : (
            <div className="codebase-input">
              <DirectorySelector
                onDirectorySelected={handleDirectorySelected}
                loading={codebaseLoading}
                error={codebaseError}
              />
              {codebaseResult && (
                <CodebaseResults result={codebaseResult} />
              )}
            </div>
          )}
        </Panel>

        {/* Resize Handle */}
        <div className="resize-handle resize-vertical"></div>

        {/* Main Display Panel */}
        <Panel
          title={VIEW_TITLES[activeView]}
          controls={<ViewSwitcher activeView={activeView} onViewChange={setActiveView} />}
          className="main-panel"
          style={{ flexBasis: `${panelSizes.main}%` }}
        >
          <div className="visualization-container">
            {getCurrentAnalysisLoading() && (
              <LoadingSpinner message={`Analyzing ${analysisMode === 'code' ? 'code' : 'codebase'}...`} />
            )}
            
            {getCurrentAnalysisError() && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {getCurrentAnalysisError()}
              </div>
            )}
            
            {!hasCurrentAnalysisData() && !getCurrentAnalysisLoading() && !getCurrentAnalysisError() && (
              <WelcomeMessage mode={analysisMode} />
            )}
            
            {hasCurrentAnalysisData() && !getCurrentAnalysisLoading() && (
              <div className="analysis-display">
                <div className="visualization-container" id="viz-container">
                  {/* Inheritance Visualization */}
                  {activeView === 'inheritance' && getCurrentAnalysisData()?.inheritance && (
                    <div 
                      id="inheritance-visualization" 
                      className="d3-visualization-wrapper"
                      style={{ width: '100%', height: '600px' }}
                    />
                  )}
                  
                  {/* Call Graph Visualization */}
                  {activeView === 'callgraph' && getCurrentAnalysisData()?.callGraph && (
                    <div 
                      id="callgraph-visualization" 
                      className="d3-visualization-wrapper"
                      style={{ width: '100%', height: '600px' }}
                    />
                  )}
                  
                  {/* No Data Message */}
                  {(!getCurrentAnalysisData()?.inheritance && activeView === 'inheritance') || 
                   (!getCurrentAnalysisData()?.callGraph && activeView === 'callgraph') ? (
                    <div className="no-data-message">
                      <h4>No {VIEW_TITLES[activeView]} Data</h4>
                      <p>Analyze {analysisMode === 'code' ? 'Python code' : 'a codebase'} to see the {VIEW_TITLES[activeView]} visualization.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Resize Handle */}
        <div className="resize-handle resize-vertical"></div>

        {/* RAG Query Panel */}
        <Panel
          title="🤖 RAG Query"
          controls={ragControls}
          className="rag-panel"
          style={{ flexBasis: `${panelSizes.rag}%` }}
        >
          <div className="rag-content">
            <QueryInput
              value={getRagQuery()}
              onChange={setRagQuery}
              onSubmit={handleCurrentRAGQuery}
              loading={getCurrentRAGLoading()}
              placeholder={
                analysisMode === 'codebase' && !currentDirectory
                  ? 'Select a directory first to query the codebase...'
                  : 'Ask a question about the code...'
              }
            />
            <div className="results-section">
              <ResultsList
                results={getCurrentRAGResults()}
                loading={getCurrentRAGLoading()}
                error={getCurrentRAGError()}
              />
            </div>
          </div>
        </Panel>

        {/* Mobile Resize Handle */}
        <div className="resize-handle resize-horizontal mobile-only"></div>
      </main>
    </div>
  );
}; 