// Type definitions for function call graph
interface FunctionInfo {
    name: string;
    params: string[];
    calls: string[];
    lineno?: number;
    docstring?: string;
}

interface CallInfo {
    caller: string;
    callee: string;
    lineno?: number;
}

interface CallGraphResponse {
    success: boolean;
    functions?: FunctionInfo[];
    calls?: CallInfo[];
    error?: string;
}

interface CallGraphNode {
    id: string;
    name: string;
    type: 'function' | 'external' | 'global';
    params?: string[];
    calls?: string[];
    group: number;
}

interface CallGraphLink {
    source: string;
    target: string;
    value: number;
}

// Global variables for call graph visualization
let currentFunctions: FunctionInfo[] = [];
let currentCalls: CallInfo[] = [];
let currentCallGraphView: 'graph' | 'list' = 'graph';
let callGraphZoom = d3.zoom().scaleExtent([0.1, 3]);

function extractCallGraph(): void {
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const status = document.getElementById('status') as HTMLDivElement;
    
    const code = codeInput.value.trim();
    
    if (!code) {
        status.innerHTML = '<div class="error">Please enter some Python code</div>';
        return;
    }
    
    status.innerHTML = '<div class="success">Processing call graph...</div>';
    
    fetch('http://localhost:5000/api/callgraph', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code })
    })
    .then((response: Response) => response.json())
    .then((data: CallGraphResponse) => {
        if (data.success && data.functions && data.calls) {
            currentFunctions = data.functions;
            currentCalls = data.calls;
            renderCallGraph(data.functions, data.calls);
            status.innerHTML = '<div class="success">Call graph extracted successfully!</div>';
        } else {
            status.innerHTML = '<div class="error">Error: ' + (data.error || 'Unknown error') + '</div>';
        }
    })
    .catch((error: Error) => {
        status.innerHTML = '<div class="error">Connection error: ' + error.message + '</div>';
    });
}

function renderCallGraph(functions: FunctionInfo[], calls: CallInfo[]): void {
    if (currentCallGraphView === 'graph') {
        renderCallGraphNetwork(functions, calls);
    } else {
        renderCallGraphList(functions, calls);
    }
}

function renderCallGraphNetwork(functions: FunctionInfo[], calls: CallInfo[]): void {
    const container = document.getElementById('callGraphContainer') as HTMLDivElement;
    container.innerHTML = '';

    // Set up the SVG
    const margin = {top: 20, right: 20, bottom: 30, left: 20};
    const width = container.clientWidth - margin.right - margin.left;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Add zoom behavior
    svg.call(callGraphZoom.on("zoom", (event: any) => {
        g.attr("transform", event.transform);
    }));

    // Create nodes and links data
    const nodes = createCallGraphNodes(functions, calls);
    const links = createCallGraphLinks(calls);

    // Create force simulation
    const simulation = (d3 as any).forceSimulation(nodes)
        .force("link", (d3 as any).forceLink(links).id((d: any) => d.id).distance(80))
        .force("charge", (d3 as any).forceManyBody().strength(-300))
        .force("center", (d3 as any).forceCenter(width / 2, height / 2));

    // Create links
    const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", (d: any) => Math.sqrt(d.value))
        .attr("marker-end", "url(#arrowhead)");

    // Add arrow markers
    svg.append("defs").selectAll("marker")
        .data(["arrowhead"])
        .enter().append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .style("fill", "#999");

    // Create nodes
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call((d3 as any).drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add circles to nodes
    node.append("circle")
        .attr("r", (d: any) => d.type === 'function' ? 12 : 8)
        .style("fill", (d: any) => {
            switch (d.type) {
                case 'function': return "#4CAF50";
                case 'external': return "#FF9800";
                case 'global': return "#9C27B0";
                default: return "#2196F3";
            }
        })
        .style("stroke", "#fff")
        .style("stroke-width", 2);

    // Add labels to nodes
    node.append("text")
        .attr("dx", 15)
        .attr("dy", ".35em")
        .style("font-size", "12px")
        .style("font-weight", (d: any) => d.type === 'function' ? "bold" : "normal")
        .text((d: any) => d.name);

    // Add tooltips
    node.append("title")
        .text((d: any) => {
            if (d.type === 'function') {
                let tooltip = `Function: ${d.name}`;
                if (d.params && d.params.length > 0) {
                    tooltip += `\nParams: ${d.params.join(', ')}`;
                }
                if (d.calls && d.calls.length > 0) {
                    tooltip += `\nCalls: ${d.calls.join(', ')}`;
                }
                return tooltip;
            } else if (d.type === 'external') {
                return `External function: ${d.name}`;
            } else {
                return `Global scope: ${d.name}`;
            }
        });

    // Update positions on each tick
    simulation.on("tick", () => {
        link
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

        node
            .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function renderCallGraphList(functions: FunctionInfo[], calls: CallInfo[]): void {
    const listOutput = document.getElementById('callGraphListOutput') as HTMLDivElement;
    listOutput.innerHTML = '';

    // Group calls by caller
    const callsByFunction = new Map<string, string[]>();
    calls.forEach(call => {
        if (!callsByFunction.has(call.caller)) {
            callsByFunction.set(call.caller, []);
        }
        callsByFunction.get(call.caller)!.push(call.callee);
    });

    // Display functions and their calls
    functions.forEach(func => {
        const funcDiv = document.createElement('div');
        funcDiv.className = 'function-item';
        
        const calledFunctions = callsByFunction.get(func.name) || [];
        
        funcDiv.innerHTML = `
            <h4>${func.name}(${func.params.join(', ')})</h4>
            ${calledFunctions.length > 0 ? `<p><strong>Calls:</strong> ${calledFunctions.join(', ')}</p>` : '<p><strong>No function calls</strong></p>'}
            ${func.docstring ? `<p><strong>Description:</strong> ${func.docstring}</p>` : ''}
        `;
        listOutput.appendChild(funcDiv);
    });

    // Add global calls if any
    const globalCalls = calls.filter(call => call.caller === '__global__');
    if (globalCalls.length > 0) {
        const globalDiv = document.createElement('div');
        globalDiv.className = 'function-item';
        globalDiv.innerHTML = `
            <h4>Global Scope</h4>
            <p><strong>Calls:</strong> ${globalCalls.map(c => c.callee).join(', ')}</p>
        `;
        listOutput.appendChild(globalDiv);
    }
}

function createCallGraphNodes(functions: FunctionInfo[], calls: CallInfo[]): CallGraphNode[] {
    const nodes: CallGraphNode[] = [];
    const nodeSet = new Set<string>();

    // Add function nodes
    functions.forEach((func, index) => {
        nodes.push({
            id: func.name,
            name: func.name,
            type: 'function',
            params: func.params,
            calls: func.calls,
            group: index + 1
        });
        nodeSet.add(func.name);
    });

    // Add external function nodes and global scope
    calls.forEach(call => {
        if (call.caller === '__global__' && !nodeSet.has('__global__')) {
            nodes.push({
                id: '__global__',
                name: 'Global Scope',
                type: 'global',
                group: 0
            });
            nodeSet.add('__global__');
        }
        
        if (!nodeSet.has(call.callee)) {
            nodes.push({
                id: call.callee,
                name: call.callee,
                type: 'external',
                group: functions.length + 1
            });
            nodeSet.add(call.callee);
        }
    });

    return nodes;
}

function createCallGraphLinks(calls: CallInfo[]): CallGraphLink[] {
    const linkMap = new Map<string, number>();
    
    calls.forEach(call => {
        const key = `${call.caller}->${call.callee}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
    });
    
    return Array.from(linkMap.entries()).map(([key, count]) => {
        const [source, target] = key.split('->');
        return {
            source,
            target,
            value: count
        };
    });
}

function toggleCallGraphView(): void {
    const callGraphContainer = document.getElementById('callGraphContainer') as HTMLDivElement;
    const callGraphListOutput = document.getElementById('callGraphListOutput') as HTMLDivElement;
    const callGraphViewMode = document.getElementById('callgraph-view-mode') as HTMLSpanElement;
    
    if (currentCallGraphView === 'graph') {
        currentCallGraphView = 'list';
        callGraphContainer.style.display = 'none';
        callGraphListOutput.style.display = 'block';
        callGraphViewMode.textContent = 'List View';
        if (currentFunctions.length > 0) renderCallGraphList(currentFunctions, currentCalls);
    } else {
        currentCallGraphView = 'graph';
        callGraphContainer.style.display = 'block';
        callGraphListOutput.style.display = 'none';
        callGraphViewMode.textContent = 'Graph View';
        if (currentFunctions.length > 0) renderCallGraphNetwork(currentFunctions, currentCalls);
    }
}

function resetCallGraphZoom(): void {
    const svg = d3.select('#callGraphContainer svg g');
    svg.transition().duration(750).call(
        callGraphZoom.transform,
        d3.zoomIdentity
    );
}

function callGraphZoomIn(): void {
    const svg = d3.select('#callGraphContainer svg g');
    svg.transition().duration(300).call(
        callGraphZoom.scaleBy,
        1.3
    );
}

function callGraphZoomOut(): void {
    const svg = d3.select('#callGraphContainer svg g');
    svg.transition().duration(300).call(
        callGraphZoom.scaleBy,
        1 / 1.3
    );
}

// Export functions for global access
(window as any).extractCallGraph = extractCallGraph;
(window as any).toggleCallGraphView = toggleCallGraphView;
(window as any).resetCallGraphZoom = resetCallGraphZoom;
(window as any).callGraphZoomIn = callGraphZoomIn;
(window as any).callGraphZoomOut = callGraphZoomOut; 