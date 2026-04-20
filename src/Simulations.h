#pragma once

#include <string>
#include <vector>
#include <nlohmann/json.hpp>

// File System Simulation
nlohmann::json simulateFileSystem(const std::vector<std::string>& actions);

// Expression Tree Simulation
nlohmann::json simulateExpressionTree(const std::string& expression);

// Memory Allocator Simulation (Best Fit / Worst Fit)
nlohmann::json simulateMemoryAllocator(const std::vector<std::string>& actions);

// Network Routing Simulation (Dijkstra)
nlohmann::json simulateNetworkRouting(const std::vector<std::string>& actions);
