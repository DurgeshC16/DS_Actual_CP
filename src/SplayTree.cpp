#include "SplayTree.h"
#include <algorithm>
#include <queue>

SplayTree::SplayTree() : root(nullptr), nodeCount(0) {}

SplayTree::~SplayTree() {
    clear(root);
}

void SplayTree::clear(SplayNode* node) {
    if (node) {
        clear(node->left);
        clear(node->right);
        delete node;
    }
}

void SplayTree::leftRotate(SplayNode* x) {
    metrics.singleRotations++;
    SplayNode* y = x->right;
    x->right = y->left;
    if (y->left) y->left->parent = x;
    y->parent = x->parent;
    if (!x->parent) root = y;
    else if (x == x->parent->left) x->parent->left = y;
    else x->parent->right = y;
    y->left = x;
    x->parent = y;
}

void SplayTree::rightRotate(SplayNode* x) {
    metrics.singleRotations++;
    SplayNode* y = x->left;
    x->left = y->right;
    if (y->right) y->right->parent = x;
    y->parent = x->parent;
    if (!x->parent) root = y;
    else if (x == x->parent->right) x->parent->right = y;
    else x->parent->left = y;
    y->right = x;
    x->parent = y;
}

void SplayTree::splay(SplayNode* x) {
    while (x->parent) {
        if (!x->parent->parent) {
            if (x == x->parent->left) rightRotate(x->parent);
            else leftRotate(x->parent);
        } else if (x == x->parent->left && x->parent == x->parent->parent->left) {
            rightRotate(x->parent->parent);
            rightRotate(x->parent);
        } else if (x == x->parent->right && x->parent == x->parent->parent->right) {
            leftRotate(x->parent->parent);
            leftRotate(x->parent);
        } else if (x == x->parent->left && x->parent == x->parent->parent->right) {
            rightRotate(x->parent);
            leftRotate(x->parent);
        } else {
            leftRotate(x->parent);
            rightRotate(x->parent);
        }
    }
}

void SplayTree::insert(int key) {
    if (!root) {
        root = new SplayNode(key);
        nodeCount++;
        return;
    }

    SplayNode* curr = root;
    SplayNode* parent = nullptr;
    while (curr) {
        parent = curr;
        metrics.comparisons++;
        if (key == curr->key) {
            splay(curr);
            return;
        }
        if (key < curr->key) curr = curr->left;
        else curr = curr->right;
    }

    SplayNode* newNode = new SplayNode(key);
    newNode->parent = parent;
    if (key < parent->key) parent->left = newNode;
    else parent->right = newNode;
    nodeCount++;
    splay(newNode);
}

void SplayTree::remove(int key) {
    SplayNode* z = searchNode(key);
    if (!z) return;

    splay(z);
    SplayNode* L = z->left;
    SplayNode* R = z->right;

    if (L) L->parent = nullptr;
    if (R) R->parent = nullptr;

    delete z;
    nodeCount--;

    if (!L) {
        root = R;
    } else {
        SplayNode* m = L;
        while (m->right) m = m->right;
        root = L;
        splay(m);
        m->right = R;
        if (R) R->parent = m;
    }
}

bool SplayTree::search(int key) {
    SplayNode* z = searchNode(key);
    if (z) {
        splay(z);
        return true;
    }
    return false;
}

SplayNode* SplayTree::searchNode(int key) {
    SplayNode* curr = root;
    SplayNode* last = nullptr;
    while (curr) {
        last = curr;
        metrics.comparisons++;
        if (key == curr->key) return curr;
        if (key < curr->key) curr = curr->left;
        else curr = curr->right;
    }
    if (last) splay(last);
    return nullptr;
}

std::vector<int> SplayTree::inOrderTraversal() {
    std::vector<int> res;
    inOrder(root, res);
    return res;
}

void SplayTree::inOrder(SplayNode* node, std::vector<int>& res) {
    if (!node) return;
    inOrder(node->left, res);
    res.push_back(node->key);
    inOrder(node->right, res);
}

std::vector<int> SplayTree::preOrderTraversal() {
    std::vector<int> res;
    preOrder(root, res);
    return res;
}

void SplayTree::preOrder(SplayNode* node, std::vector<int>& res) {
    if (!node) return;
    res.push_back(node->key);
    preOrder(node->left, res);
    preOrder(node->right, res);
}

std::vector<int> SplayTree::rangeQuery(int start, int end) {
    std::vector<int> res;
    rangeQueryHelper(root, start, end, res);
    return res;
}

void SplayTree::rangeQueryHelper(SplayNode* node, int start, int end, std::vector<int>& res) {
    if (!node) return;
    metrics.comparisons++;
    if (start < node->key) rangeQueryHelper(node->left, start, end, res);
    metrics.comparisons++;
    if (start <= node->key && end >= node->key) res.push_back(node->key);
    metrics.comparisons++;
    if (end > node->key) rangeQueryHelper(node->right, start, end, res);
}

int SplayTree::getHeight(SplayNode* node) {
    if (!node) return 0;
    int height = 0;
    std::queue<SplayNode*> q;
    q.push(node);
    while (!q.empty()) {
        int levelSize = q.size();
        height++;
        for (int i = 0; i < levelSize; i++) {
            SplayNode* curr = q.front();
            q.pop();
            if (curr->left) q.push(curr->left);
            if (curr->right) q.push(curr->right);
        }
    }
    return height;
}

void SplayTree::updateHeightAndMemory() {
    metrics.maxHeight = getHeight(root);
    metrics.memoryBytes = nodeCount * sizeof(SplayNode);
}

void SplayTree_toJsonHelper(SplayNode* node, nlohmann::json& nodes, nlohmann::json& edges, int& counter, int parentId = -1) {
    if (!node) return;
    int currentId = counter++;
    nodes.push_back({{"id", currentId}, {"key", node->key}});
    if (parentId != -1) {
        edges.push_back({{"source", parentId}, {"target", currentId}});
    }
    SplayTree_toJsonHelper(node->left, nodes, edges, counter, currentId);
    SplayTree_toJsonHelper(node->right, nodes, edges, counter, currentId);
}

nlohmann::json SplayTree::toJson() {
    nlohmann::json result;
    nlohmann::json nodes = nlohmann::json::array();
    nlohmann::json edges = nlohmann::json::array();
    int counter = 0;
    SplayTree_toJsonHelper(root, nodes, edges, counter, -1);
    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}
