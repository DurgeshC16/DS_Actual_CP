#include <gtest/gtest.h>
#include <vector>
#include <algorithm>
#include <random>

#define private public
#define protected public

#include "AVLTree.h"
#include "RedBlackTree.h"
#include "BTree.h"
#include "BPlusTree.h"

// Helper to generate random data
std::vector<int> generateRandomData(int size, int seed = 42) {
    std::mt19937 gen(seed);
    std::uniform_int_distribution<int> dist(1, size * 10);
    std::vector<int> data(size);
    for(int i=0; i<size; ++i) data[i] = dist(gen);
    return data;
}

// ---------------- AVL Tree Tests ----------------

bool isAVLBalanced(AVLNode* node) {
    if (!node) return true;
    int leftH = node->left ? node->left->height : 0;
    int rightH = node->right ? node->right->height : 0;
    if (std::abs(leftH - rightH) > 1) return false;
    return isAVLBalanced(node->left) && isAVLBalanced(node->right);
}

TEST(AVLTreeTest, InsertAndBalance) {
    AVLTree tree;
    auto data = generateRandomData(100);
    for (int key : data) {
        tree.insert(key);
        EXPECT_TRUE(isAVLBalanced(tree.root));
    }
}

TEST(AVLTreeTest, InOrderSorted) {
    AVLTree tree;
    auto data = generateRandomData(100);
    for (int key : data) tree.insert(key);
    auto inOrder = tree.inOrderTraversal();
    EXPECT_TRUE(std::is_sorted(inOrder.begin(), inOrder.end()));
}

TEST(AVLTreeTest, DeleteAndBalance) {
    AVLTree tree;
    auto data = generateRandomData(100);
    for (int key : data) tree.insert(key);
    for (int i = 0; i < 50; i++) {
        tree.remove(data[i]);
        EXPECT_TRUE(isAVLBalanced(tree.root));
    }
}

// ---------------- Red-Black Tree Tests ----------------

int countBlackNodes(RBTNode* node, RBTNode* TNULL) {
    if (node == TNULL) return 1;
    int leftB = countBlackNodes(node->left, TNULL);
    int rightB = countBlackNodes(node->right, TNULL);
    if (leftB != rightB || leftB == -1) return -1;
    return leftB + (node->color == BLACK ? 1 : 0);
}

bool noConsecutiveReds(RBTNode* node, RBTNode* TNULL) {
    if (node == TNULL) return true;
    if (node->color == RED) {
        if (node->left->color == RED || node->right->color == RED) return false;
    }
    return noConsecutiveReds(node->left, TNULL) && noConsecutiveReds(node->right, TNULL);
}

TEST(RedBlackTreeTest, Invariants) {
    RedBlackTree tree;
    auto data = generateRandomData(100);
    for (int key : data) {
        tree.insert(key);
        EXPECT_EQ(tree.root->color, BLACK);
        EXPECT_TRUE(noConsecutiveReds(tree.root, tree.TNULL));
        EXPECT_NE(countBlackNodes(tree.root, tree.TNULL), -1);
    }
}

TEST(RedBlackTreeTest, InOrderSorted) {
    RedBlackTree tree;
    auto data = generateRandomData(100);
    for (int key : data) tree.insert(key);
    auto inOrder = tree.inOrderTraversal();
    EXPECT_TRUE(std::is_sorted(inOrder.begin(), inOrder.end()));
}

// ---------------- B-Tree Tests ----------------

bool checkBTreeInvariants(BTreeNode* node, int t, bool isRoot) {
    if (!node) return true;
    if (!isRoot && node->keys.size() < t - 1) return false;
    if (node->keys.size() > 2 * t - 1) return false;
    
    if (!node->leaf) {
        if (node->children.size() != node->keys.size() + 1) return false;
        for (auto child : node->children) {
            if (!checkBTreeInvariants(child, t, false)) return false;
        }
    }
    return true;
}

int getBTreeDepth(BTreeNode* node) {
    if (!node) return 0;
    if (node->leaf) return 1;
    int depth = getBTreeDepth(node->children[0]);
    for (size_t i = 1; i < node->children.size(); i++) {
        if (getBTreeDepth(node->children[i]) != depth) return -1;
    }
    return depth + 1;
}

TEST(BTreeTest, Invariants) {
    BTree tree(3);
    auto data = generateRandomData(100);
    for (int key : data) {
        tree.insert(key);
        EXPECT_TRUE(checkBTreeInvariants(tree.root, 3, true));
        EXPECT_NE(getBTreeDepth(tree.root), -1);
    }
}

TEST(BTreeTest, InOrderSorted) {
    BTree tree(3);
    auto data = generateRandomData(100);
    for (int key : data) tree.insert(key);
    auto inOrder = tree.inOrderTraversal();
    EXPECT_TRUE(std::is_sorted(inOrder.begin(), inOrder.end()));
}

// ---------------- B+ Tree Tests ----------------

bool checkBPlusTreeLeavesLinked(BPlusTreeNode* root) {
    if (!root) return true;
    BPlusTreeNode* curr = root;
    while (!curr->leaf) {
        curr = curr->children[0];
    }
    int lastVal = -1;
    while(curr) {
        for(int k : curr->keys) {
            if (k < lastVal) return false;
            lastVal = k;
        }
        curr = curr->next;
    }
    return true;
}

bool checkBPlusTreeDataInLeavesOnly(BPlusTreeNode* node) {
    if (!node) return true;
    if (node->leaf) return true;
    for (auto child : node->children) {
        if (!checkBPlusTreeDataInLeavesOnly(child)) return false;
    }
    return true;
}

TEST(BPlusTreeTest, LeavesLinkedAndSorted) {
    BPlusTree tree(4);
    auto data = generateRandomData(100);
    for (int key : data) {
        tree.insert(key);
    }
    EXPECT_TRUE(checkBPlusTreeLeavesLinked(tree.root));
    EXPECT_TRUE(checkBPlusTreeDataInLeavesOnly(tree.root));
}

TEST(BPlusTreeTest, InOrderSorted) {
    BPlusTree tree(4);
    auto data = generateRandomData(100);
    for (int key : data) tree.insert(key);
    auto inOrder = tree.inOrderTraversal();
    EXPECT_TRUE(std::is_sorted(inOrder.begin(), inOrder.end()));
}
