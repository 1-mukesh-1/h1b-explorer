import { useState, useCallback } from 'react';

const defaultFilters = {
  employers: [],
  jobTitles: [],
  employerSearch: '',
  jobTitleSearch: '',
  state: '',
  minSalary: '',
  maxSalary: '',
  status: '',
  newEmployment: '',
};

export const useFilters = () => {
  const [filters, setFilters] = useState(defaultFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const getActiveFilters = useCallback(() => {
    return Object.fromEntries(
      Object.entries(filters).filter(([k, v]) => {
        if (Array.isArray(v)) return v.length > 0;
        return v !== '';
      })
    );
  }, [filters]);

  const hasActiveFilters = useCallback(() => {
    return Object.keys(getActiveFilters()).length > 0;
  }, [getActiveFilters]);

  return {
    filters,
    updateFilter,
    toggleArrayFilter,
    resetFilters,
    getActiveFilters,
    hasActiveFilters,
  };
};
