#pragma once
#include <vector>
#include <string>

enum class DatasetType {
    Random,
    Sorted,
    ReverseSorted,
    Skewed,
    RealWorld
};

class DatasetGenerator {
public:
    DatasetGenerator(const std::string& realWorldFilePath = "data/realworld.txt");
    std::vector<int> generate(DatasetType type, size_t size);
    static std::string datasetTypeToString(DatasetType type);

private:
    std::string realWorldPath;
    std::vector<int> cachedRealWorldData;
    void loadRealWorldData();
};
