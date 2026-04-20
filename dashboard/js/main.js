const colors = {
    'AVL': '#3b82f6',        // Blue
    'Red-Black': '#ef4444',  // Red
    'B-Tree': '#10b981',     // Green
    'B+ Tree': '#f59e0b'     // Yellow
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
            document.getElementById('winnersList').innerHTML = '<li>Error loading data. Run TreeAnalyzer first.</li>';
        });

    // Add event listeners
    document.getElementById('operationSelect').addEventListener('change', updateDashboard);
    document.getElementById('datasetSelect').addEventListener('change', updateDashboard);
    document.getElementById('sizeSelect').addEventListener('change', updateDashboard);
});

function initializeDashboard() {
    updateDashboard();
    calculateBestPerformersOverall();
}

function updateDashboard() {
    const operation = document.getElementById('operationSelect').value;
    const dataset = document.getElementById('datasetSelect').value;
    const size = parseInt(document.getElementById('sizeSelect').value);

    // Filter data for charts showing "vs Size"
    const sizeData = rawData.filter(d => d.operation === operation && d.dataset === dataset);
    
    // Filter data for current specific selection
    const currentData = sizeData.filter(d => d.inputSize === size);

    updateCharts(sizeData, currentData, operation);
    populateTable(currentData);
}

function updateCharts(sizeData, currentData, operation) {
    const trees = ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree'];
    const sizes = [1000, 10000, 100000];

    // 1. Time Chart (Line - Time vs Size)
    const timeChartCtx = document.getElementById('timeChart').getContext('2d');
    const timeChartData = {
        labels: sizes,
        datasets: trees.map(tree => ({
            label: tree,
            data: sizes.map(s => {
                const b = sizeData.find(d => d.tree === tree && d.inputSize === s);
                return b ? b.executionTimeMs : 0;
            }),
            borderColor: colors[tree],
            backgroundColor: `${colors[tree]}33`,
            tension: 0.1,
            fill: false
        }))
    };
    buildChart('time', 'line', timeChartCtx, timeChartData, 'Time (ms)');

    // 2. Rotations/Splits Chart (Bar - Current Data)
    const rotChartCtx = document.getElementById('rotationsChart').getContext('2d');
    const structLabels = ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree'];
    const structData = {
        labels: structLabels,
        datasets: [{
            label: 'Structural Ops (Rotations/Splits/Recolors)',
            data: structLabels.map(tree => {
                const b = currentData.find(d => d.tree === tree);
                if (!b) return 0;
                return b.singleRotations + b.doubleRotations * 2 + b.recolorings + b.splits;
            }),
            backgroundColor: structLabels.map(t => colors[t])
        }]
    };
    buildChart('rotations', 'bar', rotChartCtx, structData, 'Count');

    // 3. Height Chart (Line - Height vs Size)
    const heightChartCtx = document.getElementById('heightChart').getContext('2d');
    const heightChartData = {
        labels: sizes,
        datasets: trees.map(tree => ({
            label: tree,
            data: sizes.map(s => {
                const b = sizeData.find(d => d.tree === tree && d.inputSize === s);
                return b ? b.maxHeight : 0;
            }),
            borderColor: colors[tree],
            tension: 0.1,
            fill: false
        }))
    };
    buildChart('height', 'line', heightChartCtx, heightChartData, 'Max Depth');

    // 4. Comparisons Chart (Bar - Current Data)
    const compChartCtx = document.getElementById('comparisonsChart').getContext('2d');
    const compData = {
        labels: structLabels,
        datasets: [{
            label: 'Key Comparisons',
            data: structLabels.map(tree => {
                const b = currentData.find(d => d.tree === tree);
                return b ? b.comparisons : 0;
            }),
            backgroundColor: structLabels.map(t => colors[t])
        }]
    };
    buildChart('comparisons', 'bar', compChartCtx, compData, 'Count');
    
    // 5. Memory Chart (Bar - Current Data)
    const memChartCtx = document.getElementById('memoryChart').getContext('2d');
    const memData = {
        labels: structLabels,
        datasets: [{
            label: 'Memory Bytes',
            data: structLabels.map(tree => {
                const b = currentData.find(d => d.tree === tree);
                return b ? b.memoryBytes : 0;
            }),
            backgroundColor: structLabels.map(t => colors[t])
        }]
    };
    buildChart('memory', 'bar', memChartCtx, memData, 'Bytes');

    // 6. Traversal Chart (Bar)
    const travChartCtx = document.getElementById('traversalChart').getContext('2d');
    const travData = {
        labels: structLabels,
        datasets: [{
            label: 'Traversal Time (ms)',
            data: structLabels.map(tree => {
                const b = rawData.find(d => d.tree === tree && d.dataset === currentData[0]?.dataset && d.inputSize === currentData[0]?.inputSize && d.operation === 'Traversal');
                return b ? b.traversalTimeMs : 0;
            }),
            backgroundColor: structLabels.map(t => colors[t])
        }]
    };
    buildChart('traversal', 'bar', travChartCtx, travData, 'Time (ms)');

    // 7. Range Query Chart (Bar)
    const rqChartCtx = document.getElementById('specialChart').getContext('2d');
    const rqData = {
        labels: structLabels,
        datasets: [{
            label: 'Range Query Time (ms)',
            data: structLabels.map(tree => {
                const b = rawData.find(d => d.tree === tree && d.dataset === currentData[0]?.dataset && d.inputSize === currentData[0]?.inputSize && d.operation === 'Range Query');
                return b ? b.rangeQueryTimeMs : 0;
            }),
            backgroundColor: structLabels.map(t => colors[t])
        }]
    };
    buildChart('special', 'bar', rqChartCtx, rqData, 'Time (ms)');
}

function buildChart(id, type, ctx, data, yTitle) {
    if (charts[id]) {
        charts[id].destroy();
    }
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#475569';

    charts[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: type === 'line' ? '#334155' : 'transparent' }
                },
                y: {
                    title: { display: true, text: yTitle },
                    grid: { color: '#334155' }
                }
            },
            plugins: {
                legend: {
                    display: type === 'line' || data.datasets.length > 1
                }
            }
        }
    });
}

function populateTable(currentData) {
    const tbody = document.getElementById('metricsTableBody');
    tbody.innerHTML = '';

    currentData.forEach(d => {
        const tr = document.createElement('tr');
        const structOps = d.singleRotations + d.doubleRotations * 2 + d.recolorings + d.splits;
        
        tr.innerHTML = `
            <td>${d.tree}</td>
            <td>${d.operation}</td>
            <td>${d.dataset}</td>
            <td>${d.inputSize}</td>
            <td>${d.executionTimeMs.toFixed(3)}</td>
            <td>${structOps}</td>
            <td>${d.maxHeight}</td>
            <td>${d.comparisons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function getBestPerformersSummary() {
    if (rawData.length === 0) return {};

    // Only assess performance on the absolute largest input size benchmarked to actually test the tree's scaling
    const maxSize = Math.max(...rawData.map(d => d.inputSize));
    const maxData = rawData.filter(d => d.inputSize === maxSize);

    const findBest = (filterFn, metricFn) => {
        const filtered = maxData.filter(filterFn);
        if (filtered.length === 0) return 'N/A';
        const best = filtered.reduce((prev, curr) => metricFn(prev) < metricFn(curr) ? prev : curr);
        return best ? best.tree : 'N/A';
    };

    return {
        'Fastest Search': findBest(d => d.operation === 'Search', d => d.executionTimeMs),
        'Fastest Insert': findBest(d => d.operation === 'Insert', d => d.executionTimeMs),
        'Fastest Delete': findBest(d => d.operation === 'Delete', d => d.executionTimeMs),
        'Best Range Query': findBest(d => d.operation === 'Range Query', d => d.executionTimeMs),
        'Lowest Height': findBest(d => d.operation === 'Insert', d => d.maxHeight),
        'Fewest Rotations': findBest(d => d.operation === 'Insert' && (d.tree === 'AVL' || d.tree === 'Red-Black'), d => d.singleRotations + d.doubleRotations),
        'Best for Sorted Input': findBest(d => d.operation === 'Insert' && d.dataset === 'Sorted', d => d.executionTimeMs),
        'Least Memory per Node': findBest(d => d.operation === 'Insert', d => d.memoryBytes / d.inputSize) // Divides total memory by N keys!
    };
}

function calculateBestPerformersOverall() {
    const summary = getBestPerformersSummary();
    const ul = document.getElementById('winnersList');
    ul.innerHTML = '';

    Object.entries(summary).forEach(([category, winner]) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${category}</span> <span class="winner-tree" style="color:${colors[winner] || 'inherit'}">${winner}</span>`;
        ul.appendChild(li);
    });
}

let sortAsc = true;
function sortTable(colIndex) {
    const table = document.getElementById('metricsTable');
    const tbody = document.getElementById('metricsTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        let valA = a.children[colIndex].textContent;
        let valB = b.children[colIndex].textContent;

        if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
            return sortAsc ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
    sortAsc = !sortAsc;
}
