import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth.jsx';
import styles from './Leaderboard.module.css';

const RANG_ICONS = {
  novici: '○', aprenent: '◇', guerrer: '◆', campió: '★', mestre: '✦'
};

export default function Leaderboard() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const { usuari, logout }    = useAuth();
  const navigate              = useNavigate();

  useEffect(() => {
    api.grup.leaderboard()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>◄ DASHBOARD</button>
        <div className={styles.title}>RANKING SEMANAL</div>
        <button className={styles.backBtn} onClick={logout}>SALIR</button>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Cargando ranking...</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>Nadie ha entrenado esta semana todavía.<br/>¡Sé el primero!</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>#</span>
              <span>Jugador</span>
              <span>Rango</span>
              <span>XP semana</span>
              <span>Racha</span>
            </div>
            {rows.map((row, i) => {
              const esJugador = row.alias === usuari?.alias;
              const isPodio   = i < 3;
              const podioColor = ['var(--color-gold)', 'var(--color-text-secondary)', 'var(--color-neon-orange)'][i] || '';

              return (
                <div
                  key={row.alias}
                  className={`${styles.row} ${esJugador ? styles.rowMe : ''} ${isPodio ? styles.rowPodio : ''}`}
                  style={isPodio ? { '--podio-color': podioColor } : {}}
                >
                  <span className={styles.pos} style={isPodio ? { color: podioColor } : {}}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : row.posicio}
                  </span>
                  <span className={styles.alias}>
                    {row.alias}
                    {esJugador && <span className={styles.tuTag}> (tú)</span>}
                  </span>
                  <span className={styles.rang}>
                    <span className={styles.rangIcon}>{RANG_ICONS[row.rang] || '○'}</span>
                    {row.rang}
                  </span>
                  <span className={styles.xp}>{row.xp_setmana.toLocaleString()} XP</span>
                  <span className={styles.racha}>🔥 {row.racha_dies}d</span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
