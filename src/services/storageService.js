import { STORAGE_KEYS } from '../utils/constants';

// Abstract storage interface - swap implementation for backend later

export const saveTree = (tree) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.TREE, JSON.stringify(tree));
    return true;
  } catch (e) {
    console.error('Failed to save tree:', e);
    return false;
  }
};

export const loadTree = () => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.TREE);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load tree:', e);
    return null;
  }
};

export const clearTree = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.TREE);
    return true;
  } catch (e) {
    console.error('Failed to clear tree:', e);
    return false;
  }
};

export const saveFilters = (filters) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
    return true;
  } catch (e) {
    console.error('Failed to save filters:', e);
    return false;
  }
};

export const loadFilters = () => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEYS.FILTERS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load filters:', e);
    return null;
  }
};
