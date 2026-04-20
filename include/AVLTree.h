#pragma once
#include "SearchTree.h"

struct AVLNode {
    int key;
    AVLNode* left;
    AVLNode* right;
    int height;
    
    AVLNode(int k) : key(k), left(nullptr), right(nullptr), height(1) {}
};

class AVLTree : public SearchTree {
private:
    AVLNode* root;
    size_t nodeCount;

    int getHeight(AVLNode* node);
    int getBalanceFactor(AVLNode* node);
    void updateHeight(AVLNode* node);

    AVLNode* rightRotate(AVLNode* y);
    AVLNode* leftRotate(AVLNode* x);

    AVLNode* insertNode(AVLNode* node, int key);
    AVLNode* removeNode(AVLNode* node, int key);
    AVLNode* minValueNode(AVLNode* node);

    void inOrderHelper(AVLNode* node, std::vector<int>& result);
    void preOrderHelper(AVLNode* node, std::vector<int>& result);
    void rangeQueryHelper(AVLNode* node, int start, int end, std::vector<int>& result);
    
    void clear(AVLNode* node);
public:
    AVLTree();
    ~AVLTree() override;

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> rangeQuery(int start, int end) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;
    nlohmann::json toJson() override;

    void updateHeightAndMemory() override;
};
