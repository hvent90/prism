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
  query: string;
  results: RAGItem[];
  timestamp: string;
}

export interface RAGItem {
  type: 'class' | 'function' | 'variable' | 'import';
  name: string;
  content: string;
  relevance: number;
  context: string;
  line?: number;
} 