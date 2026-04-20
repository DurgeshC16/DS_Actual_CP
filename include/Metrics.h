#pragma once
#include <string>

struct TreeMetrics {
    double executionTimeMs = 0.0;
    long long singleRotations = 0;
    long long doubleRotations = 0;
    long long recolorings = 0;
    long long splits = 0;
    long long comparisons = 0;
    int maxHeight = 0;
    double traversalTimeMs = 0.0;
    double rangeQueryTimeMs = 0.0;
    long long memoryBytes = 0;

    void resetForOperation() {
        executionTimeMs = 0.0;
        singleRotations = 0;
        doubleRotations = 0;
        recolorings = 0;
        splits = 0;
        comparisons = 0;
        traversalTimeMs = 0.0;
        rangeQueryTimeMs = 0.0;
        // maxHeight and memoryBytes are typically persistent state 
        // measured after the operation, so we might not zero them here.
    }
    
    void clearAll() {
        resetForOperation();
        maxHeight = 0;
        memoryBytes = 0;
    }
};

struct BenchmarkResult {
    std::string tree;
    std::string dataset;
    int inputSize;
    std::string operation;
    TreeMetrics metrics;
};
