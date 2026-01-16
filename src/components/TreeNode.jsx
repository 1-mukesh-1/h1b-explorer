import React from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

export const TreeNode = ({ 
  node, 
  isActive, 
  isLeaf, 
  canAdd, 
  onClick, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  const truncatedPrompt = node.prompt.length > 40 
    ? node.prompt.substring(0, 40) + '...' 
    : node.prompt;

  const getBorderClass = () => {
    if (node.error) return 'border-red-500 bg-red-900/20';
    if (node.isStale) return 'border-yellow-500 bg-yellow-900/20';
    if (isActive) return 'border-blue-500 bg-blue-900/30';
    return 'border-gray-700 bg-gray-800';
  };

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={onClick}
        className={`relative px-3 py-2 rounded-lg border-2 cursor-pointer min-w-48 max-w-64 transition-all hover:scale-105 ${getBorderClass()}`}
        title={node.prompt}
      >
        {(node.isStale || node.error) && (
          <AlertTriangle className={`absolute -top-2 -right-2 w-4 h-4 ${node.error ? 'text-red-500' : 'text-yellow-500'}`} />
        )}
        
        <p className="text-sm text-gray-200 truncate">{truncatedPrompt}</p>
        
        <div className="flex gap-1 mt-2 justify-end">
          {canAdd.allowed && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-blue-400"
              title="Add child filter"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400"
            title="Edit filter"
          >
            <Pencil className="w-3 h-3" />
          </button>
          {isLeaf && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400"
              title="Delete filter"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
