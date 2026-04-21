const API_URL = 'http://localhost:3000/api';
let currentMode = 'database';
let visualizer = null;

const modeConfig = {
    'database': {
        title: 'Database Index Simulation',
        complexity: 'O(log n)',
        controls: `
            <input type="number" id="db-id" placeholder="Record ID">
            <input type="text" id="db-name" placeholder="Name">
            <button onclick="handleAppAction('insert')">Insert</button>
            <button onclick="handleAppAction('search')">Search</button>
            <button class="danger" onclick="handleAppAction('delete')">Delete</button>
        `,
        endpoint: '/simulation/database'
    },
    'search': {
        title: 'Search Engine Index',
        complexity: 'O(log n)',
        controls: `
            <input type="text" id="se-keyword" placeholder="Keyword">
            <select id="se-tree">
                <option value="avl">AVL Tree</option>
                <option value="rb">Red-Black Tree</option>
            </select>
            <button onclick="handleAppAction('index')">Index</button>
            <button onclick="handleAppAction('search')">Search</button>
        `,
        endpoint: '/tree' // Maps to tree api but we handle hash in C++
    },
    'filesystem': {
        title: 'File System Simulation',
        complexity: 'O(depth)',
        controls: `
            <input type="text" id="fs-path" placeholder="/home/user/docs">
            <button onclick="handleAppAction('create')">Create Path</button>
            <button class="danger" onclick="handleAppAction('delete')">Delete</button>
        `,
        endpoint: '/simulation/filesystem'
    },
    'memory': {
        title: 'Memory Allocator',
        complexity: 'O(log n)',
        controls: `
            <input type="number" id="mem-size" placeholder="Size (KB)">
            <select id="mem-fit">
                <option value="best">Best Fit</option>
                <option value="worst">Worst Fit</option>
            </select>
            <button onclick="handleAppAction('allocate')">Allocate</button>
            <button class="danger" onclick="handleAppAction('free')">Free All</button>
        `,
        endpoint: '/simulation/memory'
    },
    'network': {
        title: 'Network Router',
        complexity: 'O(V + E)',
        controls: `
            <input type="text" id="net-from" placeholder="From" style="width: 80px">
            <input type="text" id="net-to" placeholder="To" style="width: 80px">
            <button onclick="handleAppAction('route')">Find Path</button>
            <button onclick="handleAppAction('reset')">Reset</button>
        `,
        endpoint: '/simulation/network'
    },
    'expression': {
        title: 'Expression Tree (AST)',
        complexity: 'O(n)',
        controls: `
            <input type="text" id="exp-raw" placeholder="(3+5)*2" style="width: 200px">
            <button onclick="handleAppAction('parse')">Parse & Eval</button>
        `,
        endpoint: '/simulation/expression'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    
    document.querySelectorAll('.nav-item-glass').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item-glass').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            switchMode(item.dataset.mode);
        });
    });

    switchMode('database'); // Default
});

function switchMode(mode) {
    currentMode = mode;
    const cfg = modeConfig[mode];
    
    document.getElementById('mode-title').innerText = cfg.title;
    document.getElementById('mode-complexity').innerText = cfg.complexity;
    document.getElementById('mode-controls').innerHTML = cfg.controls;
    
    visualizer.clear();
    addLog(`Switched to ${cfg.title}.`, 'system');
}

async function handleAppAction(action) {
    let body = { type: currentMode, actions: [] };
    let endpoint = modeConfig[currentMode].endpoint;

    // Build payload based on mode
    if (currentMode === 'database') {
        const id = document.getElementById('db-id').value;
        const name = document.getElementById('db-name').value;
        if (!id) return;
        body.actions = [`${action}:${id}${name ? ':' + name : ''}`];
    } else if (currentMode === 'search') {
        const kw = document.getElementById('se-keyword').value;
        const type = document.getElementById('se-tree').value;
        if (!kw) return;
        body.type = type;
        body.actions = [`${action === 'index' ? 'insert' : action}:${kw}`];
        endpoint = '/tree';
    } else if (currentMode === 'expression') {
        const expr = document.getElementById('exp-raw').value;
        if (!expr) return;
        body.actions = [`eval:${expr}`];
    } else if (currentMode === 'filesystem') {
        const path = document.getElementById('fs-path').value;
        if (!path) return;
        body.actions = [`${action}:${path}`];
    } else if (currentMode === 'network') {
        const from = document.getElementById('net-from').value;
        const to = document.getElementById('net-to').value;
        body.actions = [`${action}:${from}:${to}`];
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (data.status === 'success') {
            visualizer.render(data.tree);
            updateStats(data.metrics);
            (data.logs || []).forEach(l => addLog(l, action));
        } else {
            addLog(`Error: ${data.message}`, 'delete');
        }
    } catch (e) {
        addLog(`Connection error to backend.`, 'delete');
    }
}

function updateStats(m) {
    if (!m) return;
    document.getElementById('stat-ops').innerText = m.comparisons || 0;
    document.getElementById('stat-time').innerText = `${m.time_ms || 0}ms`;
}

function addLog(msg, type) {
    const list = document.getElementById('log-list');
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    list.prepend(div);
}
