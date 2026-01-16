import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Table, Database } from 'lucide-react';
import { Header } from './components/Header';
import { TreeView } from './components/TreeView';
import { Filters } from './components/Filters';
import { DataTable } from './components/DataTable';
import { Pagination } from './components/Pagination';
import { SqlEditor } from './components/SqlEditor';
import { useDuckDB } from './hooks/useDuckDB';
import { useTree } from './hooks/useTree';
import { useFilters } from './hooks/useFilters';
import { generateSQL } from './api';
import { buildCTEChain, buildCountQuery } from './services/sqlBuilder';
import { extractSchemaFromResult, schemasEqual } from './services/schemaUtils';
import { DEFAULT_PAGE_SIZE, BASE_SCHEMA, DEFAULT_DISPLAY_COLUMNS } from './utils/constants';

export default function App() {
  const { isLoading: dbLoading, loadingStatus, error: dbError, isReady, stats, uniqueValues, executeQuery } = useDuckDB();
  const { tree, aiMode, setAiMode, addNode, updateNode, deleteNode, setActiveNode, setNodeError, clearNodeStale, canAddNode, getParentSchema, isLeaf, getChildren, hasDescendants, resetTree } = useTree();
  const { filters, updateFilter, toggleArrayFilter, resetFilters, hasActiveFilters } = useFilters();

  const [tableData, setTableData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'EMPLOYER_NAME', direction: 'asc' });
  const [currentSchema, setCurrentSchema] = useState(BASE_SCHEMA);
  const [isQuerying, setIsQuerying] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [activeTab, setActiveTab] = useState('table');

  const [refreshKey, setRefreshKey] = useState(0);
  const [queryError, setQueryError] = useState(null);

  useEffect(() => {
    if (!isReady) return;
    
    const fetchData = async () => {
      setIsQuerying(true);
      setQueryError(null);

      const pagination = { page: currentPage, pageSize: DEFAULT_PAGE_SIZE };
      const activeNode = tree.activeId ? tree.nodes[tree.activeId] : null;
      const schema = activeNode?.schema || BASE_SCHEMA;
      setCurrentSchema(schema);

      const countSql = buildCountQuery(tree.nodes, tree.activeId, filters);
      const countResult = await executeQuery(countSql);
      if (countResult.error) {
        setQueryError(countResult.error);
        setIsQuerying(false);
        return;
      }
      setTotalRows(Number(countResult.data[0]?.cnt || 0));

      const dataSql = buildCTEChain(tree.nodes, tree.activeId, filters, sortConfig, pagination);
      console.log('[Data Query]', dataSql);
      const dataResult = await executeQuery(dataSql);
      if (dataResult.error) {
        setQueryError(dataResult.error);
        setTableData([]);
      } else {
        setTableData(dataResult.data);
      }
      setIsQuerying(false);
    };

    fetchData();
  }, [isReady, tree.nodes, tree.activeId, filters, sortConfig, currentPage, executeQuery]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const handleAddNode = async (parentId, prompt) => {
    setAiLoading(true);
    setAiError(null);

    const parentSchema = getParentSchema(parentId);
    const result = await generateSQL(prompt, parentSchema);

    if (!result.success) {
      setAiError(result.error);
      setAiLoading(false);
      return;
    }

    // Validate: run the query to check for empty results
    const testSql = buildCTEChain(
      { ...tree.nodes, temp: { id: 'temp', parentId, prompt, sql: result.sql, schema: result.schema, isStale: false, error: null } },
      'temp', {}, {}, { page: 1, pageSize: 1 }
    );
    console.log('[Test Query]', testSql);
    const testResult = await executeQuery(testSql);
    
    if (testResult.error) {
      setAiError(`SQL Error: ${testResult.error}`);
      setAiLoading(false);
      return;
    }

    if (testResult.data.length === 0) {
      setAiError('Warning: This filter returns 0 results. Try a different query.');
      setAiLoading(false);
      return;
    }

    addNode(parentId, prompt, result.sql, result.schema);
    resetFilters();
    setCurrentPage(1);
    setSortConfig({ key: '', direction: 'asc' });
    setAiLoading(false);
  };

  const handleEditNode = async (nodeId, prompt) => {
    setAiLoading(true);
    setAiError(null);

    const node = tree.nodes[nodeId];
    const parentSchema = getParentSchema(node.parentId);
    const result = await generateSQL(prompt, parentSchema);

    if (!result.success) {
      setAiError(result.error);
      setAiLoading(false);
      return;
    }

    const schemaChanged = !schemasEqual(node.schema, result.schema);
    if (schemaChanged) resetFilters();

    updateNode(nodeId, prompt, result.sql, result.schema);
    setCurrentPage(1);
    setAiLoading(false);
  };

  const handleNodeClick = (nodeId) => {
    setActiveNode(nodeId);
    resetFilters();
    setCurrentPage(1);
    setSortConfig({ key: '', direction: 'asc' }); // Reset sort to respect AI's ORDER BY
  };

  const handleDeleteNode = (nodeId) => {
    deleteNode(nodeId);
    resetFilters();
    setCurrentPage(1);
  };

  const handleFilterUpdate = (key, value) => {
    updateFilter(key, value);
    setCurrentPage(1);
  };

  const handleFilterToggle = (key, value) => {
    toggleArrayFilter(key, value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalRows / DEFAULT_PAGE_SIZE);
  const displayColumns = tree.activeId && tree.nodes[tree.activeId]?.schema
    ? tree.nodes[tree.activeId].schema.map(c => c.name)
    : DEFAULT_DISPLAY_COLUMNS;

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg">{loadingStatus}</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-red-400 mb-2">Failed to load</p>
          <p className="text-gray-400 text-sm">{dbError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header stats={stats} />
      
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
      </div>

      {activeTab === 'table' && (
        <>
          <TreeView tree={tree} aiMode={aiMode} onToggleAiMode={setAiMode} onNodeClick={handleNodeClick}
            onAddNode={handleAddNode} onEditNode={handleEditNode} onDeleteNode={handleDeleteNode}
            canAddNode={canAddNode} isLeaf={isLeaf} getChildren={getChildren} hasDescendants={hasDescendants}
            isLoading={aiLoading} aiError={aiError} onResetTree={resetTree} />
          <Filters filters={filters} uniqueValues={uniqueValues} onUpdate={handleFilterUpdate}
            onToggle={handleFilterToggle} onReset={resetFilters} schema={currentSchema} hasActiveFilters={hasActiveFilters()} />
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {isQuerying && (
              <div className="absolute inset-0 bg-gray-950/50 flex items-center justify-center z-40">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}
            <DataTable data={tableData} columns={displayColumns} sortConfig={sortConfig} onSort={handleSort} />
            <Pagination currentPage={currentPage} totalPages={totalPages} totalRows={totalRows} onPageChange={setCurrentPage} />
          </div>
        </>
      )}

      {activeTab === 'sql' && (
        <SqlEditor executeQuery={executeQuery} />
      )}
    </div>
  );
}
