class TreeVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = this.container.node().getBoundingClientRect().height;
        
        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(d3.zoom().on("zoom", (e) => {
                this.g.attr("transform", e.transform);
            }))
            .append("g")
            .attr("transform", `translate(${this.width/2}, 50)`); // center top
            
        this.g = this.svg;
    }

    render(treeData) {
        this.g.selectAll("*").remove(); // clear current
        
        if (!treeData || !treeData.nodes || treeData.nodes.length === 0) {
            return;
        }

        // Stratify the flat data into a hierarchy
        // The root has no source in edges, so its parent is null
        
        const parentMap = new Map();
        for (const e of treeData.edges) {
            parentMap.set(e.target, e.source);
        }

        const hierarchicalData = treeData.nodes.map(n => ({
            ...n,
            parentId: parentMap.has(n.id) ? parentMap.get(n.id) : null
        }));

        try {
            const root = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId)
                (hierarchicalData);

            // Configure tree layout
            const treeLayout = d3.tree().nodeSize([60, 80]); // spacing
            
            treeLayout(root);

            // Links
            this.g.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.linkVertical()
                    .x(d => d.x)
                    .y(d => d.y)
                );

            // Nodes
            const node = this.g.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x},${d.y})`);

            node.append("circle")
                .attr("r", 20)
                .style("fill", d => {
                    if (d.data.color) return d.data.color === 'red' ? '#ef4444' : '#1e293b';
                    if (d.data.type === 'folder') return '#93c5fd';
                    if (d.data.type === 'op') return '#a78bfa';
                    return 'var(--bg-primary)';
                });

            node.append("text")
                .text(d => d.data.key);

        } catch (e) {
            console.error("D3 rendering error:", e);
        }
    }
}
