const API_URL = 'http://localhost:3000/api';

// Session ID for the manual page
let MANUAL_SESSION_ID = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + '_manual';

let visualizer = null;
let comparisonChart = null;
let isFetching = false; // BUG 6: global in-flight guard

// Persistent list of values in the current tree
let insertedValues = [];

const colors = {
    'AVL': '#3b82f6',
    'Red-Black': '#ef4444',
    'B-Tree': '#10b981',
    'B+ Tree': '#f59e0b',
    'Splay': '#a78bfa'
};

// ─── BUG 6: Disable/enable all action buttons ─────────────────────────────────
function setButtonsDisabled(disabled) {
    const btnIds = [
        'btn-insert-single', 'btn-delete-single',
        'btn-load-bulk', 'btn-compare', 'btn-clear-manual'
    ];
    btnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '';
        btn.style.cursor = disabled ? 'not-allowed' : '';
    });
}

// ─── BUG 2: toggleOrder — now defined here, called from DOMContentLoaded ──────
function toggleOrder() {
    const val = document.getElementById('tree-select').value;
    document.getElementById('order-group').style.display =
        (val === 'btree' || val === 'bplus') ? 'block' : 'none';
}

// ─── BUG 3 & General: Live badge update — called on select change + order input
function updateManualBadge() {
    const type = document.getElementById('tree-select')?.value;
    const order = getManualOrder();
    const badge = document.getElementById('order-badge');
    if (!badge) return;
    if (type === 'btree' || type === 'bplus') {
        const label = type === 'btree' ? 'B-Tree' : 'B+ Tree';
        const maxKeys = getMaxKeysForOrder(order);
        const minChildren = Math.ceil(order / 2);
        const minKeys = Math.max(1, minChildren - 1);
        badge.innerText = `${label} - Order ${order}: keys ${minKeys}-${maxKeys}, children ${minChildren}-${order}`;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    updateOrderInfo();
}

function getManualOrder() {
    const input = document.getElementById('manual-order');
    const order = parseInt(input?.value, 10);
    return Number.isFinite(order) ? Math.max(3, order) : 3;
}

function getMaxKeysForOrder(order) {
    return Math.max(2, order - 1);
}

function updateOrderInfo() {
    const info = document.getElementById('order-info');
    const type = document.getElementById('tree-select')?.value;
    if (!info) return;

    if (type !== 'btree' && type !== 'bplus') {
        info.style.display = 'none';
        return;
    }

    const order = getManualOrder();
    const maxKeys = getMaxKeysForOrder(order);
    const minChildren = Math.ceil(order / 2);
    const minKeys = Math.max(1, minChildren - 1);
    info.innerText = `Order ${order}: non-root internal nodes have ${minChildren}-${order} children and ${minKeys}-${maxKeys} keys. Root may have fewer.`;
    info.style.display = 'block';
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    initChart();

    // BUG 6: wire all action buttons
    document.getElementById('btn-insert-single').addEventListener('click', insertSingle);
    document.getElementById('btn-delete-single').addEventListener('click', deleteSingle);
    document.getElementById('btn-load-bulk').addEventListener('click', loadBulk);
    document.getElementById('btn-compare').addEventListener('click', runComparison);
    document.getElementById('btn-clear-manual').addEventListener('click', clearAll);

    // BUG 2 + BUG 3: wire tree-select & order input programmatically
    document.getElementById('tree-select').addEventListener('change', onTreeTypeChange);
    document.getElementById('manual-order').addEventListener('input', () => {
        updateManualBadge();      // BUG 3: update badge live as user types
        renderBuildSimulation();
    });

    // BUG 2: call toggleOrder once on load to reflect any browser-restored state
    toggleOrder();
    updateManualBadge(); // BUG 3: show badge immediately on load if B-Tree selected

    // Enter-key shortcuts
    document.getElementById('single-val').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); insertSingle(); }
    });
    document.getElementById('delete-val').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); deleteSingle(); }
    });
    document.getElementById('raw-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); loadBulk(); }
    });
});

// ─── BUG 2 + BUG 5: Handle tree type change ──────────────────────────────────
async function onTreeTypeChange() {
    const oldSessionId = MANUAL_SESSION_ID;

    // BUG 5: release old session from server immediately
    fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: oldSessionId })
    }).catch(() => {}); // fire-and-forget, don't block UI

    // Generate a fresh session ID for the new tree type
    MANUAL_SESSION_ID = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + '_manual';

    // Clear accumulated values and visualization so old state doesn't bleed
    insertedValues = [];
    visualizer.clear();
    updateStats({ nodes: 0, height: 0, comparisons: 0, rotations: 0 });
    updateValueBadge();
    renderBuildSimulation();

    // BUG 2: toggle order input visibility
    toggleOrder();
    // BUG 3: update badge immediately
    updateManualBadge();
}

// ─── Single Insert ─────────────────────────────────────────────────────────────
async function insertSingle() {
    if (isFetching) return; // BUG 6: guard against double-submit
    const raw = document.getElementById('single-val').value.trim();
    const val = parseInt(raw, 10);
    if (isNaN(val)) { alert('Enter a valid integer.'); return; }

    insertedValues.push(val);
    document.getElementById('single-val').value = '';
    await buildTree();
}

// ─── Single Delete ─────────────────────────────────────────────────────────────
async function deleteSingle() {
    if (isFetching) return; // BUG 6: guard
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
    if (isFetching) return; // BUG 6: guard
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
        updateManualBadge(); // BUG 3: keep badge state correct on empty tree
        renderBuildSimulation();
        return;
    }

    const type = document.getElementById('tree-select').value;
    const order = getManualOrder();

    // BUG 3: always update badge before the fetch (not inside it)
    updateManualBadge();

    // BUG 6: lock all buttons before fetch
    isFetching = true;
    setButtonsDisabled(true);

    const actions = insertedValues.map(v => `insert:${v}`);

    try {
        const res = await fetch(`${API_URL}/tree`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, actions, order })
        });
        const result = await res.json();

        if (result.status === 'success') {
            if (result.tree) result.tree.type = type;
            visualizer.render(result.tree);

            const nodeCount = result.tree?.nodes?.length ?? insertedValues.length;

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
            renderBuildSimulation();
        } else {
            alert(`Error: ${result.message || 'Server error'}`);
        }
    } catch (e) {
        console.error('Build error:', e);
        alert('Backend error. Is the server running? (node server.js in the backend folder)');
    } finally {
        // BUG 6: always re-enable buttons
        isFetching = false;
        setButtonsDisabled(false);
    }

    updateValueBadge();
}

// ─── Compare All (multi-metric grouped bar chart) ──────────────────────────────
async function runComparison() {
    if (isFetching) return; // BUG 6: guard
    if (insertedValues.length === 0) { alert('Load values first.'); return; }

    // BUG 6: lock buttons
    isFetching = true;
    setButtonsDisabled(true);

    try {
        const trees = ['avl', 'rb', 'btree', 'bplus', 'splay'];
        const treeLabels = ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'];
        const order = getManualOrder();
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

        // BUG 10: dynamic chart title showing what was compared
        const valSummary = insertedValues.slice(0, 5).join(', ') +
            (insertedValues.length > 5 ? ', …' : '');
        const titleEl = document.getElementById('chart-title');
        if (titleEl) {
            titleEl.innerText =
                `Compare All Trees — ${insertedValues.length} value${insertedValues.length !== 1 ? 's' : ''}: [${valSummary}]`;
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
                        backgroundColor: 'rgba(59,130,246,0.75)',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        yAxisID: 'y-time'
                    },
                    {
                        label: 'Comparisons',
                        data: comps,
                        backgroundColor: 'rgba(16,185,129,0.75)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        yAxisID: 'y-count'
                    },
                    {
                        label: 'Struct Ops',
                        data: rots,
                        backgroundColor: 'rgba(245,158,11,0.75)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        yAxisID: 'y-count'
                    },
                    {
                        label: 'Tree Height',
                        data: heights,
                        backgroundColor: 'rgba(167,139,250,0.75)',
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
                    // BUG 10: high-contrast axis text (#e2e8f0 instead of muted #94a3b8)
                    x: {
                        grid: { color: '#334155' },
                        ticks: { color: '#e2e8f0', font: { weight: '600' } }
                    },
                    'y-time': {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Time (ms)', color: '#e2e8f0' },
                        grid: { color: '#334155' },
                        ticks: { color: '#e2e8f0' }
                    },
                    'y-count': {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Count', color: '#e2e8f0' },
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#e2e8f0' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#f8fafc', boxWidth: 12, font: { weight: '600' } }
                    }
                }
            }
        });
    } finally {
        // BUG 6: always re-enable
        isFetching = false;
        setButtonsDisabled(false);
    }
}

// ─── Clear Everything ─────────────────────────────────────────────────────────
async function clearAll() {
    if (isFetching) return; // BUG 6: guard

    // BUG 5: release server session immediately
    const oldId = MANUAL_SESSION_ID;
    fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: oldId })
    }).catch(() => {});
    MANUAL_SESSION_ID = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)) + '_manual';

    insertedValues = [];
    visualizer.clear();
    document.getElementById('raw-input').value = '';
    document.getElementById('single-val').value = '';
    document.getElementById('delete-val').value = '';
    updateStats({ nodes: 0, height: 0, comparisons: 0, rotations: 0 });
    updateValueBadge();
    // BUG 3: restore badge based on currently selected tree type (don't just hide)
    updateManualBadge();
    renderBuildSimulation();
    if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
    initChart();

    // BUG 10: reset chart title
    const titleEl = document.getElementById('chart-title');
    if (titleEl) titleEl.innerText = 'Dataset Complexity Analysis — Compare All Trees';
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
function renderBuildSimulation() {
    const card = document.getElementById('build-simulation-card');
    const list = document.getElementById('build-simulation-list');
    const type = document.getElementById('tree-select')?.value;
    if (!card || !list) return;

    if ((type !== 'btree' && type !== 'bplus') || insertedValues.length === 0) {
        card.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    const steps = simulateMultiwayBuild(type, insertedValues, getManualOrder());
    const visible = steps.slice(-12);
    list.innerHTML = '';

    if (steps.length > visible.length) {
        const skipped = document.createElement('li');
        skipped.innerText = `${steps.length - visible.length} earlier build step(s) hidden`;
        list.appendChild(skipped);
    }

    visible.forEach(step => {
        const li = document.createElement('li');
        if (step.includes('split')) {
            li.innerHTML = step.replace('split', '<span class="split">split</span>');
        } else {
            li.innerText = step;
        }
        list.appendChild(li);
    });

    card.style.display = 'block';
}

function simulateMultiwayBuild(type, values, order) {
    const state = {
        root: { keys: [], children: [], leaf: true },
        steps: [],
        maxKeys: getMaxKeysForOrder(order)
    };

    values.forEach(value => {
        state.steps.push(`Insert ${value}`);
        const promoted = type === 'bplus'
            ? insertBPlusSim(state.root, value, state)
            : insertBTreeSim(state.root, value, state);

        if (promoted) {
            state.root.keys = [promoted.key];
            state.root.children = [promoted.left, promoted.right];
            state.root.leaf = false;
            state.steps.push(`Root split: promote ${promoted.key}; height increases`);
        } else {
            state.steps[state.steps.length - 1] = `Insert ${value}: placed without split`;
        }
    });

    return state.steps;
}

function insertBTreeSim(node, value, state) {
    if (node.leaf) {
        insertSortedUnique(node.keys, value);
    } else {
        let childIndex = 0;
        while (childIndex < node.keys.length && value > node.keys[childIndex]) childIndex++;
        const promoted = insertBTreeSim(node.children[childIndex], value, state);
        if (promoted) {
            node.keys.splice(childIndex, 0, promoted.key);
            node.children.splice(childIndex, 1, promoted.left, promoted.right);
        }
    }

    if (node.keys.length <= state.maxKeys) return null;

    const mid = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[mid];
    const left = {
        keys: node.keys.slice(0, mid),
        children: node.leaf ? [] : node.children.slice(0, mid + 1),
        leaf: node.leaf
    };
    const right = {
        keys: node.keys.slice(mid + 1),
        children: node.leaf ? [] : node.children.slice(mid + 1),
        leaf: node.leaf
    };
    state.steps.push(`Node split: promote ${promotedKey}; max ${state.maxKeys} keys and ${state.maxKeys + 1} children`);
    return { key: promotedKey, left, right };
}

function insertBPlusSim(node, value, state) {
    if (node.leaf) {
        insertSortedUnique(node.keys, value);
    } else {
        let childIndex = 0;
        while (childIndex < node.keys.length && value >= node.keys[childIndex]) childIndex++;
        const promoted = insertBPlusSim(node.children[childIndex], value, state);
        if (promoted) {
            node.keys.splice(childIndex, 0, promoted.key);
            node.children.splice(childIndex, 1, promoted.left, promoted.right);
        }
    }

    if (node.keys.length <= state.maxKeys) return null;

    if (node.leaf) {
        const mid = Math.ceil(node.keys.length / 2);
        const left = { keys: node.keys.slice(0, mid), children: [], leaf: true };
        const right = { keys: node.keys.slice(mid), children: [], leaf: true };
        state.steps.push(`Leaf split: copy up ${right.keys[0]}; leaves remain linked`);
        return { key: right.keys[0], left, right };
    }

    const mid = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[mid];
    const left = {
        keys: node.keys.slice(0, mid),
        children: node.children.slice(0, mid + 1),
        leaf: false
    };
    const right = {
        keys: node.keys.slice(mid + 1),
        children: node.children.slice(mid + 1),
        leaf: false
    };
    state.steps.push(`Internal split: promote ${promotedKey}; max children remains ${state.maxKeys + 1}`);
    return { key: promotedKey, left, right };
}

function insertSortedUnique(keys, value) {
    let index = 0;
    while (index < keys.length && value > keys[index]) index++;
    if (keys[index] !== value) keys.splice(index, 0, value);
}

function initChart() {
    const ctx = document.getElementById('manual-chart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['AVL', 'Red-Black', 'B-Tree', 'B+ Tree', 'Splay'],
            datasets: [
                { label: 'Build Time (ms)', data: [0,0,0,0,0], backgroundColor: 'rgba(59,130,246,0.75)', yAxisID: 'y-time' },
                { label: 'Comparisons',     data: [0,0,0,0,0], backgroundColor: 'rgba(16,185,129,0.75)',  yAxisID: 'y-count' },
                { label: 'Struct Ops',      data: [0,0,0,0,0], backgroundColor: 'rgba(245,158,11,0.75)', yAxisID: 'y-count' },
                { label: 'Tree Height',     data: [0,0,0,0,0], backgroundColor: 'rgba(167,139,250,0.75)', yAxisID: 'y-count' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#e2e8f0', font: { weight: '600' } }
                },
                'y-time': {
                    type: 'linear', position: 'left',
                    title: { display: true, text: 'Time (ms)', color: '#e2e8f0' },
                    grid: { color: '#334155' }, ticks: { color: '#e2e8f0' }
                },
                'y-count': {
                    type: 'linear', position: 'right',
                    title: { display: true, text: 'Count', color: '#e2e8f0' },
                    grid: { drawOnChartArea: false }, ticks: { color: '#e2e8f0' }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#f8fafc', boxWidth: 12, font: { weight: '600' } }
                }
            }
        }
    });
}
