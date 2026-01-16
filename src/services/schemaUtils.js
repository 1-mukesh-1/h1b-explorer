/**
 * Extract schema from query result
 */
export const extractSchemaFromResult = (result) => {
  if (!result || result.length === 0) return [];
  
  const firstRow = result[0];
  return Object.keys(firstRow).map(name => ({
    name,
    type: inferType(firstRow[name]),
  }));
};

/**
 * Infer SQL type from JS value
 */
const inferType = (value) => {
  if (value === null || value === undefined) return 'VARCHAR';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'DOUBLE';
  }
  if (typeof value === 'bigint') return 'BIGINT';
  if (typeof value === 'boolean') return 'BOOLEAN';
  return 'VARCHAR';
};

/**
 * Compare two schemas for equality
 */
export const schemasEqual = (schema1, schema2) => {
  if (!schema1 || !schema2) return false;
  if (schema1.length !== schema2.length) return false;
  
  return schema1.every((col, i) => 
    col.name === schema2[i].name && col.type === schema2[i].type
  );
};

/**
 * Format schema for AI prompt context
 */
export const schemaToPromptContext = (schema) => {
  if (!schema || schema.length === 0) return 'No columns available';
  
  return schema.map(col => `${col.name} (${col.type})`).join(', ');
};

/**
 * Get string columns from schema (for filter suggestions)
 */
export const getStringColumns = (schema) => {
  return schema
    .filter(col => col.type === 'VARCHAR')
    .map(col => col.name);
};

/**
 * Get numeric columns from schema
 */
export const getNumericColumns = (schema) => {
  return schema
    .filter(col => ['INTEGER', 'DOUBLE', 'BIGINT'].includes(col.type))
    .map(col => col.name);
};
