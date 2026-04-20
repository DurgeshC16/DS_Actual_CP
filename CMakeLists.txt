cmake_minimum_required(VERSION 3.14...3.28)
project(TreePerformanceAnalyzer CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Download nlohmann_json single-header directly to avoid legacy CMake target issues
set(NLOHMANN_INCLUDE_DIR ${CMAKE_BINARY_DIR}/third_party/nlohmann)
file(MAKE_DIRECTORY ${NLOHMANN_INCLUDE_DIR})
if(NOT EXISTS "${NLOHMANN_INCLUDE_DIR}/json.hpp")
    message(STATUS "Downloading nlohmann/json.hpp...")
    file(DOWNLOAD
        "https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp"
        "${NLOHMANN_INCLUDE_DIR}/json.hpp"
    )
endif()

add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE ${CMAKE_BINARY_DIR}/third_party)
add_library(nlohmann_json::nlohmann_json ALIAS nlohmann_json)

# Fetch GoogleTest
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# Add our source files
set(SOURCES
    src/AVLTree.cpp
    src/RedBlackTree.cpp
    src/BTree.cpp
    src/BPlusTree.cpp
    src/DatasetGenerator.cpp
    src/MetricCollector.cpp
    src/BenchmarkRunner.cpp
    src/InteractiveRunner.cpp
)

# TreeLib library
add_library(TreeLib ${SOURCES})
target_include_directories(TreeLib PUBLIC include)
target_link_libraries(TreeLib PUBLIC nlohmann_json::nlohmann_json)

# Main executable
add_executable(TreeAnalyzer src/main.cpp)
target_link_libraries(TreeAnalyzer PRIVATE TreeLib)

# Tests executable
enable_testing()
add_executable(TreeTests tests/TreeTests.cpp)
target_link_libraries(TreeTests PRIVATE TreeLib GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(TreeTests)
