import { useState, useEffect, useCallback } from 'react';
import { initDatabase, getStats, getUniqueValues, runQuery } from '../services/queryService';

export const useDuckDB = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState({ total: 0, certified: 0, avgSalary: 0, newHires: 0 });
  const [uniqueValues, setUniqueValues] = useState({
    employers: [],
    jobTitles: [],
    states: [],
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase(setLoadingStatus);
        
        setLoadingStatus('Loading statistics...');
        const dbStats = await getStats();
        setStats(dbStats);

        setLoadingStatus('Loading filter options...');
        const [employers, jobTitles, states] = await Promise.all([
          getUniqueValues('EMPLOYER_NAME'),
          getUniqueValues('JOB_TITLE'),
          getUniqueValues('WORKSITE_STATE'),
        ]);
        
        setUniqueValues({ employers, jobTitles, states });
        setIsReady(true);
        setIsLoading(false);
      } catch (e) {
        console.error('Init error:', e);
        setError(e.message);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const executeQuery = useCallback(async (sql) => {
    try {
      return { data: await runQuery(sql), error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }, []);

  return {
    isLoading,
    loadingStatus,
    error,
    isReady,
    stats,
    uniqueValues,
    executeQuery,
  };
};
