import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Download, Database, Code, Filter, ChevronUp, ChevronDown, Play, Loader2, Upload, Table, AlertCircle, X, Check } from 'lucide-react';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_worker_eh from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export default function App() {
  const [db, setDb] = useState(null);
  const [conn, setConn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing DuckDB...');
  const [loadError, setLoadError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [tableData, setTableData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  
  const [filters, setFilters] = useState({
    employers: [],
    jobTitles: [],
    employerSearch: '',
    jobTitleSearch: '',
    state: '',
    minSalary: '',
    maxSalary: '',
    status: '',
    newEmployment: '',
  });
  
  const [sortConfig, setSortConfig] = useState({ key: 'EMPLOYER_NAME', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [activeTab, setActiveTab] = useState('table');
  const [showFilters, setShowFilters] = useState(true);
  
  const [sqlQuery, setSqlQuery] = useState(`-- Top 20 employers by total workers
SELECT 
  EMPLOYER_NAME,
  COUNT(*) as total_lcas,
  SUM(NEW_EMPLOYMENT) as new_employment_workers,
  ROUND(AVG(WAGE_RATE_OF_PAY_FROM), 0) as avg_salary
FROM h1b
WHERE CASE_STATUS = 'Certified'
GROUP BY EMPLOYER_NAME
ORDER BY total_lcas DESC
LIMIT 20`);
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlError, setSqlError] = useState(null);

  const [uniqueStates, setUniqueStates] = useState([]);
  const [uniqueEmployers, setUniqueEmployers] = useState([]);
  const [uniqueJobTitles, setUniqueJobTitles] = useState([]);
  const [stats, setStats] = useState({ total: 0, certified: 0, avgSalary: 0, newHires: 0 });
  
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false);
  const [showJobTitleDropdown, setShowJobTitleDropdown] = useState(false);
  const employerRef = useRef(null);
  const jobTitleRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingStatus('Loading DuckDB...');
        
        const bundle = await duckdb.selectBundle({
          mvp: {
            mainModule: duckdb_wasm,
            mainWorker: duckdb_worker,
          },
          eh: {
            mainModule: duckdb_wasm_eh,
            mainWorker: duckdb_worker_eh,
          },
        });
        
        const worker = new Worker(bundle.mainWorker);
        const logger = new duckdb.ConsoleLogger();
        const database = new duckdb.AsyncDuckDB(logger, worker);
        
        await database.instantiate(bundle.mainModule);
        const connection = await database.connect();
        
        setDb(database);
        setConn(connection);
        
        setLoadingStatus('Loading H-1B data...');
        
        const response = await fetch('/h1b_data.parquet');
        if (!response.ok) {
          throw new Error('Parquet file not found in public folder. Please add h1b_data.parquet to the public folder.');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        await database.registerFileBuffer('h1b_data.parquet', uint8Array);
        await connection.query(`CREATE TABLE h1b AS SELECT * FROM parquet_scan('h1b_data.parquet')`);
        
        setLoadingStatus('Calculating statistics...');
        
        const countResult = await connection.query('SELECT COUNT(*) as cnt FROM h1b');
        const count = Number(countResult.toArray()[0].cnt);
        setTotalRows(count);
        
        const statesResult = await connection.query(`SELECT DISTINCT WORKSITE_STATE FROM h1b WHERE WORKSITE_STATE IS NOT NULL ORDER BY WORKSITE_STATE`);
        setUniqueStates(statesResult.toArray().map(r => r.WORKSITE_STATE));
        
        const employersResult = await connection.query(`
          SELECT EMPLOYER_NAME, COUNT(*) as cnt 
          FROM h1b 
          WHERE EMPLOYER_NAME IS NOT NULL 
          GROUP BY EMPLOYER_NAME 
          ORDER BY cnt DESC
        `);
        setUniqueEmployers(employersResult.toArray().map(r => r.EMPLOYER_NAME));

        const jobTitlesResult = await connection.query(`
          SELECT JOB_TITLE, COUNT(*) as cnt 
          FROM h1b 
          WHERE JOB_TITLE IS NOT NULL 
          GROUP BY JOB_TITLE 
          ORDER BY cnt DESC
        `);
        setUniqueJobTitles(jobTitlesResult.toArray().map(r => r.JOB_TITLE));
        
        const statsResult = await connection.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN CASE_STATUS = 'Certified' THEN 1 ELSE 0 END) as certified,
            ROUND(AVG(WAGE_RATE_OF_PAY_FROM), 0) as avg_salary,
            SUM(NEW_EMPLOYMENT) as new_hires
          FROM h1b
        `);
        const s = statsResult.toArray()[0];
        setStats({
          total: Number(s.total),
          certified: Number(s.certified),
          avgSalary: Number(s.avg_salary) || 0,
          newHires: Number(s.new_hires),
        });
        
        setDataLoaded(true);
        setIsLoading(false);
        
      } catch (err) {
        console.error('Init error:', err);
        setLoadError(err.message);
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employerRef.current && !employerRef.current.contains(e.target)) {
        setShowEmployerDropdown(false);
      }
      if (jobTitleRef.current && !jobTitleRef.current.contains(e.target)) {
        setShowJobTitleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTableData = useCallback(async () => {
    if (!conn || !dataLoaded) return;
    
    try {
      let whereClause = '1=1';
      
      if (filters.employers.length > 0) {
        const employerList = filters.employers.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
        whereClause += ` AND EMPLOYER_NAME IN (${employerList})`;
      } else if (filters.employerSearch) {
        whereClause += ` AND LOWER(EMPLOYER_NAME) LIKE '%${filters.employerSearch.toLowerCase().replace(/'/g, "''")}%'`;
      }
      
      if (filters.jobTitles.length > 0) {
        const jobTitleList = filters.jobTitles.map(j => `'${j.replace(/'/g, "''")}'`).join(',');
        whereClause += ` AND JOB_TITLE IN (${jobTitleList})`;
      } else if (filters.jobTitleSearch) {
        whereClause += ` AND LOWER(JOB_TITLE) LIKE '%${filters.jobTitleSearch.toLowerCase().replace(/'/g, "''")}%'`;
      }
      
      if (filters.state) {
        whereClause += ` AND WORKSITE_STATE = '${filters.state}'`;
      }
      if (filters.minSalary) {
        whereClause += ` AND WAGE_RATE_OF_PAY_FROM >= ${parseInt(filters.minSalary)}`;
      }
      if (filters.maxSalary) {
        whereClause += ` AND WAGE_RATE_OF_PAY_FROM <= ${parseInt(filters.maxSalary)}`;
      }
      if (filters.status) {
        whereClause += ` AND CASE_STATUS = '${filters.status}'`;
      }
      if (filters.newEmployment === 'new') {
        whereClause += ` AND NEW_EMPLOYMENT > 0`;
      } else if (filters.newEmployment === 'continued') {
        whereClause += ` AND CONTINUED_EMPLOYMENT > 0`;
      }
      
      const offset = (currentPage - 1) * pageSize;
      const orderDir = sortConfig.direction.toUpperCase();
      
      const countResult = await conn.query(`SELECT COUNT(*) as cnt FROM h1b WHERE ${whereClause}`);
      const filteredCount = Number(countResult.toArray()[0].cnt);
      setTotalRows(filteredCount);
      
      const displayCols = ['EMPLOYER_NAME', 'JOB_TITLE', 'WORKSITE_STATE', 'WORKSITE_CITY', 'WAGE_RATE_OF_PAY_FROM', 'CASE_STATUS', 'NEW_EMPLOYMENT', 'TOTAL_WORKER_POSITIONS'];
      const query = `
        SELECT ${displayCols.join(', ')}
        FROM h1b 
        WHERE ${whereClause}
        ORDER BY ${sortConfig.key} ${orderDir}
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      
      const result = await conn.query(query);
      setTableData(result.toArray());
    } catch (err) {
      console.error('Query error:', err);
    }
  }, [conn, dataLoaded, filters, currentPage, pageSize, sortConfig]);

  useEffect(() => {
    if (dataLoaded) {
      fetchTableData();
    }
  }, [dataLoaded, filters, currentPage, sortConfig, fetchTableData]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const toggleEmployer = (employer) => {
    setFilters(f => ({
      ...f,
      employers: f.employers.includes(employer)
        ? f.employers.filter(e => e !== employer)
        : [...f.employers, employer]
    }));
    setCurrentPage(1);
  };

  const toggleJobTitle = (jobTitle) => {
    setFilters(f => ({
      ...f,
      jobTitles: f.jobTitles.includes(jobTitle)
        ? f.jobTitles.filter(j => j !== jobTitle)
        : [...f.jobTitles, jobTitle]
    }));
    setCurrentPage(1);
  };

  const runSQL = async () => {
    if (!conn) return;
    setIsLoading(true);
    setSqlError(null);
    
    try {
      const result = await conn.query(sqlQuery);
      setSqlResult(result.toArray());
    } catch (err) {
      setSqlError(err.message);
      setSqlResult(null);
    }
    
    setIsLoading(false);
  };

  const handleExport = async (format) => {
    if (!conn) return;
    
    try {
      let whereClause = '1=1';
      if (filters.employers.length > 0) {
        const employerList = filters.employers.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
        whereClause += ` AND EMPLOYER_NAME IN (${employerList})`;
      } else if (filters.employerSearch) {
        whereClause += ` AND LOWER(EMPLOYER_NAME) LIKE '%${filters.employerSearch.toLowerCase()}%'`;
      }
      if (filters.jobTitles.length > 0) {
        const jobTitleList = filters.jobTitles.map(j => `'${j.replace(/'/g, "''")}'`).join(',');
        whereClause += ` AND JOB_TITLE IN (${jobTitleList})`;
      } else if (filters.jobTitleSearch) {
        whereClause += ` AND LOWER(JOB_TITLE) LIKE '%${filters.jobTitleSearch.toLowerCase()}%'`;
      }
      if (filters.state) whereClause += ` AND WORKSITE_STATE = '${filters.state}'`;
      if (filters.status) whereClause += ` AND CASE_STATUS = '${filters.status}'`;
      if (filters.newEmployment === 'new') whereClause += ` AND NEW_EMPLOYMENT > 0`;
      else if (filters.newEmployment === 'continued') whereClause += ` AND CONTINUED_EMPLOYMENT > 0`;
      
      const result = await conn.query(`SELECT * FROM h1b WHERE ${whereClause} LIMIT 10000`);
      const data = result.toArray();
      
      if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        downloadFile(`${headers}\n${rows}`, 'h1b_export.csv', 'text/csv');
      } else if (format === 'json') {
        downloadFile(JSON.stringify(data, null, 2), 'h1b_export.json', 'application/json');
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalRows / pageSize);
  const displayColumns = ['EMPLOYER_NAME', 'JOB_TITLE', 'WORKSITE_STATE', 'WORKSITE_CITY', 'WAGE_RATE_OF_PAY_FROM', 'CASE_STATUS', 'NEW_EMPLOYMENT', 'TOTAL_WORKER_POSITIONS'];

  const filteredEmployers = uniqueEmployers.filter(e => 
    e.toLowerCase().includes(filters.employerSearch.toLowerCase())
  );

  const filteredJobTitles = uniqueJobTitles.filter(j => 
    j.toLowerCase().includes(filters.jobTitleSearch.toLowerCase())
  );

  if (isLoading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg">{loadingStatus}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-red-400 mb-2">Failed to load</p>
          <p className="text-gray-400 text-sm">{loadError}</p>
          <p className="text-gray-500 text-xs mt-4">Make sure h1b_data.parquet is in the public folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">H-1B LCA Explorer</h1>
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
              {stats.total.toLocaleString()} records
            </span>
          </div>
        </div>
      </header>

      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-400">Total:</span> <span className="font-mono text-blue-400">{stats.total.toLocaleString()}</span></div>
          <div><span className="text-gray-400">Certified:</span> <span className="font-mono text-green-400">{stats.certified.toLocaleString()}</span></div>
          <div><span className="text-gray-400">Avg Salary:</span> <span className="font-mono text-yellow-400">${stats.avgSalary.toLocaleString()}</span></div>
          <div><span className="text-gray-400">New Employment Workers:</span> <span className="font-mono text-purple-400">{stats.newHires.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="flex border-b border-gray-800">
        {[
          { id: 'table', label: 'Data Table', icon: Table },
          { id: 'sql', label: 'SQL Query', icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400 bg-gray-900/50' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-2 px-4">
          <span className="text-xs text-gray-500">Export (max 10k):</span>
          <button onClick={() => handleExport('csv')} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded">CSV</button>
          <button onClick={() => handleExport('json')} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded">JSON</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'table' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-900/30 border-b border-gray-800">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="w-full px-4 py-2 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
              >
                <Filter className="w-4 h-4" />
                Filters
                {showFilters ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
              </button>
              
              {showFilters && (
                <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  <div ref={employerRef} className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Employer..."
                        value={filters.employerSearch}
                        onChange={e => setFilters(f => ({ ...f, employerSearch: e.target.value }))}
                        onFocus={() => setShowEmployerDropdown(true)}
                        className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                      />
                      {filters.employers.length > 0 && (
                        <span className="absolute right-2 top-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                          {filters.employers.length}
                        </span>
                      )}
                    </div>
                    {showEmployerDropdown && (
                      <div className="absolute z-50 mt-1 w-80 max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg">
                        {filters.employers.length > 0 && (
                          <div className="p-2 border-b border-gray-700">
                            <div className="flex flex-wrap gap-1">
                              {filters.employers.map(emp => (
                                <span key={emp} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                  {emp.length > 20 ? emp.substring(0, 20) + '...' : emp}
                                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleEmployer(emp)} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {filteredEmployers.slice(0, 50).map(employer => (
                          <div
                            key={employer}
                            onClick={() => toggleEmployer(employer)}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-sm"
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                              filters.employers.includes(employer) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                            }`}>
                              {filters.employers.includes(employer) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {employer}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div ref={jobTitleRef} className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Job Title..."
                        value={filters.jobTitleSearch}
                        onChange={e => setFilters(f => ({ ...f, jobTitleSearch: e.target.value }))}
                        onFocus={() => setShowJobTitleDropdown(true)}
                        className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                      />
                      {filters.jobTitles.length > 0 && (
                        <span className="absolute right-2 top-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                          {filters.jobTitles.length}
                        </span>
                      )}
                    </div>
                    {showJobTitleDropdown && (
                      <div className="absolute z-50 mt-1 w-80 max-h-64 overflow-y-auto bg-gray-800 border border-gray-700 rounded shadow-lg">
                        {filters.jobTitles.length > 0 && (
                          <div className="p-2 border-b border-gray-700">
                            <div className="flex flex-wrap gap-1">
                              {filters.jobTitles.map(title => (
                                <span key={title} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                  {title.length > 20 ? title.substring(0, 20) + '...' : title}
                                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleJobTitle(title)} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {filteredJobTitles.slice(0, 50).map(jobTitle => (
                          <div
                            key={jobTitle}
                            onClick={() => toggleJobTitle(jobTitle)}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-sm"
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                              filters.jobTitles.includes(jobTitle) ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                            }`}>
                              {filters.jobTitles.includes(jobTitle) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {jobTitle}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <select
                    value={filters.state}
                    onChange={e => { setFilters(f => ({ ...f, state: e.target.value })); setCurrentPage(1); }}
                    className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All States</option>
                    {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Min Salary"
                    value={filters.minSalary}
                    onChange={e => { setFilters(f => ({ ...f, minSalary: e.target.value })); setCurrentPage(1); }}
                    className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max Salary"
                    value={filters.maxSalary}
                    onChange={e => { setFilters(f => ({ ...f, maxSalary: e.target.value })); setCurrentPage(1); }}
                    className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={filters.status}
                    onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setCurrentPage(1); }}
                    className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="Certified">Certified</option>
                    <option value="Denied">Denied</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                  <select
                    value={filters.newEmployment}
                    onChange={e => { setFilters(f => ({ ...f, newEmployment: e.target.value })); setCurrentPage(1); }}
                    className="px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Employment Type</option>
                    <option value="new">New Employment</option>
                    <option value="continued">Continued Employment</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    {displayColumns.map(col => (
                      <th 
                        key={col}
                        onClick={() => handleSort(col)}
                        className="px-3 py-2 text-left font-medium text-gray-400 cursor-pointer hover:text-gray-200 whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {col.replace(/_/g, ' ')}
                          {sortConfig.key === col && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-900/50">
                      {displayColumns.map(col => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap max-w-xs truncate">
                          {col === 'WAGE_RATE_OF_PAY_FROM' 
                            ? `$${Number(row[col])?.toLocaleString()}` 
                            : col === 'CASE_STATUS'
                            ? <span className={`px-1.5 py-0.5 rounded text-xs ${row[col] === 'Certified' ? 'bg-green-900/50 text-green-400' : row[col] === 'Denied' ? 'bg-red-900/50 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{row[col]}</span>
                            : col === 'NEW_EMPLOYMENT'
                            ? <span className={`px-1.5 py-0.5 rounded text-xs ${Number(row[col]) > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>{row[col]}</span>
                            : col === 'TOTAL_WORKER_POSITIONS'
                            ? <span className="text-gray-300">{row[col]}</span>
                            : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">{totalRows.toLocaleString()} results</span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50">First</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50">Prev</button>
                <span className="px-3 py-1">{currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50">Next</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded disabled:opacity-50">Last</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">SQL Query (table: h1b)</span>
                <button 
                  onClick={runSQL}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run
                </button>
              </div>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="h-40 p-3 bg-gray-900 border border-gray-700 rounded font-mono text-sm focus:border-blue-500 focus:outline-none resize-none"
                placeholder="SELECT * FROM h1b LIMIT 10"
              />
            </div>
            
            {sqlError && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
                {sqlError}
              </div>
            )}
            
            {sqlResult && (
              <div className="flex-1 overflow-auto border border-gray-700 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      {Object.keys(sqlResult[0] || {}).map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium text-gray-400">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {sqlResult.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-900/50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2">{typeof val === 'number' || typeof val === 'bigint' ? Number(val).toLocaleString() : String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}