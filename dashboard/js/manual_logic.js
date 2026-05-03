const API_URL = 'http://localhost:3000/api';
let visualizer = null;
let comparisonChart = null;

const colors = {
    'AVL': '#3b82f6',
    'Red-Black': '#ef4444',
    'B-Tree': '#10b981',
    'B+ Tree': '#f59e0b',
    'Splay': '#a78bfa'
};

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    initChart();

    document.getElementById('btn-build').addEventListener('click', buildTree);
    document.getElementById('btn-compare').addEventListener('click', runComparison);
    document.getElementById('btn-clear-manual').addEventListener('click', () => {
        visualizer.clear();
        document.getElementById('raw-input').value = '';
        document.getElementById('order-badge').style.display = 'none';
        updateStats({ comparisons: 0, rotations: 0, height: 0 });
        if (comparisonChart) {
            comparisonChart.data.datasets[0].data = [0, 0, 0, 0, 0];
            comparisonChart.update();
        }
    });
});

function initChart() {
    const ctx = document.getElementById('manual-chart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'],
            datasets: [{
                label: 'Build Time (ms)',
                data: [0, 0, 0, 0, 0],
                backgroundColor: Object.values(colors)
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                x: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function parseInput() {
    const raw = document.getElementById('raw-input').value;
    return raw.split(/[\s,\n]+/).map(v => v.trim()).filter(v => v !== "" && !isNaN(v));
}

async function buildTree() {
    const data = parseInput();
    if (data.length === 0) return;

    const type = document.getElementById('tree-select').value;
    const order = parseInt(document.getElementById('manual-order').value) || 3;
    
    if (type === 'btree' || type === 'bplus') {
        document.getElementById('order-badge').innerText = `Order: ${order}`;
        document.getElementById('order-badge').style.display = 'block';
    } else {
        document.getElementById('order-badge').style.display = 'none';
    }

    const actions = data.map(v => `insert:${v}`);
    
    try {
        const res = await fetch(`${API_URL}/tree`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, actions, order })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            visualizer.render(result.tree);
            if (result.metrics && result.metrics.height === undefined) {
                const heights = result.tree.nodes.map(n => n.height || 0);
                result.metrics.height = heights.length > 0 ? Math.max(...heights) : 'N/A';
            }
            updateStats(result.metrics);
        } else {
            alert(`Error: ${result.message || 'Unknown error from server'}`);
        }
    } catch (e) { 
        console.error("Manual Build Error:", e);
        alert("Backend error. Please ensure the server is running ('node server.js' in backend folder).");
    }
}

async function runComparison() {
    const vals = parseInput();
    if (vals.length === 0) return;

    const trees = ['avl', 'rb', 'btree', 'bplus', 'splay'];
    const order = parseInt(document.getElementById('manual-order').value) || 3;
    const times = [];

    for (const type of trees) {
        try {
            const res = await fetch(`${API_URL}/tree`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, actions: vals.map(v => `insert:${v}`), order })
            });
            const data = await res.json();
            times.push(data.metrics ? data.metrics.time_ms : 0);
        } catch (e) { times.push(0); }
    }

    comparisonChart.data.datasets[0].data = times;
    comparisonChart.update();
}

function updateStats(m) {
    if (!m) return;
    document.getElementById('stat-nodes').innerText = parseInput().length;
    document.getElementById('stat-height').innerText = m.height !== undefined ? m.height : 'N/A';
    document.getElementById('stat-comps').innerText = m.comparisons || 0;
    document.getElementById('stat-rot').innerText = m.rotations || 0;
}
