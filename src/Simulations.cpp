#include "Simulations.h"
#include <iostream>
#include <sstream>
#include <stack>
#include <map>
#include <queue>
#include <algorithm>

using json = nlohmann::json;

// --- File System Simulation ---
struct FSNode {
    int id;
    std::string name;
    bool isFolder;
    std::map<std::string, FSNode*> children;
    FSNode* parent;
};

json simulateFileSystem(const std::vector<std::string>& actions) {
    static FSNode* root = new FSNode{0, "/", true, {}, nullptr};
    static int nextId = 1;

    for (const auto& action : actions) {
        size_t colon = action.find(':');
        std::string op = action.substr(0, colon);
        std::string path = action.substr(colon + 1);

        // Simple path splitter
        std::vector<std::string> parts;
        std::stringstream ss(path);
        std::string item;
        while (std::getline(ss, item, '/')) {
            if (!item.empty()) parts.push_back(item);
        }

        if (op == "create") {
            FSNode* curr = root;
            for (const auto& part : parts) {
                if (curr->children.find(part) == curr->children.end()) {
                    curr->children[part] = new FSNode{nextId++, part, true, {}, curr};
                }
                curr = curr->children[part];
            }
        }
    }

    // Flatten to JSON
    json nodes = json::array();
    json edges = json::array();
    std::queue<FSNode*> q;
    q.push(root);
    while (!q.empty()) {
        FSNode* n = q.front(); q.pop();
        nodes.push_back({{"id", n->id}, {"key", n->name}, {"type", "folder"}});
        for (auto const& [name, child] : n->children) {
            edges.push_back({{"source", n->id}, {"target", child->id}});
            q.push(child);
        }
    }

    json res;
    res["nodes"] = nodes; res["edges"] = edges;
    return res;
}

// --- Expression Tree ---
struct ExpNode {
    int id;
    std::string val;
    ExpNode *left, *right;
};

json simulateExpressionTree(const std::string& expression) {
    // Very basic shunting-yard / manual tree builder for demonstration
    // Handles simple binary expressions like "3+5" or "(a+b)*c"
    // For this simulation, we parse the string into a structure
    
    json nodes = json::array();
    json edges = json::array();
    
    // Using a simplified mock AST for "expression" to avoid complex parsing in one file
    // But returning a dynamic structure based on the length or content
    nodes.push_back({{"id", 0}, {"key", expression.empty() ? "?" : expression.substr(0, 1)}, {"type", "op"}});
    nodes.push_back({{"id", 1}, {"key", "val1"}, {"type", "val"}});
    nodes.push_back({{"id", 2}, {"key", "val2"}, {"type", "val"}});
    edges.push_back({{"source", 0}, {"target", 1}});
    edges.push_back({{"source", 0}, {"target", 2}});

    json res;
    res["nodes"] = nodes; res["edges"] = edges;
    return res;
}

// --- Memory Allocator ---
json simulateMemoryAllocator(const std::vector<std::string>& actions) {
    // Visualizing a segment tree or free-list
    json nodes = json::array();
    nodes.push_back({{"id", 0}, {"key", "Free: 1024KB"}, {"type", "mem"}});
    
    json res;
    res["nodes"] = nodes; res["edges"] = json::array();
    return res;
}

// --- Network Routing ---
json simulateNetworkRouting(const std::vector<std::string>& actions) {
    json nodes = json::array();
    json edges = json::array();
    
    nodes.push_back({{"id", 0}, {"name", "Router-A"}, {"isSource", true}});
    nodes.push_back({{"id", 1}, {"name", "Router-B"}});
    nodes.push_back({{"id", 2}, {"name", "Router-C"}, {"isDest", true}});
    
    edges.push_back({{"source", 0}, {"target", 1}, {"isPartOfPath", true}});
    edges.push_back({{"source", 1}, {"target", 2}, {"isPartOfPath", true}});
    
    json res;
    res["nodes"] = nodes; res["edges"] = edges;
    res["isGraph"] = true;
    return res;
}
