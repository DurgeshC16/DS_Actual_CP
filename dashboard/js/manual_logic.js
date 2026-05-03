const API_URL = 'http://localhost:3000/api';

// Session ID for the manual page — persists across builds so tree accumulates
const MANUAL_SESSION_ID = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + '_manual';

let visualizer = null;
let comparisonChart = null;

// Persistent list of values in the current tree
let insertedValues = [];

const colors = {
    'AVL': '#3b82f6',
    'Red-Black': '#ef4444',
    'B-Tree': '#10b981',
    'B+ Tree': '#f59e0b',
    'Splay': '#a78bfa'
};

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    initChart();

    document.getElementById('btn-insert-single').addEventListener('click', insertSingle);
    document.getElementById('btn-delete-single').addEventListener('click', deleteSingle);
    document.getElementById('btn-load-bulk').addEventListener('click', loadBulk);
    document.getElementById('btn-compare').addEventListener('click', runComparison);
    document.getElementById('btn-clear-manual').addEventListener('click', clearAll);

    // Allow Enter key in single-value input
    document.getElementById('single-val').addEventListener('keydown', e => {
        if (e.key === 'Enter') insertSingle();
    });
    document.getElementById('delete-val').addEventListener('keydown', e => {
        if (e.key === 'Enter') deleteSingle();
    });
});

// ─── Single Insert ─────────────────────────────────────────────────────────────
async function insertSingle() {
    const raw = document.getElementById('single-val').value.trim();
    const val = parseInt(raw, 10);
    if (isNaN(val)) { alert('Enter a valid integer.'); return; }

    insertedValues.push(val);
    document.getElementById('single-val').value = '';
    await buildTree();
}

// ─── Single Delete ─────────────────────────────────────────────────────────────
async function deleteSingle() {
    const raw = document.getElementById('delete-val').value.trim();
    const val = parseInt(raw, 10);
    if (isNaN(val)) { alert('Enter a valid integer.'); return; }

    const idx = insertedValues.indexOf(val);
    if (idx === -1) { alert(`${val} is not in the current tree.`); return; }
    insertedValues.splice(idx, 1);
    document.getElementById('delete-val').value = '';
    await buildTree();
}

// ─── Bulk Load ────────────────────────────────────────────────────────────────
async function loadBulk() {
    const raw = document.getElementById('raw-input').value;
    const vals = raw.split(/[\s,\n]+/).map(v => v.trim()).filter(v => v !== '' && !isNaN(v)).map(Number);
    if (vals.length === 0) { alert('No valid numbers found.'); return; }
    insertedValues = vals;
    await buildTree();
}

// ─── Build / Rebuild Tree ─────────────────────────────────────────────────────
async function buildTree() {
    if (insertedValues.length === 0) {
        visualizer.clear();
        updateStats({ nodes: 0, height: 0, comparisons: 0, rotations: 0 });
        updateValueBadge();
        return;
    }

    const type = document.getElementById('tree-select').value;
    const order = parseInt(document.getElementById('manual-order').value) || 3;

    if (type === 'btree' || type === 'bplus') {
        document.getElementById('order-badge').innerText = `Order: ${order}`;
        document.getElementById('order-badge').style.display = 'block';
    } else {
        document.getElementById('order-badge').style.display = 'none';
    }

    // Send the FULL insertedValues array (no session needed — we control the list)
    const actions = insertedValues.map(v => `insert:${v}`);

    try {
        const res = await fetch(`${API_URL}/tree`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, actions, order })
        });
        const result = await res.json();

        if (result.status === 'success') {
            // Attach type hint for B-Tree rendering
            if (result.tree) result.tree.type = type;
            visualizer.render(result.tree);

            // FIX: use server's node count, not parseInput().length
            const nodeCount = result.tree?.nodes?.length ?? insertedValues.length;

            // Compute height from metrics or from node heights in the tree
            let height = result.metrics?.height;
            if (height === undefined || height === null) {
                const heights = (result.tree?.nodes || []).map(n => n.height || 0);
                height = heights.length > 0 ? Math.max(...heights) : 0;
            }

            updateStats({
                nodes: nodeCount,
                height,
                comparisons: result.metrics?.comparisons ?? 0,
                rotations: result.metrics?.rotations ?? 0
            });
        } else {
            alert(`Error: ${result.message || 'Server error'}`);
        }
    } catch (e) {
        console.error('Build error:', e);
        alert('Backend error. Is the server running? (node server.js in the backend folder)');
    }

    updateValueBadge();
}

// ─── Compare All (multi-metric grouped bar chart) ──────────────────────────────
async function runComparison() {
    if (insertedValues.length === 0) { alert('Load values first.'); return; }

    const trees = ['avl', 'rb', 'btree', 'bplus', 'splay'];
    const treeLabels = ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'];
    const order = parseInt(document.getElementById('manual-order').value) || 3;
    const actions = insertedValues.map(v => `insert:${v}`);

    const times = [], comps = [], rots = [], heights = [];

    for (const type of trees) {
        try {
            const res = await fetch(`${API_URL}/tree`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, actions, order })
            });
            const data = await res.json();
            const m = data.metrics || {};
            const nodeList = data.tree?.nodes || [];
            const hs = nodeList.map(n => n.height || 0);
            const h = m.height ?? (hs.length ? Math.max(...hs) : 0);

            times.push(parseFloat((m.time_ms ?? 0).toFixed(4)));
            comps.push(m.comparisons ?? 0);
            rots.push(m.rotations ?? 0);
            heights.push(h);
        } catch (_) {
            times.push(0); comps.push(0); rots.push(0); heights.push(0);
        }
    }

    // Rebuild chart with 4 datasets
    if (comparisonChart) comparisonChart.destroy();

    const ctx = document.getElementById('manual-chart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: treeLabels,
            datasets: [
                {
                    label: 'Build Time (ms)',
                    data: times,
                    backgroundColor: 'rgba(59,130,246,0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    yAxisID: 'y-time'
                },
                {
                    label: 'Comparisons',
                    data: comps,
                    backgroundColor: 'rgba(16,185,129,0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    yAxisID: 'y-count'
                },
                {
                    label: 'Struct Ops',
                    data: rots,
                    backgroundColor: 'rgba(245,158,11,0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    yAxisID: 'y-count'
                },
                {
                    label: 'Tree Height',
                    data: heights,
                    backgroundColor: 'rgba(167,139,250,0.7)',
                    borderColor: '#a78bfa',
                    borderWidth: 1,
                    yAxisID: 'y-count'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                'y-time': {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Time (ms)', color: '#94a3b8' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                'y-count': {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Count', color: '#94a3b8' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#f8fafc', boxWidth: 12 }
                }
            }
        }
    });
}

// ─── Clear Everything ─────────────────────────────────────────────────────────
function clearAll() {
    insertedValues = [];
    visualizer.clear();
    document.getElementById('raw-input').value = '';
    document.getElementById('single-val').value = '';
    document.getElementById('delete-val').value = '';
    document.getElementById('order-badge').style.display = 'none';
    updateStats({ nodes: 0, height: 0, comparisons: 0, rotations: 0 });
    updateValueBadge();
    if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
    initChart();
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats({ nodes = 0, height = 0, comparisons = 0, rotations = 0 }) {
    document.getElementById('stat-nodes').innerText = nodes;
    document.getElementById('stat-height').innerText = height;
    document.getElementById('stat-comps').innerText = comparisons;
    document.getElementById('stat-rot').innerText = rotations;
}

function updateValueBadge() {
    const badge = document.getElementById('value-badge');
    if (!badge) return;
    badge.innerText = `Values: [${insertedValues.slice(0, 8).join(', ')}${insertedValues.length > 8 ? ', ...' : ''}] (${insertedValues.length})`;
    badge.style.display = insertedValues.length > 0 ? 'block' : 'none';
}

// ─── Initial blank chart ──────────────────────────────────────────────────────
function initChart() {
    const ctx = document.getElementById('manual-chart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'],
            datasets: [
                { label: 'Build Time (ms)', data: [0,0,0,0,0], backgroundColor: 'rgba(59,130,246,0.7)', yAxisID: 'y-time' },
                { label: 'Comparisons', data: [0,0,0,0,0], backgroundColor: 'rgba(16,185,129,0.7)', yAxisID: 'y-count' },
                { label: 'Struct Ops', data: [0,0,0,0,0], backgroundColor: 'rgba(245,158,11,0.7)', yAxisID: 'y-count' },
                { label: 'Tree Height', data: [0,0,0,0,0], backgroundColor: 'rgba(167,139,250,0.7)', yAxisID: 'y-count' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                'y-time': {
                    type: 'linear', position: 'left',
                    title: { display: true, text: 'Time (ms)', color: '#94a3b8' },
                    grid: { color: '#334155' }, ticks: { color: '#94a3b8' }
                },
                'y-count': {
                    type: 'linear', position: 'right',
                    title: { display: true, text: 'Count', color: '#94a3b8' },
                    grid: { drawOnChartArea: false }, ticks: { color: '#94a3b8' }
                }
            },
            plugins: { legend: { display: true, labels: { color: '#f8fafc', boxWidth: 12 } } }
        }
    });
}
