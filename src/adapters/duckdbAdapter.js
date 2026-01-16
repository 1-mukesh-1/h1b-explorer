import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_worker_eh from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

let db = null;
let conn = null;

export const initDuckDB = async (onProgress) => {
  if (conn) return conn;

  onProgress?.('Initializing DuckDB...');
  
  const BUNDLES = {
    mvp: { mainModule: duckdb_wasm, mainWorker: duckdb_worker },
    eh: { mainModule: duckdb_wasm_eh, mainWorker: duckdb_worker_eh },
  };

  const bundle = await duckdb.selectBundle(BUNDLES);
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule);
  conn = await db.connect();

  onProgress?.('Loading H1B data...');
  
  const response = await fetch('/h1b_data.parquet');
  if (!response.ok) throw new Error('Failed to load parquet file');
  
  const arrayBuffer = await response.arrayBuffer();
  await db.registerFileBuffer('h1b_data.parquet', new Uint8Array(arrayBuffer));
  await conn.query(`CREATE OR REPLACE TABLE h1b AS SELECT * FROM parquet_scan('h1b_data.parquet')`);

  onProgress?.('Ready');
  return conn;
};

export const runQuery = async (sql) => {
  if (!conn) throw new Error('Database not initialized');
  const result = await conn.query(sql);
  return result.toArray();
};

export const getConnection = () => conn;

export const getStats = async () => {
  if (!conn) throw new Error('Database not initialized');
  
  const result = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN CASE_STATUS = 'Certified' THEN 1 ELSE 0 END) as certified,
      ROUND(AVG(WAGE_RATE_OF_PAY_FROM), 0) as avg_salary,
      SUM(NEW_EMPLOYMENT) as new_hires
    FROM h1b
  `);
  
  const s = result.toArray()[0];
  return {
    total: Number(s.total),
    certified: Number(s.certified),
    avgSalary: Number(s.avg_salary) || 0,
    newHires: Number(s.new_hires),
  };
};

export const getUniqueValues = async (column) => {
  if (!conn) throw new Error('Database not initialized');
  
  const result = await conn.query(`
    SELECT ${column}, COUNT(*) as cnt 
    FROM h1b 
    WHERE ${column} IS NOT NULL 
    GROUP BY ${column} 
    ORDER BY cnt DESC
  `);
  
  return result.toArray().map(r => r[column]);
};
