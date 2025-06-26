export interface ASTNode {
  type: string;
  children?: ASTNode[];
  value?: any;
  lineno?: number;
  col_offset?: number;
  end_lineno?: number;
  end_col_offset?: number;
}

export interface InheritanceData {
  classes: ClassInfo[];
  relationships: InheritanceRelationship[];
}

export interface ClassInfo {
  name: string;
  bases: string[];
  methods: string[];
  attributes: string[];
  lineno: number;
}

export interface InheritanceRelationship {
  parent: string;
  child: string;
}

export interface CallGraphData {
  functions: FunctionInfo[];
  calls: CallRelationship[];
}

export interface FunctionInfo {
  name: string;
  args: string[];
  lineno: number;
  docstring?: string;
}

export interface CallRelationship {
  caller: string;
  callee: string;
  line: number;
}

export interface AnalysisResult {
  ast: ASTNode[];
  inheritance: InheritanceData;
  callGraph: CallGraphData;
  error?: string;
}

export interface RAGResult {
  success: boolean;
  results: RAGItem[];
  visualization_data?: {
    inheritance: {
      classes: any[];
      functions: any[];
    };
    callgraph: {
      functions: any[];
      calls: any[];
    };
  };
}

export interface RAGItem {
  type: 'class' | 'function' | 'variable' | 'import';
  name: string;
  snippet: string;
  score: number;
  line_start?: number;
  line_end?: number;
  file_path?: string;
  ast_ref?: {
    col: number;
    end_col: number;
    end_line: number;
    line: number;
    node_id: string;
    node_path: string[];
    node_type: string;
  };
}

export interface ComprehensiveAnalysisResult {
  success: boolean;
  ast?: any;
  inheritance?: {
    classes: any[];
    functions: any[];
  };
  callgraph?: {
    functions: any[];
    calls: any[];
  };
  error?: string;
}

export interface CodebaseFileInfo {
  file_path: string;
  classes: any[];
  functions: any[];
  success: boolean;
  error?: string;
}

export interface CodebaseStatistics {
  total_classes: number;
  total_functions: number;
  total_calls: number;
  files_with_errors: number;
  directories_skipped: number;
}

export interface CodebaseAnalysisResult {
  success: boolean;
  directory_path: string;
  files_analyzed: number;
  files_found: number;
  skipped_directories: string[];
  statistics: CodebaseStatistics;
  files: CodebaseFileInfo[];
  combined_analysis: {
    inheritance: {
      classes: any[];
      functions: any[];
    };
    callgraph: {
      functions: any[];
      calls: any[];
    };
  };
  errors: string[];
  message?: string;
  error?: string;
}

export interface CodebaseRAGResult {
  success: boolean;
  query: string;
  directory_path: string;
  files_processed: number;
  chunks_processed: number;
  results: RAGItem[];
  skipped_directories: string[];
  visualization_data: {
    inheritance: {
      classes: any[];
      functions: any[];
    };
    callgraph: {
      functions: any[];
      calls: any[];
    };
  };
  message?: string;
  error?: string;
} 