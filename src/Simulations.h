#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

// Database Indexing Simulation (B+ Tree)
nlohmann::json simulateDatabase(const std::vector<std::string>& actions);

// File System Simulation (N-ary Tree)
nlohmann::json simulateFileSystem(const std::vector<std::string>& actions);

// Expression Tree Simulation (AST)
nlohmann::json simulateExpressionTree(const std::string& expression);

// Memory Allocator Simulation (AVL Tree)
nlohmann::json simulateMemoryAllocation(const std::vector<std::string>& actions);

// Network Routing Simulation
nlohmann::json simulateNetworkRouting(const std::vector<std::string>& actions);
