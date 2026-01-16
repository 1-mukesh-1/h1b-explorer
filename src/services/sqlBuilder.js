import { BASE_TABLE } from '../utils/constants';

/**
 * Build CTE chain from root to target node
 */
export const buildCTEChain = (nodes, targetId, filters = {}, sort = {}, pagination = {}) => {
  const chain = getNodeChain(nodes, targetId);
  if (chain.length === 0) return buildBaseQuery(filters, sort, pagination);

  const ctes = chain.map((node, index) => {
    const parentRef = index === 0 ? BASE_TABLE : `node_${chain[index - 1].id}`;
    const cteName = `node_${node.id}`;
    // Node SQL should reference {parent}, we replace it
    const sql = node.sql.replace(/\{parent\}/g, parentRef);
    return `${cteName} AS (\n  ${sql}\n)`;
  });

  const finalNode = `node_${chain[chain.length - 1].id}`;
  const whereClause = buildWhereClause(filters);
  const orderClause = buildOrderClause(sort);
  const limitClause = buildLimitClause(pagination);

  return `WITH \n${ctes.join(',\n')}\nSELECT * FROM ${finalNode}${whereClause}${orderClause}${limitClause}`;
};

/**
 * Get ordered chain of nodes from root to target
 */
export const getNodeChain = (nodes, targetId) => {
  if (!targetId || !nodes[targetId]) return [];
  
  const chain = [];
  let current = nodes[targetId];
  
  while (current) {
    chain.unshift(current);
    current = current.parentId ? nodes[current.parentId] : null;
  }
  
  return chain;
};

/**
 * Build base query without AI nodes
 */
export const buildBaseQuery = (filters = {}, sort = {}, pagination = {}) => {
  const whereClause = buildWhereClause(filters);
  const orderClause = buildOrderClause(sort);
  const limitClause = buildLimitClause(pagination);
  return `SELECT * FROM ${BASE_TABLE}${whereClause}${orderClause}${limitClause}`;
};

/**
 * Build WHERE clause from traditional filters
 */
export const buildWhereClause = (filters) => {
  const conditions = [];

  if (filters.employers?.length > 0) {
    const list = filters.employers.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
    conditions.push(`EMPLOYER_NAME IN (${list})`);
  }
  if (filters.jobTitles?.length > 0) {
    const list = filters.jobTitles.map(j => `'${j.replace(/'/g, "''")}'`).join(',');
    conditions.push(`JOB_TITLE IN (${list})`);
  }
  if (filters.state) conditions.push(`WORKSITE_STATE = '${filters.state}'`);
  if (filters.minSalary) conditions.push(`WAGE_RATE_OF_PAY_FROM >= ${parseInt(filters.minSalary)}`);
  if (filters.maxSalary) conditions.push(`WAGE_RATE_OF_PAY_FROM <= ${parseInt(filters.maxSalary)}`);
  if (filters.status) conditions.push(`CASE_STATUS = '${filters.status}'`);
  if (filters.newEmployment === 'new') conditions.push(`NEW_EMPLOYMENT > 0`);
  if (filters.newEmployment === 'continued') conditions.push(`CONTINUED_EMPLOYMENT > 0`);

  return conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
};

const buildOrderClause = (sort) => {
  if (!sort || !sort.key) return '';
  return ` ORDER BY ${sort.key} ${(sort.direction || 'asc').toUpperCase()}`;
};

const buildLimitClause = (pagination) => {
  if (!pagination.pageSize) return '';
  const offset = ((pagination.page || 1) - 1) * pagination.pageSize;
  return ` LIMIT ${pagination.pageSize} OFFSET ${offset}`;
};

/**
 * Build count query for pagination
 */
export const buildCountQuery = (nodes, targetId, filters = {}) => {
  const chain = getNodeChain(nodes, targetId);
  if (chain.length === 0) {
    const whereClause = buildWhereClause(filters);
    return `SELECT COUNT(*) as cnt FROM ${BASE_TABLE}${whereClause}`;
  }

  const ctes = chain.map((node, index) => {
    const parentRef = index === 0 ? BASE_TABLE : `node_${chain[index - 1].id}`;
    const cteName = `node_${node.id}`;
    const sql = node.sql.replace(/\{parent\}/g, parentRef);
    return `${cteName} AS (\n  ${sql}\n)`;
  });

  const finalNode = `node_${chain[chain.length - 1].id}`;
  const whereClause = buildWhereClause(filters);

  return `WITH \n${ctes.join(',\n')}\nSELECT COUNT(*) as cnt FROM ${finalNode}${whereClause}`;
};
