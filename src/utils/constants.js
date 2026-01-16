// Tree limits
export const MAX_TREE_DEPTH = 5;
export const MAX_TOTAL_NODES = 10;

// Pagination
export const DEFAULT_PAGE_SIZE = 100;

// Base table schema
export const BASE_TABLE = 'h1b';
export const BASE_SCHEMA = [
  { name: 'EMPLOYER_NAME', type: 'VARCHAR' },
  { name: 'JOB_TITLE', type: 'VARCHAR' },
  { name: 'WORKSITE_STATE', type: 'VARCHAR' },
  { name: 'WORKSITE_CITY', type: 'VARCHAR' },
  { name: 'WAGE_RATE_OF_PAY_FROM', type: 'DOUBLE' },
  { name: 'CASE_STATUS', type: 'VARCHAR' },
  { name: 'NEW_EMPLOYMENT', type: 'INTEGER' },
  { name: 'CONTINUED_EMPLOYMENT', type: 'INTEGER' },
  { name: 'TOTAL_WORKER_POSITIONS', type: 'INTEGER' },
];

// Display columns for base table
export const DEFAULT_DISPLAY_COLUMNS = [
  'EMPLOYER_NAME',
  'JOB_TITLE', 
  'WORKSITE_STATE',
  'WORKSITE_CITY',
  'WAGE_RATE_OF_PAY_FROM',
  'CASE_STATUS',
  'NEW_EMPLOYMENT',
  'TOTAL_WORKER_POSITIONS',
];

// Column formatting config
export const COLUMN_CONFIG = {
  WAGE_RATE_OF_PAY_FROM: {
    label: 'Salary',
    format: (v) => `$${Number(v).toLocaleString()}`,
  },
  CASE_STATUS: {
    label: 'Status',
    variant: (v) => v === 'Certified' ? 'success' : v === 'Denied' ? 'error' : 'default',
  },
  NEW_EMPLOYMENT: {
    label: 'New Emp',
    variant: (v) => Number(v) > 0 ? 'info' : 'default',
  },
};

// Storage keys
export const STORAGE_KEYS = {
  TREE: 'h1b_ai_tree',
  FILTERS: 'h1b_filters',
};

// Root node constant
export const ROOT_NODE_ID = '__ROOT__';
