#include "Simulations.h"
#include <iostream>
#include <sstream>

using json = nlohmann::json;

// Mock implementations returning static or simple dynamic JSON for the simulations
// In a full implementation, these would contain the complete C++ core logic for each mode.

json simulateFileSystem(const std::vector<std::string>& actions) {
    json result;
    json nodes = json::array();
    json edges = json::array();
    
    // Hardcoded minimal simulation for demonstration
    nodes.push_back({{"id", 0}, {"key", "/"}, {"type", "folder"}});
    nodes.push_back({{"id", 1}, {"key", "usr"}, {"type", "folder"}});
    nodes.push_back({{"id", 2}, {"key", "home"}, {"type", "folder"}});
    edges.push_back({{"source", 0}, {"target", 1}});
    edges.push_back({{"source", 0}, {"target", 2}});

    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}

json simulateExpressionTree(const std::string& expression) {
    json result;
    json nodes = json::array();
    json edges = json::array();
    
    // Hardcoded simple tree for a + b * c
    nodes.push_back({{"id", 0}, {"key", "+"}, {"type", "op"}});
    nodes.push_back({{"id", 1}, {"key", "a"}, {"type", "val"}});
    nodes.push_back({{"id", 2}, {"key", "*"}, {"type", "op"}});
    nodes.push_back({{"id", 3}, {"key", "b"}, {"type", "val"}});
    nodes.push_back({{"id", 4}, {"key", "c"}, {"type", "val"}});
    
    edges.push_back({{"source", 0}, {"target", 1}});
    edges.push_back({{"source", 0}, {"target", 2}});
    edges.push_back({{"source", 2}, {"target", 3}});
    edges.push_back({{"source", 2}, {"target", 4}});

    result["nodes"] = nodes;
    result["edges"] = edges;
    result["result"] = "evaluated";
    return result;
}

json simulateMemoryAllocator(const std::vector<std::string>& actions) {
    json result;
    result["nodes"] = json::array();
    result["edges"] = json::array();
    return result;
}

json simulateNetworkRouting(const std::vector<std::string>& actions) {
    json result;
    result["nodes"] = json::array();
    result["edges"] = json::array();
    return result;
}
