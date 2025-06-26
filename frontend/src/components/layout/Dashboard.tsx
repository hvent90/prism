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
        <div className="feature-icon">📊</div>
        <h4>AST Analysis</h4>
        <p>Visualize Abstract Syntax Trees</p>
      </div>
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
  const [activeView, setActiveView] = useState<ViewType>('ast');
  const [panelSizes, setPanelSizes] = useState<PanelSizes>(DEFAULT_PANEL_SIZES);
  
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
  } = useRAGQuery();

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

  const ragControls = (
    <Button
      variant="secondary"
      size="sm"
      title="Query History"
      onClick={() => {
        // Could implement a history dropdown here
        console.log('Query history:', queryHistory);
      }}
    >
      History
    </Button>
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
                {/* AST Visualization */}
                {activeView === 'ast' && analysis.ast && (
                  <div 
                    id="ast-viz-container" 
                    className="d3-visualization-wrapper"
                    style={{ width: '100%', height: '600px' }}
                    ref={(ref) => {
                      if (ref && analysis.ast) {
                        // Clear any existing visualization
                        ref.innerHTML = '';
                        
                        // Create unique container ID
                        const vizId = 'ast-viz-' + Date.now();
                        const vizDiv = document.createElement('div');
                        vizDiv.id = vizId;
                        vizDiv.style.width = '100%';
                        vizDiv.style.height = '100%';
                        ref.appendChild(vizDiv);
                        
                        // Render D3 visualization
                        setTimeout(() => {
                          D3Visualizations.renderAST(vizId, analysis.ast);
                        }, 0);
                      }
                    }}
                  />
                )}
                
                {/* Inheritance Visualization */}
                {activeView === 'inheritance' && analysis.inheritance && (
                  <div 
                    id="inheritance-viz-container" 
                    className="d3-visualization-wrapper"
                    style={{ width: '100%', height: '600px' }}
                    ref={(ref) => {
                      if (ref && analysis.inheritance) {
                        // Clear any existing visualization
                        ref.innerHTML = '';
                        
                        // Create unique container ID
                        const vizId = 'inheritance-viz-' + Date.now();
                        const vizDiv = document.createElement('div');
                        vizDiv.id = vizId;
                        vizDiv.style.width = '100%';
                        vizDiv.style.height = '100%';
                        ref.appendChild(vizDiv);
                        
                        // Render D3 visualization
                        setTimeout(() => {
                          D3Visualizations.renderInheritance(vizId, analysis.inheritance);
                        }, 0);
                      }
                    }}
                  />
                )}
                
                {/* Call Graph Visualization */}
                {activeView === 'callgraph' && analysis.callGraph && (
                  <div 
                    id="callgraph-viz-container" 
                    className="d3-visualization-wrapper"
                    style={{ width: '100%', height: '600px' }}
                    ref={(ref) => {
                      if (ref && analysis.callGraph) {
                        // Clear any existing visualization
                        ref.innerHTML = '';
                        
                        // Create unique container ID
                        const vizId = 'callgraph-viz-' + Date.now();
                        const vizDiv = document.createElement('div');
                        vizDiv.id = vizId;
                        vizDiv.style.width = '100%';
                        vizDiv.style.height = '100%';
                        ref.appendChild(vizDiv);
                        
                        // Render D3 visualization
                        setTimeout(() => {
                          D3Visualizations.renderCallGraph(vizId, analysis.callGraph);
                        }, 0);
                      }
                    }}
                  />
                )}
                
                {/* No Data Message */}
                {(!analysis.ast && activeView === 'ast') || 
                 (!analysis.inheritance && activeView === 'inheritance') || 
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