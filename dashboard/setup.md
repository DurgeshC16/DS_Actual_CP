# Advanced Data Structures Simulator - Setup Guide

This comprehensive guide will help you install, build, and run the complete Data Structures simulator including the C++ backend and Node.js server.

## Prerequisites

1.  **C++ Compiler & CMake** (MinGW, MSVC, or Clang)
2.  **Node.js & npm** (Tested on v18+)

## Step 1: Build the C++ Backend

The core tree execution happens in a blazing fast C++ CLI tool.

1.  Open a terminal in the root project folder (`Actual CP/`).
2.  Run the following CMake commands to configure and build:
    ```bash
    mkdir build
    cd build
    cmake ..
    cmake --build . --target tree_cli
    ```
    *(Note: If you run into Generator issues on Windows, you can force MinGW with `cmake -G "MinGW Makefiles" ..`)*
3.  Ensure that `tree_cli.exe` is successfully created inside the `build/Debug/` (or `build/`) folder.

## Step 2: Initialize the Node.js Bridge

The Node.js setup bridges the C++ tool with the browser UI.

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies (`express`, `cors`):
    ```bash
    npm install
    ```

## Step 3: Start the Application

1.  Inside the `backend` folder, start the API server:
    ```bash
    node server.js
    ```
    *You should see "Backend Bridge running on http://localhost:3000"*

2.  Open your browser and navigate to:
    **http://localhost:3000**

You can now use the Advanced Simulator to visualize complex structures in real-time!
