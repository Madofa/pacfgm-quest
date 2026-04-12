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
  const { progres, skillTree, loading } = useProgress();
  const navigate = useNavigate();

  const nodesCompletats = skillTree.filter(n => n.estat === 'completat' || n.estat === 'dominat').length;
  const totalNodes = skillTree.length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={`${styles.logo} text-neon-green text-game`}>PACFGM QUEST</div>
        <nav className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate('/skill-tree')}>ÁRBOL</button>
          <button className={styles.navBtn} onClick={() => navigate('/leaderboard')}>RANKING</button>
          <button className={`${styles.navBtn} ${styles.navBtnDanger}`} onClick={logout}>SALIR</button>
        </nav>
      </header>

      <main className={styles.main}>
        {/* Columna izquierda — personaje */}
        <aside className={`${styles.sidePanel} panel-rpg animate-panel-in`}>
          <CharacterPanel usuari={usuari} />
          <div className={styles.divider} />
          <div className={styles.statRow}>
            <span className={styles.statLabel}>RACHA</span>
            <StreakCounter dies={progres?.racha_dies || 0} />
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>EXAMEN</span>
            <BossTimer />
          </div>
          <div className={styles.divider} />
          <div className={styles.nodeProgress}>
            <span className={styles.statLabel}>PROGRESO</span>
            <span className={styles.nodeCount}>
              <span className="text-neon-green text-game">{nodesCompletats}</span>
              <span className={styles.nodeTotal}> / {totalNodes}</span>
            </span>
          </div>
        </aside>

        {/* Columna central — stats */}
        <section className={styles.centerPanel}>
          {/* XP */}
          <div className={`panel-rpg ${styles.xpPanel} animate-panel-in`} style={{ animationDelay: '0.05s' }}>
            <div className={styles.panelTitle}>EXPERIENCIA</div>
            <XPBar xp_total={progres?.xp_total || 0} nivell={usuari?.nivell || 1} />
            <div className={styles.xpTotal}>
              Total: <span className="text-gold text-game">{(progres?.xp_total || 0).toLocaleString()} XP</span>
            </div>
          </div>

          {/* Radar */}
          <div className={`panel-rpg ${styles.radarPanel} animate-panel-in`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.panelTitle}>ATRIBUTOS</div>
            {loading ? (
              <div className={styles.loading}>Cargando...</div>
            ) : (
              <StatsRadar nodes={skillTree} />
            )}
          </div>

          {/* CTA — ir al árbol */}
          <button
            className={`${styles.ctaBtn} animate-panel-in`}
            style={{ animationDelay: '0.15s' }}
            onClick={() => navigate('/skill-tree')}
          >
            <span className={styles.ctaIcon}>⚔</span>
            <span>CONTINUAR ENTRENANDO</span>
          </button>
        </section>
      </main>
    </div>
  );
}
