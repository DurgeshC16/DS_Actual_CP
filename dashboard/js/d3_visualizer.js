class ADSVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = this.container.append('svg').attr('width', '100%').attr('height', '100%');
        this.g = this.svg.append('g');

        this.zoom = d3.zoom().on('zoom', (e) => this.g.attr('transform', e.transform));
        this.svg.call(this.zoom);

        this._hasContent = false;  // Issue 11: track if tree was previously non-empty

        window.addEventListener('resize', () => this.updateSize());
        this.updateSize();
    }

    updateSize() {
        const rect = this.container.node().getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = rect.height || 500;
    }

    clear() {
        this.g.selectAll('*').remove();
        this._hasContent = false;  // Issue 11: reset flag when explicitly cleared
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

    // ─── Determine if this is a multi-key B-Tree/B+Tree node ──────────────────
    _isBTreeType(treeData) {
        return treeData.type === 'btree' || treeData.type === 'bplus';
    }

    _parseKeys(keyField) {
        // keyField may be "10|20|30", "10,20,30", an array, or a single value
        if (Array.isArray(keyField)) return keyField.map(String);
        const s = String(keyField);
        if (s.includes('|')) return s.split('|').map(k => k.trim());
        if (s.includes(',')) return s.split(',').map(k => k.trim());
        return [s];
    }

    // ─── Tree Renderer ────────────────────────────────────────────────────────
    renderTree(treeData) {
        const isBTree = this._isBTreeType(treeData);
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

            const nodeW = isBTree ? 90 : 70;
            const nodeH = isBTree ? 36 : 70;
            const treeLayout = d3.tree().nodeSize([nodeW, 100]);
            treeLayout(root);

            // Issue 11: only reset zoom/pan on the first render (empty → content).
            // Preserve the user's position on subsequent inserts.
            if (!this._hasContent) {
                this.svg.call(this.zoom.transform, d3.zoomIdentity.translate(this.width / 2, 50));
                this._hasContent = true;
            }

            // Links
            this.g.selectAll('.link')
                .data(root.links())
                .enter().append('path')
                .attr('class', 'link')
                .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
                .attr('fill', 'none')
                .attr('stroke', '#475569')
                .attr('stroke-width', 1.5);

            // BUG 7 FIX: B+ Tree leaf links — smooth cubic Bezier arcs that exit
            // BELOW each leaf node and curve underneath the tree so they never
            // intersect with any node rectangle.
            if (treeData.type === 'bplus') {
                const leaves = root.leaves().sort((a, b) => a.x - b.x);
                // Drop the arc 40px below the leaf node centre (outside the rect)
                const DROP = 40;
                for (let i = 0; i < leaves.length - 1; i++) {
                    const x1 = leaves[i].x;
                    const y1 = leaves[i].y + DROP;
                    const x2 = leaves[i + 1].x;
                    const y2 = leaves[i + 1].y + DROP;
                    // Midpoint y is another 20px lower so the arc bows cleanly
                    const cy = Math.max(y1, y2) + 20;
                    this.g.append('path')
                        .attr('class', 'link leaf-link')
                        .attr('d', `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`)
                        .attr('fill', 'none')
                        .attr('stroke-dasharray', '5,3')
                        .attr('stroke', '#60a5fa')
                        .attr('stroke-width', 1.5)
                        .attr('opacity', 0.85);
                }
            }

            // Nodes
            const node = this.g.selectAll('.node')
                .data(root.descendants())
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${d.x},${d.y})`);

            if (isBTree) {
                this._renderBTreeNodes(node, treeData);
            } else {
                this._renderCircleNodes(node, treeData);
            }

        } catch (e) {
            console.error('D3 Tree Error:', e);
        }
    }

    // ─── Circle nodes (AVL, RB, Splay, FS, etc.) ─────────────────────────────
    _renderCircleNodes(node, treeData) {
        node.append('circle')
            .attr('r', 22)
            .style('fill', d => {
                if (d.data.highlight) return '#fbbf24';
                if (d.data.color === 'red') return '#ef4444';
                if (d.data.color === 'black') return '#1e293b';
                return 'var(--bg-card, #334155)';
            })
            .style('stroke', d => {
                if (d.data.color === 'red') return '#ef4444';
                if (d.data.color === 'black') return '#475569';
                return '#3b82f6';
            })
            .style('stroke-width', 2);

        node.append('text')
            .attr('dy', '0.35em')
            .text(d => {
                const key = d.data.key;
                // Filesystem: show icon + short name
                if (d.data.isFolder === true) return '📁 ' + String(key).slice(0, 6);
                if (d.data.isFolder === false) return '📄 ' + String(key).slice(0, 6);
                // Memory: show label if present
                if (d.data.label) return d.data.label;
                return key;
            })
            .style('fill', '#f8fafc')
            .style('text-anchor', 'middle')
            .style('font-size', d => d.data.isFolder !== undefined ? '9px' : '11px')
            .style('font-weight', '600');
    }

    // ─── Rounded-rect nodes for B-Tree / B+Tree ───────────────────────────────
    _renderBTreeNodes(node, treeData) {
        const SLOT_W = 36;  // width per key slot
        const RECT_H = 30;
        const CORNER = 6;

        node.each(function(d) {
            const g = d3.select(this);
            const keys = this.__adsKeys = [];

            // Parse keys
            const keyField = d.data.key;
            if (Array.isArray(keyField)) {
                keyField.forEach(k => keys.push(String(k)));
            } else {
                const s = String(keyField);
                if (s.includes('|')) s.split('|').forEach(k => keys.push(k.trim()));
                else if (s.includes(',')) s.split(',').forEach(k => keys.push(k.trim()));
                else keys.push(s);
            }

            const numKeys = keys.length;
            const totalW = numKeys * SLOT_W + (numKeys - 1) * 1; // 1px dividers
            const x0 = -totalW / 2;

            // Background rect
            g.append('rect')
                .attr('x', x0)
                .attr('y', -RECT_H / 2)
                .attr('width', totalW)
                .attr('height', RECT_H)
                .attr('rx', CORNER)
                .attr('ry', CORNER)
                .style('fill', d.data.leaf ? '#1e3a5f' : '#1e293b')
                .style('stroke', treeData.type === 'bplus' ? '#60a5fa' : '#10b981')
                .style('stroke-width', 1.5);

            // Key slots + dividers
            keys.forEach((k, i) => {
                const slotX = x0 + i * (SLOT_W + 1);

                // Divider line (between slots)
                if (i > 0) {
                    g.append('line')
                        .attr('x1', slotX)
                        .attr('y1', -RECT_H / 2 + 4)
                        .attr('x2', slotX)
                        .attr('y2', RECT_H / 2 - 4)
                        .style('stroke', '#475569')
                        .style('stroke-width', 1);
                }

                // Key text
                g.append('text')
                    .attr('x', slotX + SLOT_W / 2)
                    .attr('y', 0)
                    .attr('dy', '0.35em')
                    .text(k)
                    .style('fill', '#f8fafc')
                    .style('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .style('font-weight', '600');
            });
        });
    }

    // ─── Force-graph renderer (for network mode) ──────────────────────────────
    renderGraph(graphData) {
        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.edges).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));

        this.svg.call(this.zoom.transform, d3.zoomIdentity);

        const link = this.g.selectAll('.link')
            .data(graphData.edges)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke-width', d => d.isPartOfPath ? 4 : 1.5)
            .style('stroke', d => d.isPartOfPath ? '#22d3ee' : '#334155');

        const node = this.g.selectAll('.node')
            .data(graphData.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (e, d) => {
                    if (!e.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on('end', (e, d) => {
                    if (!e.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                }));

        node.append('circle')
            .attr('r', 15)
            .style('fill', d => d.isSource ? '#10b981' : (d.isDest ? '#ef4444' : '#1e293b'))
            .style('stroke', '#3b82f6')
            .style('stroke-width', 1.5);

        node.append('text')
            .attr('dy', -20)
            .text(d => d.name || d.key)
            .style('fill', '#94a3b8')
            .style('text-anchor', 'middle')
            .style('font-size', '11px');

        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }
}
