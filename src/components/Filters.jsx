import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronUp, ChevronDown, X, Check, Trash2 } from 'lucide-react';

export const Filters = ({ filters, uniqueValues, onUpdate, onToggle, onReset, schema, hasActiveFilters }) => {
  const [showFilters, setShowFilters] = useState(true);
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false);
  const [showJobTitleDropdown, setShowJobTitleDropdown] = useState(false);
  const employerRef = useRef(null);
  const jobTitleRef = useRef(null);

  // Check if columns exist in current schema
  const hasColumn = (col) => !schema || schema.some(s => s.name === col);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employerRef.current && !employerRef.current.contains(e.target)) setShowEmployerDropdown(false);
      if (jobTitleRef.current && !jobTitleRef.current.contains(e.target)) setShowJobTitleDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize filtered results to prevent input from losing focus
  const filteredEmployers = useMemo(() => 
    uniqueValues.employers.filter(e =>
      e.toLowerCase().includes(filters.employerSearch.toLowerCase())
    ),
    [uniqueValues.employers, filters.employerSearch]
  );
  
  const filteredJobTitles = useMemo(() =>
    uniqueValues.jobTitles.filter(j =>
      j.toLowerCase().includes(filters.jobTitleSearch.toLowerCase())
    ),
    [uniqueValues.jobTitles, filters.jobTitleSearch]
  );

  const MultiSelect = ({ ref, label, items, selected, search, onSearch, onToggleItem, show, setShow }) => (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder={`${label}...`}
          value={search}
          onChange={e => onSearch(e.target.value)}
          onFocus={() => setShow(true)}
          className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
            {selected.length}
          </span>
        )}
      </div>
      {show && (
        <div className="absolute z-50 mt-1 w-80 max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg">
          {selected.length > 0 && (
            <div className="p-2 border-b border-gray-700 flex flex-wrap gap-1">
              {selected.map(item => (
                <span key={item} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  {item.length > 20 ? item.substring(0, 20) + '...' : item}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => onToggleItem(item)} />
                </span>
              ))}
            </div>
          )}
          {items.slice(0, 50).map(item => (
            <div key={item} onClick={() => onToggleItem(item)} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(item) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                {selected.includes(item) && <Check className="w-3 h-3" />}
              </div>
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-900/30 border-b border-gray-800">
      <button onClick={() => setShowFilters(!showFilters)} className={`w-full px-4 py-2 flex items-center gap-2 text-sm hover:text-gray-200 ${hasActiveFilters ? 'text-blue-400 bg-blue-900/20' : 'text-gray-400'}`}>
        <Filter className={`w-4 h-4 ${hasActiveFilters ? 'text-blue-400' : ''}`} />
        Filters
        {hasActiveFilters && (
          <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded ml-1">Active</span>
        )}
        {hasActiveFilters && (
          <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="ml-2 p-1 hover:bg-red-600/50 rounded" title="Clear all filters">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        )}
        {showFilters ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {showFilters && (
        <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {hasColumn('EMPLOYER_NAME') && (
            <MultiSelect ref={employerRef} label="Employer" items={filteredEmployers} selected={filters.employers}
              search={filters.employerSearch} onSearch={v => onUpdate('employerSearch', v)}
              onToggleItem={e => onToggle('employers', e)} show={showEmployerDropdown} setShow={setShowEmployerDropdown} />
          )}
          {hasColumn('JOB_TITLE') && (
            <MultiSelect ref={jobTitleRef} label="Job Title" items={filteredJobTitles} selected={filters.jobTitles}
              search={filters.jobTitleSearch} onSearch={v => onUpdate('jobTitleSearch', v)}
              onToggleItem={j => onToggle('jobTitles', j)} show={showJobTitleDropdown} setShow={setShowJobTitleDropdown} />
          )}
          {hasColumn('WORKSITE_STATE') && (
            <select value={filters.state} onChange={e => onUpdate('state', e.target.value)}
              className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded">
              <option value="">All States</option>
              {uniqueValues.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {hasColumn('WAGE_RATE_OF_PAY_FROM') && (
            <>
              <input type="number" placeholder="Min Salary" value={filters.minSalary}
                onChange={e => onUpdate('minSalary', e.target.value)}
                className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
              <input type="number" placeholder="Max Salary" value={filters.maxSalary}
                onChange={e => onUpdate('maxSalary', e.target.value)}
                className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
            </>
          )}
          {hasColumn('CASE_STATUS') && (
            <select value={filters.status} onChange={e => onUpdate('status', e.target.value)}
              className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded">
              <option value="">All Status</option>
              <option value="Certified">Certified</option>
              <option value="Denied">Denied</option>
            </select>
          )}
          {(hasColumn('NEW_EMPLOYMENT') || hasColumn('CONTINUED_EMPLOYMENT')) && (
            <select value={filters.newEmployment} onChange={e => onUpdate('newEmployment', e.target.value)}
              className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded">
              <option value="">All Employment</option>
              <option value="new">New Only</option>
              <option value="continued">Continued Only</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
};
