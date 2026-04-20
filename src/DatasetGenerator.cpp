#include "DatasetGenerator.h"
#include <random>
#include <fstream>
#include <iostream>
#include <algorithm>

DatasetGenerator::DatasetGenerator(const std::string& realWorldFilePath) 
    : realWorldPath(realWorldFilePath) {
}

void DatasetGenerator::loadRealWorldData() {
    if (!cachedRealWorldData.empty()) return;

    std::ifstream file(realWorldPath);
    if (!file.is_open()) {
        std::cerr << "Warning: Could not open " << realWorldPath << ". Using generated fallback data.\n";
        for (int i = 0; i < 100000; ++i) {
            cachedRealWorldData.push_back((i * 37) % 100000 + 10000);
        }
        return;
    }

    int val;
    while (file >> val) {
        cachedRealWorldData.push_back(val);
    }
}

std::vector<int> DatasetGenerator::generate(DatasetType type, size_t size) {
    std::vector<int> data;
    data.reserve(size);
    std::mt19937 gen(42); 

    switch (type) {
        case DatasetType::Random: {
            std::uniform_int_distribution<int> dist(1, static_cast<int>(size * 10));
            for (size_t i = 0; i < size; ++i) data.push_back(dist(gen));
            break;
        }
        case DatasetType::Sorted: {
            for (size_t i = 0; i < size; ++i) data.push_back(static_cast<int>(i + 1));
            break;
        }
        case DatasetType::ReverseSorted: {
            for (size_t i = 0; i < size; ++i) data.push_back(static_cast<int>(size - i));
            break;
        }
        case DatasetType::Skewed: {
            std::uniform_int_distribution<int> distVals(1, static_cast<int>(size / 10 + 1));
            std::uniform_int_distribution<int> distRepeats(5, 50);
            size_t count = 0;
            while (count < size) {
                int val = distVals(gen);
                int repeats = distRepeats(gen);
                for (int i = 0; i < repeats && count < size; ++i, ++count) {
                    data.push_back(val);
                }
            }
            break;
        }
        case DatasetType::RealWorld: {
            loadRealWorldData();
            if (cachedRealWorldData.empty()) {
                for (size_t i = 0; i < size; ++i) data.push_back(static_cast<int>(i));
            } else {
                for (size_t i = 0; i < size; ++i) {
                    data.push_back(cachedRealWorldData[i % cachedRealWorldData.size()]);
                }
            }
            break;
        }
    }
    return data;
}

std::string DatasetGenerator::datasetTypeToString(DatasetType type) {
    switch (type) {
        case DatasetType::Random: return "Random";
        case DatasetType::Sorted: return "Sorted";
        case DatasetType::ReverseSorted: return "Reverse Sorted";
        case DatasetType::Skewed: return "Skewed";
        case DatasetType::RealWorld: return "Real-world";
    }
    return "Unknown";
}
