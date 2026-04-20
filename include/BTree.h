#pragma once
#include "SearchTree.h"
#include <vector>

class BTreeNode {
public:
    std::vector<int> keys;
    std::vector<BTreeNode*> children;
    bool leaf;
    int t; 

    BTreeNode(int t, bool leaf);
    ~BTreeNode();
};

class BTree : public SearchTree {
private:
    BTreeNode* root;
    int t;
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
    BTree(int min_degree = 3);
    ~BTree() override;

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> rangeQuery(int start, int end) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;

    void updateHeightAndMemory() override;
};
