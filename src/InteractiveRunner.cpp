#include "InteractiveRunner.h"
#include "AVLTree.h"
#include "RedBlackTree.h"
#include "BTree.h"
#include "BPlusTree.h"
#include <iostream>
#include <iomanip>
#include <chrono>

InteractiveRunner::InteractiveRunner() {
    trees.push_back(std::make_unique<AVLTree>());
    treeNames.push_back("AVL");

    trees.push_back(std::make_unique<RedBlackTree>());
    treeNames.push_back("Red-Black");

    trees.push_back(std::make_unique<BTree>(3));
    treeNames.push_back("B-Tree");

    trees.push_back(std::make_unique<BPlusTree>(4));
    treeNames.push_back("B+ Tree");
}

void InteractiveRunner::printMenu() {
    std::cout << "\n============================================\n";
    std::cout << " Tree Performance System - Interactive Mode\n";
    std::cout << "============================================\n";
    std::cout << " 1. Insert a Key\n";
    std::cout << " 2. Search for a Key\n";
    std::cout << " 3. Delete a Key\n";
    std::cout << " 4. Range Query\n";
    std::cout << " 0. Exit\n";
    std::cout << "============================================\n";
    std::cout << "Enter choice: ";
}

void InteractiveRunner::printMetricsTable(const std::string& operation, int key) {
    std::cout << "\n--- Metrics for " << operation << " (" << key << ") ---\n";
    std::cout << std::left << std::setw(15) << "Tree" 
              << std::setw(15) << "Time (ms)" 
              << std::setw(15) << "Comparisons" 
              << std::setw(15) << "Rotations" 
              << std::setw(15) << "Splits" << "\n";
    std::cout << std::string(75, '-') << "\n";

    for (size_t i = 0; i < trees.size(); ++i) {
        auto metrics = trees[i]->getMetrics();
        int rots = metrics.singleRotations + metrics.doubleRotations;
        
        std::cout << std::left << std::setw(15) << treeNames[i]
                  << std::setw(15) << std::fixed << std::setprecision(5) << metrics.executionTimeMs
                  << std::setw(15) << metrics.comparisons
                  << std::setw(15) << rots
                  << std::setw(15) << metrics.splits << "\n";
    }
}

void InteractiveRunner::run() {
    int choice;
    while (true) {
        printMenu();
        if (!(std::cin >> choice)) {
            std::cout << "Invalid input. Exiting.\n";
            break;
        }

        if (choice == 0) break;

        if (choice >= 1 && choice <= 3) {
            std::cout << "Enter key: ";
            int key;
            std::cin >> key;

            for (size_t i = 0; i < trees.size(); ++i) {
                trees[i]->resetMetricsForOperation();
                auto start = std::chrono::high_resolution_clock::now();
                if (choice == 1) { 
                    trees[i]->insert(key); 
                } else if (choice == 2) {
                    bool found = trees[i]->search(key);
                    if (i == 0) std::cout << (found ? "Key Found!\n" : "Key Not Found!\n");
                } else if (choice == 3) { 
                    trees[i]->remove(key); 
                }
                auto end = std::chrono::high_resolution_clock::now();
                
                double timeMs = std::chrono::duration<double, std::milli>(end - start).count();
                std::cout << " [" << std::setw(10) << treeNames[i] << "] -> " << std::fixed << std::setprecision(5) << timeMs << " ms\n";
            }
            if (choice != 2) printMetricsTable(choice == 1 ? "Insert" : "Delete", key);
        } else if (choice == 4) {
            std::cout << "Enter start key: ";
            int startK; std::cin >> startK;
            std::cout << "Enter end key: ";
            int endK; std::cin >> endK;

            for (size_t i = 0; i < trees.size(); ++i) {
                trees[i]->resetMetricsForOperation();
                auto start = std::chrono::high_resolution_clock::now();
                auto res = trees[i]->rangeQuery(startK, endK);
                auto end = std::chrono::high_resolution_clock::now();
                
                if (i == 0) std::cout << "Query found " << res.size() << " items.\n";
                double timeMs = std::chrono::duration<double, std::milli>(end - start).count();
                std::cout << " [" << std::setw(10) << treeNames[i] << "] -> " << std::fixed << std::setprecision(5) << timeMs << " ms\n";
            }
        }
    }
}
