#include "Simulations.h"
#include "AVLTree.h"
#include "BPlusTree.h"
#include <iostream>
#include <sstream>
#include <stack>
#include <map>
#include <queue>
#include <algorithm>

using json = nlohmann::json;

// --- Database Simulation (using actual B+ Tree) ---
static std::unique_ptr<BPlusTree> dbIndex = std::make_unique<BPlusTree>(4);

json simulateDatabase(const std::vector<std::string>& actions) {
    for (const auto& action : actions) {
        size_t colon = action.find(':');
        if (colon == std::string::npos) continue;
        std::string op = action.substr(0, colon);
        int id = std::stoi(action.substr(colon + 1));

        if (op == "insert") dbIndex->insert(id);
        else if (op == "delete") dbIndex->remove(id);
        else if (op == "search") dbIndex->search(id);
    }
    dbIndex->updateHeightAndMemory();
    return dbIndex->toJson();
}

// --- Memory Allocator (using AVL Tree to track free blocks) ---
static std::unique_ptr<AVLTree> memoryPool = std::make_unique<AVLTree>();

json simulateMemoryAllocation(const std::vector<std::string>& actions) {
    for (const auto& action : actions) {
        if (action == "free:all") {
            memoryPool = std::make_unique<AVLTree>();
            continue;
        }
        size_t colon = action.find(':');
        if (colon == std::string::npos) continue;
        std::string op = action.substr(0, colon);
        int size = std::stoi(action.substr(colon + 1));

        if (op == "allocate") memoryPool->insert(size);
    }
    memoryPool->updateHeightAndMemory();
    return memoryPool->toJson();
}

// --- File System Simulation (N-ary Tree) ---
struct FSNode {
    int id;
    std::string name;
    bool isFolder;
    std::map<std::string, FSNode*> children;
};

static FSNode* fsRoot = new FSNode{0, "/", true, {}};
static int fsNextId = 1;

json simulateFileSystem(const std::vector<std::string>& actions) {
    for (const auto& action : actions) {
        size_t colon = action.find(':');
        if (colon == std::string::npos) continue;
        std::string op = action.substr(0, colon);
        std::string path = action.substr(colon + 1);

        std::vector<std::string> parts;
        std::stringstream ss(path);
        std::string part;
        while (std::getline(ss, part, '/')) {
            if (!part.empty()) parts.push_back(part);
        }

        if (op == "create") {
            FSNode* curr = fsRoot;
            for (const auto& name : parts) {
                if (curr->children.find(name) == curr->children.end()) {
                    curr->children[name] = new FSNode{fsNextId++, name, true, {}};
                }
                curr = curr->children[name];
            }
        } else if (op == "delete") {
            // Simple delete logic for the leaf of the path
            FSNode* curr = fsRoot;
            FSNode* parent = nullptr;
            std::string lastPart = "";
            for (size_t i = 0; i < parts.size(); ++i) {
                if (curr->children.find(parts[i]) == curr->children.end()) break;
                parent = curr;
                lastPart = parts[i];
                curr = curr->children[parts[i]];
            }
            if (parent && !lastPart.empty()) {
                parent->children.erase(lastPart);
            }
        }
    }

    json nodes = json::array();
    json edges = json::array();
    std::queue<FSNode*> q;
    q.push(fsRoot);
    while (!q.empty()) {
        FSNode* n = q.front(); q.pop();
        nodes.push_back({{"id", n->id}, {"key", n->name}, {"type", n->isFolder ? "folder" : "file"}});
        for (auto const& [name, child] : n->children) {
            edges.push_back({{"source", n->id}, {"target", child->id}});
            q.push(child);
        }
    }
    json res;
    res["nodes"] = nodes; res["edges"] = edges;
    return res;
}

// --- Simplified Expression Tree ---
json simulateExpressionTree(const std::string& expression) {
    json nodes = json::array();
    json edges = json::array();
    
    // Split basic expression for visualization (e.g. "3+5")
    nodes.push_back({{"id", 0}, {"key", expression}, {"type", "root"}});
    
    json res;
    res["nodes"] = nodes; res["edges"] = edges;
    return res;
}

json simulateNetworkRouting(const std::vector<std::string>& actions) {
    json res;
    res["nodes"] = json::array({{{"id", 0}, {"key", "Router-1"}}, {{"id", 1}, {"key", "Router-2"}}});
    res["edges"] = json::array({{{"source", 0}, {"target", 1}}});
    return res;
}
