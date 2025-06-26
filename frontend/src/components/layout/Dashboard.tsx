import React, { useState, useEffect, useCallback } from 'react';
import { ViewType, DEFAULT_PANEL_SIZES, PanelSizes, VIEW_TITLES } from '../../types/ui';
import { useCodeAnalysis } from '../../hooks/useCodeAnalysis';
import { useRAGQuery } from '../../hooks/useRAGQuery';
import { Panel } from '../common/Panel';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CodeEditor } from '../editor/CodeEditor';
import { ViewSwitcher } from '../visualizations/ViewSwitcher';
import { D3Visualization } from '../visualizations/D3Visualization';
import { QueryInput } from '../rag/QueryInput';
import { ResultsList } from '../rag/ResultsList';
import { D3Visualizations } from '../../d3-visualizations';
import { VisualizationCoordinator } from '../../ast-coordinator';
import * as d3 from 'd3';

interface DashboardProps {
  className?: string;
}

const WelcomeMessage: React.FC = () => (
  <div className="welcome-message">
    <h3>Welcome to Prism Dashboard</h3>
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
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<ViewType>('inheritance');
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  
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

  // Handle view switching for AST coordinator
  useEffect(() => {
    const event = new CustomEvent('visualization-view-switched', {
      detail: {
        newView: activeView,
        previousView: activeView, // Could track previous view if needed
        data: analysis
      }
    });
    document.dispatchEvent(event);
  }, [activeView, analysis]);

  // Store analysis data globally for AST coordinator
  useEffect(() => {
    if (analysis) {
      (window as any).prismDashboard = {
        getAnalysisData: () => analysis
      };
    }
  }, [analysis]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (code.trim()) {
              analyzeCode();
            }
            break;
          case 'k':
            e.preventDefault();
            setCode('');
            clearAnalysis();
            break;
        }
      }
    };

    const handleAnalyzeCodeEvent = () => {
      if (code.trim()) {
        analyzeCode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('analyzeCode', handleAnalyzeCodeEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('analyzeCode', handleAnalyzeCodeEvent);
    };
  }, [code, analyzeCode, setCode, clearAnalysis]);

  const handleFormatCode = useCallback(() => {
    // Basic Python formatting - this could be enhanced with a proper formatter
    const formatted = code
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Remove excessive blank lines
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
          History {queryHistory.length > 0 && `(${queryHistory.length})`}
        </Button>
        {showHistory && (
          <div className="history-dropdown">
            {queryHistory.length === 0 ? (
              <div className="history-empty">No query history yet</div>
            ) : (
              <>
                <div className="history-header">Recent Queries</div>
                {queryHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    className="history-item"
                    onClick={() => {
                      setQuery(historyQuery);
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
                       clearHistory();
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

  return (
    <main className={`dashboard-grid ${className}`}>
      {/* Code Input Panel */}
      <Panel
        title="📝 Code Input"
        controls={codeControls}
        className="code-panel"
        style={{ flexBasis: `${panelSizes.code}%` }}
      >
        <CodeEditor
          value={code}
          onChange={setCode}
          height="100%"
        />
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
          {analysisLoading && (
            <LoadingSpinner message="Analyzing code..." />
          )}
          
          {analysisError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {analysisError}
            </div>
          )}
          
          {!analysis && !analysisLoading && !analysisError && (
            <WelcomeMessage />
          )}
          
          {analysis && !analysisLoading && (
            <div className="analysis-display">
              <div className="visualization-container" id="viz-container">
                {/* Inheritance Visualization */}
                {activeView === 'inheritance' && analysis.inheritance && (
                  <div 
                    id="inheritance-visualization" 
                    className="d3-visualization-wrapper"
                    style={{ width: '100%', height: '600px' }}
                    ref={(ref) => {
                      if (ref && analysis.inheritance) {
                        // Clear any existing visualization
                        ref.innerHTML = '';
                        
                        // Render D3 visualization with fixed ID for AST coordinator
                        setTimeout(() => {
                          D3Visualizations.renderInheritance('inheritance-visualization', analysis.inheritance);
                          
                          // Dispatch visualization data update event
                          const event = new CustomEvent('visualization-data-updated', {
                            detail: {
                              view: 'inheritance',
                              data: analysis.inheritance
                            }
                          });
                          document.dispatchEvent(event);
                        }, 0);
                      }
                    }}
                  />
                )}
                
                {/* Call Graph Visualization */}
                {activeView === 'callgraph' && analysis.callGraph && (
                  <div 
                    id="callgraph-visualization" 
                    className="d3-visualization-wrapper"
                    style={{ width: '100%', height: '600px' }}
                    ref={(ref) => {
                      if (ref && analysis.callGraph) {
                        // Clear any existing visualization
                        ref.innerHTML = '';
                        
                        // Render D3 visualization with fixed ID for AST coordinator
                        setTimeout(() => {
                          D3Visualizations.renderCallGraph('callgraph-visualization', analysis.callGraph);
                          
                          // Dispatch visualization data update event
                          const event = new CustomEvent('visualization-data-updated', {
                            detail: {
                              view: 'callgraph',
                              data: analysis.callGraph
                            }
                          });
                          document.dispatchEvent(event);
                        }, 0);
                      }
                    }}
                  />
                )}
                
                {/* No Data Message */}
                {(!analysis.inheritance && activeView === 'inheritance') || 
                 (!analysis.callGraph && activeView === 'callgraph') ? (
                  <div className="no-data-message">
                    <h4>No {VIEW_TITLES[activeView]} Data</h4>
                    <p>Analyze Python code to see the {VIEW_TITLES[activeView]} visualization.</p>
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
            value={query}
            onChange={setQuery}
            onSubmit={handleRAGQuery}
            loading={ragLoading}
          />
          <div className="results-section">
            <ResultsList
              results={ragResults}
              loading={ragLoading}
              error={ragError}
            />
          </div>
        </div>
      </Panel>

      {/* Mobile Resize Handle */}
      <div className="resize-handle resize-horizontal mobile-only"></div>
    </main>
  );
}; 