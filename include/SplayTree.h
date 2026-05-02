#pragma once
#include "SearchTree.h"
#include <vector>
#include <string>

struct SplayNode {
    int key;
    SplayNode *left, *right, *parent;
    SplayNode(int k) : key(k), left(nullptr), right(nullptr), parent(nullptr) {}
};

class SplayTree : public SearchTree {
private:
    SplayNode* root;
    int nodeCount;

    void leftRotate(SplayNode* x);
    void rightRotate(SplayNode* x);
    void splay(SplayNode* x);
    void clear(SplayNode* node);
    SplayNode* searchNode(int key);

    void inOrder(SplayNode* node, std::vector<int>& res);
    void preOrder(SplayNode* node, std::vector<int>& res);
    void rangeQueryHelper(SplayNode* node, int start, int end, std::vector<int>& res);
    int getHeight(SplayNode* node);

public:
    SplayTree();
    ~SplayTree();

    void insert(int key) override;
    void remove(int key) override;
    bool search(int key) override;
    std::vector<int> inOrderTraversal() override;
    std::vector<int> preOrderTraversal() override;
    std::vector<int> rangeQuery(int start, int end) override;

    void updateHeightAndMemory() override;
    nlohmann::json toJson() override;
};
