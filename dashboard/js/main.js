const colors = {
    'AVL': '#3b82f6',
    'Red-Black': '#ef4444',
    'B-Tree': '#10b981',
    'B+ Tree': '#f59e0b',
    'Splay': '#a78bfa'
};

let rawData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    fetch('metrics.json')
        .then(response => response.json())
        .then(data => {
            rawData = data;
            initializeDashboard();
        })
        .catch(err => {
            console.error('Error loading metrics.json:', err);
            const winners = document.getElementById('winnersList');
            if (winners) winners.innerHTML = '<li>Status: No Data Loaded</li>';
        });

    document.getElementById('operationSelect')?.addEventListener('change', updateDashboard);
    document.getElementById('datasetSelect')?.addEventListener('change', updateDashboard);
    document.getElementById('sizeSelect')?.addEventListener('change', updateDashboard);
});

function initializeDashboard() {
    updateDashboard();
    calculateBestPerformersOverall();
}

function updateDashboard() {
    const operation = document.getElementById('operationSelect').value;
    const dataset = document.getElementById('datasetSelect').value;
    const size = parseInt(document.getElementById('sizeSelect').value);

    // Filter data for the specific operation and dataset
    const opDatasetData = rawData.filter(d => d.operation === operation && d.dataset === dataset);
    // Data for all trees at the current selected size
    const currentSizeData = opDatasetData.filter(d => d.inputSize === size);

    updateCharts(opDatasetData, currentSizeData, operation);
    populateTable(currentSizeData);
    
    // Update Insight text
    const bestTimeTree = currentSizeData.length > 0 ? 
        currentSizeData.reduce((prev, curr) => (prev.executionTimeMs < curr.executionTimeMs) ? prev : curr).tree : 'N/A';
    
    const insight = document.getElementById('status-text');
    if (insight) {
        insight.innerText = `At size ${size}, ${bestTimeTree} performed best for ${operation}.`;
    }
}

function updateCharts(opDatasetData, currentSizeData, operation) {
    const trees = ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'];
    const sizes = [...new Set(rawData.map(d => d.inputSize))].sort((a, b) => a - b);

    // 1. Time vs Size (Line Chart)
    const timeData = {
        labels: sizes.map(s => s >= 1000 ? (s/1000) + 'K' : s),
        datasets: trees.map(tree => ({
            label: tree,
            data: sizes.map(s => {
                const d = opDatasetData.find(x => x.tree === tree && x.inputSize === s);
                return d ? d.executionTimeMs : 0;
            }),
            borderColor: colors[tree],
            backgroundColor: `${colors[tree]}22`,
            borderWidth: 2,
            tension: 0.3,
            fill: true
        }))
    };
    buildChart('time', 'line', 'timeChart', timeData, 'Time (ms)');

    // 2. Structural Ops (Bar Chart for current size)
    const structData = {
        labels: trees,
        datasets: [{
            label: 'Total Structural Ops',
            data: trees.map(tree => {
                const d = currentSizeData.find(x => x.tree === tree);
                if (!d) return 0;
                return (d.singleRotations || 0) + (d.doubleRotations || 0) * 2 + (d.recolorings || 0) + (d.splits || 0);
            }),
            backgroundColor: trees.map(t => colors[t])
        }]
    };
    buildChart('rotations', 'bar', 'rotationsChart', structData, 'Count');

    // 3. Height vs Size (Line Chart)
    const heightData = {
        labels: sizes.map(s => (s/1000) + 'K'),
        datasets: trees.map(tree => ({
            label: tree,
            data: sizes.map(s => {
                const d = opDatasetData.find(x => x.tree === tree && x.inputSize === s);
                return d && d.maxHeight > 0 ? d.maxHeight : null;
            }),
            borderColor: colors[tree],
            tension: 0.3
        }))
    };
    buildChart('height', 'line', 'heightChart', heightData, 'Depth');

    // 4. Key Comparisons (Bar Chart)
    const compData = {
        labels: trees,
        datasets: [{
            label: 'Comparisons',
            data: trees.map(tree => {
                const d = currentSizeData.find(x => x.tree === tree);
                return d ? d.comparisons : 0;
            }),
            backgroundColor: trees.map(t => colors[t])
        }]
    };
    buildChart('comparisons', 'bar', 'comparisonsChart', compData, 'Count');

    // 5. Memory Usage (Bar Chart)
    const memData = {
        labels: trees,
        datasets: [{
            label: 'Bytes per Node',
            data: trees.map(tree => {
                const d = currentSizeData.find(x => x.tree === tree);
                return d ? d.memoryBytes : 0;
            }),
            backgroundColor: trees.map(t => colors[t])
        }]
    };
    buildChart('memory', 'bar', 'memoryChart', memData, 'Bytes');

    // 6. Secondary (Range Query or Traversal)
    const secondaryOp = (operation === 'Insert' || operation === 'Search') ? 'Traversal' : 'Range Query';
    const secondaryData = {
        labels: trees,
        datasets: [{
            label: `${secondaryOp} Time`,
            data: trees.map(tree => {
                const d = rawData.find(x => x.tree === tree && x.operation === secondaryOp && x.inputSize === (currentSizeData[0]?.inputSize || 1000));
                return d ? d.executionTimeMs : 0;
            }),
            backgroundColor: trees.map(t => colors[t])
        }]
    };
    buildChart('special', 'bar', 'specialChart', secondaryData, 'Time (ms)');
}

function buildChart(id, type, canvasId, data, yTitle) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (charts[id]) charts[id].destroy();
    
    charts[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { 
                    title: { display: true, text: yTitle, color: '#94a3b8' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    type: id === 'height' ? 'logarithmic' : 'linear'
                }
            },
            plugins: {
                legend: { 
                    display: type === 'line',
                    labels: { color: '#f8fafc', boxWidth: 12, usePointStyle: true }
                }
            }
        }
    });
}

function populateTable(currentSizeData) {
    const tbody = document.getElementById('metricsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    currentSizeData.forEach(d => {
        const tr = document.createElement('tr');
        const structOps = (d.singleRotations || 0) + (d.doubleRotations || 0) * 2 + (d.recolorings || 0) + (d.splits || 0);
        
        tr.innerHTML = `
            <td><strong style="color:${colors[d.tree]}">${d.tree}</strong></td>
            <td>${d.operation}</td>
            <td>${d.inputSize}</td>
            <td>${d.executionTimeMs.toFixed(3)}</td>
            <td>${structOps}</td>
            <td>${d.maxHeight}</td>
            <td>${d.comparisons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateBestPerformersOverall() {
    if (rawData.length === 0) return;
    const maxSize = Math.max(...rawData.map(d => d.inputSize));
    const maxData = rawData.filter(d => d.inputSize === maxSize);

    const getWinner = (op, metric) => {
        const filtered = maxData.filter(d => d.operation === op);
        if (filtered.length === 0) return 'N/A';
        return filtered.reduce((prev, curr) => (prev[metric] < curr[metric]) ? prev : curr).tree;
    };

    const categories = {
        'Fastest Search': getWinner('Search', 'executionTimeMs'),
        'Fastest Insert': getWinner('Insert', 'executionTimeMs'),
        'Memory Efficient': getWinner('Insert', 'memoryBytes'),
        'Shallowest Tree': getWinner('Insert', 'maxHeight')
    };

    const winnersList = document.getElementById('winnersList');
    if (!winnersList) return;
    winnersList.innerHTML = '';

    Object.entries(categories).forEach(([label, tree]) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${label}</span> <span class="winner-tree">${tree}</span>`;
        winnersList.appendChild(li);
    });
}

let sortAsc = true;
function sortTable(colIndex) {
    const tbody = document.getElementById('metricsTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        let vA = a.children[colIndex].innerText;
        let vB = b.children[colIndex].innerText;
        if (!isNaN(parseFloat(vA)) && !isNaN(parseFloat(vB))) {
            return sortAsc ? parseFloat(vA) - parseFloat(vB) : parseFloat(vB) - parseFloat(vA);
        }
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
    sortAsc = !sortAsc;
}
