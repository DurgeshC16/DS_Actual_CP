# Data Structures Advanced System Upgrade Plan

This document outlines the architecture and implementation steps to upgrade the existing C++ Data Structures project into an advanced system with a Node.js backend bridge and a dynamic, real-world scenario dashboard.

## User Review Required

> [!WARNING]
> Please review the architecture approach. I propose using a **Stateless C++ CLI execution model**.
> Instead of keeping a C++ process running continuously (which is complex to manage through web requests), the Node.js backend will store the sequence of operations (e.g., `insert 1, insert 5, delete 1`) and pass the entire state to a new C++ tool (`tree_cli`) through a JSON file on each request. The C++ tool builds the tree in milliseconds and returns the final tree structure as JSON. This guarantees perfect synchronization between the frontend and C++ backend without memory leak risks. 
> 
> Also, wait, let me confirm: for real-world scenarios like file systems and expression trees, I will implement NEW lightweight C++ classes (`FSTree`, `ExpressionTree`, `MemAllocator`) so that the core logic stays fully in C++, as requested.

## Architecture

1.  **C++ Core (`/src`)**:
    *   Maintain all existing trees (`AVLTree`, `RedBlackTree`, `BPlusTree`, `BTree`).
    *   Add a new CLI executable (`tree_cli.cpp`) to handle requests.
    *   Implement new C++ classes for simulations: `FSTree` (File System N-ary Tree), `ExpressionTree` (Binary Tree for math parsing), `MemAllocator` (Free-list tree), `NetworkGraph` (Routing).
    *   Add JSON serialization to all trees (flattening the tree to nodes & edges format for D3.js).

2.  **Backend Bridge (`/backend`)**:
    *   Initialize a lightweight **Node.js with Express** server.
    *   Expose structured REST APIs (see Backend Components below).
    *   The backend validates input, writes a JSON input file, spawns the compiled `tree_cli` child process, and pipes the C++ stdout JSON directly to the frontend.

3.  **Frontend Dashboard (`/dashboard`)**:
    *   **Styling**: Vanilla CSS, modern dark theme, glassmorphism elements, CSS Grid/Flexbox layout.
    *   **Structure**: A responsive Sidebar for selecting simulation modes, and a Main Content area split between controls (insert, delete, simulate) and a **D3.js Visualization Canvas**. Include an informational UI element to **show theoretical complexity** (e.g., O(log n), O(n), etc.).
    *   **Modes**:
        *   **Database Index**: Maps `(id, name)` records to B+ Tree.
        *   **Search Engine**: Hashes keywords to Integers, storing them in AVL/RB Trees.
        *   **File System**: Maps folder paths to an N-ary tree visualization.
        *   **Memory Allocator**: Visualizes free/allocated memory blocks based on Best/Worst Fit.
        *   **Network Router**: Visualizes nodes and highlights the shortest path. Explicitly uses **Dijkstra's Algorithm** (preferred) or **BFS**.
        *   **Expression Tree**: Accepts mathematical expressions, creates an AST visualization, and provides the evaluated result.
    *   **Step-by-Step Visualization Mode (Optional)**: Support a step-by-step execution mode to show tree changes after each operation, which is highly valuable for learning.

## System Error Handling Standard

To ensure stability, a consistent error response format will be used across the system:
```json
{
  "status": "error",
  "message": "Invalid input or operation"
}
```
Validation will occur at two levels:
*   **Backend Validation**: Before calling the C++ binary.
*   **C++ CLI Validation**: Before execution of tree operations.

## Proposed Changes

### Build System & C++ Entry
#### [MODIFY] CMakeLists.txt
- Add commands to compile the new `tree_cli` executable with the simulation modules.
#### [NEW] src/tree_cli.cpp
- The single entry point that reads CLI args pointing to a JSON input file.
- **CLI Structure**: `./tree_cli --type avl --input input.json` (This replaces long inline arguments for better scalability and clarity).
- **Example input.json**:
```json
{
  "actions": ["insert:10", "insert:20", "delete:10"]
}
```
- **Example C++ Output Format**:
```json
{
  "status": "success",
  "tree": {
    "nodes": [{"id": 1, "key": 20}],
    "edges": []
  },
  "metrics": {
    "time_ms": 2,
    "comparisons": 5,
    "rotations": 1
  },
  "logs": [
    "Insert 10",
    "Insert 20",
    "Rotate left at node 10",
    "Rebalance complete",
    "Delete 10"
  ]
}
```
*Note: The `logs` array provides operation logs that the frontend can display for better UX and learning validation.*

#### [NEW] src/Simulations.cpp / src/Simulations.h
- Contains the supplementary C++ code logic for Expression Trees, File Systems, Memory Allocation, and routing algorithms.

---

### Backend Components
#### [NEW] backend/package.json
- Initialize a Node.js project with `express` and `cors`.
#### [NEW] backend/server.js
- Implements the API routes that execute the C++ binary and return JSON responses.
- **Concrete API Designs**:

**`POST /api/tree`**
Request:
```json
{
  "type": "avl",
  "actions": ["insert:10", "insert:20"]
}
```
Response:
```json
{
  "status": "success",
  "tree": {
    "nodes": [...],
    "edges": [...]
  },
  "metrics": {
    "time_ms": 2,
    "comparisons": 5,
    "rotations": 1
  },
  "logs": [...]
}
```

**Simulation APIs**:
*   `POST /api/simulation/memory`
*   `POST /api/simulation/database`
*   `POST /api/simulation/expression`
*   `POST /api/simulation/network`
*   `POST /api/simulation/filesystem`

---

### Frontend Components
#### [MODIFY] dashboard/index.html
- Overhaul layout to include a sidebar with the 6 application modes, D3.js container, and modern UI controls. Show theoretical complexity of operations.
#### [NEW] dashboard/css/styles.css
- Implements the "Wow" premium dark theme design, including subtle animations, gradients, and custom typography.
#### [NEW] dashboard/js/d3_visualizer.js
- Modular D3.js logic specifically for drawing binary trees, n-ary trees, and graphs based on flattened JSON data.
#### [NEW] dashboard/js/app.js
- Defines the State manager logic, sending actions to the Backend `/api`, maintaining simulation contexts (like the Database ID mappings), updating charts, and displaying execution step logs.
#### [NEW] dashboard/setup.md
- **Setup Instructions**: Step-by-step instructions to compile C++, `npm install` backend, and start the app.

## Open Questions

1.  Do you have Node.js / npm installed locally to run the backend Bridge? (I assume yes, based on common dev setups, but want to confirm).
2.  Is the Stateless "Rebuild on Request" approach for C++ acceptable? It keeps the architecture extremely robust over a web API.
3.  Are there any specific D3.js visualization preferences (e.g. Tree top-down layout vs horizontal layout)? I will default to top-down.

## Verification Plan

### Automated Tests
- I will run backend unit tests via simple `curl` commands to ensure the C++ CLI outputs correct, parseable JSON.

### Manual Verification
- I will verify the C++ `tree_cli` binary handles various operations without crashing.
- Test the dashboard inside a browser by starting the Node.js server, confirming all modes render in D3 and perform the required logic smoothly.
