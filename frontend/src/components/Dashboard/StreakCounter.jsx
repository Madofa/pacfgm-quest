import styles from './StreakCounter.module.css';

export default function StreakCounter({ dies = 0 }) {
  const emoji = dies >= 7 ? '🔥🔥' : dies >= 3 ? '🔥' : '❄️';

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>{emoji}</span>
      <div className={styles.info}>
        <span className={`${styles.count} ${dies >= 3 ? styles.hot : ''}`}>{dies}</span>
        <span className={styles.label}>dies</span>
      </div>
    </div>
  );
}
