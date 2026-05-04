#pragma once
#include "SearchTree.h"
#include <vector>

class BTreeNode {
public:
    std::vector<int> keys;
    std::vector<BTreeNode*> children;
    bool leaf;
    int t;    // CLRS minimum degree (used for min-key enforcement)
    int MAX;  // maximum keys per node = Knuth order - 1

    BTreeNode(int t, int max_keys, bool leaf);
    ~BTreeNode();
};

class BTree : public SearchTree {
private:
    BTreeNode* root;
    int t;    // CLRS minimum degree
    int MAX;  // max keys per node = Knuth order - 1
    size_t nodeCount;

    void insertNonFull(BTreeNode* x, int k);
    void splitChild(BTreeNode* x, int i, BTreeNode* y);
    void removeNode(BTreeNode* x, int k);
    void removeFromLeaf(BTreeNode* x, int idx);
    void removeFromNonLeaf(BTreeNode* x, int idx);
    int getPred(BTreeNode* x, int idx);
    int getSucc(BTreeNode* x, int idx);
    void fill(BTreeNode* x, int idx);
    void borrowFromPrev(BTreeNode* x, int idx);
    void borrowFromNext(BTreeNode* x, int idx);
    void merge(BTreeNode* x, int idx);

    bool searchNode(BTreeNode* x, int k);
    
    void inOrderHelper(BTreeNode* node, std::vector<int>& result);
    void preOrderHelper(BTreeNode* node, std::vector<int>& result);
    void rangeQueryHelper(BTreeNode* node, int start, int end, std::vector<int>& result);
    int getHeightHelper(BTreeNode* node) const;

public:
    // Constructor: knuth_order is the Knuth B-Tree order (max children per node).
    // Internally computes t = max(2, ceil(order/2)) and MAX = order - 1.
    BTree(int knuth_order = 4);
    ~BTree() override;

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> rangeQuery(int start, int end) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;

    void updateHeightAndMemory() override;
    nlohmann::json toJson() override;
};
