import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Sparkles, Plus, Trash2 } from 'lucide-react';
import { TreeNode } from './TreeNode';
import { NodePopup } from './NodePopup';

export const TreeView = ({
  tree,
  aiMode,
  onToggleAiMode,
  onNodeClick,
  onAddNode,
  onEditNode,
  onDeleteNode,
  canAddNode,
  isLeaf,
  getChildren,
  hasDescendants,
  isLoading,
  aiError,
  onResetTree,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [popup, setPopup] = useState({ open: false, mode: null, parentId: null, nodeId: null });
  const [warning, setWarning] = useState(null);

  const rootNodes = Object.values(tree.nodes).filter(n => !n.parentId);

  const handleAddClick = (parentId) => {
    setPopup({ open: true, mode: 'add', parentId, nodeId: null });
    setWarning(null);
  };

  const handleEditClick = (nodeId) => {
    const node = tree.nodes[nodeId];
    if (hasDescendants(nodeId)) {
      setWarning('This will affect all child filters. Schema changes may cause errors.');
    } else {
      setWarning(null);
    }
    setPopup({ open: true, mode: 'edit', parentId: node.parentId, nodeId });
  };

  const handleSubmit = (prompt) => {
    if (popup.mode === 'add') {
      onAddNode(popup.parentId, prompt);
    } else {
      onEditNode(popup.nodeId, prompt);
    }
  };

  const handleConfirmWarning = () => {
    setWarning(null);
  };

  const closePopup = () => {
    setPopup({ open: false, mode: null, parentId: null, nodeId: null });
    setWarning(null);
  };

  const renderNode = (node, level = 0) => {
    const children = getChildren(node.id);
    return (
      <div key={node.id} className="flex flex-col items-center">
        <div className="relative">
          {level > 0 && <div className="absolute top-0 left-1/2 w-px h-4 -mt-4 bg-gray-600" />}
          <TreeNode
            node={node}
            isActive={tree.activeId === node.id}
            isLeaf={isLeaf(node.id)}
            canAdd={canAddNode(node.id)}
            onClick={() => onNodeClick(node.id)}
            onAdd={() => handleAddClick(node.id)}
            onEdit={() => handleEditClick(node.id)}
            onDelete={() => onDeleteNode(node.id)}
          />
        </div>
        {children.length > 0 && (
          <div className="flex gap-4 mt-4 pt-4 relative">
            <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-600" />
            {children.length > 1 && (
              <div className="absolute top-4 left-0 right-0 h-px bg-gray-600" style={{ left: '25%', right: '25%' }} />
            )}
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`border-b border-gray-800 ${aiMode && Object.keys(tree.nodes).length > 0 ? 'bg-purple-900/10' : 'bg-gray-900/50'}`}>
      <button 
        onClick={() => aiMode ? setIsCollapsed(!isCollapsed) : onToggleAiMode(true)}
        className="w-full px-4 py-2 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span>AI Filters</span>
        {aiMode && Object.keys(tree.nodes).length > 0 && (
          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded ml-2">
            {Object.keys(tree.nodes).length} nodes
          </span>
        )}
        {aiMode && (isCollapsed ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronUp className="w-4 h-4 ml-auto" />)}
        {!aiMode && <span className="text-xs text-gray-500 ml-2">Click to enable</span>}
      </button>

      {aiMode && !isCollapsed && (
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => handleAddClick(null)} 
              disabled={!canAddNode(null).allowed}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded font-medium"
            >
              <Plus className="w-4 h-4" /> Add Root Filter
            </button>
            {Object.keys(tree.nodes).length > 0 && (
              <button onClick={onResetTree} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600/30 hover:bg-red-600 border border-red-600 rounded">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            )}
            <button onClick={() => onToggleAiMode(false)} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
              Exit AI Mode
            </button>
          </div>

          {rootNodes.length === 0 ? (
            <div className="text-center text-gray-500 py-8 border border-dashed border-gray-700 rounded-lg">
              No AI filters yet. Click "Add Root Filter" to start.
            </div>
          ) : (
            <div className="flex justify-center gap-8 py-4 min-h-24">
              {rootNodes.map(node => renderNode(node))}
            </div>
          )}
        </div>
      )}

      <NodePopup
        isOpen={popup.open}
        mode={popup.mode}
        initialPrompt={popup.nodeId ? tree.nodes[popup.nodeId]?.prompt : ''}
        parentPrompt={popup.parentId ? tree.nodes[popup.parentId]?.prompt : null}
        isLoading={isLoading}
        error={aiError}
        warning={warning}
        onSubmit={handleSubmit}
        onClose={closePopup}
        onConfirmWarning={handleConfirmWarning}
      />
    </div>
  );
};
