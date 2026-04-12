import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useProgress() {
  const [progres, setProgres]   = useState(null);
  const [skillTree, setSkillTree] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, st] = await Promise.all([api.progres.meu(), api.progres.skillTree()]);
      setProgres(p);
      setSkillTree(st);
    } catch (err) {
      setError(err.error || 'Error carregant el progrés');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { progres, skillTree, loading, error, refresh: fetchAll };
}
