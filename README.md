# Tree Performance Analysis System

This project is a complete, end-to-end performance analysis system for four self-balancing search trees implemented from scratch in C++17:
- **AVL Tree**
- **Red-Black Tree**
- **B-Tree**
- **B+ Tree**

## Building and Running

### Prerequisites
- CMake 3.14+
- A C++17 compatible compiler (GCC, Clang, MSVC)

### Build Instructions

From the project root directory, run:

```bash
mkdir build
cd build
cmake ..
cmake --build .
```

Alternatively:
```bash
cmake -B build
cmake --build build
```

### Running the Analyzer

Run the executable to generate `dashboard/metrics.json`:
```bash
./build/TreeAnalyzer.exe
# or ./build/TreeAnalyzer on Linux/macOS
```

### Running Tests
The project includes a comprehensive GTest suite that validates structural invariants. To run the tests:
```bash
ctest --test-dir build --output-on-failure
```

### Dashboard
After running the analyzer, open `dashboard/index.html` in your web browser to view the interactive performance dashboard.
