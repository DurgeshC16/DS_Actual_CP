class ADSVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = this.container.append("svg").attr("width", "100%").attr("height", "100%");
        this.g = this.svg.append("g");

        this.zoom = d3.zoom().on("zoom", (e) => this.g.attr("transform", e.transform));
        this.svg.call(this.zoom);
        
        window.addEventListener('resize', () => this.updateSize());
        this.updateSize();
    }

    updateSize() {
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = this.container.node().getBoundingClientRect().height;
    }

    clear() {
        this.g.selectAll("*").remove();
    }

    render(data) {
        this.clear();
        if (!data || !data.nodes || data.nodes.length === 0) return;

        if (data.isGraph) {
            this.renderGraph(data);
        } else {
            this.renderTree(data);
        }
    }

    renderTree(treeData) {
        const parentMap = new Map();
        (treeData.edges || []).forEach(e => parentMap.set(e.target, e.source));

        const hierarchicalData = treeData.nodes.map(n => ({
            ...n,
            parentId: parentMap.has(n.id) ? parentMap.get(n.id) : null
        }));

        try {
            const root = d3.stratify()
                .id(d => d.id)
                .parentId(d => d.parentId)
                (hierarchicalData);

            const treeLayout = d3.tree().nodeSize([70, 100]);
            treeLayout(root);

            // Center the tree
            this.svg.call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, 50));

            // Links
            this.g.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

            // Optional B+ Tree leaf links
            if (treeData.type === 'bplus') {
                const leaves = root.leaves().sort((a, b) => a.x - b.x);
                for (let i = 0; i < leaves.length - 1; i++) {
                    this.g.append("path")
                        .attr("class", "link leaf-link")
                        .attr("d", `M ${leaves[i].x} ${leaves[i].y} L ${leaves[i+1].x} ${leaves[i+1].y}`)
                        .style("stroke-dasharray", "4,2")
                        .style("stroke", "#60a5fa");
                }
            }

            // Nodes
            const node = this.g.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x},${d.y})`);

            node.append("circle")
                .attr("r", 22)
                .style("fill", d => {
                    if (d.data.highlight) return '#fbbf24';
                    if (d.data.color === 'red') return '#ef4444';
                    if (d.data.color === 'black') return '#1e293b';
                    if (d.data.type === 'folder') return '#3b82f6';
                    return 'var(--bg-primary)';
                });

            node.append("text")
                .attr("dy", "0.35em")
                .text(d => d.data.key)
                .style("fill", "#fff")
                .style("text-anchor", "middle");

        } catch (e) {
            console.error("D3 Tree Error:", e);
        }
    }

    renderGraph(graphData) {
        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2));

        this.svg.call(this.zoom.transform, d3.zoomIdentity);

        const link = this.g.selectAll(".link")
            .data(graphData.edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", d => d.isPartOfPath ? 4 : 1.5)
            .style("stroke", d => d.isPartOfPath ? "#22d3ee" : "#334155");

        const node = this.g.selectAll(".node")
            .data(graphData.nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on("end", (e, d) => {
                    if (!e.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                }));

        node.append("circle")
            .attr("r", 15)
            .style("fill", d => d.isSource ? "#10b981" : (d.isDest ? "#ef4444" : "#1e293b"));

        node.append("text")
            .attr("dy", -20)
            .text(d => d.name)
            .style("fill", "#94a3b8")
            .style("text-anchor", "middle");

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }
}
