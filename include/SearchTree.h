#pragma once
#include <vector>
#include "Metrics.h"

class SearchTree {
protected:
    TreeMetrics metrics;

public:
    virtual ~SearchTree() = default;

    virtual void insert(int key) = 0;
    virtual void remove(int key) = 0;
    virtual bool search(int key) = 0;
    virtual std::vector<int> rangeQuery(int start, int end) = 0;
    virtual std::vector<int> inOrderTraversal() = 0;
    virtual std::vector<int> preOrderTraversal() = 0;

    TreeMetrics getMetrics() const { return metrics; }
    void resetMetricsForOperation() { metrics.resetForOperation(); }
    void clearAllMetrics() { metrics.clearAll(); }

    virtual void updateHeightAndMemory() = 0;
};
