const API_URL = 'http://localhost:3000/api';
let visualizer = null;
let comparisonChart = null;

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    initChart();

    document.getElementById('btn-build').addEventListener('click', buildTreeSequentially);
    document.getElementById('btn-compare').addEventListener('click', runComparison);
    document.getElementById('btn-clear-manual').addEventListener('click', () => {
        visualizer.clear();
        document.getElementById('raw-input').value = '';
        if (comparisonChart) comparisonChart.destroy();
        initChart();
    });
});

function initChart() {
    const ctx = document.getElementById('manual-chart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree'],
            datasets: [{
                label: 'Execution Time (ms)',
                data: [0, 0, 0, 0],
                backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, grid: { color: '#334155' } } }
        }
    });
}

function parseInput() {
    const raw = document.getElementById('raw-input').value;
    return raw.split(/[\s,\n]+/).map(v => v.trim()).filter(v => v !== "");
}

async function buildTreeSequentially() {
    const data = parseInput();
    if (data.length === 0) return;

    const type = document.getElementById('tree-select').value;
    const speed = parseInt(document.getElementById('speed-select').value);
    
    visualizer.clear();
    const actions = [];

    for (const val of data) {
        actions.push(`insert:${val}`);
        
        try {
            const res = await fetch(`${API_URL}/tree`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, actions })
            });
            const result = await res.json();
            
            if (result.status === 'success') {
                visualizer.render(result.tree);
                updateStats(result.metrics);
                await new Promise(r => setTimeout(r, speed));
            }
        } catch (e) { console.error(e); break; }
    }
}

async function runComparison() {
    const vals = parseInput();
    if (vals.length === 0) return;

    const trees = ['avl', 'rb', 'btree', 'bplus'];
    const times = [];

    for (const type of trees) {
        const res = await fetch(`${API_URL}/tree`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, actions: vals.map(v => `insert:${v}`) })
        });
        const data = await res.json();
        times.push(data.metrics ? data.metrics.time_ms : 0);
    }

    comparisonChart.data.datasets[0].data = times;
    comparisonChart.update();
}

function updateStats(m) {
    if (!m) return;
    document.getElementById('stat-nodes').innerText = m.nodes || 0;
    document.getElementById('stat-height').innerText = m.height || 0;
    document.getElementById('stat-comps').innerText = m.comparisons || 0;
    document.getElementById('stat-rot').innerText = m.rotations || 0;
}
