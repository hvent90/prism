# React Frontend Rewrite

## 📋 **Feature Overview**
Rewrite the current TypeScript/vanilla JavaScript frontend in React, maintaining the existing functionality while improving maintainability, component reusability, and development experience. The rewrite should be sane, concise, and avoid overengineering for potential future challenges.

## 🎯 **Goals**
- **Modern React architecture**: Leverage React 18+ with functional components and hooks
- **Maintainable codebase**: Clear component structure and separation of concerns
- **Performance optimization**: Efficient rendering and state management
- **Type safety**: Continue using TypeScript with proper React types
- **Developer experience**: Better tooling, hot reload, and debugging capabilities
- **Component reusability**: Modular design for easy maintenance and feature additions

## 🔧 **Technical Requirements**

### **Phase 1 - Core Migration**
- [ ] **Project setup**: Create React app with TypeScript and necessary tooling
- [ ] **Component architecture**: Break down existing functionality into logical React components
- [ ] **State management**: Implement local state with useState/useReducer (avoid Redux unless necessary)
- [ ] **API integration**: Migrate existing backend calls to React patterns (custom hooks)
- [ ] **Styling approach**: Choose between CSS modules, styled-components, or Tailwind CSS
- [ ] **Build system**: Configure Vite for React with TypeScript support

### **Phase 2 - Feature Parity**
- [ ] **Dashboard layout**: Recreate existing three-panel dashboard in React
- [ ] **Code editor integration**: Integrate Monaco Editor as a React component
- [ ] **D3 visualizations**: Wrap existing D3 code in React components with proper lifecycle management
- [ ] **RAG interface**: Convert RAG query interface to React components
- [ ] **Panel management**: Implement resizable panels with React state

## 🏗️ **Implementation Plan**

### **1. Project Setup & Architecture**

#### **A. Setup React in Existing Frontend**
**IMPORTANT: Work within the existing `frontend/` directory - do NOT create a new project.**

```bash
# Navigate to existing frontend directory
cd frontend

# Install React dependencies (keeping existing Vite + TypeScript setup)
npm install --save react react-dom @types/react @types/react-dom
npm install --save @monaco-editor/react d3 @types/d3
npm install -D --save-dev @testing-library/react @testing-library/jest-dom vitest

# Update vite.config.ts for React
```

#### **B. Updated Project Structure (within existing frontend/)**
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── Panel/
│   │   │   └── LoadingSpinner/
│   │   ├── layout/
│   │   │   ├── Dashboard/
│   │   │   ├── Header/
│   │   │   └── StatusBar/
│   │   ├── editor/
│   │   │   ├── CodeEditor/
│   │   │   └── EditorControls/
│   │   ├── visualizations/
│   │   │   ├── ASTView/
│   │   │   ├── InheritanceView/
│   │   │   ├── CallGraphView/
│   │   │   └── VisualizationContainer/
│   │   └── rag/
│   │       ├── QueryInput/
│   │       ├── ResultsList/
│   │       └── RAGPanel/
│   ├── hooks/
│   │   ├── useAPI.ts
│   │   ├── useCodeAnalysis.ts
│   │   ├── useRAGQuery.ts
│   │   └── usePanelResize.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── codeProcessor.ts
│   │   └── visualization.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── code.ts
│   │   └── visualization.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── components/
│   ├── App.tsx
│   └── main.tsx (React entry point)
├── index.html (update for React)
├── package.json (update dependencies)
├── vite.config.ts (configure for React)
└── tsconfig.json (update for React)
```

### **2. Component Design Principles**

#### **A. Keep Components Simple**
- Single responsibility principle
- Props interface clearly defined
- Minimal state per component
- Avoid deep nesting

#### **B. Custom Hooks for Logic**
```typescript
// Example: Code analysis hook
export const useCodeAnalysis = () => {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeCode = useCallback(async (codeInput: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeCode(codeInput);
      setAnalysis(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { code, setCode, analysis, loading, error, analyzeCode };
};
```

#### **C. TypeScript Integration**
```typescript
// Component props interface
interface DashboardProps {
  className?: string;
  initialLayout?: PanelLayout;
}

// API response types
interface AnalysisResult {
  ast: ASTNode[];
  inheritance: InheritanceData;
  callGraph: CallGraphData;
}
```

### **3. Migration Strategy**

#### **A. Incremental Migration**
1. **Start with layout components**: Header, Dashboard, Panels
2. **Add editor integration**: Monaco Editor wrapper
3. **Migrate visualizations**: D3 components with React lifecycle
4. **Convert RAG interface**: Query input and results display
5. **Add interactions**: Panel resizing, view switching

#### **B. Testing Strategy**
```typescript
// Component testing example
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

test('should update code when typing', () => {
  const mockOnChange = jest.fn();
  render(<CodeEditor value="" onChange={mockOnChange} />);
  
  const editor = screen.getByRole('textbox');
  fireEvent.change(editor, { target: { value: 'print("hello")' } });
  
  expect(mockOnChange).toHaveBeenCalledWith('print("hello")');
});
```

#### **C. D3 Integration Pattern**
```typescript
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface D3VisualizationProps {
  data: any;
  width: number;
  height: number;
}

export const D3Visualization: React.FC<D3VisualizationProps> = ({ 
  data, 
  width, 
  height 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    // D3 visualization logic here
    
    return () => {
      // Cleanup D3 elements
      svg.selectAll('*').remove();
    };
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
};
```

### **4. Key Components**

#### **A. App Component**
```typescript
function App() {
  const [activeView, setActiveView] = useState<ViewType>('ast');
  const [panelSizes, setPanelSizes] = useState(DEFAULT_PANEL_SIZES);
  
  return (
    <div className="app">
      <Header />
      <Dashboard
        activeView={activeView}
        onViewChange={setActiveView}
        panelSizes={panelSizes}
        onPanelResize={setPanelSizes}
      />
      <StatusBar />
    </div>
  );
}
```

#### **B. Dashboard Component**
```typescript
interface DashboardProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  panelSizes: PanelSizes;
  onPanelResize: (sizes: PanelSizes) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeView,
  onViewChange,
  panelSizes,
  onPanelResize
}) => {
  const { code, setCode, analysis, loading, error, analyzeCode } = useCodeAnalysis();
  
  return (
    <div className="dashboard">
      <Panel size={panelSizes.code} title="Python Code">
        <CodeEditor value={code} onChange={setCode} />
        <Button onClick={() => analyzeCode(code)} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Code'}
        </Button>
      </Panel>
      
      <Panel size={panelSizes.main} title="Visualization">
        <ViewSwitcher activeView={activeView} onViewChange={onViewChange} />
        <VisualizationContainer 
          view={activeView} 
          data={analysis} 
          loading={loading}
          error={error}
        />
      </Panel>
      
      <Panel size={panelSizes.rag} title="RAG Query">
        <RAGPanel codeData={analysis} />
      </Panel>
      
      <ResizeHandles onResize={onPanelResize} />
    </div>
  );
};
```

## 📚 **Migration Checklist**

### **Setup**
- [ ] Setup React in existing frontend directory (NOT a new project)
- [ ] Configure Vite build system
- [ ] Set up ESLint and Prettier
- [ ] Install necessary dependencies
- [ ] Configure TypeScript paths and aliases

### **Core Components**
- [ ] App shell component
- [ ] Dashboard layout component
- [ ] Header and status bar components
- [ ] Panel component with resize functionality
- [ ] Button and common UI components

### **Editor Integration**
- [ ] Monaco Editor React wrapper
- [ ] Code formatting and validation
- [ ] Editor controls and actions
- [ ] Syntax highlighting for Python

### **Visualizations**
- [ ] AST visualization component
- [ ] Inheritance graph component
- [ ] Call graph visualization
- [ ] D3 React integration patterns
- [ ] View switching mechanism

### **RAG Interface**
- [ ] Query input component
- [ ] Results display component
- [ ] Search functionality
- [ ] Results highlighting

### **State Management**
- [ ] Code analysis state
- [ ] UI state (panels, views)
- [ ] RAG query state
- [ ] Error handling state

### **API Integration**
- [ ] API service layer
- [ ] Custom hooks for API calls
- [ ] Loading and error states
- [ ] Response type definitions

### **Final Steps**
- [ ] Documentation updates

## 🎨 **Design Principles**

### **Simplicity First**
- Use built-in React patterns over third-party libraries
- Minimize dependencies and complexity
- Clear, readable component structure
- Straightforward state management

### **Performance Awareness**
- Optimize only when necessary
- Measure before optimizing
- Use React DevTools for profiling
- Consider code splitting for large features

### **Maintainability**
- Consistent naming conventions
- Clear component boundaries
- Proper TypeScript usage
- Comprehensive error handling

### **Future-Proofing Without Over-Engineering**
- Use stable React patterns
- Avoid premature abstractions
- Keep components focused
- Document architectural decisions

## 📝 **Success Criteria**
- [ ] All existing functionality preserved
- [ ] Improved code maintainability and readability
- [ ] Better development experience with hot reload
- [ ] Type safety throughout the application
- [ ] Performance on par or better than current implementation
- [ ] Clean, testable component architecture
- [ ] Comprehensive test coverage
- [ ] Clear documentation for new developers

## 🚀 **Next Steps**
1. Set up React project with TypeScript
2. Create basic layout components
3. Migrate code editor functionality
4. Convert D3 visualizations to React components
5. Implement RAG interface in React
6. Add comprehensive testing
7. Performance optimization and final polish

---

**Priority**: Medium  
**Estimated Effort**: 2-3 weeks  
**Dependencies**: None  
**Risk Level**: Medium (Major frontend rewrite) 