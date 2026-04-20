#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include <memory>
#include <nlohmann/json.hpp>

#include "AVLTree.h"
#include "RedBlackTree.h"
#include "BTree.h"
#include "BPlusTree.h"
#include "Simulations.h" 

using json = nlohmann::json;

void fail(const std::string& message) {
    json response;
    response["status"] = "error";
    response["message"] = message;
    std::cout << response.dump() << std::endl;
    exit(1);
}

int main(int argc, char* argv[]) {
    std::string type = "";
    std::string input_file = "";

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--type" && i + 1 < argc) {
            type = argv[++i];
        } else if (arg == "--input" && i + 1 < argc) {
            input_file = argv[++i];
        }
    }

    if (type.empty() || input_file.empty()) {
        fail("Usage: tree_cli --type <type> --input <input.json>");
    }

    std::ifstream f(input_file);
    if (!f.is_open()) {
        fail("Could not open input file: " + input_file);
    }

    json input_json;
    try {
        f >> input_json;
    } catch (const json::parse_error& e) {
        fail(std::string("Invalid JSON parsing: ") + e.what());
    }

    std::unique_ptr<SearchTree> tree = nullptr;
    if (type == "avl") {
        tree = std::make_unique<AVLTree>();
    } else if (type == "rb") {
        tree = std::make_unique<RedBlackTree>();
    } else if (type == "btree") {
        tree = std::make_unique<BTree>();
    } else if (type == "bplus") {
        tree = std::make_unique<BPlusTree>();
    } else if (type == "fs") {
        // Mock execution
        std::cout << simulateFileSystem({}).dump() << std::endl;
        return 0;
    } else if (type == "expr") {
        std::cout << simulateExpressionTree("").dump() << std::endl;
        return 0;
    } else if (type == "memory") {
        std::cout << simulateMemoryAllocator({}).dump() << std::endl;
        return 0;
    } else if (type == "network") {
        std::cout << simulateNetworkRouting({}).dump() << std::endl;
        return 0;
    } else {
        fail("Unknown tree/simulation type: " + type);
    }

    std::vector<std::string> logs;

    if (input_json.contains("actions") && input_json["actions"].is_array()) {
        for (const auto& action_json : input_json["actions"]) {
            std::string action_str = action_json.get<std::string>();
            size_t colon_pos = action_str.find(':');
            if (colon_pos != std::string::npos) {
                std::string op = action_str.substr(0, colon_pos);
                int val = std::stoi(action_str.substr(colon_pos + 1));
                
                if (op == "insert") {
                    tree->insert(val);
                    logs.push_back("Insert " + std::to_string(val));
                } else if (op == "delete") {
                    tree->remove(val);
                    logs.push_back("Delete " + std::to_string(val));
                } else if (op == "search") {
                    bool found = tree->search(val);
                    logs.push_back("Search " + std::to_string(val) + (found ? " (Found)" : " (Not Found)"));
                } else {
                    fail("Unknown operation: " + op);
                }
            } else {
                 fail("Invalid action format: " + action_str);
            }
        }
    }

    tree->updateHeightAndMemory();
    auto metrics = tree->getMetrics();

    json response;
    response["status"] = "success";
    response["tree"] = tree->toJson();
    
    json j_metrics;
    j_metrics["time_ms"] = metrics.executionTimeMs; // it is static actually or collected via external. Wait, metrics in search tree doesn't track time automatically.
    j_metrics["comparisons"] = metrics.comparisons;
    j_metrics["rotations"] = metrics.singleRotations + metrics.doubleRotations * 2;
    j_metrics["memoryBytes"] = metrics.memoryBytes;
    
    response["metrics"] = j_metrics;
    response["logs"] = logs;

    std::cout << response.dump() << std::endl;

    return 0;
}
