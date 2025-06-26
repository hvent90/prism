// D3 Visualization Utilities for Prism Dashboard
import * as d3 from 'd3';

export interface ASTNode {
    type: string;
    name?: string;
    value?: string;
    children?: ASTNode[];
    lineno?: number;
    col_offset?: number;
}

export interface ClassNode {
    name: string;
    bases: string[];
    methods: {
        name: string;
        params: string[];
        lineno: number;
        docstring?: string;
        ast_ref?: {
            node_id: string;
            line: number;
            col?: number;
            end_line: number;
            end_col?: number;
            node_type: string;
            node_path: string[];
        };
    }[];
    attributes: string[];
    lineno?: number;
    docstring?: string;
    ast_ref?: {
        node_id: string;
        line: number;
        col?: number;
        end_line: number;
        end_col?: number;
        node_type: string;
        node_path: string[];
    };
}

export interface FunctionNode {
    name: string;
    calls: string[];
    called_by: string[];
    params?: string[];
    lineno?: number;
    docstring?: string;
    ast_ref?: {
        node_id: string;
        line: number;
        col?: number;
        end_line: number;
        end_col?: number;
        node_type: string;
        node_path: string[];
    };
}

export interface CallGraphNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    calls: string[];
    called_by: string[];
    group: string;
    ast_ref?: {
        node_id: string;
        line: number;
        col?: number;
        end_line: number;
        end_col?: number;
        node_type: string;
        node_path: string[];
    };
}

export interface CallGraphLink extends d3.SimulationLinkDatum<CallGraphNode> {
    source: string;
    target: string;
    value: number;
}

export class D3Visualizations {
    private static colors = d3.scaleOrdinal(d3.schemeCategory10);

    // AST Tree Visualization
    public static renderAST(containerId: string, astData: any): void {
        const container = d3.select(`#${containerId}`);
        container.selectAll('*').remove();

        if (!astData) {
            this.showNoData(container, 'AST');
            return;
        }

        const containerNode = container.node() as HTMLElement;
        const width = containerNode?.getBoundingClientRect().width || 800;
        const height = containerNode?.getBoundingClientRect().height || 600;

        // Transform Python AST format to D3 hierarchy format
        const transformedData = this.transformPythonAST(astData);

        // Create tree layout
        const tree = d3.tree<ASTNode>().size([height - 100, width - 100]);
        const root = d3.hierarchy(transformedData);
        const treeData = tree(root);

        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(50,50)`);

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                svg.attr('transform', event.transform);
            });

        container.select('svg').call(zoom as any);

        // Create links
        const links = svg.selectAll('.link')
            .data(treeData.links())
            .enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 2)
            .attr('d', (d) => {
                const link = d3.linkHorizontal()
                    .x((d: any) => d.y)
                    .y((d: any) => d.x);
                return link(d as any);
            });

        // Create nodes
        const nodes = svg.selectAll('.node')
            .data(treeData.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

        // Add node circles
        nodes.append('circle')
            .attr('r', 6)
            .attr('fill', (d: any) => this.getNodeColor(d.data.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Add node labels
        nodes.append('text')
            .attr('dy', '.35em')
            .attr('x', (d: any) => d.children ? -13 : 13)
            .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
            .style('font-size', '12px')
            .style('font-family', 'monospace')
            .text((d: any) => this.getNodeLabel(d.data));

        // Add tooltips
        nodes.append('title')
            .text((d: any) => `${d.data.type}${d.data.name ? ': ' + d.data.name : ''}${d.data.lineno ? ' (line ' + d.data.lineno + ')' : ''}`);

        // Add legend
        this.addLegend(container, width, height);
    }

    // Inheritance Hierarchy Visualization
    public static renderInheritance(containerId: string, inheritanceData: any): void {
        const container = d3.select(`#${containerId}`);
        container.selectAll('*').remove();

        if (!inheritanceData?.classes || inheritanceData.classes.length === 0) {
            this.showNoData(container, 'Inheritance');
            return;
        }

        const containerNode = container.node() as HTMLElement;
        const width = containerNode?.getBoundingClientRect().width || 800;
        const height = containerNode?.getBoundingClientRect().height || 600;

        // Convert API format to internal format
        const convertedData = this.convertInheritanceData(inheritanceData);

        // Create hierarchical data structure with methods and functions as separate nodes
        const hierarchy = this.buildInheritanceHierarchyWithMethods(convertedData.classes, convertedData.functions || []);
        if (!hierarchy) {
            this.showNoData(container, 'Inheritance');
            return;
        }

        // Create hierarchy first to get node count
        const root = d3.hierarchy(hierarchy);
        
        // Create tree layout with dynamic spacing based on node count and types
        const nodeCount = root.descendants().length;
        const adjustedHeight = Math.max(height - 100, nodeCount * 60); // Minimum 60px per node vertically
        const adjustedWidth = Math.max(width - 200, nodeCount * 40); // Minimum 40px per node horizontally
        
        const tree = d3.tree<any>().size([adjustedHeight, adjustedWidth]).separation((a, b) => {
            // Dynamic separation based on node types and relationship
            const aType = a.data.type;
            const bType = b.data.type;
            
            // Base separation
            let separation = a.parent === b.parent ? 1.5 : 3;
            
            // Increase separation for classes (they're wider rectangles)
            if (aType === 'class' || bType === 'class') {
                separation += 1;
            }
            
            // Extra space between different node types
            if (aType !== bType) {
                separation += 0.5;
            }
            
            // More space for nodes with many children
            if (a.children && a.children.length > 3) {
                separation += 0.5;
            }
            if (b.children && b.children.length > 3) {
                separation += 0.5;
            }
            
            return separation;
        });
        
        const treeData = tree(root);

        // Create SVG with dynamic dimensions based on tree size
        const svgWidth = Math.max(width, adjustedWidth + 200);
        const svgHeight = Math.max(height, adjustedHeight + 100);
        
        const svg = container.append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
            .append('g')
            .attr('transform', `translate(100,50)`);

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                svg.attr('transform', event.transform);
            });

        container.select('svg').call(zoom as any);

        // Create links
        const links = svg.selectAll('.link')
            .data(treeData.links())
            .enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', (d: any) => {
                // Different colors for different link types
                if (d.source.data.type === 'class' && d.target.data.type === 'class') {
                    return '#2E7D32'; // Dark green for inheritance
                } else if (d.source.data.type === 'class' && d.target.data.type === 'method') {
                    return '#1976D2'; // Blue for class-to-method
                } else if (d.source.data.type === 'root' && d.target.data.type === 'function') {
                    return '#FF5722'; // Orange for root-to-function
                }
                return '#666';
            })
            .attr('stroke-width', (d: any) => {
                return d.source.data.type === 'class' && d.target.data.type === 'class' ? 3 : 2;
            })
            .attr('d', (d) => {
                const link = d3.linkHorizontal()
                    .x((d: any) => d.y)
                    .y((d: any) => d.x);
                return link(d as any);
            });

        // Create nodes
        const nodes = svg.selectAll('.node')
            .data(treeData.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

        // Add AST data attributes to nodes - ensure we pass the actual data with ast_ref
        nodes.each(function(d: any) {
            const node = d3.select(this);
            if (d.data.ast_ref) {
                node.attr('data-ast-id', d.data.ast_ref.node_id)
                    .attr('data-ast-line', d.data.ast_ref.line)
                    .attr('data-ast-type', d.data.ast_ref.node_type);
            }
        });

        // Add different shapes for classes vs methods vs functions vs root
        nodes.each(function(d: any) {
            const node = d3.select(this);
            
            if (d.data.type === 'root') {
                // Root node - larger circle with special styling
                node.append('circle')
                    .attr('r', 30)
                    .attr('fill', '#9C27B0')
                    .attr('stroke', '#7B1FA2')
                    .attr('stroke-width', 3);

                // Root label
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '.35em')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .style('fill', 'white')
                    .text(d.data.name);
            } else if (d.data.type === 'class') {
                // Class nodes - rectangles with dynamic width based on text length
                const textLength = d.data.name.length;
                const rectWidth = Math.max(140, textLength * 8 + 20); // Minimum 140px, scale with text
                
                node.append('rect')
                    .attr('width', rectWidth)
                    .attr('height', 50)
                    .attr('x', -rectWidth/2)
                    .attr('y', -25)
                    .attr('rx', 5)
                    .attr('fill', '#4CAF50')
                    .attr('stroke', '#2E7D32')
                    .attr('stroke-width', 2);

                // Class name
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '-5')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .style('fill', 'white')
                    .text(d.data.name);

                // Method and attribute count
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '10')
                    .style('font-size', '10px')
                    .style('fill', 'white')
                    .text(`${d.data.methodCount || 0} methods, ${d.data.attributeCount || 0} attrs`);
            } else if (d.data.type === 'method') {
                // Method nodes - circles
                node.append('circle')
                    .attr('r', 25)
                    .attr('fill', '#2196F3')
                    .attr('stroke', '#1976D2')
                    .attr('stroke-width', 2);

                // Method name
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '-5')
                    .style('font-size', '12px')
                    .style('font-weight', 'bold')
                    .style('fill', 'white')
                    .text(d.data.name);

                // Parameter count
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '8')
                    .style('font-size', '9px')
                    .style('fill', 'white')
                    .text(`${d.data.paramCount || 0} params`);
            } else if (d.data.type === 'function') {
                // Function nodes - diamonds
                node.append('polygon')
                    .attr('points', '0,-20 30,0 0,20 -30,0')
                    .attr('fill', '#FF5722')
                    .attr('stroke', '#D84315')
                    .attr('stroke-width', 2);

                // Function name
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '-2')
                    .style('font-size', '11px')
                    .style('font-weight', 'bold')
                    .style('fill', 'white')
                    .text(typeof d.data.name === 'string' ? d.data.name : String(d.data.name || 'unknown'));

                // Parameter count
                node.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '12')
                    .style('font-size', '8px')
                    .style('fill', 'white')
                    .text(`${d.data.paramCount || 0} params`);
            }
        });

        // Add tooltips
        nodes.append('title')
            .text((d: any) => {
                if (d.data.type === 'root') {
                    return `Root: ${d.data.name}\nContainer for all classes and functions`;
                } else if (d.data.type === 'class') {
                    const cls = d.data;
                    return `Class: ${cls.name}${cls.lineno ? ` (line ${cls.lineno})` : ''}\nMethods: ${cls.methodCount || 0}\nAttributes: ${cls.attributeCount || 0}${cls.bases && cls.bases.length > 0 ? `\nInherits from: ${cls.bases.join(', ')}` : ''}`;
                } else if (d.data.type === 'method') {
                    const method = d.data;
                    return `Method: ${method.name}${method.lineno ? ` (line ${method.lineno})` : ''}\nParameters: ${method.params ? method.params.join(', ') : 'none'}${method.docstring ? `\nDocstring: ${method.docstring}` : ''}`;
                } else if (d.data.type === 'function') {
                    const func = d.data;
                    return `Function: ${func.name}${func.lineno ? ` (line ${func.lineno})` : ''}\nParameters: ${func.params ? func.params.join(', ') : 'none'}${func.docstring ? `\nDocstring: ${func.docstring}` : ''}`;
                }
                return d.data.name;
            });

        // Add legend
        this.addInheritanceLegend(container, svgWidth, svgHeight);
    }

    // Call Graph Visualization
    public static renderCallGraph(containerId: string, callGraphData: any): void {
        const container = d3.select(`#${containerId}`);
        container.selectAll('*').remove();

        if (!callGraphData?.functions || callGraphData.functions.length === 0) {
            this.showNoData(container, 'Call Graph');
            return;
        }

        const containerNode = container.node() as HTMLElement;
        const width = containerNode?.getBoundingClientRect().width || 800;
        const height = containerNode?.getBoundingClientRect().height || 600;

        // Convert API format to internal format
        const convertedData = this.convertCallGraphData(callGraphData);

        // Build complete function map with called_by relationships
        const functionMap = new Map<string, { calls: string[], called_by: string[] }>();
        
        // Initialize from functions array
        convertedData.functions.forEach(fn => {
            functionMap.set(fn.name, {
                calls: Array.isArray(fn.calls) ? fn.calls : [],
                called_by: []
            });
        });

        // Add called_by relationships and ensure all called functions exist
        convertedData.functions.forEach(fn => {
            const calls = Array.isArray(fn.calls) ? fn.calls : [];
            calls.forEach(calledFunction => {
                // Ensure called function exists in map
                if (!functionMap.has(calledFunction)) {
                    functionMap.set(calledFunction, { calls: [], called_by: [] });
                }
                // Add called_by relationship
                functionMap.get(calledFunction)!.called_by.push(fn.name);
            });
        });

        // Create force simulation data
        const nodes: CallGraphNode[] = Array.from(functionMap.entries()).map(([name, data]) => {
            // Find the original function data to get AST ref
            const originalFunction = convertedData.functions.find(fn => fn.name === name);
            
            return {
                id: name,
                name: name,
                calls: data.calls,
                called_by: data.called_by,
                group: this.getFunctionGroup({
                    name: name,
                    calls: data.calls,
                    called_by: data.called_by
                }),
                ast_ref: originalFunction?.ast_ref
            };
        });

        const links: CallGraphLink[] = [];
        
        // Create links from function calls
        nodes.forEach(node => {
            node.calls.forEach(callName => {
                if (functionMap.has(callName)) {
                    links.push({
                        source: node.id,
                        target: callName,
                        value: 1
                    });
                }
            });
        });

        // Create SVG with proper container structure
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        // Create a container group for zoom/pan
        const g = svg.append('g');

        // Create force simulation
        const simulation = d3.forceSimulation<CallGraphNode>(nodes)
            .force('link', d3.forceLink<CallGraphNode, CallGraphLink>(links).id((d) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX(width / 2).strength(0.1))
            .force('y', d3.forceY(height / 2).strength(0.1))
            .force('collision', d3.forceCollide().radius(30));

        // Store simulation reference on the container for highlighting access
        (container.node() as any).__simulation = simulation;

        // Create links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2);

        // Create nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag<SVGGElement, CallGraphNode>()
                .on('start', (event, d) => this.dragstarted(event, d, simulation))
                .on('drag', this.dragged)
                .on('end', (event, d) => this.dragended(event, d, simulation)));

        // Add AST data attributes to nodes
        this.enhanceNodesWithASTData(node, nodes);

        // Add node circles
        node.append('circle')
            .attr('r', 20)
            .attr('fill', (d) => this.getFunctionColor(d.group))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Add function names
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .text((d) => d.name);

        // Add tooltips
        node.append('title')
            .text((d) => {
                const calls = d.calls.length > 0 ? d.calls.join(', ') : 'none';
                const calledBy = d.called_by.length > 0 ? d.called_by.join(', ') : 'none';
                return `${d.name}\nCalls: ${calls}\nCalled by: ${calledBy}`;
            });

        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node
                .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
    }

    // Transform Python AST format to D3 hierarchy format
    private static transformPythonAST(node: any): ASTNode {
        if (!node || typeof node !== 'object') {
            return {
                type: 'Unknown',
                name: String(node || 'null')
            };
        }

        const transformed: ASTNode = {
            type: node.type || 'Unknown',
            name: this.extractNodeName(node),
            value: this.extractNodeValue(node),
            lineno: node.lineno,
            col_offset: node.col_offset
        };

        // Handle different child node properties
        const children: any[] = [];
        
        // Python AST uses 'body' for child statements
        if (node.body && Array.isArray(node.body)) {
            children.push(...node.body);
        }
        
        // Handle function/class definitions
        if (node.args && typeof node.args === 'object') {
            children.push(node.args);
        }
        
        if (node.decorator_list && Array.isArray(node.decorator_list)) {
            children.push(...node.decorator_list);
        }
        
        // Handle expressions and values
        if (node.value && typeof node.value === 'object') {
            children.push(node.value);
        }
        
        if (node.targets && Array.isArray(node.targets)) {
            children.push(...node.targets);
        }
        
        if (node.func && typeof node.func === 'object') {
            children.push(node.func);
        }
        
        if (node.args && Array.isArray(node.args)) {
            children.push(...node.args);
        }
        
        // Handle class bases
        if (node.bases && Array.isArray(node.bases)) {
            children.push(...node.bases);
        }
        
        // Handle call arguments
        if (node.keywords && Array.isArray(node.keywords)) {
            children.push(...node.keywords);
        }
        
        // Handle attribute access
        if (node.attr && typeof node.attr === 'string') {
            // Don't add attr as child, it's just a property
        }
        
        // Handle context nodes
        if (node.ctx && typeof node.ctx === 'object') {
            // Skip context nodes as they're not very useful for visualization
        }
        
        // Handle formatted string values
        if (node.values && Array.isArray(node.values)) {
            children.push(...node.values);
        }
        
        // Handle other common AST properties
        if (node.orelse && Array.isArray(node.orelse)) {
            children.push(...node.orelse);
        }
        
        if (node.test && typeof node.test === 'object') {
            children.push(node.test);
        }
        
        if (node.iter && typeof node.iter === 'object') {
            children.push(node.iter);
        }
        
        if (node.target && typeof node.target === 'object') {
            children.push(node.target);
        }

        // Transform children recursively
        if (children.length > 0) {
            transformed.children = children
                .filter(child => child && typeof child === 'object')
                .map(child => this.transformPythonAST(child));
        }

        return transformed;
    }

    private static extractNodeName(node: any): string | undefined {
        if (node.name) return node.name;
        if (node.id) return node.id;
        if (node.attr) return node.attr;
        if (node.arg) return node.arg;
        return undefined;
    }

    private static extractNodeValue(node: any): string | undefined {
        if (node.value !== undefined && node.value !== null) {
            if (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean') {
                return String(node.value);
            }
        }
        if (node.kind !== undefined && node.kind !== null) {
            return String(node.kind);
        }
        return undefined;
    }

    // Helper methods
    private static getNodeColor(type: string): string {
        const colorMap: { [key: string]: string } = {
            'Module': '#2196F3',
            'FunctionDef': '#4CAF50',
            'ClassDef': '#FF9800',
            'Name': '#9C27B0',
            'Call': '#F44336',
            'Assign': '#607D8B',
            'Return': '#795548',
            'If': '#E91E63',
            'For': '#3F51B5',
            'While': '#009688'
        };
        return colorMap[type] || '#757575';
    }

    private static getNodeLabel(node: ASTNode): string {
        if (node.name) return node.name;
        if (node.value) return node.value;
        return node.type;
    }

    private static getFunctionColor(group: string): string {
        const colorMap: { [key: string]: string } = {
            'entry': '#4CAF50',
            'internal': '#2196F3',
            'leaf': '#FF9800',
            'utility': '#9C27B0'
        };
        return colorMap[group] || '#757575';
    }

    private static getFunctionGroup(fn: FunctionNode): string {
        if (fn.called_by.length === 0) return 'entry';
        if (fn.calls.length === 0) return 'leaf';
        if (fn.calls.length > 3) return 'utility';
        return 'internal';
    }

    private static buildInheritanceHierarchy(classes: ClassNode[]): any {
        if (classes.length === 0) return null;

        const classMap = new Map<string, ClassNode>();
        classes.forEach(cls => classMap.set(cls.name, cls));

        // Find root classes (those with no bases or bases not in our class list)
        const rootClasses = classes.filter(cls => 
            cls.bases.length === 0 || 
            cls.bases.every(base => !classMap.has(base))
        );

        if (rootClasses.length === 0) {
            // If no clear root, create a virtual root
            return {
                name: 'Root',
                children: classes.map(cls => ({
                    name: cls.name,
                    methods: cls.methods,
                    attributes: cls.attributes,
                    children: this.findChildClasses(cls.name, classes)
                }))
            };
        }

        return {
            name: 'Root',
            children: rootClasses.map(cls => ({
                name: cls.name,
                methods: cls.methods,
                attributes: cls.attributes,
                children: this.findChildClasses(cls.name, classes)
            }))
        };
    }

    private static buildInheritanceHierarchyWithMethods(classes: ClassNode[], functions: any[]): any {
        if (classes.length === 0 && functions.length === 0) return null;

        const classMap = new Map<string, ClassNode>();
        classes.forEach(cls => classMap.set(cls.name, cls));

        // Find root classes (those with no bases or bases not in our class list)
        const rootClasses = classes.filter(cls => 
            cls.bases.length === 0 || 
            cls.bases.every(base => !classMap.has(base))
        );

        // Convert functions to proper format
        const functionNodes = functions.map(fn => ({
            name: typeof fn.name === 'string' ? fn.name : String(fn.name || 'unknown'),
            type: 'function',
            params: Array.isArray(fn.params) ? fn.params : 
                    Array.isArray(fn.args) ? fn.args : [],
            paramCount: Array.isArray(fn.params) ? fn.params.length : 
                       Array.isArray(fn.args) ? fn.args.length : 0,
            lineno: fn.lineno,
            docstring: fn.docstring,
            ast_ref: fn.ast_ref
        }));

        if (rootClasses.length === 0) {
            // If no clear root, create a virtual root
            return {
                name: 'Root',
                type: 'root',
                children: [...classes.map(cls => this.buildClassNodeWithMethods(cls, classes)), ...functionNodes]
            };
        }

        return {
            name: 'Root',
            type: 'root',
            children: [...rootClasses.map(cls => this.buildClassNodeWithMethods(cls, classes)), ...functionNodes]
        };
    }

    private static buildClassNodeWithMethods(cls: ClassNode, allClasses: ClassNode[]): any {
        // Create method children
        const methodChildren = cls.methods.map(method => ({
            name: method.name,
            type: 'method',
            params: method.params,
            paramCount: method.params.length,
            lineno: method.lineno,
            docstring: method.docstring,
            ast_ref: method.ast_ref
        }));

        // Find child classes
        const classChildren = this.findChildClassesWithMethods(cls.name, allClasses);

        return {
            name: cls.name,
            type: 'class',
            bases: cls.bases,
            methodCount: cls.methods.length,
            attributeCount: cls.attributes.length,
            lineno: cls.lineno,
            docstring: cls.docstring,
            ast_ref: cls.ast_ref,
            children: [...methodChildren, ...classChildren]
        };
    }

    private static findChildClassesWithMethods(parentName: string, classes: ClassNode[]): any[] {
        return classes
            .filter(cls => cls.bases.includes(parentName))
            .map(cls => this.buildClassNodeWithMethods(cls, classes));
    }

    private static findChildClasses(parentName: string, classes: ClassNode[]): any[] {
        return classes
            .filter(cls => cls.bases.includes(parentName))
            .map(cls => ({
                name: cls.name,
                methods: cls.methods,
                attributes: cls.attributes,
                children: this.findChildClasses(cls.name, classes)
            }));
    }

    private static showNoData(container: d3.Selection<any, any, any, any>, type: string): void {
        container.html(`
            <div class="no-data-message">
                <h4>No ${type} Data</h4>
                <p>Analyze Python code to see the ${type} visualization.</p>
            </div>
        `);
    }

    private static addLegend(container: d3.Selection<any, any, any, any>, width: number, height: number): void {
        const legend = container.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - 200}, 20)`);

        const legendData = [
            { type: 'Module', color: '#2196F3' },
            { type: 'FunctionDef', color: '#4CAF50' },
            { type: 'ClassDef', color: '#FF9800' },
            { type: 'Call', color: '#F44336' },
            { type: 'Name', color: '#9C27B0' }
        ];

        legend.selectAll('.legend-item')
            .data(legendData)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`)
            .each(function(d) {
                d3.select(this).append('circle')
                    .attr('r', 6)
                    .attr('fill', d.color);
                
                d3.select(this).append('text')
                    .attr('x', 15)
                    .attr('dy', '.35em')
                    .style('font-size', '12px')
                    .text(d.type);
            });
    }

    private static addInheritanceLegend(container: d3.Selection<any, any, any, any>, width: number, height: number): void {
        const legend = container.append('g')
            .attr('class', 'inheritance-legend')
            .attr('transform', `translate(${width - 200}, 20)`);

        const legendData = [
            { type: 'Root', color: '#9C27B0', shape: 'circle' },
            { type: 'Class', color: '#4CAF50', shape: 'rect' },
            { type: 'Method', color: '#2196F3', shape: 'circle' },
            { type: 'Function', color: '#FF5722', shape: 'diamond' },
            { type: 'Inheritance', color: '#2E7D32', shape: 'line' },
            { type: 'Contains', color: '#1976D2', shape: 'line' }
        ];

        legend.selectAll('.legend-item')
            .data(legendData)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`)
            .each(function(d) {
                const item = d3.select(this);
                
                if (d.shape === 'rect') {
                    item.append('rect')
                        .attr('width', 12)
                        .attr('height', 8)
                        .attr('x', -6)
                        .attr('y', -4)
                        .attr('fill', d.color);
                } else if (d.shape === 'circle') {
                    item.append('circle')
                        .attr('r', 6)
                        .attr('fill', d.color);
                } else if (d.shape === 'diamond') {
                    item.append('polygon')
                        .attr('points', '0,-6 8,0 0,6 -8,0')
                        .attr('fill', d.color);
                } else if (d.shape === 'line') {
                    item.append('line')
                        .attr('x1', -8)
                        .attr('x2', 8)
                        .attr('y1', 0)
                        .attr('y2', 0)
                        .attr('stroke', d.color)
                        .attr('stroke-width', 2);
                }
                
                item.append('text')
                    .attr('x', 20)
                    .attr('dy', '.35em')
                    .style('font-size', '12px')
                    .text(d.type);
            });
    }

    // Drag behavior for force simulation
    private static dragstarted(event: any, d: CallGraphNode, simulation: d3.Simulation<CallGraphNode, undefined>): void {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    private static dragged(event: any, d: CallGraphNode): void {
        d.fx = event.x;
        d.fy = event.y;
    }

    private static dragended(event: any, d: CallGraphNode, simulation: d3.Simulation<CallGraphNode, undefined>): void {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // AST Coordinate Highlighting Methods
    
    /**
     * Highlight nodes in inheritance visualization with enhanced visibility
     */
    public static highlightInheritanceNodes(containerId: string, highlightTargets: any[]): void {
        const container = d3.select(`#${containerId}`);
        
        // Clear previous highlights and reset all nodes
        container.selectAll('.node').classed('highlighted direct-match hierarchical-match temporary-match secondary-match', false);
        container.selectAll('.node rect, .node circle, .node polygon').style('filter', null).style('stroke', null).style('stroke-width', null);
        container.selectAll('.node').style('opacity', 1);
        container.selectAll('.link').style('opacity', 0.6);
        
        if (highlightTargets.length === 0) return;
        
        const highlightedNodes: any[] = [];
        
        // Apply highlights and collect highlighted nodes
        highlightTargets.forEach(target => {
            const selector = `[data-ast-id="${target.nodeId}"]`;
            let nodes = container.selectAll(selector);
            
            // If no nodes found by AST ID, try alternative selectors
            if (nodes.size() === 0) {
                const nodeIdParts = target.nodeId.split('_');
                if (nodeIdParts.length >= 3) {
                    const nodeType = nodeIdParts[0];
                    const line = nodeIdParts[1];
                    nodes = container.selectAll(`.node[data-ast-line="${line}"][data-ast-type="${nodeType}"]`);
                }
                
                // Still no nodes? Try more lenient matching
                if (nodes.size() === 0) {
                    const line = nodeIdParts[1];
                    nodes = container.selectAll(`.node[data-ast-line="${line}"]`);
                }
            }
            
            if (nodes.size() > 0) {
                nodes.each(function(d: any) {
                    highlightedNodes.push(d);
                });
                
                // Bring highlighted nodes to front
                nodes.raise();
                
                nodes.classed('highlighted', true)
                     .classed(`${target.highlightStyle}-match`, true);
                
                // Enhanced visual effects for highlighted nodes
                if (target.highlightStyle === 'direct') {
                    nodes.select('rect, circle, polygon')
                         .style('filter', 'drop-shadow(0 0 20px #00ff88)')
                         .style('stroke', '#00ff88')
                         .style('stroke-width', '4px');
                } else if (target.highlightStyle === 'hierarchical') {
                    nodes.select('rect, circle, polygon')
                         .style('stroke', '#ffaa00')
                         .style('stroke-width', '3px')
                         .style('filter', 'drop-shadow(0 0 15px #ffaa00)');
                } else if (target.highlightStyle === 'temporary') {
                    nodes.select('rect, circle, polygon')
                         .style('filter', 'drop-shadow(0 0 18px #ff00aa)')
                         .style('stroke', '#ff00aa')
                         .style('stroke-width', '3px');
                } else if (target.highlightStyle === 'secondary') {
                    nodes.select('rect, circle, polygon')
                         .style('filter', 'drop-shadow(0 0 25px #00ffff)')
                         .style('stroke', '#00ffff')
                         .style('stroke-width', '5px');
                }
            }
        });
        
        // Dim non-highlighted nodes for better contrast
        container.selectAll('.node:not(.highlighted)')
                 .style('opacity', 0.3);
        
        // Dim non-highlighted links
        container.selectAll('.link')
                 .style('opacity', 0.1);
        
        // Highlight connections between highlighted nodes and their relationships
        container.selectAll('.link')
                 .style('opacity', function(d: any) {
                     // For tree structures, d might not have source/target like force graphs
                     // Check if this link connects to any highlighted nodes
                     const linkElement = d3.select(this);
                     const pathData = linkElement.attr('d');
                     
                     // Simple approach: if any nodes are highlighted, show connections more prominently
                     if (highlightedNodes.length > 0) {
                         return 0.8; // Show all connections more prominently when nodes are highlighted
                     }
                     return 0.1;
                 })
                 .style('stroke', function(d: any) {
                     if (highlightedNodes.length > 0) {
                         return '#00ff88'; // Highlight color for connections when nodes are highlighted
                     }
                     return '#ccc'; // Default color
                 })
                 .style('stroke-width', function(d: any) {
                     if (highlightedNodes.length > 0) {
                         return 3; // Thicker lines when nodes are highlighted
                     }
                     return 2; // Default thickness
                 });
        

    }
    
    /**
     * Highlight nodes in call graph visualization with enhanced visibility
     */
    public static highlightCallGraphNodes(containerId: string, highlightTargets: any[]): void {
        const container = d3.select(`#${containerId}`);
        const simulation = (container.node() as any).__simulation;
        
        // Clear previous highlights and reset all nodes
        container.selectAll('.node circle').style('filter', null).style('stroke', null).style('stroke-width', null);
        container.selectAll('.node').classed('highlighted direct-match hierarchical-match temporary-match secondary-match', false);
        container.selectAll('.node').style('opacity', 1);
        container.selectAll('.links line').style('opacity', 0.6);
        
        if (highlightTargets.length === 0) return;
        
        const highlightedNodes: any[] = [];
        
        // Apply highlights and collect highlighted nodes
        highlightTargets.forEach(target => {
            const selector = `[data-ast-id="${target.nodeId}"]`;
            let nodes = container.selectAll(selector);
            
            // If no nodes found by AST ID, try alternative selectors
            if (nodes.size() === 0) {
                const nodeIdParts = target.nodeId.split('_');
                if (nodeIdParts.length >= 3) {
                    const nodeType = nodeIdParts[0];
                    const line = nodeIdParts[1];
                    nodes = container.selectAll(`.node[data-ast-line="${line}"][data-ast-type="${nodeType}"]`);
                }
            }
            
            if (nodes.size() > 0) {
                nodes.each(function(d: any) {
                    highlightedNodes.push(d);
                });
                
                // Bring highlighted nodes to front
                nodes.raise();
                
                nodes.classed('highlighted', true)
                     .classed(`${target.highlightStyle}-match`, true);
                
                const circles = nodes.select('circle');
                
                // Enhanced visual effects for highlighted nodes
                if (target.highlightStyle === 'direct') {
                    circles.style('filter', 'drop-shadow(0 0 20px #00ff88)')
                           .style('stroke', '#00ff88')
                           .style('stroke-width', '4px')
                           .attr('r', 25); // Increase size
                } else if (target.highlightStyle === 'hierarchical') {
                    circles.style('stroke', '#ffaa00')
                           .style('stroke-width', '3px')
                           .style('filter', 'drop-shadow(0 0 15px #ffaa00)')
                           .attr('r', 23);
                } else if (target.highlightStyle === 'temporary') {
                    circles.style('filter', 'drop-shadow(0 0 18px #ff00aa)')
                           .style('stroke', '#ff00aa')
                           .style('stroke-width', '3px')
                           .attr('r', 24);
                } else if (target.highlightStyle === 'secondary') {
                    circles.style('filter', 'drop-shadow(0 0 25px #00ffff)')
                           .style('stroke', '#00ffff')
                           .style('stroke-width', '5px')
                           .attr('r', 28);
                }
            }
        });
        
        // Dim non-highlighted nodes for better contrast
        container.selectAll('.node:not(.highlighted)')
                 .style('opacity', 0.3);
        
        // Dim non-highlighted links
        container.selectAll('.links line')
                 .style('opacity', 0.1);
        
        // Highlight connections between highlighted nodes
        container.selectAll('.links line')
                 .style('opacity', function(d: any) {
                     const sourceHighlighted = highlightedNodes.some(n => n.id === d.source.id);
                     const targetHighlighted = highlightedNodes.some(n => n.id === d.target.id);
                     if (sourceHighlighted && targetHighlighted) {
                         return 1; // Full opacity for connections between highlighted nodes
                     } else if (sourceHighlighted || targetHighlighted) {
                         return 0.6; // Partial opacity for connections to highlighted nodes
                     }
                     return 0.1; // Very dim for other connections
                 })
                 .style('stroke', function(d: any) {
                     const sourceHighlighted = highlightedNodes.some(n => n.id === d.source.id);
                     const targetHighlighted = highlightedNodes.some(n => n.id === d.target.id);
                     if (sourceHighlighted && targetHighlighted) {
                         return '#00ff88'; // Highlight color for inter-highlighted connections
                     }
                     return '#999'; // Default color
                 })
                 .style('stroke-width', function(d: any) {
                     const sourceHighlighted = highlightedNodes.some(n => n.id === d.source.id);
                     const targetHighlighted = highlightedNodes.some(n => n.id === d.target.id);
                     if (sourceHighlighted && targetHighlighted) {
                         return 3; // Thicker lines for inter-highlighted connections
                     }
                     return 2; // Default thickness
                 });
        
        // Gently reheat the simulation without disrupting existing positions
        if (simulation) {
            // Remove any existing highlight force first
            simulation.force('highlight', null);
            
            // Only give the simulation a gentle energy boost if it's nearly stopped
            const currentAlpha = simulation.alpha();
            if (currentAlpha < 0.1) {
                simulation.alpha(Math.max(currentAlpha, 0.1)).restart();
            }
        }
        

    }
    
    /**
     * Clear all highlights from a visualization
     */
    public static clearHighlights(containerId: string): void {
        const container = d3.select(`#${containerId}`);
        const simulation = (container.node() as any).__simulation;
        
        // Remove highlight classes
        container.selectAll('.node').classed('highlighted direct-match hierarchical-match temporary-match secondary-match', false);
        
        // Reset visual effects
        container.selectAll('.node rect, .node circle, .node polygon')
                 .style('filter', null)
                 .style('stroke', null)
                 .style('stroke-width', null)
                 .attr('r', function(d: any) {
                     // Reset circle radius to default
                     return 20;
                 });
        
        // Reset opacity for all nodes
        container.selectAll('.node').style('opacity', 1);
        
        // Reset links for both call graphs (lines) and inheritance graphs (paths)
        container.selectAll('.links line')
                 .style('opacity', 0.6)
                 .style('stroke', '#999')
                 .style('stroke-width', 2);
        
        // Reset inheritance graph links (paths)
        container.selectAll('.link')
                 .style('opacity', 0.6)
                 .style('stroke', '#ccc')
                 .style('stroke-width', 2);
        
        // Stop any ongoing animations
        container.selectAll('.node circle').interrupt();
        
        // Reset simulation parameters and remove any temporary forces (for call graphs)
        if (simulation) {
            simulation.force('highlight', null);
            // Only give a gentle boost if the simulation has stopped
            const currentAlpha = simulation.alpha();
            if (currentAlpha < 0.05) {
                simulation.alpha(0.05).restart();
            }
        }
    }
    
    /**
     * Pan to show highlighted nodes (simplified version to avoid TypeScript issues)
     */
    private static zoomToFitNodes(container: d3.Selection<any, any, any, any>, nodes: any[]): void {
        if (nodes.length === 0) return;
        
        // Calculate center of highlighted nodes
        let centerX = 0, centerY = 0;
        let validNodes = 0;
        
        nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                centerX += node.x;
                centerY += node.y;
                validNodes++;
            }
        });
        
        if (validNodes === 0) return;
        
        centerX /= validNodes;
        centerY /= validNodes;
        
        // Get SVG and container dimensions
        const svg = container.select('svg');
        const svgNode = svg.node() as SVGSVGElement;
        const svgRect = svgNode.getBoundingClientRect();
        const svgWidth = svgRect.width;
        const svgHeight = svgRect.height;
        
        // Calculate translation to center the highlighted nodes
        const g = svg.select('g');
        const currentTransform = d3.zoomTransform(svgNode);
        
        const targetX = svgWidth / 2 - centerX * currentTransform.k;
        const targetY = svgHeight / 2 - centerY * currentTransform.k;
        
        // Animate to the new position
        g.transition()
         .duration(1500)
         .attr('transform', `translate(${targetX}, ${targetY}) scale(${currentTransform.k})`);
    }
    
    /**
     * Update node creation to include AST data attributes
     */
    private static enhanceNodesWithASTData(nodes: any, data: any[]): void {
        nodes.attr('data-ast-id', (d: any) => d.ast_ref?.node_id)
             .attr('data-ast-line', (d: any) => d.ast_ref?.line)
             .attr('data-ast-type', (d: any) => d.ast_ref?.node_type);
    }

    /**
     * Convert API inheritance data format to internal format
     */
    private static convertInheritanceData(apiData: any): { classes: ClassNode[], functions: any[] } {
        // Handle nested inheritance data structure
        const inheritanceData = apiData.inheritance || apiData;
        
        const classes: ClassNode[] = (inheritanceData.classes || []).map((cls: any) => ({
            name: cls.name,
            bases: cls.bases || [],
            methods: cls.methods ? cls.methods.map((method: any) => ({
                name: typeof method.name === 'string' ? method.name : String(method.name || 'unknown'),
                params: Array.isArray(method.params) ? method.params : [],
                lineno: method.lineno || cls.lineno || 0,
                docstring: method.docstring,
                ast_ref: method.ast_ref
            })) : [],
            attributes: cls.attributes || [],
            lineno: cls.lineno,
            docstring: cls.docstring,
            ast_ref: cls.ast_ref
        }));

        // Process functions if they exist in the API data
        const functions = (inheritanceData.functions || []).map((fn: any) => ({
            name: typeof fn.name === 'string' ? fn.name : String(fn.name || 'unknown'),
            params: Array.isArray(fn.params) ? fn.params : 
                    Array.isArray(fn.args) ? fn.args : [],
            lineno: fn.lineno,
            docstring: fn.docstring,
            ast_ref: fn.ast_ref
        }));

        return {
            classes,
            functions
        };
    }

    /**
     * Convert API call graph data format to internal format
     */
    private static convertCallGraphData(apiData: any): { functions: FunctionNode[] } {
        const functions: FunctionNode[] = apiData.functions.map((fn: any) => {
            // Use class.method format if this function is a class method
            const displayName = fn.class_name ? `${fn.class_name}.${fn.name}` : fn.name;
            
            // Build calls array from the calls relationships
            const calls: string[] = [];
            if (apiData.calls) {
                apiData.calls.forEach((call: any) => {
                    if (call.caller === (fn.class_name ? `${fn.class_name}.${fn.name}` : fn.name)) {
                        calls.push(call.callee);
                    }
                });
            }

            // Build called_by array from the calls relationships
            const called_by: string[] = [];
            if (apiData.calls) {
                apiData.calls.forEach((call: any) => {
                    if (call.callee === (fn.class_name ? `${fn.class_name}.${fn.name}` : fn.name)) {
                        called_by.push(call.caller);
                    }
                });
            }

            return {
                name: displayName,
                calls,
                called_by,
                params: fn.args || fn.params || [],
                lineno: fn.lineno,
                docstring: fn.docstring,
                ast_ref: fn.ast_ref
            };
        });

        return { functions };
    }
} 