import React from 'react';
import { Database } from 'lucide-react';

export const Header = ({ stats }) => {
  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold">H-1B Explorer</h1>
          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
            {stats.total.toLocaleString()} records
          </span>
        </div>
      </header>

      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Total:</span>{' '}
            <span className="font-mono text-blue-400">{stats.total.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Certified:</span>{' '}
            <span className="font-mono text-green-400">{stats.certified.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Avg Salary:</span>{' '}
            <span className="font-mono text-yellow-400">${stats.avgSalary.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">New Employment:</span>{' '}
            <span className="font-mono text-purple-400">{stats.newHires.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
};
