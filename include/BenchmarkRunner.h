#pragma once
#include "DatasetGenerator.h"
#include "MetricCollector.h"
#include "SearchTree.h"
#include <memory>
#include <vector>
#include <string>

class BenchmarkRunner {
private:
    DatasetGenerator datasetGen;
    MetricCollector metrics;
    std::vector<int> sizes = {1000, 5000, 10000};
    std::vector<DatasetType> datasetTypes = {
        DatasetType::Random,
        DatasetType::Sorted,
        DatasetType::ReverseSorted,
        DatasetType::Skewed,
        DatasetType::RealWorld
    };
    std::vector<std::string> treeNames = {"AVL", "Red-Black", "B-Tree", "B+ Tree", "Splay"};
    int bTreeOrder = 3;
    int bPlusTreeOrder = 4;

    std::unique_ptr<SearchTree> createTree(const std::string& name);
    void runTreeBenchmarks(const std::string& treeName, DatasetType dsType, int size);

public:
    BenchmarkRunner();
    void setBTreeOrder(int t) { bTreeOrder = t; }
    void setBPlusTreeOrder(int m) { bPlusTreeOrder = m; }
    void runAll();
    void exportMetrics(const std::string& filepath);
};
