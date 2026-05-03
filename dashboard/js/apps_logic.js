const API_URL = 'http://localhost:3000/api';

// Generate a unique session ID for this page load
const SESSION_ID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

let currentMode = 'sandbox';
let visualizer = null;
let isFetching = false; // BUG 6: global in-flight guard

// ─── BUG 6: Disable / enable all action buttons in the dynamic controls panel ─
function setButtonsDisabled(disabled) {
    document.querySelectorAll('#mode-controls-inner button, #mode-selector .nav-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '';
        btn.style.cursor  = disabled ? 'not-allowed' : '';
    });
}

// ─── BUG 4: Mode badge helper ──────────────────────────────────────────────────
// For simulation modes, always show a clearly-labeled structure badge.
// Returns text for the order-badge, or null to hide it.
function getBadgeText(mode) {
    if (mode === 'sandbox') {
        const tree  = document.getElementById('sb-tree')?.value;
        const order = document.getElementById('sb-order')?.value || '3';
        if (tree === 'btree') return `B-Tree — Order: ${order}`;
        if (tree === 'bplus') return `B+ Tree — Order: ${order}`;
        return null; // hide for AVL / RB / Splay
    }
    // BUG 4: fixed badges for every simulation mode
    if (mode === 'database')   return '🗄️ B+ Tree — Order: 4';
    if (mode === 'memory')     return '⚖️ AVL Tree';
    if (mode === 'filesystem') return '📁 B-Tree (N-ary)';
    if (mode === 'expression') return '🌲 Binary AST';
    return null;
}

function updateOrderBadge(mode) {
    const badge = document.getElementById('order-badge');
    if (!badge) return;
    const text = getBadgeText(mode);
    if (text) {
        badge.innerText = text;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// ─── BUG 1: ALL buttons in template strings have type="button" ────────────────
// BUG 4: simulation modes show a tree-type badge
// BUG 5: onTreeTypeChange / clearSimulation handle session reset
// GENERAL: no inline onclick — all event wiring happens via attachModeHandlers()
const modeConfig = {
    'sandbox': {
        title: 'Data Structure Sandbox',
        badge: 'Sandbox',
        knowledge: 'Explore self-balancing properties. Splay Trees bring frequently accessed items to the root, optimising for temporal locality.',
        controls: `
            <div class="control-group">
                <label>Tree Type</label>
                <select id="sb-tree">
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
                <button type="button" id="btn-sb-insert" class="primary">Insert</button>
                <button type="button" id="btn-sb-search" class="primary">Search</button>
                <button type="button" id="btn-sb-delete" class="danger">Delete</button>
            </div>
            <div class="btn-group" style="margin-top:0.5rem">
                <button type="button" id="btn-sb-clear" class="danger" style="flex:none;width:100%;">Clear Tree</button>
            </div>
        `
    },
    'database': {
        title: 'Database Indexing (B+ Tree)',
        badge: 'B+ Tree Index',
        knowledge: 'Databases use B+ Trees to minimise disk reads. Internal nodes only store keys for routing, while leaves store actual record pointers and are linked for fast range scans.',
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
                <button type="button" id="btn-db-insert" class="primary">Add Index</button>
                <button type="button" id="btn-db-search" class="primary">Find ID</button>
                <button type="button" id="btn-db-delete" class="danger">Drop ID</button>
            </div>
            <div class="btn-group" style="margin-top:0.5rem">
                <button type="button" id="btn-db-clear" class="danger" style="flex:none;width:100%;">Reset DB</button>
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
                <button type="button" id="btn-mem-alloc" class="primary">Best Fit Alloc</button>
                <button type="button" id="btn-mem-clear" class="danger">Clear Pool</button>
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
                <button type="button" id="btn-fs-create" class="primary">Mkdir/Touch</button>
                <button type="button" id="btn-fs-delete" class="danger">Rm -rf</button>
            </div>
            <div class="btn-group" style="margin-top:0.5rem">
                <button type="button" id="btn-fs-clear" class="danger" style="flex:none;width:100%;">Reset FS</button>
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
                <button type="button" id="btn-exp-parse" class="primary">Compile AST</button>
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
    visualizer = new ADSVisualizer('d3-container');

    // Wire mode selector nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        // BUG 1: nav-btn has no type attr in HTML — explicitly set it
        btn.setAttribute('type', 'button');
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === currentMode) return; // no-op if already active
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchMode(mode);
        });
    });

    switchMode('sandbox');
    addLog('System initialized. Select a scenario to begin simulation.', 'system');
});

// ─── GENERAL: Wire event handlers after dynamic HTML is injected ────────────────
function attachModeHandlers(mode) {
    // Use setTimeout so the innerHTML has been parsed before querying
    setTimeout(() => {
        if (mode === 'sandbox') {
            const treeSelect = document.getElementById('sb-tree');
            const orderInput = document.getElementById('sb-order');
            // BUG 2 (apps): wire sandbox tree-select programmatically
            if (treeSelect) treeSelect.addEventListener('change', onTreeTypeChange);
            // BUG 3: update badge live as order is typed
            if (orderInput) orderInput.addEventListener('input', () => updateOrderBadge('sandbox'));

            document.getElementById('btn-sb-insert')?.addEventListener('click', () => handleAction('insert'));
            document.getElementById('btn-sb-search')?.addEventListener('click', () => handleAction('search'));
            document.getElementById('btn-sb-delete')?.addEventListener('click', () => handleAction('delete'));
            document.getElementById('btn-sb-clear')?.addEventListener('click', clearSandbox);

            // Enter-key shortcut
            const sbVal = document.getElementById('sb-val');
            if (sbVal) sbVal.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAction('insert'); }
            });

            // Sync order-ctrl visibility and badge for the currently selected tree
            onTreeTypeChange();

        } else if (mode === 'database') {
            document.getElementById('btn-db-insert')?.addEventListener('click', () => handleAction('insert'));
            document.getElementById('btn-db-search')?.addEventListener('click', () => handleAction('search'));
            document.getElementById('btn-db-delete')?.addEventListener('click', () => handleAction('delete'));
            document.getElementById('btn-db-clear')?.addEventListener('click', clearSimulation);

            const dbId = document.getElementById('db-id');
            if (dbId) dbId.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAction('insert'); }
            });

        } else if (mode === 'memory') {
            document.getElementById('btn-mem-alloc')?.addEventListener('click', () => handleAction('allocate'));
            document.getElementById('btn-mem-clear')?.addEventListener('click', () => {
                clearSimulation();
                addLog('Memory pool cleared.', 'system');
            });

            const memSize = document.getElementById('mem-size');
            if (memSize) memSize.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAction('allocate'); }
            });

        } else if (mode === 'filesystem') {
            document.getElementById('btn-fs-create')?.addEventListener('click', () => handleAction('create'));
            document.getElementById('btn-fs-delete')?.addEventListener('click', () => handleAction('delete'));
            document.getElementById('btn-fs-clear')?.addEventListener('click', clearSimulation);

            const fsPath = document.getElementById('fs-path');
            if (fsPath) fsPath.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAction('create'); }
            });

        } else if (mode === 'expression') {
            document.getElementById('btn-exp-parse')?.addEventListener('click', () => handleAction('parse'));

            const expRaw = document.getElementById('exp-raw');
            if (expRaw) expRaw.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAction('parse'); }
            });
        }
    }, 0);
}

// ─── Tree-type change in sandbox ───────────────────────────────────────────────
function onTreeTypeChange() {
    const tree  = document.getElementById('sb-tree')?.value;
    const ctrl  = document.getElementById('order-ctrl');
    if (ctrl) ctrl.style.display = (tree === 'btree' || tree === 'bplus') ? 'block' : 'none';

    // BUG 5: reset old session on server before creating a new one
    const oldSid = getModeSessionId('sandbox');
    fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: oldSid })
    }).catch(() => {}); // fire-and-forget

    modeSessions['sandbox'] = SESSION_ID + '_sandbox_' + tree + '_' + Date.now();
    visualizer.clear();

    // BUG 3 (apps): update badge immediately on tree type change
    updateOrderBadge('sandbox');

    addLog('Tree type changed — tree cleared.', 'system');
}

// ─── Mode switch ───────────────────────────────────────────────────────────────
function switchMode(mode) {
    currentMode = mode;
    const cfg = modeConfig[mode];

    document.getElementById('mode-title').innerText   = cfg.title;
    document.getElementById('mode-badge').innerText   = cfg.badge;
    document.getElementById('mode-controls-inner').innerHTML = cfg.controls;
    document.getElementById('knowledge-text').innerText = cfg.knowledge;

    // BUG 4: show structure badge immediately on mode switch
    updateOrderBadge(mode);

    visualizer.clear();
    addLog(`Switched to ${cfg.title}.`, 'system');

    // Wire the new control buttons (no more inline onclick)
    attachModeHandlers(mode);
}

// ─── Clear sandbox ────────────────────────────────────────────────────────────
function clearSandbox() {
    // BUG 5: release server session
    const oldSid = getModeSessionId('sandbox');
    fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: oldSid })
    }).catch(() => {});

    modeSessions['sandbox'] = SESSION_ID + '_sandbox_clear_' + Date.now();
    visualizer.clear();
    updateStats({ comparisons: 0, time_ms: 0, memoryBytes: 0 });
    addLog('Sandbox cleared — tree reset.', 'system');
}

// ─── Clear simulation session (BUG 5 & 6) ─────────────────────────────────────
async function clearSimulation() {
    const sid = getModeSessionId(currentMode);
    // BUG 5: call reset endpoint with the current session ID
    await fetch(`${API_URL}/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid })
    }).catch(() => {});
    modeSessions[currentMode] = SESSION_ID + '_' + currentMode + '_' + Date.now();
    visualizer.clear();
    updateStats({ comparisons: 0, time_ms: 0, memoryBytes: 0 });
    addLog('Simulation reset.', 'system');
}

// ─── Main Action Handler (BUG 6: disable ALL buttons during fetch) ─────────────
async function handleAction(action) {
    if (isFetching) return; // BUG 6: hard guard against concurrent submits

    let body = {};
    let endpoint = '/tree';
    let type = 'avl';
    let order = 3;
    let singleAction = null;

    if (currentMode === 'sandbox') {
        type  = document.getElementById('sb-tree').value;
        const val = document.getElementById('sb-val')?.value;
        order = parseInt(document.getElementById('sb-order')?.value) || 3;
        if (!val && action !== 'clear') { addLog('Enter a value first.', 'delete'); return; }
        singleAction = `${action}:${val}`;
        endpoint     = '/tree';
        body = { type, actions: [singleAction], order, sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'database') {
        type  = 'bplus';
        order = 4;
        const id = document.getElementById('db-id')?.value;
        if (!id) { addLog('Enter a Record ID first.', 'delete'); return; }
        singleAction = `${action}:${id}`;
        endpoint     = '/simulation/database';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'memory') {
        const size = document.getElementById('mem-size')?.value;
        if (!size && action !== 'free') { addLog('Enter a size first.', 'delete'); return; }
        singleAction = `allocate:${size}`;
        endpoint     = '/simulation/memory';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'filesystem') {
        const fspath = document.getElementById('fs-path')?.value;
        if (!fspath) { addLog('Enter a path first.', 'delete'); return; }
        singleAction = `${action}:${fspath}`;
        endpoint     = '/simulation/filesystem';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };

    } else if (currentMode === 'expression') {
        const raw = document.getElementById('exp-raw')?.value;
        if (!raw) { addLog('Enter an expression first.', 'delete'); return; }
        singleAction = `eval:${raw}`;
        endpoint     = '/simulation/expression';
        body = { actions: [singleAction], sessionId: getModeSessionId(currentMode) };
    }

    // BUG 6: lock all buttons for the duration of the fetch
    isFetching = true;
    setButtonsDisabled(true);

    try {
        const res  = await fetch(`${API_URL}${endpoint}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
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

            const logs = data.logs || (treeData && treeData.logs) || [];
            logs.forEach(l => addLog(l, action));

            if (treeData && treeData.eval_result !== undefined) {
                addLog(`⚡ Result = ${treeData.eval_result}`, 'insert');
            }

            if (currentMode === 'memory' && action === 'allocate') {
                const sz       = document.getElementById('mem-size')?.value;
                const poolSize = treeData?.nodes?.length;
                if (sz) addLog(`Best-fit block of ${sz}KB allocated. Pool has ${poolSize} tracked blocks.`, 'insert');
            }

        } else {
            addLog(`Error: ${data.message || 'Unknown error'}`, 'delete');
        }
    } catch (e) {
        addLog(`Backend error: Check if Node server is running on port 3000.`, 'delete');
        console.error(e);
    } finally {
        // BUG 6: always re-enable buttons
        isFetching = false;
        setButtonsDisabled(false);
    }
}

// ─── Stats & Logs ──────────────────────────────────────────────────────────────
function updateStats(m) {
    if (!m) return;
    const ops  = document.getElementById('stat-ops');
    const time = document.getElementById('stat-time');
    const mem  = document.getElementById('stat-mem');
    if (ops)  ops.innerText  = m.comparisons ?? 0;
    if (time) time.innerText = `${(m.time_ms ?? 0).toFixed(3)}ms`;
    if (mem)  mem.innerText  = `${m.memoryBytes ?? 0} B`;
}

// BUG 9: log panel has max-height + overflow set in CSS; capped at 50 entries here
function addLog(msg, type = 'system') {
    const list = document.getElementById('log-list');
    if (!list) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerText = `> ${msg}`;
    list.prepend(div);
    // Keep a hard cap to prevent runaway growth
    while (list.children.length > 50) list.removeChild(list.lastChild);
}
