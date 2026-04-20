#include "RedBlackTree.h"
#include <algorithm>
#include <iostream>

RedBlackTree::RedBlackTree() : nodeCount(0) {
    TNULL = new RBTNode(0);
    TNULL->color = BLACK;
    TNULL->left = nullptr;
    TNULL->right = nullptr;
    root = TNULL;
}

RedBlackTree::~RedBlackTree() {
    clear(root);
    delete TNULL;
}

void RedBlackTree::clear(RBTNode* node) {
    if (node != TNULL) {
        clear(node->left);
        clear(node->right);
        delete node;
    }
}

void RedBlackTree::initializeNULLNode(RBTNode* node, RBTNode* parent) {
    node->key = 0;
    node->parent = parent;
    node->left = nullptr;
    node->right = nullptr;
    node->color = BLACK;
}

void RedBlackTree::preOrderHelper(RBTNode* node, std::vector<int>& result) {
    if (node != TNULL) {
        result.push_back(node->key);
        preOrderHelper(node->left, result);
        preOrderHelper(node->right, result);
    }
}

std::vector<int> RedBlackTree::preOrderTraversal() {
    std::vector<int> result;
    if(root != TNULL) result.reserve(nodeCount);
    preOrderHelper(root, result);
    return result;
}

void RedBlackTree::inOrderHelper(RBTNode* node, std::vector<int>& result) {
    if (node != TNULL) {
        inOrderHelper(node->left, result);
        result.push_back(node->key);
        inOrderHelper(node->right, result);
    }
}

std::vector<int> RedBlackTree::inOrderTraversal() {
    std::vector<int> result;
    if(root != TNULL) result.reserve(nodeCount);
    inOrderHelper(root, result);
    return result;
}

RBTNode* RedBlackTree::searchTreeHelper(RBTNode* node, int key) {
    if (node == TNULL) {
        return TNULL;
    }
    metrics.comparisons++;
    if (key == node->key) {
        return node;
    }

    metrics.comparisons++;
    if (key < node->key) {
        return searchTreeHelper(node->left, key);
    }
    return searchTreeHelper(node->right, key);
}

bool RedBlackTree::search(int key) {
    return searchTreeHelper(root, key) != TNULL;
}

RBTNode* RedBlackTree::minimum(RBTNode* node) {
    while (node->left != TNULL) {
        node = node->left;
    }
    return node;
}

RBTNode* RedBlackTree::maximum(RBTNode* node) {
    while (node->right != TNULL) {
        node = node->right;
    }
    return node;
}

void RedBlackTree::leftRotate(RBTNode* x) {
    metrics.singleRotations++;
    RBTNode* y = x->right;
    x->right = y->left;
    if (y->left != TNULL) {
        y->left->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        this->root = y;
    } else if (x == x->parent->left) {
        x->parent->left = y;
    } else {
        x->parent->right = y;
    }
    y->left = x;
    x->parent = y;
}

void RedBlackTree::rightRotate(RBTNode* x) {
    metrics.singleRotations++;
    RBTNode* y = x->left;
    x->left = y->right;
    if (y->right != TNULL) {
        y->right->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        this->root = y;
    } else if (x == x->parent->right) {
        x->parent->right = y;
    } else {
        x->parent->left = y;
    }
    y->right = x;
    x->parent = y;
}

void RedBlackTree::insertFix(RBTNode* k) {
    RBTNode* u;
    while (k->parent != nullptr && k->parent->color == RED) {
        if (k->parent == k->parent->parent->right) {
            u = k->parent->parent->left; 
            if (u != TNULL && u->color == RED) {
                metrics.recolorings += 3;
                u->color = BLACK;
                k->parent->color = BLACK;
                k->parent->parent->color = RED;
                k = k->parent->parent;
            } else {
                if (k == k->parent->left) {
                    k = k->parent;
                    rightRotate(k);
                }
                metrics.recolorings += 2;
                k->parent->color = BLACK;
                k->parent->parent->color = RED;
                leftRotate(k->parent->parent);
            }
        } else {
            u = k->parent->parent->right; 
            if (u != TNULL && u->color == RED) {
                metrics.recolorings += 3;
                u->color = BLACK;
                k->parent->color = BLACK;
                k->parent->parent->color = RED;
                k = k->parent->parent;
            } else {
                if (k == k->parent->right) {
                    k = k->parent;
                    leftRotate(k);
                }
                metrics.recolorings += 2;
                k->parent->color = BLACK;
                k->parent->parent->color = RED;
                rightRotate(k->parent->parent);
            }
        }
        if (k == root) {
            break;
        }
    }
    if (root->color == RED) {
        metrics.recolorings++;
        root->color = BLACK;
    }
}

void RedBlackTree::insert(int key) {
    RBTNode* node = new RBTNode(key);
    node->parent = nullptr;
    node->left = TNULL;
    node->right = TNULL;
    node->color = RED; 
    nodeCount++;

    RBTNode* y = nullptr;
    RBTNode* x = this->root;

    while (x != TNULL) {
        y = x;
        metrics.comparisons++;
        if (node->key < x->key) {
            x = x->left;
        } else if (node->key > x->key) {
            metrics.comparisons++;
            x = x->right;
        } else {
            metrics.comparisons++;
            delete node;
            nodeCount--;
            return;
        }
    }

    node->parent = y;
    if (y == nullptr) {
        root = node;
    } else if (node->key < y->key) {
        y->left = node;
    } else {
        y->right = node;
    }

    if (node->parent == nullptr) {
        node->color = BLACK;
        metrics.recolorings++;
        return;
    }

    if (node->parent->parent == nullptr) {
        return;
    }

    insertFix(node);
}

void RedBlackTree::rbTransplant(RBTNode* u, RBTNode* v) {
    if (u->parent == nullptr) {
        root = v;
    } else if (u == u->parent->left) {
        u->parent->left = v;
    } else {
        u->parent->right = v;
    }
    v->parent = u->parent;
}

void RedBlackTree::deleteFix(RBTNode* x) {
    RBTNode* s;
    while (x != root && x->color == BLACK) {
        if (x == x->parent->left) {
            s = x->parent->right;
            if (s->color == RED) {
                metrics.recolorings += 2;
                s->color = BLACK;
                x->parent->color = RED;
                leftRotate(x->parent);
                s = x->parent->right;
            }

            if (s->left->color == BLACK && s->right->color == BLACK) {
                metrics.recolorings++;
                s->color = RED;
                x = x->parent;
            } else {
                if (s->right->color == BLACK) {
                    metrics.recolorings += 2;
                    s->left->color = BLACK;
                    s->color = RED;
                    rightRotate(s);
                    s = x->parent->right;
                }
                metrics.recolorings += 3;
                s->color = x->parent->color;
                x->parent->color = BLACK;
                s->right->color = BLACK;
                leftRotate(x->parent);
                x = root;
            }
        } else {
            s = x->parent->left;
            if (s->color == RED) {
                metrics.recolorings += 2;
                s->color = BLACK;
                x->parent->color = RED;
                rightRotate(x->parent);
                s = x->parent->left;
            }

            if (s->right->color == BLACK && s->left->color == BLACK) {
                metrics.recolorings++;
                s->color = RED;
                x = x->parent;
            } else {
                if (s->left->color == BLACK) {
                    metrics.recolorings += 2;
                    s->right->color = BLACK;
                    s->color = RED;
                    leftRotate(s);
                    s = x->parent->left;
                }
                metrics.recolorings += 3;
                s->color = x->parent->color;
                x->parent->color = BLACK;
                s->left->color = BLACK;
                rightRotate(x->parent);
                x = root;
            }
        }
    }
    if (x->color != BLACK) {
        metrics.recolorings++;
        x->color = BLACK;
    }
}

void RedBlackTree::deleteNodeHelper(RBTNode* node, int key) {
    RBTNode* z = TNULL;
    RBTNode* x;
    RBTNode* y;
    while (node != TNULL) {
        metrics.comparisons++;
        if (node->key == key) {
            z = node;
            break;
        }

        metrics.comparisons++;
        if (node->key <= key) {
            node = node->right;
        } else {
            node = node->left;
        }
    }

    if (z == TNULL) {
        return;
    }

    y = z;
    int y_original_color = y->color;
    if (z->left == TNULL) {
        x = z->right;
        rbTransplant(z, z->right);
    } else if (z->right == TNULL) {
        x = z->left;
        rbTransplant(z, z->left);
    } else {
        y = minimum(z->right);
        y_original_color = y->color;
        x = y->right;
        if (y->parent == z) {
            x->parent = y;
        } else {
            rbTransplant(y, y->right);
            y->right = z->right;
            y->right->parent = y;
        }

        rbTransplant(z, y);
        y->left = z->left;
        y->left->parent = y;
        y->color = z->color;
    }
    delete z;
    nodeCount--;
    if (y_original_color == BLACK) {
        deleteFix(x);
    }
}

void RedBlackTree::remove(int key) {
    deleteNodeHelper(this->root, key);
}

int RedBlackTree::getHeightHelper(RBTNode* node) {
    if (node == TNULL) {
        return 0;
    }
    return 1 + std::max(getHeightHelper(node->left), getHeightHelper(node->right));
}

void RedBlackTree::rangeQueryHelper(RBTNode* node, int start, int end, std::vector<int>& result) {
    if (node == TNULL) {
        return;
    }

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

std::vector<int> RedBlackTree::rangeQuery(int start, int end) {
    std::vector<int> result;
    rangeQueryHelper(root, start, end, result);
    return result;
}

void RedBlackTree::updateHeightAndMemory() {
    metrics.maxHeight = getHeightHelper(root);
    metrics.memoryBytes = nodeCount * sizeof(RBTNode);
}

void RBTree_toJsonHelper(RBTNode* node, RBTNode* TNULL, nlohmann::json& nodes, nlohmann::json& edges, int& counter, int parentId = -1) {
    if (node == TNULL || !node) return;
    int currentId = counter++;
    std::string colorStr = (node->color == RED) ? "red" : "black";
    nodes.push_back({{"id", currentId}, {"key", node->key}, {"color", colorStr}});
    if (parentId != -1) {
        edges.push_back({{"source", parentId}, {"target", currentId}});
    }
    RBTree_toJsonHelper(node->left, TNULL, nodes, edges, counter, currentId);
    RBTree_toJsonHelper(node->right, TNULL, nodes, edges, counter, currentId);
}

nlohmann::json RedBlackTree::toJson() {
    nlohmann::json result;
    nlohmann::json nodes = nlohmann::json::array();
    nlohmann::json edges = nlohmann::json::array();
    int counter = 0;
    RBTree_toJsonHelper(root, TNULL, nodes, edges, counter, -1);
    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}
