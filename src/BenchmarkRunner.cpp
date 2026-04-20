#include "BenchmarkRunner.h"
#include "AVLTree.h"
#include "RedBlackTree.h"
#include "BTree.h"
#include "BPlusTree.h"
#include <chrono>
#include <iostream>

BenchmarkRunner::BenchmarkRunner() {}

std::unique_ptr<SearchTree> BenchmarkRunner::createTree(const std::string& name) {
    if (name == "AVL") return std::make_unique<AVLTree>();
    if (name == "Red-Black") return std::make_unique<RedBlackTree>();
    if (name == "B-Tree") return std::make_unique<BTree>(3);
    if (name == "B+ Tree") return std::make_unique<BPlusTree>(4);
    return nullptr;
}

void BenchmarkRunner::runAll() {
    for (int size : sizes) {
        for (DatasetType dsType : datasetTypes) {
            for (const std::string& treeName : treeNames) {
                std::cout << "Benchmarking " << treeName << " | " << DatasetGenerator::datasetTypeToString(dsType) << " | Size: " << size << "...\n";
                runTreeBenchmarks(treeName, dsType, size);
            }
        }
    }
}

void BenchmarkRunner::runTreeBenchmarks(const std::string& treeName, DatasetType dsType, int size) {
    auto tree = createTree(treeName);
    if (!tree) return;

    std::vector<int> data = datasetGen.generate(dsType, size);
    std::string dsName = DatasetGenerator::datasetTypeToString(dsType);

    // 1. Insert
    tree->clearAllMetrics();
    auto start = std::chrono::high_resolution_clock::now();
    for (int key : data) {
        tree->insert(key);
    }
    auto end = std::chrono::high_resolution_clock::now();
    tree->updateHeightAndMemory();
    
    BenchmarkResult resInsert;
    resInsert.tree = treeName;
    resInsert.dataset = dsName;
    resInsert.inputSize = size;
    resInsert.operation = "Insert";
    resInsert.metrics = tree->getMetrics();
    resInsert.metrics.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    metrics.addResult(resInsert);

    // 2. Search
    tree->resetMetricsForOperation();
    start = std::chrono::high_resolution_clock::now();
    for (int key : data) {
        tree->search(key);
    }
    end = std::chrono::high_resolution_clock::now();
    
    BenchmarkResult resSearch;
    resSearch.tree = treeName;
    resSearch.dataset = dsName;
    resSearch.inputSize = size;
    resSearch.operation = "Search";
    resSearch.metrics = tree->getMetrics();
    resSearch.metrics.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    metrics.addResult(resSearch);

    // 3. Range Query
    tree->resetMetricsForOperation();
    int rangeStart = data[size / 4];
    int rangeEnd = data[(size * 3) / 4];
    if (rangeStart > rangeEnd) std::swap(rangeStart, rangeEnd);
    
    start = std::chrono::high_resolution_clock::now();
    tree->rangeQuery(rangeStart, rangeEnd);
    end = std::chrono::high_resolution_clock::now();
    
    BenchmarkResult resRange;
    resRange.tree = treeName;
    resRange.dataset = dsName;
    resRange.inputSize = size;
    resRange.operation = "Range Query";
    resRange.metrics = tree->getMetrics();
    resRange.metrics.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    resRange.metrics.rangeQueryTimeMs = resRange.metrics.executionTimeMs;
    metrics.addResult(resRange);

    // 4. Traversal
    tree->resetMetricsForOperation();
    start = std::chrono::high_resolution_clock::now();
    tree->inOrderTraversal();
    end = std::chrono::high_resolution_clock::now();

    BenchmarkResult resTrav;
    resTrav.tree = treeName;
    resTrav.dataset = dsName;
    resTrav.inputSize = size;
    resTrav.operation = "Traversal";
    resTrav.metrics = tree->getMetrics();
    resTrav.metrics.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    resTrav.metrics.traversalTimeMs = resTrav.metrics.executionTimeMs;
    metrics.addResult(resTrav);

    // 5. Delete (Delete half of the data to measure metrics)
    tree->resetMetricsForOperation();
    start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < size / 2; ++i) {
        tree->remove(data[i]);
    }
    end = std::chrono::high_resolution_clock::now();
    tree->updateHeightAndMemory();
    
    BenchmarkResult resDel;
    resDel.tree = treeName;
    resDel.dataset = dsName;
    resDel.inputSize = size;
    resDel.operation = "Delete";
    resDel.metrics = tree->getMetrics();
    resDel.metrics.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    metrics.addResult(resDel);
}

void BenchmarkRunner::exportMetrics(const std::string& filepath) {
    metrics.exportToJSON(filepath);
}
