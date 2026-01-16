import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { COLUMN_CONFIG } from '../utils/constants';

export const DataTable = ({ data, columns, sortConfig, onSort }) => {
  const getColumnLabel = (col) => COLUMN_CONFIG[col]?.label || col;

  const formatCell = (col, value) => {
    const config = COLUMN_CONFIG[col];
    if (config?.format) return config.format(value);
    return String(value ?? '');
  };

  const getCellVariant = (col, value) => {
    const config = COLUMN_CONFIG[col];
    if (!config?.variant) return null;
    return config.variant(value);
  };

  const variantClasses = {
    success: 'bg-green-900/50 text-green-400',
    error: 'bg-red-900/50 text-red-400',
    info: 'bg-blue-900/50 text-blue-400',
    default: 'bg-gray-700 text-gray-400',
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        No data to display
      </div>
    );
  }

  const displayColumns = columns || Object.keys(data[0] || {});

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 sticky top-0">
          <tr>
            {displayColumns.map(col => (
              <th
                key={col}
                onClick={() => onSort?.(col)}
                className="px-3 py-2 text-left text-gray-400 font-medium cursor-pointer hover:bg-gray-800 select-none"
              >
                <div className="flex items-center gap-1">
                  {getColumnLabel(col)}
                  {sortConfig?.key === col && (
                    sortConfig.direction === 'asc' 
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-900/50">
              {displayColumns.map(col => {
                const variant = getCellVariant(col, row[col]);
                return (
                  <td key={col} className="px-3 py-2">
                    {variant ? (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${variantClasses[variant]}`}>
                        {formatCell(col, row[col])}
                      </span>
                    ) : (
                      formatCell(col, row[col])
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
