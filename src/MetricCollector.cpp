#include "MetricCollector.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>

void MetricCollector::addResult(const BenchmarkResult& result) {
    results.push_back(result);
}

void MetricCollector::exportToJSON(const std::string& filepath) {
    nlohmann::json root = nlohmann::json::array();

    for (const auto& res : results) {
        nlohmann::json j;
        j["tree"] = res.tree;
        j["dataset"] = res.dataset;
        j["inputSize"] = res.inputSize;
        j["operation"] = res.operation;
        j["executionTimeMs"] = res.metrics.executionTimeMs;
        j["singleRotations"] = res.metrics.singleRotations;
        j["doubleRotations"] = res.metrics.doubleRotations;
        j["recolorings"] = res.metrics.recolorings;
        j["splits"] = res.metrics.splits;
        j["comparisons"] = res.metrics.comparisons;
        j["maxHeight"] = res.metrics.maxHeight;
        j["traversalTimeMs"] = res.metrics.traversalTimeMs;
        j["rangeQueryTimeMs"] = res.metrics.rangeQueryTimeMs;
        j["memoryBytes"] = res.metrics.memoryBytes;
        
        root.push_back(j);
    }

    std::ofstream file(filepath);
    if (file.is_open()) {
        file << root.dump(4);
        file.close();
        std::cout << "Successfully generated " << filepath << " with " << results.size() << " records.\n";
    } else {
        std::cerr << "Could not open " << filepath << " for writing JSON.\n";
    }
}
