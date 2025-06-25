// Type definitions for class inheritance hierarchy
interface MethodInfo {
    name: string;
    params: string[];
    docstring?: string;
    lineno?: number;
}

interface ClassNode {
    name: string;
    bases: string[];
    methods: MethodInfo[];
    attributes: string[];
    docstring?: string;
    lineno?: number;
}

interface InheritanceResponse {
    success: boolean;
    classes?: ClassNode[];
    error?: string;
}

interface HierarchyNode {
    name: string;
    details: string;
    label: string;
    children?: HierarchyNode[];
    methods?: string[];
    attributes?: string[];
}

// Global variables for inheritance visualization
let currentClasses: ClassNode[] = [];
let currentInheritanceView: 'graph' | 'list' = 'graph';
let inheritanceZoom = d3.zoom().scaleExtent([0.1, 3]);

function extractInheritance(): void {
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const status = document.getElementById('status') as HTMLDivElement;
    
    const code = codeInput.value.trim();
    
    if (!code) {
        status.innerHTML = '<div class="error">Please enter some Python code</div>';
        return;
    }
    
    status.innerHTML = '<div class="success">Processing inheritance...</div>';
    
    fetch('http://localhost:5000/api/inheritance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code })
    })
    .then((response: Response) => response.json())
    .then((data: InheritanceResponse) => {
        if (data.success && data.classes) {
            currentClasses = data.classes;
            renderInheritance(data.classes);
            status.innerHTML = '<div class="success">Inheritance hierarchy extracted successfully!</div>';
        } else {
            status.innerHTML = '<div class="error">Error: ' + (data.error || 'Unknown error') + '</div>';
        }
    })
    .catch((error: Error) => {
        status.innerHTML = '<div class="error">Connection error: ' + error.message + '</div>';
    });
}

function renderInheritance(classes: ClassNode[]): void {
    if (currentInheritanceView === 'graph') {
        renderInheritanceGraph(classes);
    } else {
        renderInheritanceList(classes);
    }
}

function renderInheritanceGraph(classes: ClassNode[]): void {
    const container = document.getElementById('inheritanceContainer') as HTMLDivElement;
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
    svg.call(inheritanceZoom.on("zoom", (event: any) => {
        svg.attr("transform", event.transform);
    }));

    // Convert classes to hierarchical data
    const root = convertClassesToHierarchy(classes);
    
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

    // Add circles to nodes - differentiate between classes and methods
    node.append("circle")
        .attr("r", (d: any) => isMethodNode(d.data) ? 8 : 12)
        .style("fill", (d: any) => {
            if (isMethodNode(d.data)) {
                return "#FF9800"; // Orange for methods
            }
            return d.data.methods && d.data.methods.length > 0 ? "#4CAF50" : "#2196F3";
        })
        .style("stroke", (d: any) => isMethodNode(d.data) ? "#F57C00" : "#fff")
        .style("stroke-width", 2);

    // Add labels to nodes
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", (d: any) => d.children ? -15 : 15)
        .style("text-anchor", (d: any) => d.children ? "end" : "start")
        .style("font-size", (d: any) => isMethodNode(d.data) ? "12px" : "14px")
        .style("font-style", (d: any) => isMethodNode(d.data) ? "italic" : "normal")
        .text((d: any) => d.data.label || d.data.name);

    // Add tooltips with class/method details
    node.append("title")
        .text((d: any) => {
            if (isMethodNode(d.data)) {
                return `Method: ${d.data.label}\nBelongs to class above`;
            }
            
            let details = `Class: ${d.data.name}`;
            if (d.data.methods && d.data.methods.length > 0) {
                details += `\nMethods: ${d.data.methods.join(', ')}`;
            }
            if (d.data.attributes && d.data.attributes.length > 0) {
                details += `\nAttributes: ${d.data.attributes.join(', ')}`;
            }
            return details;
        });
}

function renderInheritanceList(classes: ClassNode[]): void {
    const listOutput = document.getElementById('inheritanceListOutput') as HTMLDivElement;
    listOutput.innerHTML = '';

    classes.forEach(cls => {
        const classDiv = document.createElement('div');
        classDiv.className = 'class-item';
        
        const methodsList = cls.methods.map(method => 
            `${method.name}(${method.params.join(', ')})`
        ).join(', ');
        
        classDiv.innerHTML = `
            <h4>${cls.name}</h4>
            ${cls.bases.length > 0 ? `<p><strong>Inherits from:</strong> ${cls.bases.join(', ')}</p>` : '<p><strong>Base class</strong></p>'}
            ${cls.methods.length > 0 ? `<p><strong>Methods:</strong> ${methodsList}</p>` : ''}
            ${cls.attributes.length > 0 ? `<p><strong>Attributes:</strong> ${cls.attributes.join(', ')}</p>` : ''}
        `;
        listOutput.appendChild(classDiv);
    });
}

function convertClassesToHierarchy(classes: ClassNode[]): HierarchyNode {
    // Create a map of class names to class objects
    const classMap = new Map<string, ClassNode>();
    classes.forEach(cls => classMap.set(cls.name, cls));

    // Find root classes (those with no bases or bases not in our class list)
    const rootClasses = classes.filter(cls => 
        cls.bases.length === 0 || 
        cls.bases.every(base => !classMap.has(base))
    );

    if (rootClasses.length === 0) {
        // If no root classes found, create a virtual root
        return {
            name: 'Classes',
            details: 'All classes',
            label: '',
            children: classes.map(cls => createClassNodeWithMethods(cls))
        };
    }

    // Build hierarchy from root classes
    const buildHierarchy = (cls: ClassNode): HierarchyNode => {
        const childClasses = classes
            .filter(child => child.bases.includes(cls.name))
            .map(child => buildHierarchy(child));

        return createClassNodeWithMethods(cls, childClasses);
    };

    if (rootClasses.length === 1) {
        return buildHierarchy(rootClasses[0]);
    } else {
        // Multiple root classes
        return {
            name: 'Classes',
            details: 'All classes',
            label: '',
            children: rootClasses.map(cls => buildHierarchy(cls))
        };
    }
}

function createClassNodeWithMethods(cls: ClassNode, childClasses: HierarchyNode[] = []): HierarchyNode {
    // Create method nodes
    const methodNodes: HierarchyNode[] = cls.methods.map(method => ({
        name: method.name,
        details: `Method: ${method.name}`,
        label: `${method.name}(${method.params.join(', ')})`,
        children: undefined,
        methods: [],
        attributes: []
    }));

    // Combine child classes and method nodes
    const allChildren = [...methodNodes, ...childClasses];

    return {
        name: cls.name,
        details: `Class: ${cls.name}`,
        label: cls.name,
        children: allChildren.length > 0 ? allChildren : undefined,
        methods: cls.methods.map(m => m.name),
        attributes: cls.attributes
    };
}

function isMethodNode(node: HierarchyNode): boolean {
    return node.details.startsWith('Method:');
}

function toggleInheritanceView(): void {
    const inheritanceContainer = document.getElementById('inheritanceContainer') as HTMLDivElement;
    const inheritanceListOutput = document.getElementById('inheritanceListOutput') as HTMLDivElement;
    const inheritanceViewMode = document.getElementById('inheritance-view-mode') as HTMLSpanElement;
    
    if (currentInheritanceView === 'graph') {
        currentInheritanceView = 'list';
        inheritanceContainer.style.display = 'none';
        inheritanceListOutput.style.display = 'block';
        inheritanceViewMode.textContent = 'List View';
        if (currentClasses.length > 0) renderInheritanceList(currentClasses);
    } else {
        currentInheritanceView = 'graph';
        inheritanceContainer.style.display = 'block';
        inheritanceListOutput.style.display = 'none';
        inheritanceViewMode.textContent = 'Graph View';
        if (currentClasses.length > 0) renderInheritanceGraph(currentClasses);
    }
}

function resetInheritanceZoom(): void {
    const svg = d3.select('#inheritanceContainer svg g');
    svg.transition().duration(750).call(
        inheritanceZoom.transform,
        d3.zoomIdentity
    );
}

function inheritanceZoomIn(): void {
    const svg = d3.select('#inheritanceContainer svg g');
    svg.transition().duration(300).call(
        inheritanceZoom.scaleBy,
        1.3
    );
}

function inheritanceZoomOut(): void {
    const svg = d3.select('#inheritanceContainer svg g');
    svg.transition().duration(300).call(
        inheritanceZoom.scaleBy,
        1 / 1.3
    );
}

// Export functions for global access
(window as any).extractInheritance = extractInheritance;
(window as any).toggleInheritanceView = toggleInheritanceView;
(window as any).resetInheritanceZoom = resetInheritanceZoom;
(window as any).inheritanceZoomIn = inheritanceZoomIn;
(window as any).inheritanceZoomOut = inheritanceZoomOut; 