#include "BPlusTree.h"
#include <iostream>
#include <algorithm>

BPlusTreeNode::BPlusTreeNode(bool leaf) : leaf(leaf), next(nullptr) {}

BPlusTreeNode::~BPlusTreeNode() {
    for (auto child : children) {
        delete child;
    }
}

BPlusTree::BPlusTree(int max_keys) : root(nullptr), MAX(max_keys), nodeCount(0) {}

BPlusTree::~BPlusTree() {
    delete root;
}

void BPlusTree::insert(int key) {
    if (root == nullptr) {
        root = new BPlusTreeNode(true);
        root->keys.push_back(key);
        nodeCount++;
        return;
    }

    BPlusTreeNode* cursor = root;
    std::vector<BPlusTreeNode*> parentStack;

    while (!cursor->leaf) {
        parentStack.push_back(cursor);
        int idx = 0;
        while (idx < cursor->keys.size() && key >= cursor->keys[idx]) {
            metrics.comparisons++;
            idx++;
        }
        if (idx < cursor->keys.size()) metrics.comparisons++;
        cursor = cursor->children[idx];
    }

    int idx = 0;
    while (idx < cursor->keys.size() && key > cursor->keys[idx]) {
        metrics.comparisons++;
        idx++;
    }
    if (idx < cursor->keys.size()) {
        metrics.comparisons++;
        if (cursor->keys[idx] == key) return; // duplicate
    }
    
    cursor->keys.insert(cursor->keys.begin() + idx, key);

    if (cursor->keys.size() <= MAX) {
        return;
    }

    metrics.splits++;
    BPlusTreeNode* newLeaf = new BPlusTreeNode(true);
    nodeCount++;
    
    int mid = (MAX + 1) / 2;
    for (int i = mid; i <= MAX; i++) {
        newLeaf->keys.push_back(cursor->keys[i]);
    }
    cursor->keys.resize(mid);

    newLeaf->next = cursor->next;
    cursor->next = newLeaf;

    if (cursor == root) {
        BPlusTreeNode* newRoot = new BPlusTreeNode(false);
        nodeCount++;
        newRoot->keys.push_back(newLeaf->keys[0]);
        newRoot->children.push_back(cursor);
        newRoot->children.push_back(newLeaf);
        root = newRoot;
    } else {
        insertInternal(newLeaf->keys[0], parentStack.back(), newLeaf, parentStack);
    }
}

void BPlusTree::insertInternal(int key, BPlusTreeNode* cursor, BPlusTreeNode* child, std::vector<BPlusTreeNode*>& parentStack) {
    int idx = 0;
    while (idx < cursor->keys.size() && key >= cursor->keys[idx]) {
        metrics.comparisons++;
        idx++;
    }
    if (idx < cursor->keys.size()) metrics.comparisons++;
    
    cursor->keys.insert(cursor->keys.begin() + idx, key);
    cursor->children.insert(cursor->children.begin() + idx + 1, child);

    if (cursor->keys.size() <= MAX) {
        return;
    }

    metrics.splits++;
    BPlusTreeNode* newInternal = new BPlusTreeNode(false);
    nodeCount++;
    
    int mid = MAX / 2;
    int upKey = cursor->keys[mid];

    for (int i = mid + 1; i <= MAX; i++) {
        newInternal->keys.push_back(cursor->keys[i]);
    }
    for (int i = mid + 1; i <= MAX + 1; i++) {
        newInternal->children.push_back(cursor->children[i]);
    }

    cursor->keys.resize(mid);
    cursor->children.resize(mid + 1);

    if (cursor == root) {
        BPlusTreeNode* newRoot = new BPlusTreeNode(false);
        nodeCount++;
        newRoot->keys.push_back(upKey);
        newRoot->children.push_back(cursor);
        newRoot->children.push_back(newInternal);
        root = newRoot;
    } else {
        parentStack.pop_back(); // Pop the current cursor
        BPlusTreeNode* parent = parentStack.empty() ? nullptr : parentStack.back();
        insertInternal(upKey, parent, newInternal, parentStack);
    }
}

bool BPlusTree::search(int key) {
    if (root == nullptr) return false;
    BPlusTreeNode* cursor = root;
    while (!cursor->leaf) {
        int idx = 0;
        while (idx < cursor->keys.size() && key >= cursor->keys[idx]) {
            metrics.comparisons++;
            idx++;
        }
        if (idx < cursor->keys.size()) metrics.comparisons++;
        cursor = cursor->children[idx];
    }
    for (int i = 0; i < cursor->keys.size(); i++) {
        metrics.comparisons++;
        if (cursor->keys[i] == key) return true;
        
        metrics.comparisons++;
        if (cursor->keys[i] > key) break;
    }
    return false;
}

std::vector<int> BPlusTree::rangeQuery(int start, int end) {
    std::vector<int> result;
    if (root == nullptr) return result;
    BPlusTreeNode* cursor = root;
    while (!cursor->leaf) {
        int idx = 0;
        while (idx < cursor->keys.size() && start >= cursor->keys[idx]) {
            metrics.comparisons++;
            idx++;
        }
        if (idx < cursor->keys.size()) metrics.comparisons++;
        cursor = cursor->children[idx];
    }

    while (cursor != nullptr) {
        for (int i = 0; i < cursor->keys.size(); i++) {
            metrics.comparisons++;
            if (cursor->keys[i] >= start && cursor->keys[i] <= end) {
                result.push_back(cursor->keys[i]);
            }
            metrics.comparisons++;
            if (cursor->keys[i] > end) {
                return result; 
            }
        }
        cursor = cursor->next;
    }
    return result;
}

std::vector<int> BPlusTree::inOrderTraversal() {
    std::vector<int> result;
    if (root == nullptr) return result;
    BPlusTreeNode* cursor = root;
    while (!cursor->leaf) {
        cursor = cursor->children[0];
    }
    while (cursor != nullptr) {
        for (int k : cursor->keys) {
            result.push_back(k);
        }
        cursor = cursor->next;
    }
    return result;
}

std::vector<int> BPlusTree::preOrderTraversal() {
    std::vector<int> result;
    if (root == nullptr) return result;
    std::vector<BPlusTreeNode*> stack;
    stack.push_back(root);
    while (!stack.empty()) {
        BPlusTreeNode* current = stack.back();
        stack.pop_back();
        for (int k : current->keys) {
            result.push_back(k);
        }
        if (!current->leaf) {
            for (auto it = current->children.rbegin(); it != current->children.rend(); ++it) {
                stack.push_back(*it);
            }
        }
    }
    return result;
}

void BPlusTree::remove(int key) {
    if (root == nullptr) return;

    BPlusTreeNode* cursor = root;
    while (!cursor->leaf) {
        int idx = 0;
        while (idx < cursor->keys.size() && key >= cursor->keys[idx]) {
            metrics.comparisons++;
            idx++;
        }
        if (idx < cursor->keys.size()) metrics.comparisons++;
        cursor = cursor->children[idx];
    }

    for (int i = 0; i < cursor->keys.size(); i++) {
        metrics.comparisons++;
        if (cursor->keys[i] == key) {
            cursor->keys.erase(cursor->keys.begin() + i);
            return;
        }
    }
}

int BPlusTree::getHeightHelper(BPlusTreeNode* node) const {
    if (!node) return 0;
    if (node->leaf) return 1;
    return 1 + getHeightHelper(node->children[0]);
}

void BPlusTree::updateHeightAndMemory() {
    metrics.maxHeight = getHeightHelper(root);
    size_t mem = nodeCount * sizeof(BPlusTreeNode);
    mem += nodeCount * ( MAX * sizeof(int) + (MAX+1) * sizeof(void*) );
    metrics.memoryBytes = mem;
}
