import { useState, useCallback, useEffect } from 'react';
import { saveTree, loadTree } from '../services/storageService';
import { schemasEqual } from '../services/schemaUtils';
import { MAX_TREE_DEPTH, MAX_TOTAL_NODES, BASE_SCHEMA } from '../utils/constants';

const createEmptyTree = () => ({ nodes: {}, activeId: null });

const generateId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const useTree = () => {
  const [tree, setTree] = useState(createEmptyTree);
  const [aiMode, setAiMode] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    const saved = loadTree();
    if (saved) {
      setTree(saved);
      setAiMode(Object.keys(saved.nodes).length > 0);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    saveTree(tree);
  }, [tree]);

  const getNodeDepth = useCallback((nodeId) => {
    let depth = 0;
    let current = tree.nodes[nodeId];
    while (current?.parentId) {
      depth++;
      current = tree.nodes[current.parentId];
    }
    return depth;
  }, [tree.nodes]);

  const getTotalNodes = useCallback(() => Object.keys(tree.nodes).length, [tree.nodes]);

  const canAddNode = useCallback((parentId) => {
    if (getTotalNodes() >= MAX_TOTAL_NODES) return { allowed: false, reason: `Max ${MAX_TOTAL_NODES} nodes` };
    const depth = parentId ? getNodeDepth(parentId) + 1 : 0;
    if (depth >= MAX_TREE_DEPTH) return { allowed: false, reason: `Max depth ${MAX_TREE_DEPTH}` };
    return { allowed: true };
  }, [getTotalNodes, getNodeDepth]);

  const addNode = useCallback((parentId, prompt, sql, schema) => {
    const id = generateId();
    setTree(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { id, parentId, prompt, sql, schema, isStale: false, error: null },
      },
      activeId: id,
    }));
    return id;
  }, []);

  const updateNode = useCallback((nodeId, prompt, sql, newSchema) => {
    setTree(prev => {
      const node = prev.nodes[nodeId];
      if (!node) return prev;

      const schemaChanged = !schemasEqual(node.schema, newSchema);
      const updated = { ...prev.nodes };
      updated[nodeId] = { ...node, prompt, sql, schema: newSchema, error: null };

      // Mark descendants stale if schema changed
      if (schemaChanged) {
        const markStale = (id) => {
          Object.values(updated).forEach(n => {
            if (n.parentId === id) {
              updated[n.id] = { ...updated[n.id], isStale: true };
              markStale(n.id);
            }
          });
        };
        markStale(nodeId);
      }

      return { ...prev, nodes: updated };
    });
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setTree(prev => {
      const node = prev.nodes[nodeId];
      if (!node) return prev;

      const children = Object.values(prev.nodes).filter(n => n.parentId === nodeId);
      if (children.length > 0) return prev; // Can't delete non-leaf

      const updated = { ...prev.nodes };
      delete updated[nodeId];

      return { ...prev, nodes: updated, activeId: node.parentId };
    });
  }, []);

  const setActiveNode = useCallback((nodeId) => {
    setTree(prev => ({ ...prev, activeId: nodeId }));
  }, []);

  const setNodeError = useCallback((nodeId, error) => {
    setTree(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], error },
      },
    }));
  }, []);

  const clearNodeStale = useCallback((nodeId) => {
    setTree(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], isStale: false },
      },
    }));
  }, []);

  const getParentSchema = useCallback((parentId) => {
    if (!parentId) return BASE_SCHEMA;
    return tree.nodes[parentId]?.schema || BASE_SCHEMA;
  }, [tree.nodes]);

  const isLeaf = useCallback((nodeId) => {
    return !Object.values(tree.nodes).some(n => n.parentId === nodeId);
  }, [tree.nodes]);

  const getChildren = useCallback((parentId) => {
    return Object.values(tree.nodes).filter(n => n.parentId === parentId);
  }, [tree.nodes]);

  const hasDescendants = useCallback((nodeId) => {
    const check = (id) => {
      const children = Object.values(tree.nodes).filter(n => n.parentId === id);
      return children.length > 0;
    };
    return check(nodeId);
  }, [tree.nodes]);

  const resetTree = useCallback(() => {
    setTree(createEmptyTree());
    setAiMode(false);
  }, []);

  return {
    tree,
    aiMode,
    setAiMode,
    addNode,
    updateNode,
    deleteNode,
    setActiveNode,
    setNodeError,
    clearNodeStale,
    canAddNode,
    getParentSchema,
    isLeaf,
    getChildren,
    hasDescendants,
    resetTree,
  };
};
