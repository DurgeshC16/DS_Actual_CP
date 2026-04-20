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

// Assuming backend is run from the `backend` folder
const CLI_PATH = path.join(__dirname, '..', 'build', 'Debug', 'tree_cli.exe');

async function executeTreeCli(type, actions) {
    return new Promise((resolve, reject) => {
        const tempId = crypto.randomBytes(8).toString('hex');
        const inputPath = path.join(__dirname, `temp_input_${tempId}.json`);
        
        fs.writeFileSync(inputPath, JSON.stringify({ actions }));

        // Execute C++ CLI
        execFile(CLI_PATH, ['--type', type, '--input', inputPath], (error, stdout, stderr) => {
            // Clean up temp file
            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }

            if (error) {
                console.error("CLI Execution Error:", stderr);
                return resolve({
                    status: "error",
                    message: "CLI failed: " + (stderr || error.message)
                });
            }

            try {
                const response = JSON.parse(stdout.trim());
                resolve(response);
            } catch (e) {
                console.error("JSON Parse Error on STDOUT:", stdout);
                resolve({
                    status: "error",
                    message: "Invalid output from CLI"
                });
            }
        });
    });
}

// Main tree API
app.post('/api/tree', async (req, res) => {
    const { type, actions } = req.body;
    
    if (!type || !Array.isArray(actions)) {
        return res.status(400).json({ status: "error", message: "Invalid input or operation" });
    }
    
    const result = await executeTreeCli(type, actions);
    res.json(result);
});

// Simulation APIs
const simulations = ['memory', 'database', 'expression', 'network', 'filesystem'];

for (const sim of simulations) {
    app.post(`/api/simulation/${sim}`, async (req, res) => {
        const { actions = [] } = req.body;
        // Map filesystem differently for cli
        const typeMapping = {
            'filesystem': 'fs',
            'expression': 'expr',
            'memory': 'memory',
            'network': 'network',
            'database': 'bplus' // database mapped to bplus tree logic
        };
        const type = typeMapping[sim];
        const result = await executeTreeCli(type, actions);
        res.json(result);
    });
}

// Serve dashboard frontend locally if desired, or let it be run independently
app.use(express.static(path.join(__dirname, '..', 'dashboard')));

app.listen(PORT, () => {
    console.log(`Backend Bridge running on http://localhost:${PORT}`);
});
