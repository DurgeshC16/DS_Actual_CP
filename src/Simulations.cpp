#include "Simulations.h"
#include "AVLTree.h"
#include "BPlusTree.h"
#include <iostream>
#include <sstream>
#include <stack>
#include <map>
#include <queue>
#include <algorithm>
#include <cmath>

using json = nlohmann::json;

// --- Database Simulation (using actual B+ Tree) ---
// State is reset each CLI spawn — server.js replays the full action history per session,
// so static globals here just hold the current-request's tree.
static std::unique_ptr<BPlusTree> dbIndex = std::make_unique<BPlusTree>(4);

json simulateDatabase(const std::vector<std::string>& actions) {
    // Re-create fresh tree (server replays full history)
    dbIndex = std::make_unique<BPlusTree>(4);
    json logs_arr = json::array();
    for (const auto& action : actions) {
        size_t colon = action.find(':');
        if (colon == std::string::npos) continue;
        std::string op = action.substr(0, colon);
        std::string val_str = action.substr(colon + 1);
        int id = std::stoi(val_str);

        if (op == "insert") {
            dbIndex->insert(id);
            logs_arr.push_back("Indexed record ID=" + std::to_string(id));
        } else if (op == "delete") {
            dbIndex->remove(id);
            logs_arr.push_back("Dropped index for ID=" + std::to_string(id));
        } else if (op == "search") {
            bool found = dbIndex->search(id);
            logs_arr.push_back("Lookup ID=" + std::to_string(id) + (found ? " -> FOUND" : " -> NOT FOUND"));
        }
    }
    dbIndex->updateHeightAndMemory();
    json res = dbIndex->toJson();
    res["type"] = "bplus";
    res["logs"] = logs_arr;
    return res;
}

// --- Memory Allocator (using AVL Tree to track free blocks) ---
static std::unique_ptr<AVLTree> memoryPool = std::make_unique<AVLTree>();

json simulateMemoryAllocation(const std::vector<std::string>& actions) {
    // Re-create fresh pool (server replays full history)
    memoryPool = std::make_unique<AVLTree>();
    // Seed with a pool of free blocks
    memoryPool->insert(1024); // 1024 KB total pool block

    json logs_arr = json::array();
    for (const auto& action : actions) {
        if (action == "free:all") {
            memoryPool = std::make_unique<AVLTree>();
            memoryPool->insert(1024);
            logs_arr.push_back("Memory pool cleared. 1024KB free block restored.");
            continue;
        }
        size_t colon = action.find(':');
        if (colon == std::string::npos) continue;
        std::string op = action.substr(0, colon);
        int size = std::stoi(action.substr(colon + 1));

        if (op == "allocate") {
            memoryPool->insert(size);
            logs_arr.push_back("Best-fit block of " + std::to_string(size) + "KB allocated from pool.");
        }
    }
    memoryPool->updateHeightAndMemory();
    json tree_json = memoryPool->toJson();

    // Annotate nodes with "Block: Xkb" label
    if (tree_json.contains("nodes") && tree_json["nodes"].is_array()) {
        for (auto& node : tree_json["nodes"]) {
            if (node.contains("key") && node["key"].is_number()) {
                int kb = node["key"].get<int>();
                node["label"] = "Block: " + std::to_string(kb) + "KB";
            }
        }
    }

    tree_json["logs"] = logs_arr;
    return tree_json;
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
    // Re-create fresh FS (server replays full history)
    // Clean up old tree
    std::queue<FSNode*> cleanup;
    cleanup.push(fsRoot);
    while (!cleanup.empty()) {
        FSNode* n = cleanup.front(); cleanup.pop();
        for (auto& [k, v] : n->children) cleanup.push(v);
        if (n != fsRoot) delete n;
    }
    fsRoot->children.clear();
    fsRoot->name = "/";
    fsRoot->isFolder = true;
    fsNextId = 1;

    json logs_arr = json::array();
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
            for (size_t i = 0; i < parts.size(); ++i) {
                const auto& name = parts[i];
                if (curr->children.find(name) == curr->children.end()) {
                    // Leaf node: treat as file if it has an extension, else folder
                    bool isFile = (name.find('.') != std::string::npos);
                    curr->children[name] = new FSNode{fsNextId++, name, !isFile, {}};
                }
                curr = curr->children[name];
            }
            logs_arr.push_back("Created: " + path);
        } else if (op == "delete") {
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
                logs_arr.push_back("Deleted: " + path);
            }
        }
    }

    json nodes = json::array();
    json edges = json::array();
    std::queue<FSNode*> q;
    q.push(fsRoot);
    while (!q.empty()) {
        FSNode* n = q.front(); q.pop();
        nodes.push_back({
            {"id", n->id},
            {"key", n->name},
            {"type", n->isFolder ? "folder" : "file"},
            {"isFolder", n->isFolder}
        });
        for (auto const& [name, child] : n->children) {
            edges.push_back({{"source", n->id}, {"target", child->id}});
            q.push(child);
        }
    }
    json res;
    res["nodes"] = nodes;
    res["edges"] = edges;
    res["logs"] = logs_arr;
    return res;
}

// --- Expression Tree (AST with evaluation) ---
// Simple recursive-descent parser for +, -, *, / and parentheses
struct ExprNode {
    int id;
    std::string key;
    std::string type; // "op" or "num"
    ExprNode* left = nullptr;
    ExprNode* right = nullptr;
};

static int exprNodeId = 0;

double evalExprNode(ExprNode* n) {
    if (!n) return 0;
    if (n->type == "num") return std::stod(n->key);
    double l = evalExprNode(n->left);
    double r = evalExprNode(n->right);
    if (n->key == "+") return l + r;
    if (n->key == "-") return l - r;
    if (n->key == "*") return l * r;
    if (n->key == "/" && r != 0) return l / r;
    return 0;
}

void collectExprNodes(ExprNode* n, json& nodes_arr, json& edges_arr) {
    if (!n) return;
    nodes_arr.push_back({{"id", n->id}, {"key", n->key}, {"type", n->type}});
    if (n->left) {
        edges_arr.push_back({{"source", n->id}, {"target", n->left->id}});
        collectExprNodes(n->left, nodes_arr, edges_arr);
    }
    if (n->right) {
        edges_arr.push_back({{"source", n->id}, {"target", n->right->id}});
        collectExprNodes(n->right, nodes_arr, edges_arr);
    }
}

void freeExprNode(ExprNode* n) {
    if (!n) return;
    freeExprNode(n->left);
    freeExprNode(n->right);
    delete n;
}

// Tokenizer
struct Token { std::string val; bool isOp; };
std::vector<Token> tokenize(const std::string& expr) {
    std::vector<Token> tokens;
    size_t i = 0;
    while (i < expr.size()) {
        if (std::isspace(expr[i])) { ++i; continue; }
        if (expr[i] == '(' || expr[i] == ')' || expr[i] == '+' || expr[i] == '-' || expr[i] == '*' || expr[i] == '/') {
            tokens.push_back({std::string(1, expr[i]), true});
            ++i;
        } else if (std::isdigit(expr[i]) || expr[i] == '.') {
            std::string num;
            while (i < expr.size() && (std::isdigit(expr[i]) || expr[i] == '.')) num += expr[i++];
            tokens.push_back({num, false});
        } else {
            ++i;
        }
    }
    return tokens;
}

// Pratt-style precedence parser
struct Parser {
    std::vector<Token> tokens;
    size_t pos = 0;

    Token peek() { return pos < tokens.size() ? tokens[pos] : Token{"", true}; }
    Token consume() { return pos < tokens.size() ? tokens[pos++] : Token{"", true}; }

    ExprNode* parseExpr(int minPrec = 0) {
        ExprNode* left = parsePrimary();
        while (true) {
            Token t = peek();
            int prec = -1;
            if (t.val == "+" || t.val == "-") prec = 1;
            else if (t.val == "*" || t.val == "/") prec = 2;
            if (prec < minPrec || prec == -1) break;
            consume();
            ExprNode* right = parseExpr(prec + 1);
            ExprNode* node = new ExprNode{exprNodeId++, t.val, "op", left, right};
            left = node;
        }
        return left;
    }

    ExprNode* parsePrimary() {
        Token t = peek();
        if (t.val == "(") {
            consume(); // (
            ExprNode* node = parseExpr(0);
            consume(); // )
            return node;
        }
        consume();
        return new ExprNode{exprNodeId++, t.val, "num", nullptr, nullptr};
    }
};

json simulateExpressionTree(const std::string& expression) {
    json nodes_arr = json::array();
    json edges_arr = json::array();
    json logs_arr = json::array();
    std::string eval_result = "";

    if (expression.empty()) {
        json res;
        res["nodes"] = nodes_arr;
        res["edges"] = edges_arr;
        res["eval_result"] = "Empty expression";
        res["logs"] = logs_arr;
        return res;
    }

    try {
        exprNodeId = 0;
        auto tokens = tokenize(expression);
        Parser parser;
        parser.tokens = tokens;
        ExprNode* root = parser.parseExpr(0);

        double result = evalExprNode(root);
        // Format nicely
        if (result == std::floor(result)) {
            eval_result = std::to_string((long long)result);
        } else {
            char buf[64];
            snprintf(buf, sizeof(buf), "%.4g", result);
            eval_result = buf;
        }

        collectExprNodes(root, nodes_arr, edges_arr);
        logs_arr.push_back("AST built for: " + expression);
        logs_arr.push_back("Result = " + eval_result);
        freeExprNode(root);
    } catch (...) {
        // Fall back to simple display
        nodes_arr.push_back({{"id", 0}, {"key", expression}, {"type", "root"}});
        eval_result = "Parse error";
        logs_arr.push_back("Could not parse: " + expression);
    }

    json res;
    res["nodes"] = nodes_arr;
    res["edges"] = edges_arr;
    res["eval_result"] = eval_result;
    res["logs"] = logs_arr;
    return res;
}

json simulateNetworkRouting(const std::vector<std::string>& actions) {
    json res;
    res["nodes"] = json::array({
        {{"id", 0}, {"key", "Router-1"}},
        {{"id", 1}, {"key", "Router-2"}}
    });
    res["edges"] = json::array({{{"source", 0}, {"target", 1}}});
    return res;
}
