const API_URL = 'http://localhost:3000/api';
let currentMode = 'sandbox';
let visualizer = null;

const modeConfig = {
    'sandbox': {
        title: 'Data Structure Sandbox',
        badge: 'Sandbox',
        knowledge: 'Explore self-balancing properties. Splay Trees bring frequently accessed items to the root, optimizing for temporal locality.',
        controls: `
            <div class="control-group">
                <label>Tree Type</label>
                <select id="sb-tree" onchange="toggleOrderControl()">
                    <option value="avl">AVL Tree</option>
                    <option value="rb">Red-Black Tree</option>
                    <option value="btree">B-Tree</option>
                    <option value="bplus">B+ Tree</option>
                    <option value="splay">Splay Tree</option>
                </select>
            </div>
            <div id="order-ctrl" class="control-group" style="display:none">
                <label>Tree Order (t/m)</label>
                <input type="number" id="sb-order" value="3" min="2" max="10">
            </div>
            <div class="control-group">
                <label>Key Value</label>
                <input type="number" id="sb-val" placeholder="e.g. 42">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('insert')">Insert</button>
                <button class="primary" onclick="handleAction('search')">Search</button>
                <button class="danger" onclick="handleAction('delete')">Delete</button>
            </div>
        `
    },
    'database': {
        title: 'Database Indexing (B+ Tree)',
        badge: 'B+ Tree Index',
        knowledge: 'Databases use B+ Trees to minimize disk reads. Internal nodes only store keys for routing, while leaves store actual record pointers and are linked for fast range scans.',
        controls: `
            <div class="control-group">
                <label>Record ID</label>
                <input type="number" id="db-id" placeholder="Primary Key">
            </div>
            <div class="control-group">
                <label>Metadata</label>
                <input type="text" id="db-meta" placeholder="e.g. User Profile">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('insert')">Add Index</button>
                <button class="primary" onclick="handleAction('search')">Find ID</button>
                <button class="danger" onclick="handleAction('delete')">Drop ID</button>
            </div>
        `
    },
    'memory': {
        title: 'Memory Allocator (AVL)',
        badge: 'Memory Mgmt',
        knowledge: 'Memory managers use AVL trees to track free blocks. This enables a "Best Fit" strategy where the smallest block larger than the request is found in O(log n).',
        controls: `
            <div class="control-group">
                <label>Request Size (KB)</label>
                <input type="number" id="mem-size" placeholder="Alloc size">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('allocate')">Best Fit Alloc</button>
                <button class="danger" onclick="handleAction('free')">Clear Pool</button>
            </div>
        `
    },
    'filesystem': {
        title: 'File System (Inodes)',
        badge: 'File Inodes',
        knowledge: 'Modern file systems (like XFS) use B-Trees to manage directory entries and block mappings, ensuring file lookups stay fast even with millions of entries.',
        controls: `
            <div class="control-group">
                <label>File Path</label>
                <input type="text" id="fs-path" placeholder="/home/user/project">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('create')">Mkdir/Touch</button>
                <button class="danger" onclick="handleAction('delete')">Rm -rf</button>
            </div>
        `
    },
    'expression': {
        title: 'Expression Parsing (AST)',
        badge: 'Compiler AST',
        knowledge: 'Compilers build Abstract Syntax Trees to represent the logical structure of code. This tree can be evaluated recursively to execute operations.',
        controls: `
            <div class="control-group">
                <label>Math Expression</label>
                <input type="text" id="exp-raw" placeholder="(3+5)*2">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('parse')">Compile AST</button>
            </div>
        `
    }
};

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchMode(btn.dataset.mode);
        });
    });

    switchMode('sandbox');
});

function toggleOrderControl() {
    const tree = document.getElementById('sb-tree').value;
    const ctrl = document.getElementById('order-ctrl');
    ctrl.style.display = (tree === 'btree' || tree === 'bplus') ? 'block' : 'none';
}

function switchMode(mode) {
    currentMode = mode;
    const cfg = modeConfig[mode];
    
    document.getElementById('mode-title').innerText = cfg.title;
    document.getElementById('mode-badge').innerText = cfg.badge;
    document.getElementById('mode-controls-inner').innerHTML = cfg.controls;
    document.getElementById('knowledge-text').innerText = cfg.knowledge;
    
    document.getElementById('order-badge').style.display = 'none';
    visualizer.clear();
    addLog(`Switched to ${cfg.title} simulation.`, 'system');
    
    if (mode === 'sandbox') toggleOrderControl();
}

async function handleAction(action) {
    let body = { actions: [] };
    let endpoint = '/tree';
    let type = 'avl';
    let order = 3;

    if (currentMode === 'sandbox') {
        type = document.getElementById('sb-tree').value;
        const val = document.getElementById('sb-val').value;
        order = parseInt(document.getElementById('sb-order').value) || 3;
        if (!val && action !== 'clear') return;
        body.actions = [`${action}:${val}`];
        body.order = order;
    } else if (currentMode === 'database') {
        type = 'bplus';
        order = 4;
        const id = document.getElementById('db-id').value;
        if (!id) return;
        body.actions = [`${action}:${id}`];
        body.order = order;
    } else if (currentMode === 'memory') {
        type = 'memory';
        const size = document.getElementById('mem-size').value;
        if (!size && action !== 'free') return;
        body.actions = (action === 'free') ? ['free:all'] : [`allocate:${size}`];
    } else if (currentMode === 'filesystem') {
        type = 'fs';
        const path = document.getElementById('fs-path').value;
        if (!path) return;
        body.actions = [`${action}:${path}`];
    } else if (currentMode === 'expression') {
        type = 'expr';
        const raw = document.getElementById('exp-raw').value;
        if (!raw) return;
        body.actions = [`eval:${raw}`];
    }

    if (type === 'btree' || type === 'bplus') {
        document.getElementById('order-badge').innerText = `Order: ${order}`;
        document.getElementById('order-badge').style.display = 'block';
    } else {
        document.getElementById('order-badge').style.display = 'none';
    }

    try {
        const res = await fetch(`${API_URL}${endpoint === '/tree' ? '/tree' : '/simulation/' + type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, type })
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
        addLog(`Backend error. Check server.`, 'delete');
    }
}

function updateStats(m) {
    if (!m) return;
    document.getElementById('stat-ops').innerText = m.comparisons || 0;
    document.getElementById('stat-time').innerText = `${m.time_ms?.toFixed(2) || 0}ms`;
    document.getElementById('stat-mem').innerText = `${m.memoryBytes || 0} B`;
}

function addLog(msg, type) {
    const list = document.getElementById('log-list');
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    list.prepend(div);
}
