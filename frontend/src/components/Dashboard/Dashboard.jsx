import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import CharacterPanel from './CharacterPanel';
import XPBar from './XPBar';
import BossTimer from './BossTimer';
import StreakCounter from './StreakCounter';
import StatsRadar from './StatsRadar';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { usuari, logout } = useAuth();
  const { progres, skillTree, revisions, loading } = useProgress();
  const navigate = useNavigate();
  const [timerEnabled, setTimerEnabled] = useState(
    localStorage.getItem('timerEnabled') !== 'false'
  );

  function toggleTimer() {
    const nou = !timerEnabled;
    setTimerEnabled(nou);
    localStorage.setItem('timerEnabled', String(nou));
  }

  const nodesCompletats = skillTree.filter(n => n.estat === 'completat' || n.estat === 'dominat').length;
  const totalNodes = skillTree.length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={`${styles.logo} text-neon-green text-game`}>PACFGM QUEST</div>
        <nav className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate('/skill-tree')}>ARBRE</button>
          <button className={styles.navBtn} onClick={() => navigate('/leaderboard')}>RÀNQUING</button>
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
              <StatsRadar nodes={skillTree} />
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
            <span className={styles.statSub}>nodes completats</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>AJUSTOS</span>
            <button className={`${styles.toggleBtn} ${timerEnabled ? styles.toggleOn : styles.toggleOff}`} onClick={toggleTimer}>
              ⏱ TEMPS {timerEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
