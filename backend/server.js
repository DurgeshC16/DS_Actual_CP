const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Locate the compiled CLI binary
let CLI_PATH = path.join(__dirname, '..', 'build', 'Debug', 'tree_cli.exe');
if (!fs.existsSync(CLI_PATH)) {
    CLI_PATH = path.join(__dirname, '..', 'build', 'tree_cli.exe');
}

// ─── Session Store ────────────────────────────────────────────────────────────
// Maps sessionId → { type, actions[] }
// Each action request replays the FULL history so C++ sees the accumulated state.
const sessionStore = {};

function getSession(sessionId, type) {
    if (!sessionStore[sessionId] || sessionStore[sessionId].type !== type) {
        sessionStore[sessionId] = { type, actions: [] };
    }
    return sessionStore[sessionId];
}

// Prune sessions older than 2 hours to avoid memory leak
setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const id of Object.keys(sessionStore)) {
        if (sessionStore[id].createdAt && sessionStore[id].createdAt < cutoff) {
            delete sessionStore[id];
        }
    }
}, 15 * 60 * 1000);

// ─── CLI Executor ─────────────────────────────────────────────────────────────
async function executeTreeCli(type, actions, order = 3) {
    return new Promise((resolve) => {
        const tempId = crypto.randomBytes(8).toString('hex');
        const inputPath = path.join(__dirname, `temp_input_${tempId}.json`);

        fs.writeFileSync(inputPath, JSON.stringify({ actions, order }));

        console.log(`[CLI] type=${type} order=${order} actions=${actions.length}`);

        execFile(CLI_PATH, ['--type', type, '--input', inputPath], (error, stdout, stderr) => {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

            if (error) {
                console.error('CLI Error:', stderr);
                return resolve({ status: 'error', message: 'CLI failed: ' + (stderr || error.message) });
            }

            try {
                const response = JSON.parse(stdout.trim());
                resolve(response);
            } catch (e) {
                console.error('JSON parse error on stdout:', stdout);
                resolve({ status: 'error', message: 'Invalid output from CLI' });
            }
        });
    });
}

// ─── Main Tree API ────────────────────────────────────────────────────────────
// Supports persistent action history via sessionId.
// FIX: sandbox and manual pages send sessionId + a SINGLE new action;
//      server appends it to the session's history and replays the full log.
app.post('/api/tree', async (req, res) => {
    const { type, actions, order, sessionId, reset } = req.body;

    if (!type || !Array.isArray(actions)) {
        return res.status(400).json({ status: 'error', message: 'Invalid input: type and actions[] required' });
    }

    // If no sessionId, just run the provided actions array directly (bulk mode / compare-all)
    if (!sessionId) {
        const result = await executeTreeCli(type, actions, order);
        return res.json(result);
    }

    const session = getSession(sessionId, type);
    session.createdAt = session.createdAt || Date.now();

    if (reset) {
        session.actions = [];
    }

    // Append the new actions to the session history
    for (const a of actions) {
        session.actions.push(a);
    }

    const result = await executeTreeCli(type, session.actions, order);
    res.json(result);
});

// Reset a session (called on tree-type switch / clear)
app.post('/api/session/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessionStore[sessionId]) {
        delete sessionStore[sessionId];
    }
    res.json({ status: 'ok' });
});

// ─── Simulation APIs (Database / Memory / Filesystem / Expression) ─────────────
// These also use session-based replay so state accumulates across clicks.
const simulations = ['memory', 'database', 'expression', 'network', 'filesystem'];

const typeMapping = {
    'filesystem': 'fs',
    'expression': 'expr',
    'memory': 'memory',
    'network': 'network',
    'database': 'database'
};

for (const sim of simulations) {
    app.post(`/api/simulation/${sim}`, async (req, res) => {
        const { actions = [], sessionId, reset } = req.body;
        const cliType = typeMapping[sim];

        if (!sessionId) {
            // No session: run actions directly
            const result = await executeTreeCli(cliType, actions);
            return res.json({ status: 'success', tree: result, logs: result.logs || [] });
        }

        const session = getSession(sessionId, cliType);
        session.createdAt = session.createdAt || Date.now();

        if (reset) session.actions = [];

        for (const a of actions) {
            session.actions.push(a);
        }

        const rawResult = await executeTreeCli(cliType, session.actions);

        // The simulation CLIs return the tree JSON directly (wrapped by wrapMock),
        // so rawResult.tree is the simulation tree object
        if (rawResult.status === 'success') {
            const treeData = rawResult.tree || rawResult;
            const logs = treeData.logs || rawResult.logs || [];
            res.json({ status: 'success', tree: treeData, logs });
        } else {
            res.json(rawResult);
        }
    });
}

// ─── Static frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

app.listen(PORT, () => {
    console.log(`ADS Backend running on http://localhost:${PORT}`);
    console.log(`CLI path: ${CLI_PATH} (exists: ${fs.existsSync(CLI_PATH)})`);
});
