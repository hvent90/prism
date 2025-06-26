export type ViewType = 'inheritance' | 'callgraph';

export interface PanelSizes {
  code: number;
  main: number;
  rag: number;
}

export interface PanelLayout {
  orientation: 'horizontal' | 'vertical';
  sizes: PanelSizes;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: string;
}

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  code: 30,
  main: 45,
  rag: 25
};

export const VIEW_TITLES: Record<ViewType, string> = {
  inheritance: '🏗️ Class Inheritance',
  callgraph: '🔗 Function Call Graph'
}; 