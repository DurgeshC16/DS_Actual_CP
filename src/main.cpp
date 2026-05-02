#include "BenchmarkRunner.h"
#include "InteractiveRunner.h"
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char* argv[]) {
    std::cerr << "Main started" << std::endl;
    std::vector<std::string> args(argv, argv + argc);
    bool interactive = false;

    for (const auto& arg : args) {
        if (arg == "--interactive" || arg == "-i") {
            interactive = true;
            break;
        }
    }

    if (interactive) {
        InteractiveRunner runner;
        runner.run();
        return 0;
    }

    std::cout << "Starting Tree Performance Analysis System...\n";
    
    BenchmarkRunner runner;
    runner.runAll();
    
    runner.exportMetrics("dashboard/metrics.json");
    
    std::cout << "Benchmarking complete. Metrics exported to dashboard/metrics.json.\n";
    std::cout << "Run with --interactive or -i to launch the manual operations mode.\n";
    return 0;
}
