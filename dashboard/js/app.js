const API_URL = 'http://localhost:3000/api';
let currentMode = 'avl';
const activeActions = [];
let visualizer = null;

const complexMap = {
    'avl': { search: 'O(log n)', insert: 'O(log n)' },
    'rb': { search: 'O(log n)', insert: 'O(log n)' },
    'btree': { search: 'O(log n)', insert: 'O(log n)' },
    'database': { search: 'O(log n)', insert: 'O(log n)' },
    'expression': { search: 'O(n)', insert: 'O(1)' },
    'filesystem': { search: 'O(depth)', insert: 'O(depth)' },
    'network': { search: 'O(V+E)', insert: 'O(1)' },
    'memory': { search: 'O(log n)', insert: 'O(log n)' },
};

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new ADSVisualizer('d3-container');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            currentMode = item.dataset.mode;
            document.getElementById('mode-title').innerText = item.innerText.trim() + ' Simulation';
            
            // Update complexity
            if (complexMap[currentMode]) {
                document.getElementById('cx-search').innerText = complexMap[currentMode].search;
                document.getElementById('cx-insert').innerText = complexMap[currentMode].insert;
            }
            
            clearWorkspace();
            
            // Adjust controls display
            const btnDelete = document.getElementById('btn-delete');
            const inputVal = document.getElementById('node-val');
            inputVal.placeholder = (currentMode === 'expression') ? "Expr (e.g. 5+3)" : "Value (e.g. 10)";
        });
    });

    document.getElementById('btn-insert').addEventListener('click', () => submitAction('insert'));
    document.getElementById('btn-delete').addEventListener('click', () => submitAction('delete'));
    document.getElementById('btn-search').addEventListener('click', () => submitAction('search'));
    document.getElementById('btn-clear').addEventListener('click', clearWorkspace);
});

function clearWorkspace() {
    activeActions.length = 0;
    visualizer.render({nodes:[], edges:[]});
    updateMetrics({ comparisons: 0, rotations: 0, memoryBytes: 0 });
    document.getElementById('log-list').innerHTML = '<li>Workspace cleared.</li>';
}

async function submitAction(op) {
    const valStr = document.getElementById('node-val').value.trim();
    if (!valStr) return;

    if (currentMode === 'expression') {
         activeActions.push(`eval:${valStr}`); // Simulation specific
    } else {
        const val = parseInt(valStr, 10);
        if (isNaN(val)) {
            alert("Please enter a valid integer for this structure.");
            return;
        }
        activeActions.push(`${op}:${val}`);
    }

    let url = `${API_URL}/tree`;
    let reqBody = { type: currentMode, actions: activeActions };

    if (['database', 'expression', 'filesystem', 'network', 'memory'].includes(currentMode)) {
        url = `${API_URL}/simulation/${currentMode}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        });
        
        const data = await response.json();
        console.log("API Response:", data); // Requested debug check
        
        if (data.status === 'success') {
            visualizer.render(data.tree);
            if (data.metrics) updateMetrics(data.metrics);
            if (data.logs) renderLogs(data.logs);
        } else {
            console.error("Backend Error:", data.message);
            alert("Error: " + data.message);
            // Revert action if failed
            activeActions.pop();
        }
        
    } catch (e) {
        console.error("Fetch/CORS error:", e);
        alert("Fetch failed. Is the backend running on port 3000?");
        // Revert
        activeActions.pop();
    }
}

function updateMetrics(metrics) {
    document.getElementById('metric-cmp').innerText = metrics.comparisons || 0;
    document.getElementById('metric-rot').innerText = metrics.rotations || 0;
    document.getElementById('metric-mem').innerText = (metrics.memoryBytes || 0) + ' B';
}

function renderLogs(logs) {
    const list = document.getElementById('log-list');
    list.innerHTML = '';
    
    logs.slice(-10).forEach(log => {
        const li = document.createElement('li');
        li.innerText = log;
        list.appendChild(li);
    });
}
