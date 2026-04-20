#pragma once
#include "SearchTree.h"

enum RBTColor { RED, BLACK };

struct RBTNode {
    int key;
    RBTColor color;
    RBTNode *left, *right, *parent;

    RBTNode(int k) : key(k), color(RED), left(nullptr), right(nullptr), parent(nullptr) {}
};

class RedBlackTree : public SearchTree {
private:
    RBTNode* root;
    RBTNode* TNULL;
    size_t nodeCount;

    void initializeNULLNode(RBTNode* node, RBTNode* parent);
    void preOrderHelper(RBTNode* node, std::vector<int>& result);
    void inOrderHelper(RBTNode* node, std::vector<int>& result);
    RBTNode* searchTreeHelper(RBTNode* node, int key);
    RBTNode* minimum(RBTNode* node);
    RBTNode* maximum(RBTNode* node);
    
    void leftRotate(RBTNode* x);
    void rightRotate(RBTNode* x);

    void insertFix(RBTNode* k);
    void deleteFix(RBTNode* x);
    void rbTransplant(RBTNode* u, RBTNode* v);
    void deleteNodeHelper(RBTNode* node, int key);
    
    int getHeightHelper(RBTNode* node);
    void rangeQueryHelper(RBTNode* node, int start, int end, std::vector<int>& result);
    void clear(RBTNode* node);

public:
    RedBlackTree();
    ~RedBlackTree() override;

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> rangeQuery(int start, int end) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;

    void updateHeightAndMemory() override;
};
