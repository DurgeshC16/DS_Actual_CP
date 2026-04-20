#include "BTree.h"
#include <iostream>
#include <algorithm>

BTreeNode::BTreeNode(int t1, bool leaf1) : leaf(leaf1), t(t1) {
    keys.reserve(2 * t - 1);
    if (!leaf) {
        children.reserve(2 * t);
    }
}
BTreeNode::~BTreeNode() {
    for (auto child : children) {
        delete child;
    }
}

BTree::BTree(int min_degree) : root(nullptr), t(min_degree), nodeCount(0) {}

BTree::~BTree() {
    delete root;
}

void BTree::insert(int key) {
    if (root == nullptr) {
        root = new BTreeNode(t, true);
        root->keys.push_back(key);
        nodeCount++;
    } else {
        if (root->keys.size() == 2 * t - 1) {
            BTreeNode* s = new BTreeNode(t, false);
            s->children.push_back(root);
            nodeCount++;
            splitChild(s, 0, root);
            root = s;
            insertNonFull(root, key);
        } else {
            insertNonFull(root, key);
        }
    }
}

void BTree::insertNonFull(BTreeNode* x, int k) {
    int i = x->keys.size() - 1;

    if (x->leaf) {
        x->keys.push_back(0); 
        while (i >= 0 && x->keys[i] > k) {
            metrics.comparisons++;
            x->keys[i + 1] = x->keys[i];
            i--;
        }
        if (i >= 0) metrics.comparisons++;
        x->keys[i + 1] = k;
    } else {
        while (i >= 0 && x->keys[i] > k) {
            metrics.comparisons++;
            i--;
        }
        if (i >= 0) metrics.comparisons++;
        i++;

        if (x->children[i]->keys.size() == 2 * t - 1) {
            splitChild(x, i, x->children[i]);
            if (x->keys[i] < k) {
                metrics.comparisons++;
                i++;
            }
        }
        insertNonFull(x->children[i], k);
    }
}

void BTree::splitChild(BTreeNode* x, int i, BTreeNode* y) {
    metrics.splits++;
    BTreeNode* z = new BTreeNode(t, y->leaf);
    nodeCount++;
    for (int j = 0; j < t - 1; j++) {
        z->keys.push_back(y->keys[j + t]);
    }

    if (!y->leaf) {
        for (int j = 0; j < t; j++) {
            z->children.push_back(y->children[j + t]);
        }
    }

    int medianKey = y->keys[t - 1];

    y->keys.resize(t - 1);
    // Explicitly shrink to fit so vector doesn't hold dead pointers over time
    y->keys.shrink_to_fit();
    y->keys.reserve(2 * t - 1);

    if (!y->leaf) {
        y->children.resize(t);
        y->children.shrink_to_fit();
        y->children.reserve(2 * t);
    }

    x->children.insert(x->children.begin() + i + 1, z);
    x->keys.insert(x->keys.begin() + i, medianKey);
}

bool BTree::search(int key) {
    if (root == nullptr) return false;
    return searchNode(root, key);
}

bool BTree::searchNode(BTreeNode* x, int k) {
    int i = 0;
    while (i < x->keys.size() && k > x->keys[i]) {
        metrics.comparisons++;
        i++;
    }

    if (i < x->keys.size()) {
        metrics.comparisons++; // for the equality check
        if (x->keys[i] == k) {
            return true;
        }
    }

    if (x->leaf) {
        return false;
    }

    return searchNode(x->children[i], k);
}

void BTree::inOrderHelper(BTreeNode* node, std::vector<int>& result) {
    if (!node) return;
    int i;
    for (i = 0; i < node->keys.size(); i++) {
        if (!node->leaf) {
            inOrderHelper(node->children[i], result);
        }
        result.push_back(node->keys[i]);
    }
    if (!node->leaf) {
        inOrderHelper(node->children[i], result);
    }
}

std::vector<int> BTree::inOrderTraversal() {
    std::vector<int> result;
    inOrderHelper(root, result);
    return result;
}

void BTree::preOrderHelper(BTreeNode* node, std::vector<int>& result) {
    if (!node) return;
    int i;
    for (i = 0; i < node->keys.size(); i++) {
        result.push_back(node->keys[i]);
        if (!node->leaf) {
            preOrderHelper(node->children[i], result);
        }
    }
    if (!node->leaf) {
        preOrderHelper(node->children[i], result);
    }
}

std::vector<int> BTree::preOrderTraversal() {
    std::vector<int> result;
    preOrderHelper(root, result);
    return result;
}

void BTree::rangeQueryHelper(BTreeNode* node, int start, int end, std::vector<int>& result) {
    if (!node) return;

    int i = 0;
    while (i < node->keys.size() && start > node->keys[i]) {
        metrics.comparisons++;
        i++;
    }

    for (; i < node->keys.size() && node->keys[i] <= end; i++) {
        metrics.comparisons++;
        if (!node->leaf) {
            rangeQueryHelper(node->children[i], start, end, result);
        }
        result.push_back(node->keys[i]);
    }
    
    metrics.comparisons++; 
    if (!node->leaf && (i == node->keys.size() || start <= node->keys[i])) {
        rangeQueryHelper(node->children[i], start, end, result);
    }
}

std::vector<int> BTree::rangeQuery(int start, int end) {
    std::vector<int> result;
    rangeQueryHelper(root, start, end, result);
    return result;
}

void BTree::remove(int key) {
    if (!root) return;

    removeNode(root, key);

    if (root->keys.empty()) {
        BTreeNode* tmp = root;
        if (root->leaf) {
            root = nullptr;
        } else {
            root = root->children[0];
            tmp->children.clear();
        }
        delete tmp;
        nodeCount--;
    }
}

void BTree::removeNode(BTreeNode* x, int k) {
    int idx = 0;
    while (idx < x->keys.size() && x->keys[idx] < k) {
        metrics.comparisons++;
        ++idx;
    }

    metrics.comparisons++;
    if (idx < x->keys.size() && x->keys[idx] == k) {
        if (x->leaf) {
            removeFromLeaf(x, idx);
        } else {
            removeFromNonLeaf(x, idx);
        }
    } else {
        if (x->leaf) {
            return; // Not found
        }

        bool flag = ((idx == x->keys.size()) ? true : false);

        if (x->children[idx]->keys.size() < t) {
            fill(x, idx);
        }

        if (flag && idx > x->keys.size()) {
            removeNode(x->children[idx - 1], k);
        } else {
            removeNode(x->children[idx], k);
        }
    }
}

void BTree::removeFromLeaf(BTreeNode* x, int idx) {
    x->keys.erase(x->keys.begin() + idx);
}

void BTree::removeFromNonLeaf(BTreeNode* x, int idx) {
    int k = x->keys[idx];

    if (x->children[idx]->keys.size() >= t) {
        int pred = getPred(x, idx);
        x->keys[idx] = pred;
        removeNode(x->children[idx], pred);
    } else if (x->children[idx + 1]->keys.size() >= t) {
        int succ = getSucc(x, idx);
        x->keys[idx] = succ;
        removeNode(x->children[idx + 1], succ);
    } else {
        merge(x, idx);
        removeNode(x->children[idx], k);
    }
}

int BTree::getPred(BTreeNode* x, int idx) {
    BTreeNode* cur = x->children[idx];
    while (!cur->leaf) {
        cur = cur->children[cur->keys.size()];
    }
    return cur->keys.back();
}

int BTree::getSucc(BTreeNode* x, int idx) {
    BTreeNode* cur = x->children[idx + 1];
    while (!cur->leaf) {
        cur = cur->children[0];
    }
    return cur->keys.front();
}

void BTree::fill(BTreeNode* x, int idx) {
    if (idx != 0 && x->children[idx - 1]->keys.size() >= t) {
        borrowFromPrev(x, idx);
    } else if (idx != x->keys.size() && x->children[idx + 1]->keys.size() >= t) {
        borrowFromNext(x, idx);
    } else {
        if (idx != x->keys.size()) {
            merge(x, idx);
        } else {
            merge(x, idx - 1);
        }
    }
}

void BTree::borrowFromPrev(BTreeNode* x, int idx) {
    BTreeNode* child = x->children[idx];
    BTreeNode* sibling = x->children[idx - 1];

    child->keys.insert(child->keys.begin(), x->keys[idx - 1]);
    if (!child->leaf) {
        child->children.insert(child->children.begin(), sibling->children.back());
        sibling->children.pop_back();
    }
    x->keys[idx - 1] = sibling->keys.back();
    sibling->keys.pop_back();
}

void BTree::borrowFromNext(BTreeNode* x, int idx) {
    BTreeNode* child = x->children[idx];
    BTreeNode* sibling = x->children[idx + 1];

    child->keys.push_back(x->keys[idx]);
    if (!child->leaf) {
        child->children.push_back(sibling->children.front());
        sibling->children.erase(sibling->children.begin());
    }
    x->keys[idx] = sibling->keys.front();
    sibling->keys.erase(sibling->keys.begin());
}

void BTree::merge(BTreeNode* x, int idx) {
    BTreeNode* child = x->children[idx];
    BTreeNode* sibling = x->children[idx + 1];

    child->keys.push_back(x->keys[idx]);
    for (int i = 0; i < sibling->keys.size(); ++i) {
        child->keys.push_back(sibling->keys[i]);
    }
    if (!child->leaf) {
        for (int i = 0; i < sibling->children.size(); ++i) {
            child->children.push_back(sibling->children[i]);
        }
    }

    x->keys.erase(x->keys.begin() + idx);
    x->children.erase(x->children.begin() + idx + 1);

    sibling->children.clear();
    delete sibling;
    nodeCount--;
}

int BTree::getHeightHelper(BTreeNode* node) const {
    if (!node) return 0;
    if (node->leaf) return 1;
    return 1 + getHeightHelper(node->children[0]);
}

void BTree::updateHeightAndMemory() {
    metrics.maxHeight = getHeightHelper(root);
    
    // Exact structural memory calculation
    // A BTreeNode has a bool (leaf), an int (t), and two vectors.
    // The vector capacities exactly dictate heap allocated bytes.
    size_t mem = nodeCount * sizeof(BTreeNode);
    
    // We assume an average BTree node holds 't' keys and 't+1' children (this is bounded by capacity resizing)
    // std::vector<int> capacity logic varies, but for tight vectors its usually capacity * sizeof(T)
    size_t avgKeysCap = (2 * t - 1); // Max capacity needed
    size_t avgChildCap = (2 * t);
    
    mem += nodeCount * (avgKeysCap * sizeof(int) + avgChildCap * sizeof(void*));
    metrics.memoryBytes = mem;
}

void BTree_toJsonHelper(BTreeNode* node, nlohmann::json& nodes, nlohmann::json& edges, int& counter, int parentId = -1) {
    if (!node) return;
    int currentId = counter++;
    
    // Group keys as CSV or an array. D3 is easier with a single label
    std::string keysStr = "";
    for(size_t i=0; i<node->keys.size(); ++i) {
        keysStr += std::to_string(node->keys[i]);
        if(i < node->keys.size()-1) keysStr += ", ";
    }
    
    nodes.push_back({{"id", currentId}, {"key", keysStr}, {"leaf", node->leaf}});
    if (parentId != -1) {
        edges.push_back({{"source", parentId}, {"target", currentId}});
    }
    
    if(!node->leaf) {
        for(size_t i=0; i<node->children.size(); ++i) {
            BTree_toJsonHelper(node->children[i], nodes, edges, counter, currentId);
        }
    }
}

nlohmann::json BTree::toJson() {
    nlohmann::json result;
    nlohmann::json nodes = nlohmann::json::array();
    nlohmann::json edges = nlohmann::json::array();
    int counter = 0;
    BTree_toJsonHelper(root, nodes, edges, counter, -1);
    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}
