// Abstract query service - swap adapter for backend implementation
import { runQuery as duckdbQuery, initDuckDB, getStats as duckdbStats, getUniqueValues as duckdbUnique } from '../adapters/duckdbAdapter';

// Current adapter - change this for backend
const adapter = {
  init: initDuckDB,
  query: duckdbQuery,
  stats: duckdbStats,
  unique: duckdbUnique,
};

export const initDatabase = async (onProgress) => {
  return adapter.init(onProgress);
};

export const runQuery = async (sql) => {
  return adapter.query(sql);
};

export const getStats = async () => {
  return adapter.stats();
};

export const getUniqueValues = async (column) => {
  return adapter.unique(column);
};

/**
 * Run query and check if results are empty
 * Returns { data, isEmpty, error }
 */
export const runQueryWithValidation = async (sql) => {
  try {
    const data = await runQuery(sql);
    return { data, isEmpty: data.length === 0, error: null };
  } catch (e) {
    return { data: null, isEmpty: true, error: e.message };
  }
};
