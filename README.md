# Advanced Tree Performance Analysis & Simulation System

This project is a comprehensive performance analysis and simulation suite for five self-balancing search trees implemented from scratch in C++17:
- **AVL Tree**
- **Red-Black Tree**
- **B-Tree** (Configurable Order)
- **B+ Tree** (Configurable Order)
- **Splay Tree** (Amortized O(log n))

## New Features (v2.0)
- **Splay Tree Integration**: Full support for splay operations (Zig, Zig-Zig, Zig-Zag) with amortized performance tracking.
- **Configurable Tree Orders**: B-Tree and B+ Tree orders can now be dynamically configured via the dashboard or CLI.
- **Interactive Sandbox**: A new real-time visualization tool in the "Applications" page allows for direct tree manipulation.
- **Enhanced Metrics**: Expanded performance metrics including memory bytes, structural operation counts (splits/rotations), and node visit counts.
- **Modern Dashboard**: Upgraded multi-page UI with Chart.js integration for deep performance insights.

## Building and Running

### Prerequisites
- CMake 3.14+
- A C++17 compatible compiler (GCC, Clang, MSVC)
- Node.js (for the Backend Bridge)

### Build Instructions
```bash
mkdir build
cd build
cmake ..
cmake --build .
```

### Running the System
1. **Benchmark**: Run `./build/Debug/TreeAnalyzer.exe` to generate the latest `metrics.json`.
2. **Backend**: Navigate to `/backend` and run `node server.js`.
3. **Frontend**: Open `http://localhost:3000` in your browser.

## Project Structure
- `/src`: C++ logic and tree implementations.
- `/include`: Header files and interfaces.
- `/dashboard`: Frontend HTML/CSS/JS dashboard.
- `/backend`: Node.js Express server acting as a bridge to the C++ CLI.
- `/data`: Performance datasets and generators.

## Tests
Run the GTest suite to verify tree invariants:
```bash
ctest --test-dir build --output-on-failure
```
