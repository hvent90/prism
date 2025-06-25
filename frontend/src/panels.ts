// Panel Resizer for Dashboard Layout
export class PanelResizer {
    private isDragging = false;
    private startX = 0;
    private startY = 0;
    private currentHandle: HTMLElement | null = null;
    private initialSizes: { [key: string]: number } = {};

    constructor() {
        this.setupResizeHandles();
    }

    private setupResizeHandles(): void {
        // const handles = document.querySelectorAll('.resize-handle');
        
        // handles.forEach(handle => {
        //     handle.addEventListener('mousedown', (e) => this.startResize(e as MouseEvent));
        // });
        
        // document.addEventListener('mousemove', (e) => this.resize(e));
        // document.addEventListener('mouseup', () => this.stopResize());
        
        // // Touch support for mobile
        // handles.forEach(handle => {
        //     handle.addEventListener('touchstart', (e) => this.startResize(e as TouchEvent));
        // });
        
        // document.addEventListener('touchmove', (e) => this.resize(e));
        // document.addEventListener('touchend', () => this.stopResize());
    }

    private startResize(e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        
        this.isDragging = true;
        this.currentHandle = e.target as HTMLElement;
        
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        
        this.startX = clientX;
        this.startY = clientY;
        
        // Store initial sizes
        this.storeInitialSizes();
        
        // Set cursor style
        document.body.style.cursor = this.currentHandle.classList.contains('resize-vertical') 
            ? 'col-resize' : 'row-resize';
        
        // Add dragging class for visual feedback
        document.body.classList.add('resizing');
        this.currentHandle.classList.add('active');
    }

    private resize(e: MouseEvent | TouchEvent): void {
        if (!this.isDragging || !this.currentHandle) return;
        
        e.preventDefault();
        
        const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
        
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;
        
        if (this.currentHandle.classList.contains('resize-vertical')) {
            this.handleVerticalResize(deltaX);
        } else if (this.currentHandle.classList.contains('resize-horizontal')) {
            this.handleHorizontalResize(deltaY);
        }
    }

    private stopResize(): void {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        document.body.style.cursor = '';
        document.body.classList.remove('resizing');
        
        if (this.currentHandle) {
            this.currentHandle.classList.remove('active');
            this.currentHandle = null;
        }
        
        this.savePanelSizes();
    }

    private storeInitialSizes(): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return;
        
        const computedStyle = window.getComputedStyle(grid);
        const columns = computedStyle.gridTemplateColumns.split(' ');
        const rows = computedStyle.gridTemplateRows.split(' ');
        
        this.initialSizes = {
            col1: this.parseSize(columns[0]),
            col2: this.parseSize(columns[1]),
            col3: this.parseSize(columns[2]),
            row1: this.parseSize(rows[0])
        };
    }

    private parseSize(size: string): number {
        if (size.endsWith('px')) {
            return parseInt(size);
        } else if (size.endsWith('fr')) {
            return parseFloat(size);
        }
        return 1;
    }

    private handleVerticalResize(deltaX: number): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return;
        
        const containerWidth = grid.offsetWidth;
        const deltaPercent = (deltaX / containerWidth) * 100;
        
        // Get current column sizes
        const computedStyle = window.getComputedStyle(grid);
        const columns = computedStyle.gridTemplateColumns.split(' ');
        
        // Calculate new sizes
        let col1Size = this.parseSize(columns[0]);
        let col2Size = this.parseSize(columns[1]);
        let col3Size = this.parseSize(columns[2]);
        
        // Convert to percentages if needed
        if (columns[0].endsWith('fr')) {
            const totalFr = col1Size + col2Size + col3Size;
            col1Size = (col1Size / totalFr) * 100;
            col2Size = (col2Size / totalFr) * 100;
            col3Size = (col3Size / totalFr) * 100;
        }
        
        // Adjust sizes
        const newCol1 = Math.max(15, Math.min(60, col1Size + deltaPercent));
        const newCol2 = Math.max(20, col2Size - deltaPercent);
        
        // Apply new sizes
        if (newCol1 >= 15 && newCol1 <= 60 && newCol2 >= 20) {
            grid.style.gridTemplateColumns = `${newCol1}% ${newCol2}% ${col3Size}%`;
        }
    }

    private handleHorizontalResize(deltaY: number): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return;
        
        // Only apply horizontal resize in mobile layout
        const isMobileLayout = window.innerWidth <= 1024;
        if (!isMobileLayout) return;
        
        const containerHeight = grid.offsetHeight;
        const deltaPercent = (deltaY / containerHeight) * 100;
        
        // Get current row sizes
        const computedStyle = window.getComputedStyle(grid);
        const rows = computedStyle.gridTemplateRows.split(' ');
        
        if (rows.length < 3) return;
        
        // Calculate new sizes
        let row1Size = this.parseSize(rows[0]);
        let row2Size = this.parseSize(rows[1]);
        let row3Size = this.parseSize(rows[2]);
        
        // Convert to pixels if needed
        if (rows[0].endsWith('fr')) {
            const totalFr = row1Size + row2Size + row3Size;
            row1Size = (row1Size / totalFr) * containerHeight;
            row2Size = (row2Size / totalFr) * containerHeight;
            row3Size = (row3Size / totalFr) * containerHeight;
        }
        
        // Adjust sizes
        const newRow2 = Math.max(200, row2Size + deltaY);
        const newRow3 = Math.max(150, row3Size - deltaY);
        
        // Apply new sizes
        if (newRow2 >= 200 && newRow3 >= 150) {
            grid.style.gridTemplateRows = `${row1Size}px ${newRow2}px ${newRow3}px`;
        }
    }

    private savePanelSizes(): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return;
        
        const computedStyle = window.getComputedStyle(grid);
        const layout = {
            columns: computedStyle.gridTemplateColumns,
            rows: computedStyle.gridTemplateRows,
            timestamp: Date.now()
        };
        
        localStorage.setItem('prism-panel-layout', JSON.stringify(layout));
    }

    public loadSavedLayout(): void {
        const saved = localStorage.getItem('prism-panel-layout');
        if (!saved) return;
        
        try {
            const layout = JSON.parse(saved);
            const grid = document.querySelector('.dashboard-grid') as HTMLElement;
            
            if (grid && layout.columns) {
                // Only apply saved layout if it's reasonable
                if (this.isLayoutValid(layout)) {
                    grid.style.gridTemplateColumns = layout.columns;
                    if (layout.rows && window.innerWidth <= 1024) {
                        grid.style.gridTemplateRows = layout.rows;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load saved panel layout:', error);
        }
    }

    private isLayoutValid(layout: any): boolean {
        // Basic validation to ensure layout is reasonable
        if (!layout.columns || typeof layout.columns !== 'string') return false;
        
        const columns = layout.columns.split(' ');
        if (columns.length !== 3) return false;
        
        // Check if all columns have reasonable sizes
        return columns.every((col: string) => {
            const size = parseFloat(col);
            return !isNaN(size) && size > 0;
        });
    }

    public resetLayout(): void {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return;
        
        // Reset to default layout
        if (window.innerWidth <= 1024) {
            grid.style.gridTemplateColumns = '1fr';
            grid.style.gridTemplateRows = '300px 1fr 250px';
        } else {
            grid.style.gridTemplateColumns = '1fr 2fr 1fr';
            grid.style.gridTemplateRows = '1fr';
        }
        
        // Clear saved layout
        localStorage.removeItem('prism-panel-layout');
    }

    public getCurrentLayout(): { columns: string; rows: string } {
        const grid = document.querySelector('.dashboard-grid') as HTMLElement;
        if (!grid) return { columns: '', rows: '' };
        
        const computedStyle = window.getComputedStyle(grid);
        return {
            columns: computedStyle.gridTemplateColumns,
            rows: computedStyle.gridTemplateRows
        };
    }
} 