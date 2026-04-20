#include "AVLTree.h"
#include <algorithm>

AVLTree::AVLTree() : root(nullptr), nodeCount(0) {}

AVLTree::~AVLTree() {
    clear(root);
}

void AVLTree::clear(AVLNode* node) {
    if (node) {
        clear(node->left);
        clear(node->right);
        delete node;
    }
}

int AVLTree::getHeight(AVLNode* node) {
    if (!node) return 0;
    return node->height;
}

int AVLTree::getBalanceFactor(AVLNode* node) {
    if (!node) return 0;
    return getHeight(node->left) - getHeight(node->right);
}

void AVLTree::updateHeight(AVLNode* node) {
    if (node) {
        node->height = 1 + std::max(getHeight(node->left), getHeight(node->right));
    }
}

AVLNode* AVLTree::rightRotate(AVLNode* y) {
    AVLNode* x = y->left;
    AVLNode* T2 = x->right;

    x->right = y;
    y->left = T2;

    updateHeight(y);
    updateHeight(x);

    return x;
}

AVLNode* AVLTree::leftRotate(AVLNode* x) {
    AVLNode* y = x->right;
    AVLNode* T2 = y->left;

    y->left = x;
    x->right = T2;

    updateHeight(x);
    updateHeight(y);

    return y;
}

void AVLTree::insert(int key) {
    root = insertNode(root, key);
}

AVLNode* AVLTree::insertNode(AVLNode* node, int key) {
    if (!node) {
        nodeCount++;
        return new AVLNode(key);
    }

    metrics.comparisons++;
    if (key < node->key) {
        node->left = insertNode(node->left, key);
    } else if (key > node->key) {
        metrics.comparisons++;
        node->right = insertNode(node->right, key);
    } else {
        metrics.comparisons++;
        return node; 
    }

    updateHeight(node);

    int balance = getBalanceFactor(node);

    if (balance > 1 && key < node->left->key) {
        metrics.singleRotations++;
        return rightRotate(node);
    }

    if (balance < -1 && key > node->right->key) {
        metrics.singleRotations++;
        return leftRotate(node);
    }

    if (balance > 1 && key > node->left->key) {
        metrics.doubleRotations++;
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }

    if (balance < -1 && key < node->right->key) {
        metrics.doubleRotations++;
        node->right = rightRotate(node->right);
        return leftRotate(node);
    }

    return node;
}

AVLNode* AVLTree::minValueNode(AVLNode* node) {
    AVLNode* current = node;
    while (current->left != nullptr) {
        current = current->left;
    }
    return current;
}

void AVLTree::remove(int key) {
    root = removeNode(root, key);
}

AVLNode* AVLTree::removeNode(AVLNode* node, int key) {
    if (!node) return node;

    metrics.comparisons++;
    if (key < node->key) {
        node->left = removeNode(node->left, key);
    } else if (key > node->key) {
        metrics.comparisons++;
        node->right = removeNode(node->right, key);
    } else {
        metrics.comparisons++;
        if (!node->left || !node->right) {
            AVLNode* temp = node->left ? node->left : node->right;
            if (!temp) {
                temp = node;
                node = nullptr;
            } else {
                *node = *temp; 
            }
            delete temp;
            nodeCount--;
        } else {
            AVLNode* temp = minValueNode(node->right);
            node->key = temp->key;
            node->right = removeNode(node->right, temp->key);
        }
    }

    if (!node) return node;

    updateHeight(node);

    int balance = getBalanceFactor(node);

    if (balance > 1 && getBalanceFactor(node->left) >= 0) {
        metrics.singleRotations++;
        return rightRotate(node);
    }

    if (balance > 1 && getBalanceFactor(node->left) < 0) {
        metrics.doubleRotations++;
        node->left = leftRotate(node->left);
        return rightRotate(node);
    }

    if (balance < -1 && getBalanceFactor(node->right) <= 0) {
        metrics.singleRotations++;
        return leftRotate(node);
    }

    if (balance < -1 && getBalanceFactor(node->right) > 0) {
        metrics.doubleRotations++;
        node->right = rightRotate(node->right);
        return leftRotate(node);
    }

    return node;
}

bool AVLTree::search(int key) {
    AVLNode* current = root;
    while (current) {
        metrics.comparisons++;
        if (current->key == key) return true;
        
        metrics.comparisons++;
        if (key < current->key) current = current->left;
        else current = current->right;
    }
    return false;
}

void AVLTree::rangeQueryHelper(AVLNode* node, int start, int end, std::vector<int>& result) {
    if (!node) return;

    metrics.comparisons++;
    if (start < node->key) {
        rangeQueryHelper(node->left, start, end, result);
    }

    metrics.comparisons++;
    if (start <= node->key && end >= node->key) {
        result.push_back(node->key);
    }

    metrics.comparisons++;
    if (end > node->key) {
        rangeQueryHelper(node->right, start, end, result);
    }
}

std::vector<int> AVLTree::rangeQuery(int start, int end) {
    std::vector<int> result;
    rangeQueryHelper(root, start, end, result);
    return result;
}

void AVLTree::inOrderHelper(AVLNode* node, std::vector<int>& result) {
    if (!node) return;
    inOrderHelper(node->left, result);
    result.push_back(node->key);
    inOrderHelper(node->right, result);
}

std::vector<int> AVLTree::inOrderTraversal() {
    std::vector<int> result;
    if(root) result.reserve(nodeCount);
    inOrderHelper(root, result);
    return result;
}

void AVLTree::preOrderHelper(AVLNode* node, std::vector<int>& result) {
    if (!node) return;
    result.push_back(node->key);
    preOrderHelper(node->left, result);
    preOrderHelper(node->right, result);
}

std::vector<int> AVLTree::preOrderTraversal() {
    std::vector<int> result;
    if(root) result.reserve(nodeCount);
    preOrderHelper(root, result);
    return result;
}

void AVLTree::updateHeightAndMemory() {
    metrics.maxHeight = getHeight(root);
    metrics.memoryBytes = nodeCount * sizeof(AVLNode);
}

void AVLTree_toJsonHelper(AVLNode* node, nlohmann::json& nodes, nlohmann::json& edges, int& counter, int parentId = -1) {
    if (!node) return;
    int currentId = counter++;
    nodes.push_back({{"id", currentId}, {"key", node->key}, {"height", node->height}});
    if (parentId != -1) {
        edges.push_back({{"source", parentId}, {"target", currentId}});
    }
    AVLTree_toJsonHelper(node->left, nodes, edges, counter, currentId);
    AVLTree_toJsonHelper(node->right, nodes, edges, counter, currentId);
}

nlohmann::json AVLTree::toJson() {
    nlohmann::json result;
    nlohmann::json nodes = nlohmann::json::array();
    nlohmann::json edges = nlohmann::json::array();
    int counter = 0;
    AVLTree_toJsonHelper(root, nodes, edges, counter, -1);
    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}
