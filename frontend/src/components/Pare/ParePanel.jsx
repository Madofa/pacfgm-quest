import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../services/api';
import { MATERIES } from '../../data/skillTree';
import styles from './ParePanel.module.css';

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
  { key: 'fortaleses',  icon: '💪', label: 'Fortaleses',   color: 'var(--color-neon-green)' },
  { key: 'en_progres',  icon: '📈', label: 'En progrés',   color: 'var(--color-gold)' },
  { key: 'febles',      icon: '⚠️',  label: 'Per millorar', color: 'var(--color-neon-orange)' },
  { key: 'no_explorat', icon: '🔒', label: 'No explorat',  color: 'var(--color-text-disabled)' },
];

function InformeDrawer({ fill, onTancar }) {
  const [estat, setEstat] = useState('carregant');
  const [data, setData]   = useState(null);
  const [err, setErr]     = useState('');

  useEffect(() => {
    let cancel = false;
    api.familia.informe(fill.id)
      .then(d => { if (!cancel) { setData(d); setEstat('ok'); } })
      .catch(e => { if (!cancel) { setErr(e.error || 'Error'); setEstat('error'); } });
    return () => { cancel = true; };
  }, [fill.id]);

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
            INFORME — {fill.alias}
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
              <div className={styles.informeValo}>
                <div className={styles.informeValoLabel}>VALORACIÓ GENERAL</div>
                <p className={styles.informeValoText}>{data.informe.valoracio_general}</p>
              </div>

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

              {data.informe.recomanacio && (
                <div className={styles.informeRec}>
                  <div className={styles.informeRecLabel}>RECOMANACIÓ PER AQUESTA SETMANA</div>
                  <p className={styles.informeRecText}>{data.informe.recomanacio}</p>
                </div>
              )}

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

// ── Targeta fill ───────────────────────────────────────────────────────────────

function FillCard({ f, onInforme, onDesvincular }) {
  const actColor = activitatColor(f.ultima_sessio);
  const rangCfg  = RANG_CONFIG[f.rang] || RANG_CONFIG.novici;
  const pct      = f.nodes_totals > 0 ? Math.round((f.nodes_completats / f.nodes_totals) * 100) : 0;

  return (
    <div className={styles.card} style={{ '--act-color': actColor, borderColor: `${actColor}60` }}>
      <div className={styles.cardHead}>
        <div className={styles.cardHeadLeft}>
          <span className={styles.alias}>{f.alias}</span>
          <span className={styles.nom}>{f.nom}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={styles.rangBadge} style={{ color: rangCfg.color, borderColor: `${rangCfg.color}60` }}>
            {rangCfg.label}
          </span>
          <button className={styles.informeBtn} onClick={() => onInforme(f)} title="Informe IA">
            📋
          </button>
          <button className={styles.desvincularBtn} onClick={() => onDesvincular(f)} title="Desvincular fill/a">
            ✕
          </button>
        </div>
      </div>

      <div className={styles.progBar}>
        <div className={styles.progFill} style={{ width: `${pct}%`, background: actColor }} />
      </div>
      <div className={styles.progLabel}>
        <span style={{ color: actColor }}>{f.nodes_completats}</span>
        <span className={styles.progTotal}>/{f.nodes_totals} temes</span>
        <span className={styles.progPct} style={{ color: actColor }}>{pct}%</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: 'var(--color-gold)' }}>Nv{f.nivell}</span>
          <span className={styles.statLbl}>nivell</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: f.racha_dies >= 3 ? 'var(--color-neon-orange)' : undefined }}>
            🔥{f.racha_dies || 0}
          </span>
          <span className={styles.statLbl}>ratxa</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: actColor }}>{formatData(f.ultima_sessio)}</span>
          <span className={styles.statLbl}>última sessió</span>
        </div>
      </div>

      {f.punts_febles?.length > 0 && (
        <div className={styles.puntsFebles}>
          {f.punts_febles.map(m => {
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

// ── Afegir fill/a ──────────────────────────────────────────────────────────────

function AfegirFill({ onAfegit }) {
  const [alias, setAlias]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function afegir() {
    if (alias.trim().length < 2) { setError('Introdueix l\'àlies del teu fill/a'); return; }
    setLoading(true); setError('');
    try {
      await api.familia.vincular(alias.trim());
      onAfegit();
      setAlias('');
    } catch (err) {
      setError(err.error || 'No s\'ha trobat cap alumne amb aquest àlies');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.afegirWrap}>
      <div className={styles.afegirIcon}>👨‍👩‍👧</div>
      <h2 className={styles.afegirTitle}>Afegeix el teu fill/a</h2>
      <p className={styles.afegirDesc}>
        Introdueix l'àlies de joc del teu fill o filla per vincular el compte i seguir el seu progrés.
      </p>
      <div className={styles.afegirForm}>
        <input
          className={styles.afegirInput}
          placeholder="Àlies del fill/a (ex: DragonSlayer42)"
          value={alias}
          onChange={e => setAlias(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && afegir()}
          type="text"
          autoComplete="off"
          maxLength={30}
          autoFocus
        />
        <button className={styles.afegirBtn} onClick={afegir} disabled={loading}>
          {loading ? '...' : 'VINCULAR'}
        </button>
      </div>
      {error && <div className={styles.afegirError}>{error}</div>}
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────

export default function ParePanel() {
  const { usuari, logout } = useAuth();
  const [fills, setFills]   = useState(null); // null = loading
  const [fillInforme, setFillInforme] = useState(null);
  const [confirmDel, setConfirmDel]   = useState(null);

  const obrirInforme  = useCallback((f) => setFillInforme(f), []);
  const tancarInforme = useCallback(() => setFillInforme(null), []);

  function carregar() {
    api.familia.fills().then(setFills).catch(() => setFills([]));
  }

  useEffect(() => { carregar(); }, []);

  async function desvincular(fill) {
    try {
      await api.familia.desvincular(fill.id);
      setFills(fs => fs.filter(f => f.id !== fill.id));
    } catch {}
    setConfirmDel(null);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.logo} text-game`}>PACFGM QUEST</div>
        <div className={styles.pareBadge}>FAMÍLIA: {usuari?.alias}</div>
        <button className={styles.logoutBtn} onClick={logout}>SORTIR</button>
      </header>

      <main className={styles.main}>
        {fills === null ? (
          <div className={styles.loading}>Carregant...</div>
        ) : fills.length === 0 ? (
          <AfegirFill onAfegit={carregar} />
        ) : (
          <>
            <div className={styles.fillsHeader}>
              <span className={styles.fillsTitle}>ELS MEUS FILLS/ES</span>
              <button className={styles.afegirMes} onClick={() => setFills(f => [...f, '__ADD__'])}>
                + AFEGIR FILL/A
              </button>
            </div>

            {/* Formulari d'afegir si s'ha premut el botó */}
            {fills.includes('__ADD__') && (
              <AfegirFill onAfegit={() => {
                setFills(f => f.filter(x => x !== '__ADD__'));
                carregar();
              }} />
            )}

            <div className={styles.cards}>
              {fills.filter(f => f !== '__ADD__').map(f => (
                <FillCard
                  key={f.id}
                  f={f}
                  onInforme={obrirInforme}
                  onDesvincular={f => setConfirmDel(f)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Drawer informe */}
      {fillInforme && <InformeDrawer fill={fillInforme} onTancar={tancarInforme} />}

      {/* Confirmació desvincular */}
      {confirmDel && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDel(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>
              Vols desvincular <strong>{confirmDel.alias}</strong>?<br />
              <span className={styles.confirmSub}>Podràs tornar a vincular-lo/la amb el mateix àlies.</span>
            </p>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmCancel} onClick={() => setConfirmDel(null)}>Cancel·lar</button>
              <button className={styles.confirmOk} onClick={() => desvincular(confirmDel)}>Desvincular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
