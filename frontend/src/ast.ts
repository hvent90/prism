// Type definitions for AST nodes
interface ASTNode {
    type: string;
    name?: string;
    id?: string;
    value?: any;
    func?: ASTNode;
    targets?: ASTNode[];
    op?: { type: string };
    [key: string]: any;
}

interface ASTResponse {
    success: boolean;
    ast?: ASTNode;
    error?: string;
}

interface HierarchyNode {
    name: string;
    details: string;
    label: string;
    children?: HierarchyNode[];
}

// D3.js type definitions (basic ones needed for this code)
declare const d3: {
    zoom: () => {
        scaleExtent: (extent: [number, number]) => any;
        on: (event: string, handler: (event: any) => void) => any;
        transform: (selection: any, transform: any) => any;
        scaleBy: (selection: any, scale: number) => any;
    };
    tree: () => {
        size: (size: [number, number]) => any;
    };
    hierarchy: (data: any) => any;
    linkHorizontal: () => {
        x: (accessor: (d: any) => number) => any;
        y: (accessor: (d: any) => number) => any;
    };
    select: (selector: string | Element) => any;
    zoomIdentity: any;
};

// Global variables
let currentAST: ASTNode | null = null;
let currentView: 'graph' | 'json' = 'graph';
let zoom = d3.zoom().scaleExtent([0.1, 3]);

function extractAST(): void {
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const status = document.getElementById('status') as HTMLDivElement;
    
    const code = codeInput.value.trim();
    
    if (!code) {
        status.innerHTML = '<div class="error">Please enter some Python code</div>';
        return;
    }
    
    status.innerHTML = '<div class="success">Processing...</div>';
    
    fetch('http://localhost:5000/api/ast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code })
    })
    .then((response: Response) => response.json())
    .then((data: ASTResponse) => {
        if (data.success && data.ast) {
            currentAST = data.ast;
            renderAST(data.ast);
            status.innerHTML = '<div class="success">AST extracted successfully!</div>';
        } else {
            status.innerHTML = '<div class="error">Error: ' + (data.error || 'Unknown error') + '</div>';
        }
    })
    .catch((error: Error) => {
        status.innerHTML = '<div class="error">Connection error: ' + error.message + '</div>';
    });
}

function renderAST(ast: ASTNode): void {
    if (currentView === 'graph') {
        renderGraph(ast);
    } else {
        renderJSON(ast);
    }
}

function renderGraph(ast: ASTNode): void {
    const container = document.getElementById('graphContainer') as HTMLDivElement;
    container.innerHTML = '';

    // Set up the SVG
    const margin = {top: 20, right: 90, bottom: 30, left: 90};
    const width = container.clientWidth - margin.right - margin.left;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add zoom behavior
    svg.call(zoom.on("zoom", (event: any) => {
        svg.attr("transform", event.transform);
    }));

    // Convert AST to hierarchical data
    const root = convertASTToHierarchy(ast);
    
    // Set up the tree layout
    const treeLayout = d3.tree().size([height, width]);
    const rootNode = d3.hierarchy(root);
    treeLayout(rootNode);

    // Create links
    const link = svg.selectAll(".link")
        .data(rootNode.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x((d: any) => d.y)
            .y((d: any) => d.x));

    // Create nodes
    const node = svg.selectAll(".node")
        .data(rootNode.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", (d: any) => "translate(" + d.y + "," + d.x + ")");

    // Add circles to nodes
    node.append("circle")
        .attr("r", 10);

    // Add labels to nodes (show type and label if present)
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", (d: any) => d.children ? -13 : 13)
        .style("text-anchor", (d: any) => d.children ? "end" : "start")
        .text(function(d: any) {
            return d.data.label ? d.data.name + ': ' + d.data.label : d.data.name;
        });

    // Add tooltips
    node.append("title")
        .text((d: any) => d.data.details || d.data.name);
}

function renderJSON(ast: ASTNode): void {
    const jsonOutput = document.getElementById('jsonOutput') as HTMLPreElement;
    jsonOutput.textContent = JSON.stringify(ast, null, 2);
}

function convertASTToHierarchy(ast: any): HierarchyNode {
    if (!ast || typeof ast !== 'object') {
        return { name: String(ast), details: typeof ast, label: '' };
    }

    const node: HierarchyNode = { name: ast.type || 'Unknown', details: '', label: '' };
    
    // Add relevant details and label based on node type
    if (ast.type === 'FunctionDef') {
        node.details = `Function: ${ast.name}`;
        node.label = ast.name || '';
    } else if (ast.type === 'ClassDef') {
        node.details = `Class: ${ast.name}`;
        node.label = ast.name || '';
    } else if (ast.type === 'Name') {
        node.details = `Name: ${ast.id}`;
        node.label = ast.id || '';
    } else if (ast.type === 'Constant') {
        node.details = `Value: ${ast.value}`;
        node.label = String(ast.value);
    } else if (ast.type === 'Call') {
        node.details = 'Function Call';
        if (ast.func && ast.func.id) { 
            node.label = ast.func.id; 
        }
    } else if (ast.type === 'Return') {
        node.details = 'Return Statement';
    } else if (ast.type === 'Assign') {
        node.details = 'Assignment';
        if (ast.targets && Array.isArray(ast.targets) && ast.targets[0] && ast.targets[0].id) {
            node.label = ast.targets[0].id;
        }
    } else if (ast.type === 'BinOp') {
        if (ast.op && ast.op.type) { 
            node.label = ast.op.type; 
        }
    }

    // Add children
    const children: HierarchyNode[] = [];
    for (const [key, value] of Object.entries(ast)) {
        if (key.startsWith('_') || key === 'type') continue;
        
        if (Array.isArray(value)) {
            value.forEach((child: any) => {
                if (child && typeof child === 'object') {
                    children.push(convertASTToHierarchy(child));
                }
            });
        } else if (value && typeof value === 'object') {
            children.push(convertASTToHierarchy(value));
        }
    }
    
    if (children.length > 0) {
        node.children = children;
    }
    
    return node;
}

function toggleView(): void {
    const graphContainer = document.getElementById('graphContainer') as HTMLDivElement;
    const jsonOutput = document.getElementById('jsonOutput') as HTMLPreElement;
    const viewMode = document.getElementById('ast-view-mode') as HTMLSpanElement;
    
    if (currentView === 'graph') {
        currentView = 'json';
        graphContainer.style.display = 'none';
        jsonOutput.style.display = 'block';
        viewMode.textContent = 'JSON View';
        if (currentAST) renderJSON(currentAST);
    } else {
        currentView = 'graph';
        graphContainer.style.display = 'block';
        jsonOutput.style.display = 'none';
        viewMode.textContent = 'Graph View';
        if (currentAST) renderGraph(currentAST);
    }
}

function resetZoom(): void {
    const svg = d3.select('#graphContainer svg g');
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
    );
}

function zoomIn(): void {
    const svg = d3.select('#graphContainer svg g');
    svg.transition().duration(300).call(
        zoom.scaleBy,
        1.3
    );
}

function zoomOut(): void {
    const svg = d3.select('#graphContainer svg g');
    svg.transition().duration(300).call(
        zoom.scaleBy,
        1 / 1.3
    );
}

// Initialize with sample data
window.onload = function(): void {
    extractAST();
};

// Export functions for global access
(window as any).extractAST = extractAST;
(window as any).toggleView = toggleView;
(window as any).resetZoom = resetZoom;
(window as any).zoomIn = zoomIn;
(window as any).zoomOut = zoomOut; 