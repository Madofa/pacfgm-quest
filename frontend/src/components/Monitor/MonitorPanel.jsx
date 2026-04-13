import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../services/api';
import { MATERIES } from '../../data/skillTree';
import styles from './MonitorPanel.module.css';

const RANG_CONFIG = {
  novici:   { color: '#90a4ae', label: 'NOV' },
  aprenent: { color: '#4fc3f7', label: 'APR' },
  guerrer:  { color: '#39ff14', label: 'GUE' },
  campió:   { color: '#ffd700', label: 'CAM' },
  mestre:   { color: '#ff6600', label: 'MES' },
};

const MAT_LABELS = Object.fromEntries(MATERIES.map(m => [m.key, { label: m.abbr, color: m.color }]));

function activitatColor(ultima_sessio) {
  if (!ultima_sessio) return 'var(--color-text-disabled)';
  const avui = new Date().toISOString().split('T')[0];
  const ahir = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (ultima_sessio >= avui) return 'var(--color-neon-green)';
  if (ultima_sessio >= ahir) return 'var(--color-gold)';
  const dies = Math.floor((Date.now() - new Date(ultima_sessio)) / 86400000);
  if (dies <= 3) return 'var(--color-neon-orange)';
  return 'var(--color-neon-red)';
}

function formatData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
}

function AlumneCard({ a }) {
  const actColor = activitatColor(a.ultima_sessio);
  const rangCfg  = RANG_CONFIG[a.rang] || RANG_CONFIG.novici;
  const pct      = a.nodes_totals > 0 ? Math.round((a.nodes_completats / a.nodes_totals) * 100) : 0;

  return (
    <div className={styles.card} style={{ '--act-color': actColor, borderColor: `${actColor}60` }}>
      {/* Cap */}
      <div className={styles.cardHead}>
        <span className={styles.alias}>{a.alias}</span>
        <span className={styles.rangBadge} style={{ color: rangCfg.color, borderColor: `${rangCfg.color}60` }}>
          {rangCfg.label}
        </span>
      </div>

      {/* Barra de progrés */}
      <div className={styles.progBar}>
        <div className={styles.progFill} style={{ width: `${pct}%`, background: actColor }} />
      </div>
      <div className={styles.progLabel}>
        <span style={{ color: actColor }}>{a.nodes_completats}</span>
        <span className={styles.progTotal}>/{a.nodes_totals} temes</span>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: 'var(--color-gold)' }}>
            {(a.xp_setmana || 0).toLocaleString()}
          </span>
          <span className={styles.statLbl}>XP/set</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>Nv{a.nivell}</span>
          <span className={styles.statLbl}>nivell</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: a.racha_dies >= 3 ? 'var(--color-neon-orange)' : undefined }}>
            🔥{a.racha_dies || 0}
          </span>
          <span className={styles.statLbl}>ratxa</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: actColor }}>{formatData(a.ultima_sessio)}</span>
          <span className={styles.statLbl}>última</span>
        </div>
      </div>

      {/* Punts febles */}
      {a.punts_febles?.length > 0 && (
        <div className={styles.puntsFebles}>
          {a.punts_febles.map(m => {
            const mc = MAT_LABELS[m] || { label: m.toUpperCase(), color: '#aaa' };
            return (
              <span key={m} className={styles.febleBadge} style={{ color: mc.color, borderColor: `${mc.color}60` }}>
                {mc.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MonitorPanel() {
  const { usuari, logout } = useAuth();
  const navigate = useNavigate();
  const [alumnes, setAlumnes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sort, setSort]       = useState('xp_setmana');

  useEffect(() => {
    api.grup.progres()
      .then(setAlumnes)
      .catch(err => setError(err.error || 'Error carregant dades'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...alumnes].sort((a, b) => {
    if (sort === 'xp_setmana') return (b.xp_setmana || 0) - (a.xp_setmana || 0);
    if (sort === 'nodes') return (b.nodes_completats || 0) - (a.nodes_completats || 0);
    if (sort === 'ratxa') return (b.racha_dies || 0) - (a.racha_dies || 0);
    if (sort === 'ultima') return (b.ultima_sessio || '').localeCompare(a.ultima_sessio || '');
    return 0;
  });

  // Resum global
  const actius = alumnes.filter(a => {
    if (!a.ultima_sessio) return false;
    const dies = Math.floor((Date.now() - new Date(a.ultima_sessio)) / 86400000);
    return dies <= 1;
  }).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.logo} text-game`}>PACFGM QUEST</div>
        <div className={styles.monitorBadge}>MONITOR: {usuari?.alias}</div>
        <button className={styles.logoutBtn} onClick={logout}>SORTIR</button>
      </header>

      <main className={styles.main}>
        {/* Resum */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal} style={{ color: 'var(--color-neon-green)' }}>{alumnes.length}</span>
            <span className={styles.summaryLbl}>alumnes</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal} style={{ color: 'var(--color-gold)' }}>{actius}</span>
            <span className={styles.summaryLbl}>actius avui/ahir</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal} style={{ color: 'var(--color-neon-orange)' }}>
              {alumnes.reduce((s, a) => s + (a.xp_setmana || 0), 0).toLocaleString()}
            </span>
            <span className={styles.summaryLbl}>XP grup setmana</span>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <span className={styles.sortLabel}>ORDENAR PER:</span>
          {[
            { key: 'xp_setmana', label: 'XP/SETMANA' },
            { key: 'nodes',      label: 'PROGRÉS' },
            { key: 'ratxa',      label: 'RATXA' },
            { key: 'ultima',     label: 'ACTIVITAT' },
          ].map(s => (
            <button
              key={s.key}
              className={`${styles.sortBtn} ${sort === s.key ? styles.sortActive : ''}`}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid d'alumnes */}
        {loading ? (
          <div className={styles.loading}>Carregant dades del grup...</div>
        ) : error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : (
          <div className={styles.grid}>
            {sorted.map(a => <AlumneCard key={a.id} a={a} />)}
          </div>
        )}
      </main>
    </div>
  );
}
