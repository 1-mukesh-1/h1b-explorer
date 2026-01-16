import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';

const DEFAULT_QUERY = `-- Top 20 employers by total workers
SELECT 
  EMPLOYER_NAME,
  COUNT(*) as total_lcas,
  SUM(NEW_EMPLOYMENT) as new_employment_workers,
  ROUND(AVG(WAGE_RATE_OF_PAY_FROM), 0) as avg_salary
FROM h1b
WHERE CASE_STATUS = 'Certified'
GROUP BY EMPLOYER_NAME
ORDER BY total_lcas DESC
LIMIT 20`;

export const SqlEditor = ({ executeQuery }) => {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runQuery = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await executeQuery(query);
    if (err) {
      setError(err);
      setResult(null);
    } else {
      setResult(data);
    }
    setIsLoading(false);
  };

  const columns = result?.[0] ? Object.keys(result[0]) : [];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">SQL Query (table: h1b)</span>
          <button
            onClick={runQuery}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </button>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-40 px-3 py-2 text-sm font-mono bg-gray-900 border border-gray-700 rounded resize-none focus:border-blue-500 focus:outline-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {result && (
        <div className="flex-1 overflow-auto border border-gray-700 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.map((row, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-900/50">
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2">
                      {typeof row[col] === 'number' 
                        ? row[col].toLocaleString() 
                        : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 text-xs text-gray-500 border-t border-gray-700">
            {result.length} rows
          </div>
        </div>
      )}
    </div>
  );
};
