#pragma once
#include <vector>
#include <string>
#include "Metrics.h"

class MetricCollector {
private:
    std::vector<BenchmarkResult> results;

public:
    void addResult(const BenchmarkResult& result);
    void exportToJSON(const std::string& filepath);
};
