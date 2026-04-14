import { useState, useEffect, useCallback } from 'react';
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

// ── Drawer informe IA ──────────────────────────────────────────────────────────

const INFORME_SECCIONS = [
  { key: 'fortaleses',   icon: '💪', label: 'Fortaleses',      color: 'var(--color-neon-green)' },
  { key: 'en_progres',   icon: '📈', label: 'En progrés',      color: 'var(--color-gold)' },
  { key: 'febles',       icon: '⚠️',  label: 'Per millorar',    color: 'var(--color-neon-orange)' },
  { key: 'no_explorat',  icon: '🔒', label: 'No explorat',     color: 'var(--color-text-disabled)' },
];

function InformeDrawer({ alumne, onTancar }) {
  const [estat, setEstat] = useState('carregant'); // carregant | ok | error
  const [data, setData]   = useState(null);
  const [err, setErr]     = useState('');

  useEffect(() => {
    let cancel = false;
    api.grup.informe(alumne.id)
      .then(d => { if (!cancel) { setData(d); setEstat('ok'); } })
      .catch(e => { if (!cancel) { setErr(e.error || 'Error'); setEstat('error'); } });
    return () => { cancel = true; };
  }, [alumne.id]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onTancar(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTancar]);

  return (
    <>
      <div className={styles.drawerOverlay} onClick={onTancar} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitol} style={{ color: 'var(--color-neon-green)' }}>
            INFORME — {alumne.alias}
          </span>
          <button className={styles.drawerClose} onClick={onTancar}>✕</button>
        </div>

        <div className={styles.drawerCos}>
          {estat === 'carregant' && (
            <div className={styles.drawerCarregant}>
              <span className={styles.drawerSpinner}>⚙</span>
              ANALITZANT PROGRÉS...
            </div>
          )}
          {estat === 'error' && (
            <div className={styles.drawerError}>{err}</div>
          )}
          {estat === 'ok' && data && (
            <div className={styles.informeWrap}>
              {/* Valoració general */}
              <div className={styles.informeValo}>
                <div className={styles.informeValoLabel}>VALORACIÓ GENERAL</div>
                <p className={styles.informeValoText}>{data.informe.valoracio_general}</p>
              </div>

              {/* Seccions */}
              {INFORME_SECCIONS.map(s => {
                const items = data.informe[s.key] || [];
                if (items.length === 0) return null;
                return (
                  <div key={s.key} className={styles.informeSeccio}>
                    <div className={styles.informeSeccioHead} style={{ color: s.color, borderColor: `${s.color}40` }}>
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </div>
                    <ul className={styles.informeLlista}>
                      {items.map((item, i) => (
                        <li key={i} className={styles.informeItem} style={{ borderColor: `${s.color}30` }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {/* Recomanació */}
              {data.informe.recomanacio && (
                <div className={styles.informeRec}>
                  <div className={styles.informeRecLabel}>RECOMANACIÓ PER AQUESTA SETMANA</div>
                  <p className={styles.informeRecText}>{data.informe.recomanacio}</p>
                </div>
              )}

              {/* Peu */}
              <div className={styles.informePeu}>
                Informe generat per IA · {new Date(data.generat_at).toLocaleDateString('ca-ES')}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AlumneCard({ a, onInforme }) {
  const actColor = activitatColor(a.ultima_sessio);
  const rangCfg  = RANG_CONFIG[a.rang] || RANG_CONFIG.novici;
  const pct      = a.nodes_totals > 0 ? Math.round((a.nodes_completats / a.nodes_totals) * 100) : 0;

  return (
    <div className={styles.card} style={{ '--act-color': actColor, borderColor: `${actColor}60` }}>
      <div className={styles.cardHead}>
        <span className={styles.alias}>{a.alias}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={styles.rangBadge} style={{ color: rangCfg.color, borderColor: `${rangCfg.color}60` }}>
            {rangCfg.label}
          </span>
          <button
            className={styles.informeBtn}
            onClick={() => onInforme(a)}
            title="Generar informe IA"
          >
            📋
          </button>
        </div>
      </div>
      <div className={styles.progBar}>
        <div className={styles.progFill} style={{ width: `${pct}%`, background: actColor }} />
      </div>
      <div className={styles.progLabel}>
        <span style={{ color: actColor }}>{a.nodes_completats}</span>
        <span className={styles.progTotal}>/{a.nodes_totals} temes</span>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: 'var(--color-gold)' }}>{(a.xp_setmana || 0).toLocaleString()}</span>
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

// ── Panell sense grup ─────────────────────────────────────────────────────────

function SenseGrup({ onGrupCreat, esPare }) {
  const [nomGrup, setNomGrup]   = useState('');
  const [codi, setCodi]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function crear() {
    if (nomGrup.trim().length < 2) { setError('Escriu el nom del grup'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.grup.crear(nomGrup.trim());
      onGrupCreat(data.grup);
    } catch (err) { setError(err.error || 'Error creant el grup'); }
    finally { setLoading(false); }
  }

  async function unir() {
    if (codi.trim().length < 4) { setError('Introdueix el codi del grup'); return; }
    setLoading(true); setError('');
    try {
      const data = await api.grup.unir(codi.trim());
      onGrupCreat(data.grup);
    } catch (err) { setError(err.error || 'Codi incorrecte'); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.senseGrup}>
      <div className={styles.senseGrupIcon}>👥</div>
      <h2 className={styles.senseGrupTitle}>Encara no tens cap grup</h2>

      <div className={styles.grupForms}>
        {!esPare && (
          <>
            <div className={styles.grupForm}>
              <div className={styles.grupFormTitle}>CREAR NOU GRUP</div>
              <input
                className={styles.grupInput}
                placeholder="Nom del grup (ex: CFGM 2024-A)"
                value={nomGrup}
                onChange={e => setNomGrup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crear()}
                type="text"
                autoComplete="off"
                maxLength={60}
              />
              <button className={styles.grupBtn} onClick={crear} disabled={loading}>
                {loading ? '...' : 'CREAR GRUP'}
              </button>
            </div>

            <div className={styles.grupDivider}>o</div>
          </>
        )}

        <div className={styles.grupForm}>
          <div className={styles.grupFormTitle}>UNIR-ME A UN GRUP EXISTENT</div>
          <input
            className={styles.grupInput}
            placeholder="Codi del grup (ex: K7MN2P)"
            value={codi}
            onChange={e => setCodi(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && unir()}
            type="text"
            autoComplete="off"
            maxLength={8}
          />
          <button className={styles.grupBtn} onClick={unir} disabled={loading}>
            {loading ? '...' : 'UNIR-ME'}
          </button>
        </div>
      </div>

      {error && <div className={styles.grupError}>{error}</div>}
    </div>
  );
}

// ── Capçalera del grup ────────────────────────────────────────────────────────

function GrupHeader({ grups }) {
  const [copiat, setCopiat] = useState(false);

  function copiarCodi(codi) {
    navigator.clipboard.writeText(codi).then(() => {
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    });
  }

  return (
    <div className={styles.grupHeaders}>
      {grups.map(g => (
        <div key={g.id} className={styles.grupHeader}>
          <span className={styles.grupNom}>{g.nom}</span>
          <div className={styles.grupCodiWrap}>
            <span className={styles.grupCodiLabel}>CODI</span>
            <span className={styles.grupCodi}>{g.codi}</span>
            <button
              className={`${styles.copiarBtn} ${copiat ? styles.copiatOk : ''}`}
              onClick={() => copiarCodi(g.codi)}
            >
              {copiat ? '✓ COPIAT' : '📋 COPIAR'}
            </button>
          </div>
          <span className={styles.grupStats}>
            {g.num_alumnes} alumne{g.num_alumnes !== 1 ? 's' : ''} · {g.num_monitors} monitor{g.num_monitors !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────

// ── Secció peticions pendents ─────────────────────────────────────────────────
function PeticionsPendents({ peticions, onAprovar, onRebutjar }) {
  if (peticions.length === 0) return null;
  return (
    <div className={styles.peticions}>
      <div className={styles.peticionsHead}>
        <span className={styles.peticionsTitol}>⏳ SOL·LICITUDS D'ACCÉS</span>
        <span className={styles.peticionsCount}>{peticions.length}</span>
      </div>
      {peticions.map(p => (
        <div key={p.id} className={styles.peticioRow}>
          <span className={styles.peticioAlias}>{p.alias}</span>
          <span className={styles.peticioNom}>{p.nom}</span>
          <span className={styles.peticioGrup}>{p.grup_nom}</span>
          <div className={styles.peticioAccions}>
            <button className={styles.btnAprovar} onClick={() => onAprovar(p.id)}>✓ ACCEPTAR</button>
            <button className={styles.btnRebutjar} onClick={() => onRebutjar(p.id)}>✕ REBUTJAR</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MonitorPanel() {
  const { usuari, logout } = useAuth();
  const navigate = useNavigate();
  const [grups, setGrups]           = useState(null);
  const [alumnes, setAlumnes]       = useState([]);
  const [loadingAlumnes, setLA]     = useState(false);
  const [sort, setSort]             = useState('xp_setmana');
  const [peticions, setPeticions]   = useState([]);
  const [alumneInforme, setAlumneInforme] = useState(null);

  const obrirInforme  = useCallback((a) => setAlumneInforme(a), []);
  const tancarInforme = useCallback(() => setAlumneInforme(null), []);

  useEffect(() => {
    api.grup.meus().then(setGrups).catch(() => setGrups([]));
  }, []);

  useEffect(() => {
    if (!grups || grups.length === 0) return;
    setLA(true);
    api.grup.progres().then(setAlumnes).catch(() => {}).finally(() => setLA(false));
    // Carregar peticions pendents
    api.grup.peticions().then(setPeticions).catch(() => {});
  }, [grups]);

  async function aprovar(alumneId) {
    await api.grup.aprovar(alumneId).catch(() => {});
    setPeticions(ps => ps.filter(p => p.id !== alumneId));
    // Refrescar llista d'alumnes
    api.grup.progres().then(setAlumnes).catch(() => {});
  }

  async function rebutjar(alumneId) {
    await api.grup.rebutjar(alumneId).catch(() => {});
    setPeticions(ps => ps.filter(p => p.id !== alumneId));
  }

  function onGrupCreat(grup) {
    setGrups([{ ...grup, num_alumnes: 0, num_monitors: 1 }]);
  }

  const sorted = [...alumnes].sort((a, b) => {
    if (sort === 'xp_setmana') return (b.xp_setmana || 0) - (a.xp_setmana || 0);
    if (sort === 'nodes')      return (b.nodes_completats || 0) - (a.nodes_completats || 0);
    if (sort === 'ratxa')      return (b.racha_dies || 0) - (a.racha_dies || 0);
    if (sort === 'ultima')     return (b.ultima_sessio || '').localeCompare(a.ultima_sessio || '');
    return 0;
  });

  const actius = alumnes.filter(a => {
    if (!a.ultima_sessio) return false;
    return Math.floor((Date.now() - new Date(a.ultima_sessio)) / 86400000) <= 1;
  }).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.logo} text-game`}><img src="/favicon.svg" alt="" style={{ height: '22px', marginRight: '10px', verticalAlign: 'middle', marginTop: '-2px' }} />PACFGM QUEST</div>
        <div className={styles.monitorBadge}>TUTOR: {usuari?.alias}</div>
        <button className={styles.logoutBtn} onClick={logout}>SORTIR</button>
      </header>

      <main className={styles.main}>
        {grups === null ? (
          <div className={styles.loading}>Carregant...</div>
        ) : grups.length === 0 ? (
          <SenseGrup onGrupCreat={onGrupCreat} esPare={usuari?.subtipus === 'pare'} />
        ) : (
          <>
            <GrupHeader grups={grups} />

            <PeticionsPendents
              peticions={peticions}
              onAprovar={aprovar}
              onRebutjar={rebutjar}
            />

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

            {loadingAlumnes ? (
              <div className={styles.loading}>Carregant alumnes...</div>
            ) : alumnes.length === 0 ? (
              <div className={styles.senseAlumnes}>
                Encara no hi ha alumnes al grup. Comparteix el codi per a que es puguin unir.
              </div>
            ) : (
              <div className={styles.grid}>
                {sorted.map(a => <AlumneCard key={a.id} a={a} onInforme={obrirInforme} />)}
              </div>
            )}
          </>
        )}
      </main>

      {alumneInforme && (
        <InformeDrawer alumne={alumneInforme} onTancar={tancarInforme} />
      )}
    </div>
  );
}
