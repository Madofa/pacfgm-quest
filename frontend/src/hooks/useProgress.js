import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useProgress() {
  const [progres, setProgres]       = useState(null);
  const [skillTree, setSkillTree]   = useState([]);
  const [revisions, setRevisions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, st, rv] = await Promise.all([
        api.progres.meu(),
        api.progres.skillTree(),
        api.progres.revisions(),
      ]);
      setProgres(p);
      setSkillTree(st);
      setRevisions(rv.revisions || []);
    } catch (err) {
      setError(err.error || 'Error carregant el progrés');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { progres, skillTree, revisions, loading, error, refresh: fetchAll };
}
