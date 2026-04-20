#pragma once
#include "SearchTree.h"
#include <vector>

class BPlusTreeNode {
public:
    std::vector<int> keys;
    std::vector<BPlusTreeNode*> children;
    BPlusTreeNode* next;
    bool leaf;

    BPlusTreeNode(bool leaf);
    ~BPlusTreeNode();
};

class BPlusTree : public SearchTree {
private:
    BPlusTreeNode* root;
    int MAX; // maximum number of keys in a node
    size_t nodeCount;

    void insertInternal(int key, BPlusTreeNode* cursor, BPlusTreeNode* child, std::vector<BPlusTreeNode*>& parentStack);
    void removeInternal(int x, BPlusTreeNode* cursor, BPlusTreeNode* child);
    int getHeightHelper(BPlusTreeNode* node) const;

public:
    BPlusTree(int max_keys = 4);
    ~BPlusTree() override;

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> rangeQuery(int start, int end) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;

    void updateHeightAndMemory() override;
};
