#pragma once
#include "SearchTree.h"
#include <memory>
#include <vector>
#include <string>

class InteractiveRunner {
private:
    std::vector<std::unique_ptr<SearchTree>> trees;
    std::vector<std::string> treeNames;

    void printMenu();
    void printMetricsTable(const std::string& operation, int key);
    
public:
    InteractiveRunner();
    void run();
};
