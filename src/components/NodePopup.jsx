import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export const NodePopup = ({ 
  isOpen, 
  mode,
  initialPrompt = '',
  parentPrompt = null,
  isLoading,
  error,
  warning,
  onSubmit,
  onClose,
  onConfirmWarning,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const inputRef = useRef(null);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200">
            {mode === 'add' ? '✨ Add AI Filter' : '✏️ Edit Filter'}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {parentPrompt && (
          <div className="px-4 py-2 bg-gray-900/50 text-xs text-gray-400 border-b border-gray-700">
            <span className="text-gray-500">Building on:</span> {parentPrompt.length > 60 ? parentPrompt.substring(0, 60) + '...' : parentPrompt}
          </div>
        )}

        <div className="p-4">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your filter in plain English...

Examples:
• Show only certified cases
• Filter salaries above 150k
• Group by state and show average salary"
            className="w-full h-32 px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded resize-none focus:border-blue-500 focus:outline-none placeholder:text-gray-600"
            disabled={isLoading}
          />

          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {warning && (
            <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded text-sm text-yellow-400">
              <p className="mb-3">{warning}</p>
              <div className="flex gap-2">
                <button onClick={onConfirmWarning} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-sm font-medium">
                  Continue Anyway
                </button>
                <button onClick={onClose} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!warning && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  mode === 'add' ? 'Apply Filter' : 'Update Filter'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
