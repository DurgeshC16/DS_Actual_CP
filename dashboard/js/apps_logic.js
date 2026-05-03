const API_URL = 'http://localhost:3000/api';

// Generate a unique session ID for this page load
const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

let currentMode = 'sandbox';
let visualizer = null;

// ─── Mode Configurations ───────────────────────────────────────────────────────
const modeConfig = {
    'sandbox': {
        title: 'Data Structure Sandbox',
        badge: 'Sandbox',
        knowledge: 'Explore self-balancing properties. Splay Trees bring frequently accessed items to the root, optimizing for temporal locality.',
        controls: `
            <div class="control-group">
                <label>Tree Type</label>
                <select id="sb-tree" onchange="onTreeTypeChange()">
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
            <div class="btn-group" style="margin-top:0.5rem">
                <button class="danger" style="flex:none;width:100%;" onclick="clearSandbox()">Clear Tree</button>
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
            <div class="btn-group" style="margin-top:0.5rem">
                <button class="danger" style="flex:none;width:100%;" onclick="clearSimulation()">Reset DB</button>
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
                <label>File / Directory Path</label>
                <input type="text" id="fs-path" placeholder="/home/user/project">
            </div>
            <div class="btn-group">
                <button class="primary" onclick="handleAction('create')">Mkdir/Touch</button>
                <button class="danger" onclick="handleAction('delete')">Rm -rf</button>
            </div>
            <div class="btn-group" style="margin-top:0.5rem">
                <button class="danger" style="flex:none;width:100%;" onclick="clearSimulation()">Reset FS</button>
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

// Per-mode session IDs so switching mode doesn't bleed history
const modeSessions = {};
function getModeSessionId(mode) {
    if (!modeSessions[mode]) {
        modeSessions[mode] = SESSION_ID + '_' + mode;
    }
    return modeSessions[mode];
}

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');   // FIX: was TreeVisualizer

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchMode(btn.dataset.mode);
        });
    });

    switchMode('sandbox');
    addLog('System initialized. Select a scenario to begin simulation.', 'system');
});

function onTreeTypeChange() {
    const tree = document.getElementById('sb-tree').value;
    const ctrl = document.getElementById('order-ctrl');
    if (ctrl) ctrl.style.display = (tree === 'btree' || tree === 'bplus') ? 'block' : 'none';
    // Reset session for this mode when tree type changes
    modeSessions['sandbox'] = SESSION_ID + '_sandbox_' + tree + '_' + Date.now();
    visualizer.clear();
    addLog('Tree type changed — history reset.', 'system');
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
    addLog(`Switched to ${cfg.title}.`, 'system');

    if (mode === 'sandbox') {
        onTreeTypeChange();
    }
}

function clearSandbox() {
    // Reset the sandbox session
    modeSessions['sandbox'] = SESSION_ID + '_sandbox_clear_' + Date.now();
    visualizer.clear();
    updateStats({ comparisons: 0, time_ms: 0, memoryBytes: 0 });
    addLog('Sandbox cleared — tree reset.', 'system');
}

async function clearSimulation() {
    const sid = getModeSessionId(currentMode);
    // Reset server-side session
    await fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid })
    }).catch(() => {});
    // Generate new session ID for this mode
    modeSessions[currentMode] = SESSION_ID + '_' + currentMode + '_' + Date.now();
    visualizer.clear();
    addLog('Simulation reset.', 'system');
}

// ─── Main Action Handler ───────────────────────────────────────────────────────
async function handleAction(action) {
    let body = {};
    let endpoint = '/tree';
    let type = 'avl';
    let order = 3;
    let singleAction = null;

    if (currentMode === 'sandbox') {
        type = document.getElementById('sb-tree').value;
        const val = document.getElementById('sb-val')?.value;
        order = parseInt(document.getElementById('sb-order')?.value) || 3;
        if (!val && action !== 'clear') { addLog('Enter a value first.', 'delete'); return; }
        singleAction = `${action}:${val}`;
        endpoint = '/tree';

        if (type === 'btree' || type === 'bplus') {
            document.getElementById('order-badge').innerText = `Order: ${order}`;
            document.getElementById('order-badge').style.display = 'block';
        } else {
            document.getElementById('order-badge').style.display = 'none';
        }

        body = {
            type,
            actions: [singleAction],   // send just the new action
            order,
            sessionId: getModeSessionId(currentMode)
        };

    } else if (currentMode === 'database') {
        type = 'bplus';
        order = 4;
        const id = document.getElementById('db-id')?.value;
        if (!id) { addLog('Enter a Record ID first.', 'delete'); return; }
        singleAction = `${action}:${id}`;
        endpoint = '/simulation/database';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'memory') {
        const size = document.getElementById('mem-size')?.value;
        if (!size && action !== 'free') { addLog('Enter a size first.', 'delete'); return; }
        singleAction = (action === 'free') ? 'free:all' : `allocate:${size}`;
        endpoint = '/simulation/memory';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'filesystem') {
        const fspath = document.getElementById('fs-path')?.value;
        if (!fspath) { addLog('Enter a path first.', 'delete'); return; }
        singleAction = `${action}:${fspath}`;
        endpoint = '/simulation/filesystem';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'expression') {
        const raw = document.getElementById('exp-raw')?.value;
        if (!raw) { addLog('Enter an expression first.', 'delete'); return; }
        singleAction = `eval:${raw}`;
        endpoint = '/simulation/expression';
        // Expression is stateless — always re-evaluate
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };
    }

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.status === 'success') {
            const treeData = data.tree;

            // Pass type hint to visualizer for B-Tree/B+Tree rendering
            if (treeData && (type === 'btree' || type === 'bplus' || currentMode === 'database')) {
                treeData.type = (currentMode === 'database') ? 'bplus' : type;
            }

            visualizer.render(treeData);
            updateStats(data.metrics || {});

            // Handle logs
            const logs = data.logs || (treeData && treeData.logs) || [];
            logs.forEach(l => addLog(l, action));

            // Special: expression eval result
            if (treeData && treeData.eval_result !== undefined) {
                addLog(`⚡ Result = ${treeData.eval_result}`, 'insert');
            }

            // Special: memory block annotation
            if (currentMode === 'memory' && action === 'allocate') {
                const sz = document.getElementById('mem-size')?.value;
                const poolSize = treeData?.nodes?.length;
                if (sz) addLog(`Best-fit block of ${sz}KB allocated. Pool has ${poolSize} tracked blocks.`, 'insert');
            }

        } else {
            addLog(`Error: ${data.message || 'Unknown error'}`, 'delete');
        }
    } catch (e) {
        addLog(`Backend error: Check if Node server is running on port 3000.`, 'delete');
        console.error(e);
    }
}

// ─── Stats & Logs ──────────────────────────────────────────────────────────────
function updateStats(m) {
    if (!m) return;
    const ops = document.getElementById('stat-ops');
    const time = document.getElementById('stat-time');
    const mem = document.getElementById('stat-mem');
    if (ops) ops.innerText = m.comparisons ?? 0;
    if (time) time.innerText = `${(m.time_ms ?? 0).toFixed(3)}ms`;
    if (mem) mem.innerText = `${m.memoryBytes ?? 0} B`;
}

function addLog(msg, type = 'system') {
    const list = document.getElementById('log-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    list.prepend(div);

    // Keep log manageable
    while (list.children.length > 50) list.removeChild(list.lastChild);
}
