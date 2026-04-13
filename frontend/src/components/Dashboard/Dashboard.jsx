import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import { api } from '../../services/api';
import CharacterPanel from './CharacterPanel';
import XPBar from './XPBar';
import BossTimer from './BossTimer';
import StreakCounter from './StreakCounter';
import StatsPanel, { MODES } from './StatsPanel';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { usuari, logout } = useAuth();
  const { progres, skillTree, revisions, loading } = useProgress();
  const navigate = useNavigate();
  const [timerEnabled, setTimerEnabled] = useState(
    localStorage.getItem('timerEnabled') !== 'false'
  );
  const [statsMode, setStatsMode] = useState(
    localStorage.getItem('statsMode') || 'donut'
  );

  function toggleTimer() {
    const nou = !timerEnabled;
    setTimerEnabled(nou);
    localStorage.setItem('timerEnabled', String(nou));
  }

  function cycleStatsMode() {
    const idx = MODES.findIndex(m => m.key === statsMode);
    const nou = MODES[(idx + 1) % MODES.length].key;
    setStatsMode(nou);
    localStorage.setItem('statsMode', nou);
  }

  const nodesCompletats = skillTree.filter(n => n.estat === 'completat' || n.estat === 'dominat').length;
  const totalNodes = skillTree.length;

  // Grup de l'alumne
  const [grups, setGrups]           = useState(null);
  const [codiGrup, setCodiGrup]     = useState('');
  const [unintGrup, setUnintGrup]   = useState(false);
  const [errorGrup, setErrorGrup]   = useState('');

  useEffect(() => {
    api.grup.meus().then(setGrups).catch(() => setGrups([]));
  }, []);

  async function unirGrup() {
    if (codiGrup.trim().length < 4) return;
    setErrorGrup('');
    try {
      const data = await api.grup.unir(codiGrup.trim());
      setGrups([{ ...data.grup, num_alumnes: 0, num_monitors: 0 }]);
      setUnintGrup(true);
    } catch (err) { setErrorGrup(err.error || 'Codi incorrecte'); }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={`${styles.logo} text-neon-green text-game`}>PACFGM QUEST</div>
        <nav className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate('/skill-tree')}>ARBRE</button>
          <button className={styles.navBtn} onClick={() => navigate('/leaderboard')}>RÀNQUING</button>
          <button className={styles.navBtn} onClick={() => navigate('/repas')}>REPÀS</button>
          <button className={`${styles.navBtn} ${styles.navBtnDanger}`} onClick={logout}>SORTIR</button>
        </nav>
      </header>

      <main className={styles.main}>
        {/* Columna esquerra — personatge */}
        <aside className={`${styles.sidePanel} panel-rpg animate-panel-in`}>
          <CharacterPanel usuari={usuari} />
        </aside>

        {/* Columna central — stats */}
        <section className={styles.centerPanel}>
          {/* XP */}
          <div className={`panel-rpg ${styles.xpPanel} animate-panel-in`} style={{ animationDelay: '0.05s' }}>
            <div className={styles.panelTitle}>EXPERIÈNCIA</div>
            <XPBar xp_total={progres?.xp_total || 0} nivell={usuari?.nivell || 1} />
            <div className={styles.xpTotal}>
              Total: <span className="text-gold text-game">{(progres?.xp_total || 0).toLocaleString()} XP</span>
            </div>
          </div>

          {/* Radar */}
          <div className={`panel-rpg ${styles.radarPanel} animate-panel-in`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.panelTitle}>ATRIBUTS</div>
            {loading ? (
              <div className={styles.loading}>Carregant...</div>
            ) : (
              <StatsPanel nodes={skillTree} mode={statsMode} />
            )}
          </div>

          {/* Revisions pendents */}
          {revisions.length > 0 && (
            <div className={`panel-rpg ${styles.revisionsPanel} animate-panel-in`} style={{ animationDelay: '0.12s' }}>
              <div className={styles.panelTitle} style={{ color: 'var(--color-neon-orange)' }}>
                ⏰ REPÀS PENDENT — {revisions.length} {revisions.length === 1 ? 'NODE' : 'NODES'}
              </div>
              <div className={styles.revisionsList}>
                {revisions.slice(0, 4).map(r => (
                  <button
                    key={r.node_id}
                    className={styles.revisionItem}
                    onClick={() => navigate(`/battle/${r.node_id}`)}
                  >
                    <span className={styles.revisionTitol}>{r.titol}</span>
                    <span className={styles.revisionBadge}>REPASSAR</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            className={`${styles.ctaBtn} animate-panel-in`}
            style={{ animationDelay: '0.15s' }}
            onClick={() => navigate('/skill-tree')}
          >
            <span className={styles.ctaIcon}>⚔</span>
            <span>{nodesCompletats === 0 ? 'COMEÇAR ENTRENAMENT' : 'CONTINUAR ENTRENANT'}</span>
          </button>
        </section>

        {/* Columna dreta — estadístiques */}
        <aside className={`${styles.rightPanel} panel-rpg animate-panel-in`} style={{ animationDelay: '0.08s' }}>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>RATXA</span>
            <StreakCounter dies={progres?.racha_dies || 0} />
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>EXAMEN</span>
            <BossTimer />
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>PROGRÉS</span>
            <span className={styles.nodeCount}>
              <span className="text-neon-green text-game">{nodesCompletats}</span>
              <span className={styles.nodeTotal}> / {totalNodes}</span>
            </span>
            <span className={styles.statSub}>temes completats</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>GRUP</span>
            {grups === null ? (
              <span className={styles.statSub}>...</span>
            ) : grups.length > 0 ? (
              <span className={styles.statSub} style={{ color: 'var(--color-neon-green)' }}>
                {grups[0].nom}
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  className={styles.grupInput}
                  placeholder="Codi del grup"
                  value={codiGrup}
                  onChange={e => setCodiGrup(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && unirGrup()}
                  maxLength={8}
                />
                <button className={styles.toggleBtn} style={{ borderColor: 'var(--color-neon-green)', color: 'var(--color-neon-green)' }} onClick={unirGrup}>
                  UNIR-ME
                </button>
                {errorGrup && <span style={{ fontSize: 10, color: 'var(--color-neon-red)', fontFamily: 'var(--font-body)' }}>{errorGrup}</span>}
              </div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>AJUSTOS</span>
            <button className={`${styles.toggleBtn} ${timerEnabled ? styles.toggleOn : styles.toggleOff}`} onClick={toggleTimer}>
              ⏱ TEMPS {timerEnabled ? 'ON' : 'OFF'}
            </button>
            <button className={`${styles.toggleBtn} ${styles.toggleOn}`} onClick={cycleStatsMode} style={{ marginTop: 4 }}>
              {MODES.find(m => m.key === statsMode)?.label}
            </button>
          </div>
        </aside>
      </main>
      <div className={styles.version}>v{__APP_VERSION__}</div>
    </div>
  );
}
